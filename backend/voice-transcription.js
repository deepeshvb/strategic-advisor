/**
 * Voice note transcription for WhatsApp voice messages.
 * Supports Groq (free tier) or OpenAI Whisper. WhatsApp sends OGG - we convert to WAV via ffmpeg or ogg-opus-decoder.
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import https from 'https';
import { spawn, execSync } from 'child_process';
import { createRequire } from 'module';
import { OggOpusDecoder } from 'ogg-opus-decoder';
import { Readable } from 'stream';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const FormData = require('form-data');
const WHISPER_SUPPORTED = new Set(['mp3', 'mp4', 'mpeg', 'mpga', 'm4a', 'wav', 'webm', 'ogg', 'opus']);

const EXT_TO_MIME = {
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  opus: 'audio/ogg',
  mp3: 'audio/mpeg',
  mp4: 'audio/mp4',
  m4a: 'audio/mp4',
  webm: 'audio/webm',
  flac: 'audio/flac',
};

/** Call OpenAI Whisper. Send as Buffer + explicit filename/type (stream can confuse format detection). */
async function whisperOpenAI(apiKey, filePath) {
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error(`Voice file not found: ${resolved}`);
  const fileBuf = fs.readFileSync(resolved);
  const size = fileBuf.length;
  if (size < 44) throw new Error(`Voice file too small (${size} bytes) to be valid audio`);
  let ext = (path.extname(resolved).slice(1) || 'wav').toLowerCase();
  const head = fileBuf.slice(0, 12);
  const isRiff = head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46;
  const isWave = head[8] === 0x57 && head[9] === 0x41 && head[10] === 0x56 && head[11] === 0x45;
  const isOgg = head[0] === 0x4f && head[1] === 0x67 && head[2] === 0x67 && head[3] === 0x53;
  const magic = isRiff && isWave ? 'RIFF/WAVE' : isOgg ? 'OggS' : head.slice(0, 4).toString('hex');
  const filename = ext === 'ogg' ? 'audio.oga' : `audio.${ext}`;
  const mime = EXT_TO_MIME[ext] || (ext === 'mp3' ? 'audio/mpeg' : 'audio/wav');
  console.log(`[voice] OpenAI send: ${path.basename(resolved)} (${filename}), ${size} bytes, magic: ${magic}`);

  const OpenAI = (await import('openai')).default;
  const { toFile } = await import('openai');
  const client = new OpenAI({ apiKey });
  const file = await toFile(fileBuf, filename, { type: mime });
  const transcription = await client.audio.transcriptions.create({ model: 'whisper-1', file });
  return (transcription?.text ?? '').trim();
}

/** Call Groq Whisper via official SDK (or fallback to https). provider: 'groq' | 'openai' */
async function whisperViaHttps(apiKey, filePath, provider = 'openai') {
  if (provider === 'openai') return whisperOpenAI(apiKey, filePath);

  // Groq: try official SDK first (handles multipart correctly)
  try {
    const groqModule = await import('groq-sdk');
    const Groq = groqModule.default;
    const toFile = groqModule.toFile;
    const client = new Groq({ apiKey });
    const fileBuf = fs.readFileSync(filePath);
    const ext = (path.extname(filePath).slice(1) || 'ogg').toLowerCase();
    const file = await toFile(fileBuf, `audio.${ext}`);
    const transcription = await client.audio.transcriptions.create({
      model: 'whisper-large-v3-turbo',
      file,
    });
    const text = (transcription?.text || '').trim();
    if (text) return text;
  } catch (sdkErr) {
    console.warn('[voice] Groq SDK failed, trying form-data:', sdkErr.message?.slice(0, 80));
  }

  // Fallback: form-data to Groq (same as before)
  const fileBuf = fs.readFileSync(filePath);
  const ext = (path.extname(filePath).slice(1) || 'ogg').toLowerCase();
  const mime = EXT_TO_MIME[ext] || 'application/octet-stream';
  const form = new FormData();
  form.append('file', fileBuf, { filename: `audio.${ext}`, contentType: mime });
  form.append('model', 'whisper-large-v3-turbo');
  return new Promise((resolve, reject) => {
    form.getLength((err, length) => {
      if (err) { reject(err); return; }
      const req = https.request(
        {
          hostname: 'api.groq.com',
          path: '/openai/v1/audio/transcriptions',
          method: 'POST',
          headers: {
            ...form.getHeaders(),
            'Authorization': `Bearer ${apiKey}`,
            'Content-Length': length,
          },
        },
        (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const data = Buffer.concat(chunks).toString('utf8');
            if (res.statusCode >= 400) return reject(new Error(data || `HTTP ${res.statusCode}`));
            try {
              resolve((JSON.parse(data)?.text || '').trim());
            } catch {
              reject(new Error(data || `HTTP ${res.statusCode}`));
            }
          });
        }
      );
      req.on('error', reject);
      req.setTimeout(60000, () => { req.destroy(); reject(new Error('Whisper API timeout')); });
      form.pipe(req);
    });
  });
}

/**
 * Download audio from Twilio MediaUrl (supports Basic Auth with Twilio credentials)
 */
async function downloadAudio(mediaUrl, twilioSid, twilioToken) {
  return new Promise((resolve, reject) => {
    const url = new URL(mediaUrl);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {},
    };
    if (twilioSid && twilioToken) {
      const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      options.headers['Authorization'] = `Basic ${auth}`;
    }
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Download timeout'));
    });
    req.end();
  });
}

/** Get ffmpeg path - prefer bundled ffmpeg-static (in project, always accessible), then FFMPEG_PATH, then PATH */
export function getFfmpegPath() {
  const bundled = path.join(__dirname, '..', 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  if (fs.existsSync(bundled)) return bundled;
  if (process.env.FFMPEG_PATH && fs.existsSync(process.env.FFMPEG_PATH)) return process.env.FFMPEG_PATH;
  try {
    const fp = require('ffmpeg-static');
    if (fp && typeof fp === 'string' && fs.existsSync(fp)) return fp;
  } catch (_) {}
  return 'ffmpeg';
}

/**
 * Run ffmpeg - use execSync via cmd.exe on Windows to avoid spawn crashes (exit 3753488571).
 */
function runFfmpeg(ffmpegPath, args, useShell) {
  const isWin = process.platform === 'win32';
  if (isWin) {
    const cmd = [ffmpegPath, ...args].map((a) => (a.includes(' ') ? `"${a.replace(/"/g, '""')}"` : a)).join(' ');
    try {
      execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 10 * 1024 * 1024, windowsHide: true, shell: 'cmd.exe' });
      return Promise.resolve();
    } catch (e) {
      const stderr = (e.stderr || e.message || '').toString();
      return Promise.reject(new Error(`exit ${e.status ?? e.code ?? '?'}: ${stderr.slice(-400)}`));
    }
  }
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'pipe', 'pipe'], shell: useShell, windowsHide: true });
    let stderr = '';
    proc.stderr?.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`exit ${code}: ${stderr.slice(-400)}`));
    });
    proc.on('error', (e) => reject(e));
  });
}

/**
 * Convert OGG (or other unsupported format) to WAV using ffmpeg.
 * WhatsApp sends Opus-in-OGG. Tries multiple strategies: -f ogg with err_detect, then auto-detect.
 */
async function convertToWav(inputPath, outputPath, inputExt = '') {
  const ffmpegPath = getFfmpegPath();
  const useShell = (ffmpegPath === 'ffmpeg' && process.platform === 'win32');
  const baseOut = ['-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1', outputPath];
  const isOgg = ['ogg', 'opus'].includes((inputExt || '').toLowerCase());

  const strategies = [];
  if (isOgg) {
    strategies.push(
      ['-y', '-err_detect', 'ignore_err', '-probesize', '5M', '-analyzeduration', '5M', '-f', 'ogg', '-i', inputPath, ...baseOut],
      ['-y', '-err_detect', 'ignore_err', '-probesize', '5M', '-analyzeduration', '5M', '-f', 'opus', '-i', inputPath, ...baseOut],
      ['-y', '-err_detect', 'ignore_err', '-probesize', '5M', '-analyzeduration', '5M', '-i', inputPath, ...baseOut],
    );
  } else if ((inputExt || '').toLowerCase() === 'amr') {
    strategies.push(
      ['-y', '-f', 'amr', '-i', inputPath, ...baseOut],
      ['-y', '-i', inputPath, ...baseOut],
    );
  } else {
    strategies.push(['-y', '-i', inputPath, ...baseOut]);
  }

  const norm = (p) => (process.platform === 'win32' ? p.replace(/\\/g, '/') : p);
  let lastErr;
  for (const args of strategies) {
    try {
      const normArgs = args.map((a) => (a === inputPath || a === outputPath ? norm(a) : a));
      console.log(`[voice] ffmpeg try: ${normArgs.slice(0, 8).join(' ')}...`);
      await runFfmpeg(ffmpegPath, normArgs, useShell);
      return outputPath;
    } catch (e) {
      lastErr = e;
      console.error(`[voice] ffmpeg attempt failed:`, e.message?.slice(0, 200));
    }
  }
  console.error(`[voice] ffmpeg all attempts failed. Last stderr:`, lastErr?.message);
  throw new Error(`ffmpeg failed (${lastErr?.message || 'unknown'})`);
}

/**
 * Resample WAV to 16kHz mono (Groq-recommended format). Returns output path or null on failure.
 */
async function resampleWavTo16kMono(srcWavPath, outPath) {
  const ffmpegPath = getFfmpegPath();
  const useShell = (ffmpegPath === 'ffmpeg' && process.platform === 'win32');
  const norm = (p) => (process.platform === 'win32' ? p.replace(/\\/g, '/') : p);
  const args = ['-y', '-i', norm(srcWavPath), '-ar', '16000', '-ac', '1', '-acodec', 'pcm_s16le', norm(outPath)];
  try {
    await runFfmpeg(ffmpegPath, args, useShell);
    return outPath;
  } catch (e) {
    console.warn('[voice] 16kHz resample failed:', e.message?.slice(0, 80));
    return null;
  }
}

/**
 * Convert any audio (WAV/OGG) to MP3 with ffmpeg. Returns output path or null on failure.
 */
async function convertToMp3(inputPath, outPath) {
  const ffmpegPath = getFfmpegPath();
  const useShell = (ffmpegPath === 'ffmpeg' && process.platform === 'win32');
  const norm = (p) => (process.platform === 'win32' ? p.replace(/\\/g, '/') : p);
  const args = ['-y', '-i', norm(inputPath), '-ar', '16000', '-ac', '1', '-acodec', 'libmp3lame', '-q:a', '4', norm(outPath)];
  try {
    await runFfmpeg(ffmpegPath, args, useShell);
    return outPath;
  } catch (e) {
    console.warn('[voice] MP3 conversion failed:', e.message?.slice(0, 80));
    return null;
  }
}

/**
 * Convert OGG/Opus to WAV using prism-media + opusscript (no ffmpeg, no native deps).
 */
async function convertOggToWavWithPrism(oggBuffer, outputPath) {
  const prism = require('prism-media');
  return new Promise((resolve, reject) => {
    const chunks = [];
    const src = Readable.from(oggBuffer);
    const demuxer = new prism.opus.OggDemuxer();
    const decoder = new prism.opus.Decoder({ rate: 48000, channels: 1, frameSize: 960 });
    src.pipe(demuxer).pipe(decoder);
    decoder.on('data', (c) => chunks.push(c));
    decoder.on('error', reject);
    decoder.on('end', () => {
      try {
        const pcm = Buffer.concat(chunks);
        if (pcm.length === 0) return reject(new Error('No PCM decoded'));
        const header = Buffer.alloc(44);
        header.write('RIFF', 0);
        header.writeUInt32LE(36 + pcm.length, 4);
        header.write('WAVE', 8);
        header.write('fmt ', 12);
        header.writeUInt32LE(16, 16);
        header.writeUInt16LE(1, 20);
        header.writeUInt16LE(1, 22);
        header.writeUInt32LE(48000, 24);
        header.writeUInt32LE(96000, 28);
        header.writeUInt16LE(2, 32);
        header.writeUInt16LE(16, 34);
        header.write('data', 36);
        header.writeUInt32LE(pcm.length, 40);
        fs.writeFileSync(outputPath, Buffer.concat([header, pcm]));
        resolve(outputPath);
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Merge multiple decoded chunks into one (for streaming decode).
 */
function mergeChannelData(chunks) {
  if (!chunks.length) return { channelData: [], samplesDecoded: 0, sampleRate: 48000 };
  const numCh = chunks[0].channelData.length;
  const sampleRate = chunks[0].sampleRate;
  const merged = [];
  for (let c = 0; c < numCh; c++) {
    const total = chunks.reduce((s, x) => s + (x.channelData[c]?.length || 0), 0);
    const arr = new Float32Array(total);
    let off = 0;
    for (const ch of chunks) {
      if (ch.channelData[c]) {
        arr.set(ch.channelData[c], off);
        off += ch.channelData[c].length;
      }
    }
    merged.push(arr);
  }
  const samplesDecoded = merged[0]?.length || 0;
  return { channelData: merged, samplesDecoded, sampleRate };
}

/**
 * Convert OGG/Opus to WAV using ogg-opus-decoder (no ffmpeg). Primary for OGG - ffmpeg crashes on this system.
 */
async function convertOggToWavWithDecoder(oggBuffer, outputPath) {
  const data = new Uint8Array(oggBuffer);
  if (data.length < 36 || !(data[0] === 0x4f && data[1] === 0x67 && data[2] === 0x67 && data[3] === 0x53)) {
    console.error(`[voice] Not valid OGG: first bytes ${data.slice(0, 8).join(',')} (expected 79,103,103,83 for OggS)`);
    throw new Error('File is not OGG format. WhatsApp may have sent a different format.');
  }
  const decoder = new OggOpusDecoder({ sampleRate: 48000 });
  await decoder.ready;
  try {
    let result = await decoder.decodeFile(data);
    if (!result.channelData?.length || result.samplesDecoded === 0) {
      await decoder.reset?.();
      const chunks = [];
      for (let i = 0; i < data.length; i += 8192) {
        const chunk = data.slice(i, Math.min(i + 8192, data.length));
        const r = await decoder.decode(chunk);
        if (r.samplesDecoded > 0) chunks.push(r);
      }
      const flush = await decoder.flush();
      if (flush.samplesDecoded > 0) chunks.push(flush);
      result = chunks.length ? mergeChannelData(chunks) : result;
    }
    const { channelData, samplesDecoded, sampleRate } = result;
    if (!channelData?.length || samplesDecoded === 0) {
      console.error(`[voice] Decoder returned empty. channelData len=${channelData?.length}, samplesDecoded=${samplesDecoded}`);
      throw new Error('No audio decoded - file may be corrupted or wrong format.');
    }
    const numChannels = channelData.length;
    const totalSamples = samplesDecoded * numChannels;
    let pcm = Buffer.alloc(totalSamples * 2);
    let offset = 0;
    for (let i = 0; i < samplesDecoded; i++) {
      for (let ch = 0; ch < numChannels; ch++) {
        const s = Math.max(-1, Math.min(1, channelData[ch][i]));
        const v = Math.max(-32768, Math.min(32767, Math.round(s * 32767)));
        pcm.writeInt16LE(v, offset);
        offset += 2;
      }
    }
    // Output 16 kHz mono for maximum API compatibility (48k WAV often rejected)
    let wavRate = sampleRate;
    let wavChannels = numChannels;
    if (sampleRate === 48000) {
      const ratio = 3; // 48000 / 16000
      const outSamples = Math.floor(samplesDecoded / ratio);
      const outPcm = Buffer.alloc(outSamples * 2);
      for (let i = 0; i < outSamples; i++) {
        const srcFrame = i * ratio;
        let sum = 0;
        for (let ch = 0; ch < numChannels; ch++) {
          const pos = (srcFrame * numChannels + ch) * 2;
          if (pos + 2 <= pcm.length) sum += pcm.readInt16LE(pos);
        }
        const v = Math.max(-32768, Math.min(32767, Math.round(sum / numChannels)));
        outPcm.writeInt16LE(v, i * 2);
      }
      pcm = outPcm;
      wavRate = 16000;
      wavChannels = 1;
    }
    const dataSize = pcm.length;
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(36 + dataSize, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(wavChannels, 22);
    header.writeUInt32LE(wavRate, 24);
    header.writeUInt32LE(wavRate * wavChannels * 2, 28);
    header.writeUInt16LE(wavChannels * 2, 32);
    header.writeUInt16LE(16, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);
    fs.writeFileSync(outputPath, Buffer.concat([header, pcm]));
    return outputPath;
  } finally {
    decoder.free();
  }
}

/**
 * Transcribe a voice note from Twilio WhatsApp webhook.
 * @param {string} mediaUrl - Twilio MediaUrl0
 * @param {string} contentType - e.g. "audio/ogg"
 * @param {string} twilioSid - Twilio Account SID (for auth)
 * @param {string} twilioToken - Twilio Auth Token
 * @returns {Promise<string>} Transcribed text
 */
export async function transcribeVoiceNote(mediaUrl, contentType, twilioSid, twilioToken) {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  // Prefer Groq first (accepts our ffmpeg WAV); fall back to OpenAI if Groq rejects
  const useGroq = !!groqKey;
  const apiKey = useGroq ? groqKey : openaiKey;
  const provider = useGroq ? 'groq' : 'openai';
  if (!apiKey) {
    throw new Error('Voice notes require OPENAI_API_KEY or GROQ_API_KEY in .env.backend. Add GROQ_API_KEY (free at console.groq.com) for best results with WhatsApp voice.');
  }
  console.log(`[voice] Using provider: ${provider}${!groqKey ? ' (add GROQ_API_KEY to .env.backend to try Groq first)' : ''}`);

  const ext = (contentType || '').split('/')[1]?.split(';')[0]?.toLowerCase() || 'ogg';
  const supported = WHISPER_SUPPORTED.has(ext);
  const projectTmp = path.join(__dirname, '..', 'tmp', 'voice');
  if (!fs.existsSync(projectTmp)) fs.mkdirSync(projectTmp, { recursive: true });
  const tmpDir = projectTmp;
  const ts = Date.now();
  const inputPath = path.join(tmpDir, `voice-${ts}.${ext}`);
  const wavPath = path.join(tmpDir, `voice-${ts}.wav`);
  const wav16kPath = path.join(tmpDir, `voice-${ts}-16k.wav`);
  const mp3Path = path.join(tmpDir, `voice-${ts}.mp3`);
  let finalPath = supported ? inputPath : wavPath;
  let path16k = null;
  let pathMp3 = null;

  try {
    let buf;
    try {
      buf = await downloadAudio(mediaUrl, twilioSid, twilioToken);
    } catch (dlErr) {
      console.error('[voice] Download failed:', dlErr.message);
      throw new Error(`Twilio media download failed: ${dlErr.message?.slice(0, 60) || 'connection error'}`);
    }
    if (buf.length < 100) {
      throw new Error(`Downloaded file too small (${buf.length} bytes). Twilio media may be expired or inaccessible.`);
    }
    if (ext === 'ogg' && !buf.slice(0, 4).equals(Buffer.from([0x4f, 0x67, 0x67, 0x53]))) {
      console.warn(`[voice] File does not start with OggS magic - may not be valid OGG. Proceeding anyway.`);
    }
    fs.writeFileSync(inputPath, buf);
    const isOgg = buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53;
    const isAmr = buf[0] === 0x23 && buf[1] === 0x21 && buf[2] === 0x41 && buf[3] === 0x4d && buf[4] === 0x52;
    console.log(`[voice] Downloaded ${buf.length} bytes, content-type: ${contentType || 'unknown'}, magic: ${isOgg ? 'OGG' : isAmr ? 'AMR' : 'other'}`);

    if (!supported) {
      const extOgg = ['ogg', 'opus'].includes(ext?.toLowerCase());
      let effectiveExt = ext;
      if (extOgg && isAmr) effectiveExt = 'amr';
      if (extOgg && isOgg) {
        // Try ogg-opus-decoder first (pure JS, no ffmpeg) - avoids Windows spawn/exec crashes
        try {
          await convertOggToWavWithDecoder(buf, wavPath);
        } catch (decoderErr) {
          console.log(`[voice] ogg-opus-decoder failed:`, decoderErr.message?.slice(0, 80));
          try {
            await convertOggToWavWithPrism(buf, wavPath);
          } catch (prismErr) {
            console.log(`[voice] prism-media failed, trying ffmpeg:`, prismErr.message?.slice(0, 80));
            try {
              await convertToWav(inputPath, wavPath, effectiveExt);
            } catch (ffmpegErr) {
              // ffmpeg crashes on some Windows (exit 3753488571) - try sending OGG directly to Whisper
              console.log(`[voice] ffmpeg failed, trying OGG directly to Whisper:`, ffmpegErr.message?.slice(0, 60));
              if (isOgg) {
                finalPath = inputPath;
              } else {
                throw ffmpegErr;
              }
            }
          }
        }
      } else {
        await convertToWav(inputPath, wavPath, effectiveExt);
      }
    }

    // For Groq: convert to WAV then MP3; if ffmpeg fails, skip Groq and use OpenAI with conversion
    if (provider === 'groq' && finalPath === inputPath && buf.length > 0) {
      const groqIn = path.join(tmpDir, `voice-${ts}-groq.ogg`);
      fs.writeFileSync(groqIn, buf);
      try {
        await convertToWav(groqIn, wavPath, 'ogg');
        finalPath = wavPath;
        const mp3Out = await convertToMp3(wavPath, mp3Path);
        if (mp3Out) {
          pathMp3 = mp3Out;
          finalPath = mp3Out;
          console.log(`[voice] Converted to MP3 (ffmpeg) for Groq`);
        } else {
          console.log(`[voice] Converted to WAV (ffmpeg) for Groq`);
        }
      } catch (e) {
        console.warn('[voice] Groq ffmpeg failed:', (e?.message || e).toString().slice(0, 80));
        try {
          await convertToWav(inputPath, wavPath, 'ogg');
          finalPath = wavPath;
          const mp3Out = await convertToMp3(wavPath, mp3Path);
          if (mp3Out) {
            pathMp3 = mp3Out;
            finalPath = mp3Out;
          }
          console.log('[voice] Converted using inputPath for Groq');
        } catch (_) {}
      } finally {
        try { fs.unlinkSync(groqIn); } catch (_) {}
      }
    }
    // For OpenAI + OGG: convert to WAV or MP3 before first send (OpenAI rejects raw WhatsApp OGG)
    if (provider === 'openai' && finalPath === inputPath && isOgg && buf.length > 0) {
      let converted = false;
      try {
        await convertOggToWavWithDecoder(buf, wavPath);
        finalPath = wavPath;
        console.log(`[voice] Converted OGG to WAV (decoder) for OpenAI`);
        converted = true;
      } catch (e) {
        console.warn('[voice] Decoder failed:', (e?.message || e).toString().slice(0, 100));
      }
      if (!converted) {
        try {
          await convertOggToWavWithPrism(buf, wavPath);
          finalPath = wavPath;
          console.log(`[voice] Converted OGG to WAV (prism) for OpenAI`);
          converted = true;
        } catch (e) {
          console.warn('[voice] Prism failed:', (e?.message || e).toString().slice(0, 100));
        }
      }
      if (!converted) {
        try {
          await convertToWav(inputPath, wavPath, 'ogg');
          finalPath = wavPath;
          console.log(`[voice] Converted OGG to WAV (ffmpeg) for OpenAI`);
          converted = true;
        } catch (e) {
          console.warn('[voice] ffmpeg failed:', (e?.message || e).toString().slice(0, 100));
        }
      }
      if (converted && finalPath === wavPath) {
        const mp3Out = await convertToMp3(wavPath, mp3Path);
        if (mp3Out) {
          pathMp3 = mp3Out;
          finalPath = mp3Out;
          console.log(`[voice] Converted WAV to MP3 for OpenAI`);
        }
      }
      if (!converted) {
        throw new Error('Could not convert voice note to WAV/MP3. Check backend console for decoder/prism/ffmpeg errors. Ensure FFMPEG_PATH in .env.backend points to ffmpeg.exe.');
      }
    }
    // For OpenAI: always try ffmpeg from raw download buffer (WhatsApp voice is often OGG; ffmpeg WAV/MP3 is accepted)
    if (provider === 'openai' && buf.length > 0) {
      const tempIn = path.join(tmpDir, `voice-${ts}-in.ogg`);
      fs.writeFileSync(tempIn, buf);
      try {
        await convertToWav(tempIn, wavPath, 'ogg');
        finalPath = wavPath;
        const mp3Out = await convertToMp3(wavPath, mp3Path);
        if (mp3Out) {
          pathMp3 = mp3Out;
          finalPath = mp3Out;
          console.log('[voice] Using ffmpeg MP3 for OpenAI');
        } else {
          console.log('[voice] Using ffmpeg WAV for OpenAI');
        }
      } catch (e) {
        console.warn('[voice] ffmpeg for OpenAI failed:', (e?.message || e).toString().slice(0, 120));
        // Keep existing finalPath (from decoder/prism if any)
      } finally {
        try { fs.unlinkSync(tempIn); } catch (_) {}
      }
    }

    const projectRoot = path.join(__dirname, '..');
    const lastSentPath = path.join(projectRoot, 'last-voice-sent' + path.extname(finalPath));
    try {
      fs.copyFileSync(finalPath, lastSentPath);
      console.log(`[voice] Copied to ${path.basename(lastSentPath)} for debugging`);
    } catch (_) {}

    let text = '';
    const pathToSend = path.resolve(finalPath);
    if (fs.existsSync(pathToSend)) {
      const four = Buffer.alloc(4);
      const fd = fs.openSync(pathToSend, 'r');
      try { fs.readSync(fd, four, 0, 4, 0); } finally { fs.closeSync(fd); }
      const isOggFile = four[0] === 0x4f && four[1] === 0x67 && four[2] === 0x67 && four[3] === 0x53;
      if (isOggFile && provider === 'openai') {
        throw new Error(`Refusing to send OGG to OpenAI. FFMPEG conversion failed. Check FFMPEG_PATH in .env.backend and backend logs.`);
      }
      if (isOggFile && provider === 'groq') {
        throw new Error(`Voice conversion failed. Groq needs WAV/MP3. Check that FFMPEG_PATH in .env.backend points to ffmpeg.exe (e.g. winget install Gyan.FFmpeg). See backend console for ffmpeg errors.`);
      }
    }
    try {
      console.log(`[voice] Sending to ${provider}: ${path.basename(pathToSend)} (${fs.statSync(pathToSend).size} bytes)`);
      text = (await whisperViaHttps(apiKey, pathToSend, provider) || '').trim();
    } catch (httpsErr) {
      const errMsg = (httpsErr?.message || '').toLowerCase();
      const isInvalidFile = errMsg.includes('valid media') || errMsg.includes('format') || errMsg.includes('invalid') || errMsg.includes('unsupported');

      if (!isInvalidFile) throw httpsErr;

      // OpenAI rejected: make a fresh ffmpeg WAV/MP3 from raw buffer and try Groq then OpenAI
      if (provider === 'openai' && buf.length > 0) {
        const retryIn = path.join(tmpDir, `voice-${ts}-retry.ogg`);
        fs.writeFileSync(retryIn, buf);
        try {
          await convertToWav(retryIn, wavPath, 'ogg');
          const retryWav = path.resolve(wavPath);
          const retryMp3 = await convertToMp3(wavPath, mp3Path) ? path.resolve(mp3Path) : null;
          if (groqKey) {
            console.log('[voice] OpenAI rejected, trying Groq with ffmpeg WAV...');
            try {
              text = (await whisperViaHttps(groqKey, retryWav, 'groq') || '').trim();
              if (text) return text || '[No speech detected]';
            } catch (_) {}
          }
          if (retryMp3) {
            console.log('[voice] Trying OpenAI with ffmpeg MP3...');
            try {
              text = (await whisperViaHttps(apiKey, retryMp3, 'openai') || '').trim();
              if (text) return text || '[No speech detected]';
            } catch (_) {}
          }
          console.log('[voice] Trying OpenAI with ffmpeg WAV...');
          try {
            text = (await whisperViaHttps(apiKey, retryWav, 'openai') || '').trim();
            if (text) return text || '[No speech detected]';
          } catch (_) {}
        } catch (e) {
          console.warn('[voice] ffmpeg retry failed:', (e?.message || e).toString().slice(0, 80));
        } finally {
          try { fs.unlinkSync(retryIn); } catch (_) {}
        }
      }

      // Try Groq with same file (in case we didn't have buf for ffmpeg retry)
      if (provider === 'openai' && groqKey && !text) {
        console.log('[voice] Trying Groq with current file...');
        try {
          text = (await whisperViaHttps(groqKey, path.resolve(finalPath), 'groq') || '').trim();
          if (text) return text || '[No speech detected]';
        } catch (_) {}
      }

      // Still failed: convert with decoder/prism and retry
      if (provider === 'openai' && isOgg && buf.length > 0 && !text) {
        console.log(`[voice] Converting to WAV/MP3 and retrying...`);
        try {
          await convertOggToWavWithDecoder(buf, wavPath);
          finalPath = wavPath;
        } catch (d) {
          try {
            await convertOggToWavWithPrism(buf, wavPath);
            finalPath = wavPath;
          } catch (_) {}
        }
        if (finalPath === wavPath) {
          const resampled = await resampleWavTo16kMono(wavPath, wav16kPath);
          if (resampled) {
            path16k = resampled;
            finalPath = resampled;
          } else {
            const mp3Out = await convertToMp3(wavPath, mp3Path);
            if (mp3Out) {
              pathMp3 = mp3Out;
              finalPath = mp3Out;
            }
          }
          try {
            text = (await whisperViaHttps(apiKey, finalPath, 'openai') || '').trim();
            return text || '[No speech detected]';
          } catch (e2) {
            if (groqKey) {
              console.log('[voice] OpenAI still rejected format, trying Groq...');
              try {
                text = (await whisperViaHttps(groqKey, finalPath, 'groq') || '').trim();
                return text || '[No speech detected]';
              } catch (_) {}
            }
            throw httpsErr;
          }
        }
      }

      // Groq rejected: try 16k WAV, then MP3, then OpenAI
      if (provider === 'groq' && finalPath === inputPath && isOgg) {
        console.log(`[voice] Groq rejected OGG, converting to WAV then 16kHz...`);
        try {
          await convertOggToWavWithDecoder(buf, wavPath);
        } catch (d) {
          try {
            await convertOggToWavWithPrism(buf, wavPath);
          } catch (p) {
            if (openaiKey) {
              console.log(`[voice] Retrying with OpenAI Whisper`);
              text = (await whisperViaHttps(openaiKey, finalPath, 'openai') || '').trim();
              return text || '[No speech detected]';
            }
            throw httpsErr;
          }
        }
        let resampled = await resampleWavTo16kMono(wavPath, wav16kPath);
        if (resampled) {
          path16k = resampled;
          finalPath = resampled;
        } else {
          finalPath = wavPath;
        }
        try {
          text = (await whisperViaHttps(apiKey, finalPath, provider) || '').trim();
          return text || '[No speech detected]';
        } catch (e2) {
          if ((e2?.message || '').toLowerCase().includes('valid media') && path16k) {
            console.log(`[voice] Groq rejected WAV, trying MP3...`);
            const mp3Out = await convertToMp3(finalPath, mp3Path);
            if (mp3Out) {
              pathMp3 = mp3Out;
              try {
                text = (await whisperViaHttps(apiKey, mp3Out, provider) || '').trim();
                return text || '[No speech detected]';
              } catch (_) {}
            }
          }
          if (openaiKey) {
            console.log(`[voice] Retrying with OpenAI Whisper`);
            try {
              text = (await whisperViaHttps(openaiKey, finalPath, 'openai') || '').trim();
              return text || '[No speech detected]';
            } catch (_) {}
          }
          throw httpsErr;
        }
      }

      if (isInvalidFile && provider === 'groq' && openaiKey) {
        console.log(`[voice] Groq rejected file, retrying with OpenAI Whisper`);
        try {
          text = (await whisperViaHttps(openaiKey, path.resolve(finalPath), 'openai') || '').trim();
          if (text) return text || '[No speech detected]';
        } catch (_) {}
        if (buf.length > 0) {
          const retryIn = path.join(tmpDir, `voice-${ts}-groq-retry.ogg`);
          fs.writeFileSync(retryIn, buf);
          try {
            await convertToWav(retryIn, wavPath, 'ogg');
            const retryMp3 = await convertToMp3(wavPath, mp3Path);
            const toTry = retryMp3 ? path.resolve(mp3Path) : path.resolve(wavPath);
            console.log('[voice] Trying OpenAI with fresh ffmpeg file...');
            text = (await whisperViaHttps(openaiKey, toTry, 'openai') || '').trim();
            if (text) return text || '[No speech detected]';
          } catch (_) {}
          try { fs.unlinkSync(retryIn); } catch (_) {}
        }
      }
      if (isInvalidFile && finalPath === inputPath && isOgg) {
        console.log(`[voice] API rejected OGG, converting with decoders...`);
        try {
          await convertOggToWavWithDecoder(buf, wavPath);
          finalPath = wavPath;
        } catch (d) {
          try {
            await convertOggToWavWithPrism(buf, wavPath);
            finalPath = wavPath;
          } catch (p) {
            throw httpsErr;
          }
        }
        text = (await whisperViaHttps(apiKey, finalPath, provider) || '').trim();
      } else {
        if (isInvalidFile && !groqKey) {
          throw new Error('Voice file was rejected. Add GROQ_API_KEY to .env.backend (free at console.groq.com) to use Groq for voice transcription.');
        }
        throw httpsErr;
      }
    }
    return text || '[No speech detected]';
  } finally {
    try { fs.unlinkSync(inputPath); } catch (_) {}
    try { if (finalPath !== inputPath && fs.existsSync(finalPath)) fs.unlinkSync(finalPath); } catch (_) {}
    try { if (path16k && fs.existsSync(path16k)) fs.unlinkSync(path16k); } catch (_) {}
    try { if (pathMp3 && fs.existsSync(pathMp3)) fs.unlinkSync(pathMp3); } catch (_) {}
  }
}
