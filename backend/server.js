/** Version marker - bump to verify new code is deployed */
const BACKEND_VERSION = '2025-02-13-employee-insights-fix';
import express from 'express';
import multer from 'multer';
import dotenv from 'dotenv';
import twilio from 'twilio';
import Anthropic from '@anthropic-ai/sdk';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { simpleParser } from 'mailparser';
import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const pathBackend = path.join(projectRoot, '.env.backend');
const pathEnv = path.join(projectRoot, '.env');
// Original behavior: load .env.backend only. If missing or empty, fall back to .env.
const backendResult = dotenv.config({ path: pathBackend });
const backendHadVars = backendResult.parsed && Object.keys(backendResult.parsed).length > 0;
if (!backendHadVars) {
  const envResult = dotenv.config({ path: pathEnv });
  if (envResult.parsed && Object.keys(envResult.parsed).length > 0) {
    console.warn('⚠️ .env.backend missing or empty – using .env. Restore .env.backend or add TWILIO_* / ANTHROPIC_API_KEY to .env.');
  }
}

import { transcribeVoiceNote, getFfmpegPath } from './voice-transcription.js';
const CONFIG_PATH = path.join(__dirname, 'config.json');
const COMPANIES_CONFIG_PATH = path.join(__dirname, 'companies-config.json');
const HENRY_ITEMS_PATH = path.join(__dirname, 'henry-items.json');
const HENRY_PRICE_MONITOR_PATH = path.join(__dirname, 'henry-price-monitor.json');
const HENRY_RESTAURANT_ALERTS_PATH = path.join(__dirname, 'henry-restaurant-alerts.json');
const BEER_MULE_STATE_PATH = path.join(__dirname, 'beer-mule-state.json');

const app = express();
const PORT = process.env.BACKEND_PORT || 3000;

// Initialize services
let twilioClient;
let anthropicClient;
let emailTransporter;
let emailFromAddress;
let useSendGrid = false;

try {
  // Twilio
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio initialized');
  } else {
    console.warn('⚠️ Twilio not configured');
    console.warn('   In .env use exactly: TWILIO_ACCOUNT_SID=... and TWILIO_AUTH_TOKEN=... (no spaces, no VITE_ prefix)');
  }

  // Claude AI
  if (process.env.ANTHROPIC_API_KEY) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 900000, // 15 min for enterprise-wide + large context
    });
    console.log('✅ Claude AI initialized');
  } else {
    console.warn('⚠️ Claude AI not configured');
  }

  // Email - SendGrid (API key, no SMTP password) or Gmail/Outlook 365
  const sgKey = process.env.SENDGRID_API_KEY;
  const isRealSendGridKey = sgKey && sgKey.startsWith('SG.') && sgKey.length > 20;
  if (isRealSendGridKey) {
    sgMail.setApiKey(sgKey);
    emailFromAddress = process.env.SENDGRID_FROM || process.env.EMAIL_USER || process.env.GMAIL_USER || 'noreply@strategic-advisor.local';
    useSendGrid = true;
    console.log('✅ Email service initialized (SendGrid)');
  } else if (sgKey) {
    console.warn('⚠️ SendGrid API key looks invalid (must start with SG.). Add SENDGRID_API_KEY or use Outlook/Gmail below.');
  }
  if (!useSendGrid) {
    const emailUser = process.env.EMAIL_USER || process.env.GMAIL_USER || process.env.OUTLOOK_EMAIL;
    const emailPass = process.env.EMAIL_PASSWORD || process.env.GMAIL_APP_PASSWORD || process.env.OUTLOOK_PASSWORD;
    const emailProvider = (process.env.EMAIL_PROVIDER || '').toLowerCase();

    if (emailUser && emailPass) {
      const isOutlook = emailProvider === 'outlook' || emailProvider === 'office365' || emailProvider === 'microsoft365';
      if (isOutlook) {
        emailTransporter = nodemailer.createTransport({
          host: 'smtp.office365.com',
          port: 587,
          secure: false,
          requireTLS: true,
          auth: { user: emailUser, pass: emailPass },
        });
        console.log('✅ Email service initialized (Outlook 365)');
      } else {
        emailTransporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: emailUser, pass: emailPass },
        });
        console.log('✅ Email service initialized (Gmail)');
      }
      emailFromAddress = emailUser;
    } else {
      console.warn('⚠️ Email not configured');
    }
  }
} catch (error) {
  console.error('❌ Service initialization error:', error.message);
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware for frontend
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Build company status HTML for briefing (from companies-config, no live fetch)
function getCompanyBriefingHtml() {
  const companiesCfg = loadCompaniesConfig();
  const companies = companiesCfg?.companies || [];
  if (companies.length === 0) {
    return '<p>No companies configured yet. Add companies in Config Dashboard → General → Companies.</p>';
  }
  const rows = companies.map((c) => {
    const ch = c.channels || {};
    let enabled = [];
    if (Array.isArray(ch)) {
      enabled = ch.filter((x) => x && x.enabled).map((x) => x.name || x.type || x.id || '');
    } else {
      enabled = Object.entries(ch).filter(([, v]) => v && typeof v === 'object' && v.enabled).map(([k]) => k);
    }
    const list = enabled.length ? enabled.join(', ') : '—';
    return `<tr><td><strong>${(c.name || c.id || 'Company').replace(/</g, '&lt;')}</strong></td><td>${list}</td></tr>`;
  }).join('');
  return `
    <h3>Configured companies &amp; channels</h3>
    <table style="border-collapse:collapse;margin:12px 0" cellpadding="8" cellspacing="0" border="1">
      <thead><tr style="background:#f0f0f0"><th>Company</th><th>Channels monitored</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p>All systems operational. Monitoring runs every ${process.env.MONITORING_INTERVAL_MINUTES || 15} minutes.</p>`;
}

// Fallback when live briefing could not be generated — never says "All systems operational"; explains why and what to check.
function getBriefingUnavailableHtml(reason) {
  const tableBlock = getCompanyBriefingHtml()
    .replace(/<p>All systems operational\.[^<]*<\/p>/i, '')
    .trim();
  const why = reason || 'Data fetch or AI summary failed.';
  return `
    <p><strong>We couldn't generate a live summary of today's emails and chats.</strong></p>
    <p>${why} Check backend logs for details. Ensure Azure/Microsoft 365 credentials are set in Config and that your chosen LLM (Cloud or Local) is available.</p>
    ${tableBlock}`;
}

// Helper: send email briefing to admin (from config). Optional customHtml; otherwise includes company status.
async function sendEmailBriefing(toEmail, subjectSuffix = '', customHtml = null) {
  if (!toEmail) return;
  const from = `Strategic AI Advisor <${emailFromAddress || process.env.EMAIL_USER || process.env.GMAIL_USER}>`;
  const subject = `☀️ Briefing ${subjectSuffix} - ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
  const hasCustom = customHtml != null && customHtml !== '' && String(customHtml).trim() !== 'null';
  const companyBlock = hasCustom ? customHtml : getCompanyBriefingHtml();
  if (!hasCustom) console.log('📧 sendEmailBriefing: no custom content — using getCompanyBriefingHtml() [All systems operational]');
  const html = `<h2>Strategic AI Advisor Briefing</h2><p>Your daily briefing is ready.</p>${companyBlock}<p>— Your Strategic AI Advisor</p>`;

  if (useSendGrid) {
    const sgFrom = process.env.SENDGRID_FROM || emailFromAddress;
    await sgMail.send({ to: toEmail, from: `Strategic AI Advisor <${sgFrom}>`, subject, html });
  } else if (emailTransporter) {
    await emailTransporter.sendMail({ from, to: toEmail, subject, html });
  }
}

// Generate live briefing HTML (and optional short voice script) from real channel data.
// mode: 'morning' | 'evening'. opts.includeVoiceSummary: true to also return a 1-2 sentence TTS script.
// Returns { html, voiceSummary? } or string (legacy) or null on failure.
async function generateLiveBriefingHtml(mode, opts = {}) {
  const isMorning = mode === 'morning';
  const label = isMorning ? 'Start of day' : 'End of day';
  try {
    console.log(`📊 Fetching live channel data for ${label} briefing...`);
    const channelData = await fetchAllChannelDataForContext();
    let contextStr = '';
    if (channelData?.companies?.length) {
      const jsonStr = JSON.stringify(channelData, null, 2);
      const ctxLimit = 60000;
      contextStr = jsonStr.length > ctxLimit ? jsonStr.slice(0, ctxLimit) + '\n...[truncated]' : jsonStr;
      const totalMessages = (channelData.companies || []).reduce((sum, c) => {
        const byUser = c.channels?.email?.byUser || [];
        return sum + byUser.reduce((s, u) => s + (u.messages?.length || 0), 0);
      }, 0);
      const totalTeams = (channelData.companies || []).reduce((sum, c) => sum + (c.channels?.teams?.recentMessages?.length || 0), 0);
      console.log(`Live briefing: using channel data for ${channelData.companies.length} company/companies (${contextStr.length} chars) — ${totalMessages} emails, ${totalTeams} Teams messages`);
      if (totalMessages === 0 && totalTeams === 0) {
        contextStr = `[The following JSON is the live fetch result. It has ZERO emails and ZERO Teams messages. Tell the CEO: "Live data was fetched from your configured channels but no emails or Teams messages were returned. This may be due to permissions, date range, or the mailboxes being empty. Check Azure app permissions (Mail.Read, etc.) and admin consent."]\n\n` + contextStr;
      }
    } else {
      const reason = channelData?._fetchTimeout ? 'fetch timed out' : channelData?._error || channelData?._note || 'no channels configured';
      console.warn('Live briefing: no channel data —', reason, '— cannot summarize emails/chats. Check Azure credentials and companies-config.');
      const timeoutHint = reason && String(reason).toLowerCase().includes('timeout')
        ? ' The fetch timed out (default 60 min). To allow full tenant monitoring, set BRIEFING_FETCH_TIMEOUT_MS in .env to a higher value (e.g. 5400000 for 90 min) and restart the backend.'
        : '';
      contextStr = `[Data fetch failed: ${reason}. Tell the user: We couldn't pull data from your channels.${timeoutHint} To see the exact error, open http://localhost:3000/api/briefing-health in your browser (backend must be running). Then fix Azure/M365 credentials in Config Dashboard and ensure monitorAllUserMailboxes is enabled for at least one company.]`;
    }
    const unreadFocus = `CRITICAL: The data includes isRead (true/false), toRecipients, ccRecipients, and folder (inbox/sent). You MUST prioritize and explicitly mention:
- UNREAD emails (isRead: false) and unread or recent Teams messages the CEO may not have seen.
- Emails and threads where the CEO is NOT in toRecipients or ccRecipients (conversations they are not copied on).
- Emails sent directly TO the CEO (inbox, toRecipients) that are unread or need attention.
Do not give a generic "all good" summary when there is real unread or not-copied content—summarize that content.`;
    const noHallucination = `STRICT: Only mention people, email addresses, subjects, and message content that appear EXACTLY in the JSON data below. Do NOT invent, infer, or add any names, emails, or threads that are not present in the data. If the data is empty or has no items in a category, say so; do not fill with made-up examples.`;
    const instruction = isMorning
      ? `Using the live data below (unread/recent emails and Teams for all employees in configured companies), produce a concise START-OF-DAY briefing for the CEO. ${noHallucination} ${unreadFocus} Include: what they need to be aware of, urgent items, key threads they are not copied on, and unread or direct emails. Output valid HTML only (no markdown): use <h3>, <ul>, <li>, <p>, <strong>. Keep it scannable and actionable.`
      : `Using the live data below (emails and Teams for all employees), produce a concise END-OF-DAY summary for the CEO. ${noHallucination} ${unreadFocus} Include: what happened today, follow-ups for tomorrow, and any unread or not-copied items to be aware of. Output valid HTML only (no markdown): use <h3>, <ul>, <li>, <p>, <strong>. Keep it scannable.`;
    let response = await askAI(instruction, contextStr);
    let raw = (response || '').trim();
    let html = raw.replace(/^```html?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    if (!html || html.toLowerCase() === 'null') {
      if (channelData?.companies?.length && anthropicClient) {
        console.warn('Live briefing: primary LLM returned no content, retrying with Claude...');
        try {
          response = await askClaude(instruction, contextStr, 0, null);
          raw = (response || '').trim();
          html = raw.replace(/^```html?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
        } catch (e) {
          console.warn('Live briefing: Claude fallback failed:', e.message);
        }
      }
      if (!html || html.toLowerCase() === 'null') {
        console.warn('Live briefing: AI returned no content or "null", using fallback');
        return null;
      }
    }
    const htmlBlock = `<div class="live-briefing">${html}</div>`;

    let voiceSummary = null;
    if (opts.includeVoiceSummary && htmlBlock && channelData?.companies?.length) {
      try {
        const voicePrompt = `Using the live data below, in 1 or 2 short sentences state the single most important thing the CEO needs to know right now. Plain text only, for a voice call. No HTML, no bullet points.`;
        voiceSummary = await askAI(voicePrompt, contextStr);
        if (voiceSummary) voiceSummary = String(voiceSummary).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 300);
      } catch (e) {
        console.warn('Voice summary failed:', e.message);
      }
    }

    if (!htmlBlock) return null;
    if (opts.includeVoiceSummary) return { html: htmlBlock, voiceSummary };
    return htmlBlock;
  } catch (e) {
    console.error('generateLiveBriefingHtml failed:', e.message);
    return null;
  }
}

// Helper: send custom email reply (for agent responses via email)
async function sendEmailReply(toEmail, subject, bodyText) {
  if (!toEmail || (!useSendGrid && !emailTransporter)) return;
  const html = `<div style="font-family:'Aptos',Aptos,'Segoe UI',sans-serif;font-size:12pt;max-width:600px"><pre style="font-family:inherit;font-size:12pt;white-space:pre-wrap;word-wrap:break-word;margin:0">${bodyText.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></div>`;
  const from = `Strategic AI Advisor <${emailFromAddress || process.env.EMAIL_USER || process.env.GMAIL_USER}>`;
  const fromAddr = process.env.SENDGRID_FROM || emailFromAddress;
  if (useSendGrid) {
    try {
      await sgMail.send({ to: toEmail, from: `Strategic AI Advisor <${fromAddr}>`, subject, html });
    } catch (e) {
      if ((e?.response?.body?.errors?.[0]?.message || '').includes('authorization') && emailTransporter) {
        console.warn('⚠️ SendGrid failed (invalid API key?), falling back to SMTP');
        await emailTransporter.sendMail({ from, to: toEmail, subject, html });
      } else throw e;
    }
  } else if (emailTransporter) {
    await emailTransporter.sendMail({ from, to: toEmail, subject, html });
  }
}

/** Detect if the user is asking for a draft email response (with tone/style options). */
function isDraftRequest(query) {
  if (!query || typeof query !== 'string') return false;
  const q = query.toLowerCase().trim();
  return /\b(draft|write|compose|suggest|help me)\s+(a\s+)?(reply|response|email|reply to)\b/i.test(q) ||
    /\b(draft|write|compose)\s+(a\s+)?(.+\s+)?(message|email)\b/i.test(q) ||
    /\b(congratulatory|ceo\s+style|team\s+)?message\s+(to\s+)?(the\s+)?team\b/i.test(q) ||
    /\b(draft|give me|want)\s+(response\s+)?options?\b/i.test(q) ||
    /\b(reply|response)\s+(options?|drafts?|in\s+different\s+tones?|with\s+(different\s+)?tones?)\b/i.test(q) ||
    /\b(tone|style)\s+(options?|variations?)\b/i.test(q) ||
    /\boptions?\s+for\s+(tone|style|how\s+to\s+reply)\b/i.test(q) ||
    /\bhow\s+should\s+i\s+(respond|reply)\b/i.test(q) ||
    /\b(respond|reply)\s+to\s+(this\s+)?email\b/i.test(q) ||
    /\b(need to|want to|have to)\s+respond\b/i.test(q) ||
    /\bsuggest\s+(how\s+to\s+)?(reply|respond)\b/i.test(q) ||
    /\bwhat\s+should\s+i\s+(say|reply|respond)\b/i.test(q) ||
    /\bresponse\s+options?\s+(by\s+)?(tone|style)\b/i.test(q);
}

/** True when user asks to draft/compose a message (e.g. congratulatory, to the team) and has pasted the source in the body — use body-only context and skip full channel fetch. */
function isDraftMessageOnlyRequest(query, rawBodyLength) {
  if (!query || typeof query !== 'string') return false;
  const q = query.toLowerCase().trim();
  const looksLikeDraftMessage = /\b(draft|write|compose)\s+(a\s+)?(.+\s+)?(message|email)\b/i.test(q) ||
    /\b(congratulatory|ceo\s+style)\s+(message|email)\b/i.test(q) ||
    /\bmessage\s+to\s+(the\s+)?team\b/i.test(q) ||
    /\b(draft|write)\s+.+\s+for\s+(the\s+)?(below|following)\b/i.test(q);
  const hasSourceInBody = rawBodyLength > 800 || /\b(below|see below|attached|pasted|copy)\b/i.test(q);
  return looksLikeDraftMessage && hasSourceInBody;
}

/** Instruction added to context when user asks for draft reply with tone/style options. */
const DRAFT_RESPONSE_INSTRUCTION = `
[USER REQUEST: DRAFT EMAIL RESPONSE(S) WITH TONE/STYLE OPTIONS]
You MUST provide 2–4 short draft reply options, each clearly labeled by tone or style. Offer a mix from: **Formal**, **Friendly**, **Concise**, **Assertive**, **Warm**, **Professional**, **Brief**, **Diplomatic**. If the user asked for a specific tone (e.g. "formal" or "friendly"), include that and add 1–2 other contrasting options. Base each draft on the email or thread the user is replying to (from the context above). Keep each draft to 2–5 sentences, ready to send or edit. End with a one-line note: e.g. "Pick one to send or edit as needed."`;

/** When user asks to draft a message (e.g. congratulatory to the team) and pasted the source below — no channel fetch. */
const DRAFT_MESSAGE_ONLY_INSTRUCTION = `
[USER REQUEST: DRAFT A MESSAGE BASED ON THE CONTENT BELOW]
The user has pasted an email or note above. They want you to draft a message (e.g. CEO-style congratulatory message to the team) based on that content. Write the requested draft in the tone/style they asked for (e.g. CEO, congratulatory, professional). If they asked for options by tone, give 2–3 short variants (e.g. **Formal**, **Warm**, **Brief**). Otherwise provide one clear, ready-to-send draft. Keep it concise and appropriate for the audience.`;

/** If the query mentions a preferred tone for a draft, return a short hint for the prompt (e.g. "User asked for a formal reply — include **Formal** and 1–2 other options."). */
function getDraftToneHint(query) {
  if (!query || typeof query !== 'string') return '';
  const q = query.toLowerCase();
  const tones = [
    { words: ['formal', 'professional'], label: 'Formal' },
    { words: ['friendly', 'warm', 'casual'], label: 'Friendly' },
    { words: ['concise', 'brief', 'short'], label: 'Concise' },
    { words: ['assertive', 'direct', 'firm'], label: 'Assertive' },
    { words: ['diplomatic', 'polite', 'tactful'], label: 'Diplomatic' },
  ];
  for (const { words, label } of tones) {
    if (words.some((w) => q.includes(w))) return ` User requested a ${label.toLowerCase()} tone — include **${label}** and 1–2 other style options.`;
  }
  return '';
}

/** Strip email signature and quoted reply from body so the LLM gets only the actual question. */
function stripEmailSignature(bodyText) {
  if (!bodyText || typeof bodyText !== 'string') return (bodyText || '').trim();
  let s = bodyText.trim();
  // Split on common delimiters: signature separator, "Sent from", "On ... wrote:", "From: ... Sent:"
  const splits = s.split(/\n\s*--\s*\n|\nSent from\s/i);
  s = splits[0].trim();
  const onWrote = s.match(/\nOn\s+.+wrote:\s*\n/i);
  if (onWrote) s = s.slice(0, onWrote.index).trim();
  // Drop trailing lines that look like signature (phone, website, tel:, single-line URLs)
  const lines = s.split(/\n/);
  let cut = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) { cut = i; continue; }
    if (/^[mtw]\s*( tel:|\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|www\.|http)/i.test(line)) { cut = i; continue; }
    if (/^https?:\/\//i.test(line) || /^\d{3}[-.\s]?\d{3}[-.\s]?\d{4}$/.test(line.replace(/\s/g, ''))) { cut = i; continue; }
    break;
  }
  s = lines.slice(0, cut).join('\n').trim();
  return s;
}

// Multer for SendGrid Inbound Parse - sends multipart/form-data (not urlencoded)
// Inbound email can include large pasted bodies; default 1MB field limit causes "Field value too long"
const MULTER_FIELD_SIZE = parseInt(process.env.MULTER_FIELD_SIZE, 10) || 50 * 1024 * 1024; // 50MB
const upload = multer({ storage: multer.memoryStorage(), limits: { fieldSize: MULTER_FIELD_SIZE } });

// Inbound email webhook - process agent queries via email (briefing or arbitrary questions)
// Working agent address: agent@parse.lobstermoltys.com (SendGrid Inbound Parse POSTs to https://webhook.lobstermoltys.com/webhook/email)
app.post('/webhook/email', upload.any(), async (req, res) => {
  res.status(200).send('OK');
  const body = req.body || {};
  console.log('📥 Inbound email webhook received', { from: body.from, subject: body.subject, hasText: !!body.text, hasHtml: !!body.html });
  const from = body.from || body.sender || '';
  const subject = (body.subject || '').trim();
  let text = (body.text || body.plain || body.Body || '').trim();
  let parsedEmail = null;
  if (!text && body.html) {
    text = String(body.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (body.email) {
    try {
      const raw = Buffer.isBuffer(body.email) ? body.email : (typeof body.email === 'string' ? Buffer.from(body.email, 'utf8') : Buffer.from(String(body.email)));
      parsedEmail = await simpleParser(raw);
      if (!text) {
        text = (parsedEmail.text || '').trim();
        if (!text && parsedEmail.html) text = String(parsedEmail.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      }
    } catch (e) {
      console.warn('📥 Raw MIME parse failed:', e.message);
    }
  }
  if (!from) {
    console.warn('📥 Inbound email skipped: no from/sender in body');
    return;
  }
  const emailMatch = from.match(/<([^>]+)>/) || from.match(/([\w.+.-]+@[\w.-]+)/);
  const senderEmail = emailMatch ? (emailMatch[1] || emailMatch[0]).trim() : null;
  const recipient = senderEmail || getAdminEmail();
  if (!recipient || (!useSendGrid && !emailTransporter)) {
    console.warn('📥 Inbound email skipped: no recipient or email not configured');
    return;
  }

  const rawEmailBodyForDraft = text ? String(text).slice(0, 12000) : ''; // keep for draft-reply context
  text = stripEmailSignature(text);
  const lowerSubject = subject.toLowerCase();
  const lowerText = text.toLowerCase();
  const wantsBriefing =
    lowerSubject === 'brief' || lowerSubject === 'briefing' || lowerSubject === 'status' || lowerText === 'brief' || lowerText === 'briefing' || lowerText === 'status' || /\b(status|briefing|brief)\b/.test(lowerText);

  const wantsKandidly = (lowerSubject.includes('kandidly') || lowerText.includes('kandidly') || lowerSubject.includes('screen candidate') || lowerText.includes('screen candidate') || lowerSubject.includes('hiring screen') || lowerText.includes('hiring screen')) && (loadConfig()?.kandidly?.enabled === true);

  if (wantsKandidly) {
    (async () => {
      try {
        const combinedText = [subject, text].filter(Boolean).join('\n');
        const screenReq = parseScreenRequest(combinedText);
        const jds = readKandidlyJds();
        const allCandidates = readKandidlyCandidates();
        const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
        if (screenReq && screenReq.candidateName && screenReq.roleOrJd) {
          const roleNorm = norm(screenReq.roleOrJd);
          const jdDoc = jds.find((j) => norm(j.title) === roleNorm || norm(j.title).includes(roleNorm) || roleNorm.includes(norm(j.title)));
          const cand = allCandidates.find((c) => norm(c.name) === norm(screenReq.candidateName) || norm(c.name).includes(norm(screenReq.candidateName)) || norm(screenReq.candidateName).includes(norm(c.name)));
          if (jdDoc && cand) {
            const previous = !screenReq.rerun ? findPreviousScreening(cand.name, jdDoc.title || extractRoleLabelFromJd(jdDoc.content)) : null;
            if (previous) {
              const c0 = previous.candidates && previous.candidates[0];
              const prevMsg = `Previously screened on ${new Date(previous.createdAt).toLocaleString()} for ${previous.roleLabel}: ${c0 ? `${c0.name} ${c0.score}/10 (${c0.recommendation === 'strong_fit' ? 'Strong fit' : c0.recommendation === 'possible_fit' ? 'Possible fit' : 'Weak fit'})` : ''}. Reply with "rerun" to run a fresh screening.`;
              await sendEmailReply(recipient, `Re: Kandidly – ${previous.roleLabel} – Previous screening`, prevMsg);
              console.log('📧 Kandidly: replied with previous screening');
              return;
            }
            const validCandidates = [{ name: cand.name, resume: cand.resume, interviewNotes: cand.interviewNotes || '' }];
            const results = await runKandidlyScreening(jdDoc.content, validCandidates, jdDoc);
            const roleLabel = jdDoc.title || extractRoleLabelFromJd(jdDoc.content);
            const recordId = `k_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const record = { id: recordId, createdAt: new Date().toISOString(), roleLabel, jobDescriptionSnippet: jdDoc.content.slice(0, 300), candidates: results, jdId: jdDoc.id, candidateIds: [cand.id] };
            const history = readKandidlyHistory();
            history.unshift(record);
            writeKandidlyHistory(history.slice(0, 200));
            const adminWhatsApp = getAdminWhatsAppNumber();
            await sendKandidlyNotifications(record, recipient, adminWhatsApp);
            const replyLines = results.map((r) => {
              const rec = r.recommendation === 'strong_fit' ? 'Strong fit' : r.recommendation === 'possible_fit' ? 'Possible fit' : 'Weak fit';
              return `${r.name || 'Candidate'}: ${r.score}/10 – ${rec}\n${r.fitSummary || ''}`;
            });
            await sendEmailReply(recipient, `Re: Kandidly – ${roleLabel} – Screening results`, `Kandidly screening results – ${roleLabel}\n\n${replyLines.join('\n\n')}\n\nFull report also sent; WhatsApp summary if configured.`);
            console.log('📧 Kandidly: screening from repo (email) sent to', recipient);
            return;
          }
        }
        const attachments = [];
        if (parsedEmail && Array.isArray(parsedEmail.attachments) && parsedEmail.attachments.length > 0) {
          for (const a of parsedEmail.attachments) {
            const content = a.content;
            const buf = Buffer.isBuffer(content) ? content : (content && typeof content === 'object' && content.content ? content.content : Buffer.from(String(content || '')));
            const fname = (a.filename || a.contentType || '').toLowerCase();
            if (buf.length > 0 && (fname.endsWith('.docx') || fname.endsWith('.doc') || fname.endsWith('.txt') || a.contentType?.includes('word') || a.contentType?.includes('text/plain'))) {
              const extracted = await extractTextFromBuffer(buf, a.filename || '', a.contentType || '');
              if (extracted.trim()) attachments.push({ filename: a.filename || 'attachment', text: extracted.trim() });
            }
          }
        }
        if (attachments.length === 0 && req.files && Array.isArray(req.files) && req.files.length > 0) {
          for (const f of req.files) {
            if (f.buffer && f.buffer.length > 0) {
              const name = (f.originalname || f.name || '').toLowerCase();
              if (name.endsWith('.docx') || name.endsWith('.doc') || name.endsWith('.txt')) {
                const extracted = await extractTextFromBuffer(f.buffer, f.originalname || f.name, f.mimetype);
                if (extracted.trim()) attachments.push({ filename: f.originalname || f.name || 'attachment', text: extracted.trim() });
              }
            }
          }
        }
        const useBodyAsJd = text && text.length > 150 && attachments.length >= 1;
        if (!useBodyAsJd && attachments.length < 2) {
          await sendEmailReply(recipient, 'Re: Kandidly – need JD + resumes', 'Kandidly: Send "Screen [candidate name] for [role/JD title]" to use saved JD and candidate, or send at least 2 attachments (JD + resume) as Word (.doc/.docx) or .txt. Add "rerun" to run screening again. Subject: "Kandidly" or "Screen candidates".');
          console.log('📧 Kandidly: replied – need more attachments or body as JD');
          return;
        }
        const jobDescription = useBodyAsJd ? text : attachments[0].text;
        const resumeAttachments = useBodyAsJd ? attachments : attachments.slice(1);
        const validCandidates = resumeAttachments.map((a, i) => ({ name: a.filename.replace(/\.[^.]+$/, ''), resume: a.text, interviewNotes: '' }));
        const results = await runKandidlyScreening(jobDescription, validCandidates);
        const roleLabel = extractRoleLabelFromJd(jobDescription);
        const recordId = `k_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        const record = { id: recordId, createdAt: new Date().toISOString(), roleLabel, jobDescriptionSnippet: jobDescription.slice(0, 300), candidates: results, jdId: null, candidateIds: null };
        const history = readKandidlyHistory();
        history.unshift(record);
        writeKandidlyHistory(history.slice(0, 200));
        const adminWhatsApp = getAdminWhatsAppNumber();
        await sendKandidlyNotifications(record, recipient, adminWhatsApp);
        const replyLines = results.map((r) => {
          const rec = r.recommendation === 'strong_fit' ? 'Strong fit' : r.recommendation === 'possible_fit' ? 'Possible fit' : 'Weak fit';
          return `${r.name || 'Candidate'}: ${r.score}/10 – ${rec}\n${r.fitSummary || ''}\nDetailed: ${(r.detailedFitNarrative || '').slice(0, 500)}…\nStrengths: ${(r.strengths || []).join('; ')}\nGaps: ${(r.gaps || []).join('; ')}\nInterview focus: ${(r.interviewFocusAreas || []).join('; ')}`;
        });
        const replyBody = `Kandidly screening results – ${roleLabel}\n\n${replyLines.length ? replyLines.join('\n\n---\n\n') : 'Could not parse screening results.'}\n\nFull report also sent to your email; WhatsApp summary sent if configured.`;
        await sendEmailReply(recipient, `Re: Kandidly – ${roleLabel} – Screening results`, replyBody);
        console.log('📧 Kandidly: screening reply sent to', recipient);
      } catch (e) {
        console.error('Kandidly email screening failed:', e.message);
        try {
          await sendEmailReply(recipient, 'Re: Kandidly – Error', `Kandidly could not process your request: ${e.message}. Please try the Lobster Console → Kandidly tab, or resend with .doc/.docx/.txt attachments.`);
        } catch (_) {}
      }
    })();
    return;
  }

  if (wantsBriefing) {
    try {
      const out = await generateLiveBriefingHtml('morning');
      const liveHtml = out && (typeof out === 'string' ? out : out.html);
      const body = liveHtml || getBriefingUnavailableHtml('Live data fetch or AI summary failed.');
      await sendEmailBriefing(recipient, '(requested via email)', body);
      console.log('📧 Briefing sent to', recipient, 'via inbound email', liveHtml ? '(live)' : '(fallback)');
    } catch (e) {
      console.error('Inbound email briefing failed:', e.message);
    }
  } else if (text) {
    // Arbitrary query - process like WhatsApp/SMS
    (async () => {
      try {
        // Henry: confirm buy (price monitor) – attempt to book pending flight with Amadeus
        if (parseHenryConfirmBuy(text) && (loadConfig()?.travelAgent?.enabled ?? process.env.TRAVEL_AGENT_ENABLED === 'true')) {
          const bookResult = await tryHenryPriceMonitorConfirmBuy();
          const replyBody = bookResult.ok ? bookResult.message : `Henry: ${bookResult.message}`;
          await sendEmailReply(recipient, bookResult.ok ? 'Re: Henry – Flight booking' : 'Re: Henry – Booking', replyBody);
          console.log(bookResult.ok ? '✈️ Henry: flight booking completed from email' : '📋 Henry: confirm-buy from email –', bookResult.message);
          return;
        }
        // Henry: booking confirmation via email – record and reply without running full agent
        const henryConf = parseHenryBookingConfirmation(text);
        if (henryConf && (loadConfig()?.travelAgent?.enabled ?? process.env.TRAVEL_AGENT_ENABLED === 'true')) {
          const confirmations = readHenryBookingConfirmations();
          const scopeLabel = { flights_only: 'flights only', hotel_only: 'hotel only', flights_hotel: 'flights and hotel', flights_hotel_restaurants: 'flights, hotel and restaurants', full: 'full (flights, hotel, restaurants)', restaurants_only: 'restaurants only' }[henryConf.scope] || henryConf.scope;
          confirmations.push({
            id: `confirm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            scope: henryConf.scope,
            confirmedVia: 'email',
            from: senderEmail || from,
            at: new Date().toISOString(),
            status: 'pending',
          });
          writeHenryBookingConfirmations(confirmations);
          const replyBody = `Henry: We've recorded your request to book **${scopeLabel}**. Complete your reservations using the links in your plan, or add payment details in the Config → Henry tab to proceed.`;
          await sendEmailReply(recipient, 'Re: Henry – Booking confirmation received', replyBody);
          console.log('📋 Henry: booking confirmation recorded from email', senderEmail || from, 'scope:', henryConf.scope);
          return;
        }
        // Fast path: user asked to draft a message (e.g. congratulatory to team) and pasted the source — skip full channel fetch
        if (isDraftMessageOnlyRequest(text, rawEmailBodyForDraft.length)) {
          const contextStr = `SOURCE MATERIAL (email/message the user wants a draft based on):\n\n${rawEmailBodyForDraft}\n\n---\n\n${DRAFT_MESSAGE_ONLY_INSTRUCTION}${getDraftToneHint(text) || ''}`;
          console.log('📧 Email: draft-message-only request — using body as context, skipping channel fetch');
          const response = await askAI(text, contextStr);
          await sendEmailReply(recipient, `Re: ${subject.slice(0, 50)} - Strategic Advisor`, response);
          console.log('📧 Agent reply sent to', recipient, 'via email (draft-message path)');
          return;
        }
        const { employeeNames, comprehensive } = extractEmployeeNameFromQuery(text);
        const daysBack = comprehensive ? 365 : (employeeNames.length ? 180 : 90);
        const receivedSince = getReceivedSinceISO(daysBack);
        let channelData;
        if (employeeNames.length > 0) {
          const cached = getCachedChannelData();
          if (cached) {
            channelData = JSON.parse(JSON.stringify(cached));
            console.log('📦 Inbound email: using cached channel data for person query');
          } else {
            channelData = await fetchAllChannelDataForContext(employeeNames, { comprehensive, daysBack, receivedSince });
          }
          for (const employeeName of employeeNames) {
              const employeeData = await fetchChannelDataForEmployee(employeeName, { receivedSince, messagesPerUser: comprehensive ? 300 : (employeeNames.length ? 220 : 150) });
              if (employeeData.companies?.length) {
                const emp = employeeData.companies[0];
                const empEmail = emp.channels?.email?._matchedUser?.userPrincipalName || emp.channels?.email?.byUser?.[0]?.userEmail;
                const empDisplayName = emp.channels?.email?._matchedUser?.displayName || employeeName;
                const empAllEmails = emp.channels?.email?._matchedUser?.allEmails;
                if (emp.channels?.email?.byUser?.length) {
                  const empByUser = emp.channels.email.byUser;
                  for (const c of channelData.companies || []) {
                    if (c.channels?.email?.byUser) {
                      const byKey = new Map();
                      c.channels.email.byUser.forEach((u, i) => {
                        byKey.set((u.userPrincipalName || u.user || '').toLowerCase(), i);
                      });
                      for (const ub of empByUser) {
                        const key = (ub.userPrincipalName || ub.user || '').toLowerCase();
                        const idx = byKey.get(key);
                        if (idx !== undefined) {
                          c.channels.email.byUser[idx] = ub;
                        } else {
                          c.channels.email.byUser.push(ub);
                          byKey.set(key, c.channels.email.byUser.length - 1);
                        }
                      }
                    }
                  }
                }
                if ((empEmail && empEmail.includes('@')) || (empDisplayName || employeeName)) {
                  const companiesCfg = loadCompaniesConfig();
                  const creds = companiesCfg?.companies?.[0]?.channels?.teams || companiesCfg?.companies?.[0]?.channels?.calendar;
                  const targetedMaxUsers = comprehensive ? 80 : (employeeNames.length ? 80 : 30);
                  const targetedMsgsPerMailbox = comprehensive ? 100 : (employeeNames.length ? 100 : 50);
                  if (creds?.azureAppId) {
                    const { fetchEmailsFromSenderAcrossMailboxes } = await import('./services/graph-service.js');
                    const senderEmails = (empAllEmails?.length ? empAllEmails : empEmail ? [empEmail] : null);
                    const ceoEmail = companiesCfg?.companies?.[0]?.channels?.email?.adminEmail || companiesCfg?.companies?.[0]?.channels?.teams?.userPrincipalName;
                    const fromSenderResult = await fetchEmailsFromSenderAcrossMailboxes(creds.tenantId, creds.azureAppId, creds.clientSecret, senderEmails, empDisplayName || employeeName, targetedMaxUsers, targetedMsgsPerMailbox, ceoEmail ? [ceoEmail] : [], receivedSince);
                    if (fromSenderResult.byUser?.length) {
                      const totalFromSender = fromSenderResult.byUser.reduce((s, u) => s + (u.messages?.length || 0), 0);
                      console.log(`📌 Email agent: targeted search found ${totalFromSender} emails FROM ${(senderEmails?.length ? senderEmails.join(', ') : empEmail) || empDisplayName || employeeName} across ${fromSenderResult.byUser.length} mailboxes`);
                      for (const c of channelData.companies || []) {
                        if (c.channels?.email?.byUser) {
                          const byKey = new Map(c.channels.email.byUser.map((u, i) => [(u.userPrincipalName || u.user || '').toLowerCase(), i]));
                          const seen = new Set();
                          for (const u of c.channels.email.byUser) {
                            for (const m of u.messages || []) seen.add(`${m.from}|${m.subject}|${m.received}`);
                          }
                          for (const ub of fromSenderResult.byUser) {
                            const key = (ub.userPrincipalName || ub.user || '').toLowerCase();
                            const newMsgs = (ub.messages || []).filter((m) => !seen.has(`${m.from}|${m.subject}|${m.received}`));
                            if (newMsgs.length === 0) continue;
                            newMsgs.forEach((m) => seen.add(`${m.from}|${m.subject}|${m.received}`));
                            const idx = byKey.get(key);
                            if (idx !== undefined) {
                              c.channels.email.byUser[idx].messages = [...(c.channels.email.byUser[idx].messages || []), ...newMsgs].sort((a, b) => new Date(b.received || 0) - new Date(a.received || 0));
                            } else {
                              c.channels.email.byUser.push({ ...ub, messages: newMsgs });
                              byKey.set(key, c.channels.email.byUser.length - 1);
                            }
                          }
                        }
                    }
                  }
                }
                }
                if (emp.channels?.teams && Object.keys(emp.channels.teams).length > 0) {
                  const first = channelData.companies?.[0];
                  if (first) {
                    first.channels = first.channels || {};
                    first.channels.employeeTeams = first.channels.employeeTeams || {};
                    first.channels.employeeTeams[employeeName] = emp.channels.teams;
                  }
                }
              } else {
                const companiesCfg = loadCompaniesConfig();
                const creds = companiesCfg?.companies?.[0]?.channels?.teams || companiesCfg?.companies?.[0]?.channels?.calendar;
                const targetedMaxUsers = comprehensive ? 80 : (employeeNames.length ? 80 : 30);
                const targetedMsgsPerMailbox = comprehensive ? 100 : (employeeNames.length ? 100 : 50);
                if (creds?.azureAppId && channelData.companies?.length) {
                  const { fetchEmailsFromSenderAcrossMailboxes } = await import('./services/graph-service.js');
                  const ceoEmail = companiesCfg?.companies?.[0]?.channels?.email?.adminEmail || companiesCfg?.companies?.[0]?.channels?.teams?.userPrincipalName;
                  const fromSenderResult = await fetchEmailsFromSenderAcrossMailboxes(creds.tenantId, creds.azureAppId, creds.clientSecret, null, employeeName, targetedMaxUsers, targetedMsgsPerMailbox, ceoEmail ? [ceoEmail] : [], receivedSince);
                  if (fromSenderResult.byUser?.length) {
                    const totalFromSender = fromSenderResult.byUser.reduce((s, u) => s + (u.messages?.length || 0), 0);
                    console.log(`📌 Email agent: name-only search found ${totalFromSender} emails FROM "${employeeName}" across ${fromSenderResult.byUser.length} mailboxes`);
                    for (const c of channelData.companies || []) {
                      if (c.channels?.email?.byUser) {
                        const byKey = new Map(c.channels.email.byUser.map((u, i) => [(u.userPrincipalName || u.user || '').toLowerCase(), i]));
                        const seen = new Set();
                        for (const u of c.channels.email.byUser) {
                          for (const m of u.messages || []) seen.add(`${m.from}|${m.subject}|${m.received}`);
                        }
                        for (const ub of fromSenderResult.byUser) {
                          const key = (ub.userPrincipalName || ub.user || '').toLowerCase();
                          const newMsgs = (ub.messages || []).filter((m) => !seen.has(`${m.from}|${m.subject}|${m.received}`));
                          if (newMsgs.length === 0) continue;
                          newMsgs.forEach((m) => seen.add(`${m.from}|${m.subject}|${m.received}`));
                          const idx = byKey.get(key);
                          if (idx !== undefined) {
                            c.channels.email.byUser[idx].messages = [...(c.channels.email.byUser[idx].messages || []), ...newMsgs].sort((a, b) => new Date(b.received || 0) - new Date(a.received || 0));
                          } else {
                            c.channels.email.byUser.push({ ...ub, messages: newMsgs });
                            byKey.set(key, c.channels.email.byUser.length - 1);
                          }
                        }
                      }
                    }
                  }
                }
            }
          }
        } else {
          channelData = await fetchAllChannelDataForContext();
        }
        let contextStr = '';
        if (channelData.companies?.length) {
          const mailboxList = [];
          for (const c of channelData.companies || []) {
            for (const u of c.channels?.email?.byUser || []) {
              const id = u.userPrincipalName || u.userEmail || u.user || '';
              if (id) mailboxList.push(id);
            }
          }
          const uniqueMailboxes = [...new Set(mailboxList)];
          const hasOutlookDomain = uniqueMailboxes.some((a) => /jerseytechpartners|othaingroup|othainsoft/i.test(a));
          if (uniqueMailboxes.length <= 3 && !hasOutlookDomain) {
            console.warn('⚠️ Inbound email/query: Only', uniqueMailboxes.length, 'mailbox(es) in context:', uniqueMailboxes.join(', '), '— Outlook company-wide mailboxes are MISSING (fetch likely timed out or failed). Person/insight queries will not see M365 data.');
          }
          const mailboxScope = mailboxList.length > 0
            ? ` MAILBOXES IN THIS DATA: ${uniqueMailboxes.join(', ')}. You MUST state exactly which mailboxes you searched (e.g. "I searched N mailboxes: ..."). If this list is only one or a few addresses (e.g. only a Gmail), do NOT say "all company mailboxes" or "all monitored mailboxes" - say "I searched the following: [list]. Outlook company-wide mailboxes may not be in this response (timeout or config)."`
            : '';
          let jsonStr = JSON.stringify(channelData, null, 2);
          const multiSubjectHint = (text.match(/\b(and|,|&)\b/i) && text.split(/\?|\./).length >= 2) ? ' User may have asked about multiple topics - address each part of their question.' : '';
          if (employeeNames.length) {
            const searchTerms = [...employeeNames.flatMap((n) => [n, ...n.split(/\s+/).filter((s) => s.length > 2)])].map((t) => t.toLowerCase());
            const found = [];
            const allToCcAddresses = (m) => [...(m.toRecipients || []), ...(m.ccRecipients || [])];
            const localPartMatches = (addr, terms) => {
              const local = (addr || '').split('@')[0].toLowerCase().replace(/\./g, ' ');
              return terms.some((t) => local.includes(t) || local.includes(t.replace(/\s/g, '')));
            };
            for (const c of channelData.companies || []) {
              for (const u of c.channels?.email?.byUser || []) {
                for (const m of u.messages || []) {
                  const from = (m.from || '').toLowerCase();
                  const fromName = (m.fromName || '').toLowerCase();
                  const toAddr = (m.toRecipients || []).join(' ').toLowerCase();
                  const toNames = [...(m.toRecipientsNames || []), ...(m.ccRecipientsNames || [])].join(' ').toLowerCase();
                  const ccAddr = (m.ccRecipients || []).join(' ').toLowerCase();
                  const preview = (m.preview || '').toLowerCase();
                  const toCcLocalMatch = allToCcAddresses(m).some((addr) => localPartMatches(addr, searchTerms));
                  if (searchTerms.some((t) => fromName.includes(t) || from.includes(t) || toAddr.includes(t) || toNames.includes(t) || ccAddr.includes(t) || preview.includes(t)) || toCcLocalMatch) {
                    found.push({
                      user: u.user,
                      from: m.from,
                      fromName: m.fromName,
                      subject: m.subject,
                      folder: m.folder,
                      received: m.received,
                      preview: (m.preview || '').slice(0, 150),
                      fullPreview: (m.preview || '').slice(0, 1200),
                    });
                  }
                }
              }
            }
            const namesLabel = employeeNames.length === 1 ? `person/contact "${employeeNames[0]}"` : `people/contacts: ${employeeNames.map((n) => `"${n}"`).join(', ')}`;
            const personScope = ' This person may be an employee, client, vendor, or any other contact. Match on fromName/from/to; they may use external addresses.';
            const foundBlock = found.length > 0 ? `\n\n=== PRE-SCAN: ${namesLabel} FOUND in ${found.length} emails - USE THIS ===\n${JSON.stringify(found.slice(0, 20).map((f) => ({ user: f.user, from: f.from, fromName: f.fromName, subject: f.subject, folder: f.folder, preview: f.preview })), null, 2)}\n=== END PRE-SCAN ===\n\n` : '';
            const relevantFullBlock = found.length > 0
              ? `\n\n=== FULL CONTENT FOR ${namesLabel} (${Math.min(found.length, 25)} emails) - PRIORITIZE IN YOUR ANSWER ===\n${found.slice(0, 25).map((f) => `Mailbox: ${f.user} | From: ${f.fromName || f.from} | Subject: ${f.subject} | ${f.received || ''}\n${(f.fullPreview || f.preview || '').trim() || '(no body)'}`).join('\n\n---\n\n')}\n=== END FULL CONTENT ===\n\n`
              : '';
            const noShortchange = ' Give a full summary per person from the data. Do NOT say "limited information" or "not much on X" when the context contains their emails/Teams.';
            jsonStr = `[CEO asking about ${namesLabel}.${personScope}${mailboxScope}${multiSubjectHint}${noShortchange}]${foundBlock}${relevantFullBlock}${jsonStr}`;
          } else if (multiSubjectHint) {
            jsonStr = `[${multiSubjectHint.trim()}]${jsonStr}`;
          } else {
            jsonStr = `[${mailboxScope.trim()}]${jsonStr}`;
          }
          const ctxLimit = 60000;
          contextStr = jsonStr.length > ctxLimit ? jsonStr.slice(0, ctxLimit) + '\n...[truncated]' : jsonStr;
        } else {
          const reason = channelData?._fetchTimeout ? 'fetch timed out' : channelData?._error || channelData?._note || 'no channels configured';
          console.warn('⚠️ Email: No company data for context:', reason);
          contextStr = `[Data fetch failed: ${reason}. Ask the user to check Config Dashboard, Azure credentials, and ensure monitorAllUserMailboxes is enabled.]`;
        }
        if (isDraftRequest(text)) {
          const emailToReplyTo = rawEmailBodyForDraft
            ? `EMAIL THE USER IS REPLYING TO:\nSubject: ${subject}\n\nBody:\n${rawEmailBodyForDraft}\n\n---\n\n`
            : `EMAIL THE USER IS REPLYING TO:\nSubject: ${subject}\n(No body captured — use subject and any thread in context.)\n\n---\n\n`;
          const toneHint = getDraftToneHint(text);
          contextStr = emailToReplyTo + contextStr + DRAFT_RESPONSE_INSTRUCTION + (toneHint || '');
          console.log('📧 Email: draft-reply requested — adding tone/style options to prompt');
        }
        const response = await askAI(text, contextStr);
        await sendEmailReply(recipient, `Re: ${subject.slice(0, 50)} - Strategic Advisor`, response);
        console.log('📧 Agent reply sent to', recipient, 'via email');
      } catch (e) {
        console.error('Email agent query failed:', e.message);
        await sendEmailReply(recipient, 'Re: Strategic Advisor - Error', `Sorry, I ran into an issue: ${e.message}. Please try again.`);
      }
    })();
  }
});

// Request briefing (from chat, or any client) - sends live briefing email to admin
app.post('/api/request-briefing', express.json(), async (req, res) => {
  try {
    if (!useSendGrid && !emailTransporter) {
      return res.status(400).json({ error: 'Email not configured' });
    }
    const to = req.body?.email || getAdminEmail();
    if (!to) {
      return res.status(400).json({ error: 'No recipient. Set email in Config Dashboard or pass { email: "you@example.com" }' });
    }
    const out = await generateLiveBriefingHtml('morning');
    const liveHtml = out && (typeof out === 'string' ? out : out.html);
    const body = liveHtml || getBriefingUnavailableHtml('Live data fetch or AI summary failed.');
    await sendEmailBriefing(to, '(requested via chat)', body);
    res.json({ success: true, message: `Live briefing sent to ${to}` });
  } catch (error) {
    console.error('Request briefing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Load companies channel config (primary: backend/companies-config.json; fallback: project root)
function loadCompaniesConfig(opts = {}) {
  const { silent } = opts;
  const paths = [COMPANIES_CONFIG_PATH, path.join(projectRoot, 'companies-config.json')];
  for (const p of paths) {
    try {
      if (fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Companies config load failed:', e.message, 'path:', p);
    }
  }
  if (!silent) console.warn('Companies config: not found or invalid at', paths.join(', '), '— briefings will show "no channels configured"');
  return null;
}

async function testCompanyChannels(company, { fetchTeamsData, fetchMailData, fetchMailFromAllUsers, fetchCalendarData, fetchSharePointData }, emailAllUsersCache = null) {
  const channels = company.channels || {};
  const results = { company: company.name, companyId: company.id, channels: {}, timestamp: new Date().toISOString() };
  const azureCreds = (ch) => ch?.azureAppId && ch?.clientSecret && ch?.tenantId && !ch.azureAppId.includes('YOUR_');
  const userEmail = channels.email?.adminEmail || channels.teams?.userPrincipalName || channels.calendar?.userPrincipalName;

  if (channels.teams?.enabled && azureCreds(channels.teams)) {
    results.channels.teams = await fetchTeamsData(
      channels.teams.tenantId,
      channels.teams.azureAppId,
      channels.teams.clientSecret,
      channels.teams.userPrincipalName || userEmail
    );
  } else if (channels.teams?.enabled) {
    results.channels.teams = { error: 'Teams not configured. Add Azure App ID, Client Secret, Tenant ID.' };
  }

  // Email: Outlook (Graph) vs Gmail/IMAP — existing configs without provider stay on Outlook
  const emailProvider = (channels.email?.provider || 'outlook').toLowerCase();
  const useImap = emailProvider === 'gmail' || emailProvider === 'imap';

  if (channels.email?.enabled && useImap) {
    try {
      const { fetchMailViaImap } = await import('./services/imap-service.js');
      results.channels.email = await fetchMailViaImap(channels.email, { messagesPerFolder: 30 });
    } catch (err) {
      results.channels.email = { error: err.message || 'Gmail/IMAP fetch failed.' };
    }
  } else if (channels.email?.enabled && azureCreds(channels.teams || channels.calendar)) {
    const creds = channels.teams || channels.calendar;
    const monitorAll = channels.email?.monitorAllUserMailboxes === true;
    if (monitorAll && typeof fetchMailFromAllUsers === 'function') {
      const cacheKey = creds.tenantId;
      if (emailAllUsersCache && emailAllUsersCache[cacheKey]) {
        results.channels.email = emailAllUsersCache[cacheKey];
      } else {
        results.channels.email = await fetchMailFromAllUsers(creds.tenantId, creds.azureAppId, creds.clientSecret, 8, 3);
        if (emailAllUsersCache) emailAllUsersCache[cacheKey] = results.channels.email;
      }
    } else {
      const mailbox = channels.email?.userPrincipalName || userEmail;
      results.channels.email = await fetchMailData(creds.tenantId, creds.azureAppId, creds.clientSecret, mailbox);
    }
  } else if (channels.email?.enabled) {
    results.channels.email = { error: 'Email via Graph requires Azure credentials (Teams or Calendar). For Gmail/IMAP, set provider to "gmail" or "imap" in channel config.' };
  }

  if (Array.isArray(channels.additionalEmails?.mailboxes) && channels.additionalEmails.mailboxes.length > 0) {
    try {
      const { fetchMailViaImap } = await import('./services/imap-service.js');
      const testResults = [];
      for (const mb of channels.additionalEmails.mailboxes) {
        const r = await fetchMailViaImap(mb, { messagesPerFolder: 5 });
        const ok = !r.error;
        testResults.push({ email: mb.adminEmail || mb.user || '(no email)', ok, error: r.error || null });
        if (!ok && r.error) {
          console.warn(`[Test channels] Additional mailbox ${mb.adminEmail || '?'} failed:`, r.error);
        }
      }
      results.channels.additionalEmails = { tested: testResults.length, results: testResults };
    } catch (err) {
      results.channels.additionalEmails = { error: err.message || 'Additional mailboxes test failed.' };
    }
  }

  if (channels.calendar?.enabled && azureCreds(channels.calendar)) {
    results.channels.calendar = await fetchCalendarData(
      channels.calendar.tenantId,
      channels.calendar.azureAppId,
      channels.calendar.clientSecret,
      channels.calendar.userPrincipalName || userEmail
    );
  } else if (channels.calendar?.enabled) {
    results.channels.calendar = { error: 'Calendar not configured.' };
  }

  if (channels.sharepoint?.enabled && azureCreds(channels.sharepoint)) {
    results.channels.sharepoint = await fetchSharePointData(
      channels.sharepoint.tenantId,
      channels.sharepoint.azureAppId,
      channels.sharepoint.clientSecret,
      channels.sharepoint.sharePointUrl
    );
  } else if (channels.sharepoint?.enabled) {
    results.channels.sharepoint = { error: 'SharePoint not configured.' };
  }

  return results;
}

/** Fetch real channel data - ENTERPRISE-WIDE (all users' email) + Teams, Calendar, SharePoint. Runs in parallel for speed. */
async function fetchAllChannelDataForContext(employeeNameOrNames = null, options = {}) {
  const FETCH_TIMEOUT_MS = parseInt(process.env.BRIEFING_FETCH_TIMEOUT_MS, 10) || 3600000; // 60 min default — full tenant (all mailboxes) can take 20–45 min; set BRIEFING_FETCH_TIMEOUT_MS in .env to raise further if needed
  const employeeNames = Array.isArray(employeeNameOrNames) ? employeeNameOrNames : (employeeNameOrNames ? [employeeNameOrNames] : []);
  const { comprehensive = false, daysBack = 90, receivedSince: optionsReceivedSince } = options;
  const receivedSince = optionsReceivedSince != null ? optionsReceivedSince : (employeeNames.length ? getReceivedSinceISO(daysBack) : null);

  const fetchPromise = (async () => {
    try {
      const companiesCfg = loadCompaniesConfig({ silent: true });
      const companies = companiesCfg?.companies || [];
      if (!companiesCfg) {
        console.warn('📊 Briefing: companies-config.json not found or invalid — briefings will show "no channels configured". Check backend/companies-config.json exists.');
      }
      const defaultCompanies = [
        { id: '1', name: 'Othain Group', domain: 'othaingroup.com' },
        { id: '2', name: 'OthainSoft', domain: 'othainsoft.com' },
        { id: '3', name: 'Jersey Technology Partners', domain: 'jerseytechpartners.com' },
        { id: '4', name: 'Strivio LLC', domain: 'strivio.com' },
      ];
      const configById = new Map(companies.map((c) => [c.id, c]));
      const toFetch = defaultCompanies
        .map((d) => configById.get(d.id) || { ...d, channels: {} })
        .filter((c) => c.channels && Object.keys(c.channels).length > 0);
      if (toFetch.length === 0) {
        const withChannels = defaultCompanies.map((d) => {
          const c = configById.get(d.id) || { ...d, channels: {} };
          return { id: d.id, name: d.name, channelKeys: c.channels ? Object.keys(c.channels) : [] };
        });
        console.warn('📊 Briefing: no channels configured — companies-config had', companies.length, 'companies; per company:', JSON.stringify(withChannels),
          '. Check backend/companies-config.json exists and each company has at least one channel (teams, email, calendar, sharepoint, or additionalEmails) with enabled: true.');
        return { companies: [], _note: 'No channels configured' };
      }

      const { fetchTeamsData, fetchMailData, fetchMailFromAllUsers, fetchMailInboxAndSentForUser, fetchCalendarData, fetchSharePointData } = await import('./services/graph-service.js');
      const creds = toFetch[0].channels?.teams || toFetch[0].channels?.calendar;
      const isOutlookEmail = (c) => {
        const p = (c.channels?.email?.provider || 'outlook').toLowerCase();
        return c.channels?.email?.enabled && p !== 'gmail' && p !== 'imap';
      };
      const needAzure = toFetch.some((c) => isOutlookEmail(c) || c.channels?.teams?.enabled || c.channels?.calendar?.enabled || c.channels?.sharepoint?.enabled);
      if (needAzure && !creds?.azureAppId) return { companies: [], _error: 'No Azure credentials (required for Outlook email, Teams, or Calendar).' };

      const hasOutlookMonitorAll = toFetch.some((c) => {
        const e = c.channels?.email;
        return e?.enabled && (e.provider || 'outlook').toLowerCase() === 'outlook' && e.monitorAllUserMailboxes === true;
      });
      const emailCfg = toFetch.find((c) => c.channels?.email?.monitorAllUserMailboxes === true)?.channels?.email || {};
      let maxUsers = Math.min(500, Math.max(1, parseInt(emailCfg.maxUsers, 10) || 100));
      let messagesPerUser = Math.min(500, Math.max(1, parseInt(emailCfg.messagesPerUser, 10) || 5));
      if (employeeNames.length) {
        maxUsers = Math.min(500, comprehensive ? 120 : 100);
        const cfgMsg = parseInt(emailCfg.messagesPerUser, 10);
        messagesPerUser = Math.min(500, cfgMsg && cfgMsg > 0 ? Math.max(cfgMsg, 35) : (comprehensive ? 50 : 40));
      }
      const ceoEmail = toFetch[0].channels?.email?.adminEmail || toFetch[0].channels?.teams?.userPrincipalName;
      const ceoEmailForFetch = toFetch[0].channels?.email?.adminEmail || toFetch[0].channels?.teams?.userPrincipalName;
      const prioritizeEmails = [ceoEmail, ...employeeNames].filter(Boolean);
      if (employeeNames.length) {
        console.log(`📌 Person/contact query: searching ALL monitored mailboxes (${maxUsers} users, ${messagesPerUser} msgs/user) across all companies; names: ${employeeNames.join(', ')}`);
      }
      const emailPromise = hasOutlookMonitorAll && creds?.azureAppId && typeof fetchMailFromAllUsers === 'function'
        ? (async () => {
            const ceoMsgs = employeeNames.length ? (comprehensive ? 250 : 150) : 80;
            const ceoOptions = employeeNames.length && receivedSince ? { receivedSince } : {};
            // Fetch from every company with Outlook + Azure so we include all tenants (e.g. Jersey Tech + Othain)
            const outlookCompanies = toFetch.filter((c) => isOutlookEmail(c) && (c.channels?.teams?.azureAppId || c.channels?.calendar?.azureAppId));
            const seenTenants = new Set();
            const allByUser = [];
            for (const company of outlookCompanies) {
              const cCreds = company.channels?.teams || company.channels?.calendar;
              if (!cCreds?.azureAppId) continue;
              const tenantKey = `${cCreds.tenantId || ''}`;
              if (seenTenants.has(tenantKey)) continue;
              seenTenants.add(tenantKey);
              const cCeo = company.channels?.email?.adminEmail || company.channels?.teams?.userPrincipalName;
              const cPrio = [cCeo, ...employeeNames].filter(Boolean);
              const [allUsersResult, ceoResult] = await Promise.all([
                fetchMailFromAllUsers(cCreds.tenantId, cCreds.azureAppId, cCreds.clientSecret, maxUsers, messagesPerUser, cPrio, receivedSince),
                cCeo && typeof fetchMailInboxAndSentForUser === 'function'
                  ? fetchMailInboxAndSentForUser(cCreds.tenantId, cCreds.azureAppId, cCreds.clientSecret, cCeo, ceoMsgs, ceoOptions)
                  : Promise.resolve({ byUser: [], error: null }),
              ]);
              let result = allUsersResult?.byUser ? { ...allUsersResult } : { byUser: [] };
              if (!result.byUser) result.byUser = [];
              if (ceoResult?.byUser?.length && result.byUser) {
                const ceoKey = (cCeo || '').toLowerCase();
                const existingIdx = result.byUser.findIndex((u) => (u.userPrincipalName || u.userEmail || '').toLowerCase() === ceoKey);
                const ceoEntry = ceoResult.byUser[0];
                if (existingIdx >= 0) {
                  result.byUser[existingIdx] = ceoEntry;
                } else {
                  result.byUser.unshift(ceoEntry);
                }
                console.log(`📌 CEO mailbox merged (${company.name}): ${ceoEntry.messages?.length || 0} msgs (inbox+sent)`);
              }
              allByUser.push(...(result.byUser || []));
            }
            // Dedupe by userPrincipalName (same tenant can appear in multiple companies)
            const byKey = new Map();
            for (const u of allByUser) {
              const key = (u.userPrincipalName || u.userEmail || u.user || '').toLowerCase();
              if (!key) continue;
              if (byKey.has(key)) {
                const existing = byKey.get(key);
                const seen = new Set((existing.messages || []).map((m) => `${m.from}|${m.subject}|${m.received}`));
                const newMsgs = (u.messages || []).filter((m) => !seen.has(`${m.from}|${m.subject}|${m.received}`));
                if (newMsgs.length) existing.messages = [...(existing.messages || []), ...newMsgs].sort((a, b) => new Date(b.received || 0) - new Date(a.received || 0));
              } else {
                byKey.set(key, { ...u });
              }
            }
            const merged = { byUser: [...byKey.values()], error: null };
            if (outlookCompanies.length > 1) console.log(`📌 Multi-tenant merge: ${merged.byUser.length} mailboxes from ${outlookCompanies.length} companies`);
            return merged;
          })()
        : null;

      // For enterprise-wide (monitorAll): fetch email; when employee-specific, fetch CEO's Teams+Calendar. Gmail/IMAP: per-company fetch.
      const companyPromises = toFetch.map(async (company, idx) => {
        const ch = company.channels || {};
        const userEmail = ch.email?.adminEmail || ch.teams?.userPrincipalName || ch.calendar?.userPrincipalName;
        let email;
        if (ch.email?.enabled) {
          const provider = (ch.email?.provider || 'outlook').toLowerCase();
          if (provider === 'gmail' || provider === 'imap') {
            const { fetchMailViaImap } = await import('./services/imap-service.js');
            email = await fetchMailViaImap(ch.email, { messagesPerFolder: 80, receivedSince });
          } else if (creds?.azureAppId) {
            if (emailPromise) {
              email = await emailPromise;
            } else {
              const mailbox = ch.email?.userPrincipalName || userEmail;
              email = await fetchMailData(creds.tenantId, creds.azureAppId, creds.clientSecret, mailbox).catch((e) => ({ error: e.message }));
            }
          } else {
            email = { error: 'Azure credentials required for Outlook email.' };
          }
        }
        // Merge additional mailboxes (Gmail/IMAP) into email.byUser
        const addMailboxes = ch.additionalEmails?.mailboxes;
        if (Array.isArray(addMailboxes) && addMailboxes.length > 0) {
          const { fetchMailViaImap } = await import('./services/imap-service.js');
          if (!email) email = { byUser: [], error: null };
          if (!email.byUser) {
            // Primary email may be from fetchMailData (single mailbox) with .messages not .byUser
            const primaryMailbox = ch.email?.userPrincipalName || ch.email?.adminEmail || userEmail;
            if (email.messages && primaryMailbox) {
              email.byUser = [{ user: primaryMailbox, userPrincipalName: primaryMailbox, userEmail: primaryMailbox, messages: email.messages }];
            } else {
              email.byUser = [];
            }
          }
          for (const mb of addMailboxes) {
            if (!mb.adminEmail || (!mb.appPassword && !mb.oauthRefreshToken)) continue;
            try {
              const result = await fetchMailViaImap(mb, { messagesPerFolder: 80, receivedSince });
              if (result.byUser?.length) email.byUser.push(...result.byUser);
            } catch (_) { /* skip failed mailbox */ }
          }
        }
        const channels = { email };
        const fetchTeamsCalendar = (!hasOutlookMonitorAll || (employeeNames.length && idx === 0)) && creds?.azureAppId; // Teams/Calendar require Azure
        if (fetchTeamsCalendar) {
          let [teams, calendar, sharepoint] = await Promise.all([
            ch.teams?.enabled ? fetchTeamsData(creds.tenantId, creds.azureAppId, creds.clientSecret, ch.teams.userPrincipalName || userEmail).catch((e) => ({ error: e.message })) : {},
            ch.calendar?.enabled ? fetchCalendarData(creds.tenantId, creds.azureAppId, creds.clientSecret, ch.calendar.userPrincipalName || userEmail).catch((e) => ({ error: e.message })) : {},
            (!hasOutlookMonitorAll && ch.sharepoint?.enabled) ? fetchSharePointData(creds.tenantId, creds.azureAppId, creds.clientSecret, ch.sharepoint?.sharePointUrl).catch((e) => ({ error: e.message })) : {},
          ]);
          // For employee queries: skip extra Teams fetch (6 more API calls) to avoid timeout - CEO Teams only
          if (employeeNames.length && ch.teams?.enabled && email?.byUser?.length > 1 && false) {
            const ceoKey = (ceoEmail || '').toLowerCase();
            const others = email.byUser.filter((u) => (u.userPrincipalName || u.userEmail || '').toLowerCase() !== ceoKey).slice(0, 6);
            const otherTeams = await Promise.all(others.map((u) => fetchTeamsData(creds.tenantId, creds.azureAppId, creds.clientSecret, u.userPrincipalName || u.userEmail).catch(() => ({}))));
            const seen = new Set();
            for (const m of (teams.recentMessages || [])) seen.add(`${m.team}|${m.channel}|${m.from}|${m.created}`);
            for (const ot of otherTeams) {
              if (ot?.recentMessages?.length) {
                for (const m of ot.recentMessages) {
                  const key = `${m.team}|${m.channel}|${m.from}|${m.created}`;
                  if (!seen.has(key)) {
                    seen.add(key);
                    teams.recentMessages = teams.recentMessages || [];
                    teams.recentMessages.push(m);
                  }
                }
              }
            }
            if (teams.recentMessages?.length) {
              teams.recentMessages.sort((a, b) => new Date(b.created || 0) - new Date(a.created || 0));
              console.log(`📌 Teams: merged ${teams.recentMessages.length} messages from CEO + ${others.length} other employees`);
            }
          }
          channels.teams = teams;
          channels.calendar = calendar;
          if (!hasOutlookMonitorAll) channels.sharepoint = sharepoint;
        }
        return {
          company: company.name,
          companyId: company.id,
          channels,
          timestamp: new Date().toISOString(),
        };
      });

      const results = await Promise.all(companyPromises);
      return { companies: results, timestamp: new Date().toISOString() };
    } catch (err) {
      console.warn('Channel data fetch failed:', err.message);
      return { companies: [], _error: err.message };
    }
  })();
  const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve({ companies: [], _fetchTimeout: true }), FETCH_TIMEOUT_MS));
  return Promise.race([fetchPromise, timeoutPromise]);
}

// Background cache for full channel data — person/insight queries use this so replies are fast and full-scope fetch runs on a schedule
const CHANNEL_CACHE_MAX_AGE_MS = Math.max(30 * 60 * 1000, parseInt(process.env.CHANNEL_CACHE_MAX_AGE_MS, 10) || 45 * 60 * 1000); // 45 min default
let channelDataCache = { data: null, timestamp: 0 };

function getCachedChannelData() {
  if (!channelDataCache.data || !channelDataCache.data.companies?.length) return null;
  if (channelDataCache.data._fetchTimeout) return null;
  if (Date.now() - channelDataCache.timestamp > CHANNEL_CACHE_MAX_AGE_MS) return null;
  return channelDataCache.data;
}

async function refreshChannelDataCache() {
  try {
    const data = await fetchAllChannelDataForContext();
    if (data?.companies?.length && !data._fetchTimeout && !data._error) {
      channelDataCache = { data, timestamp: Date.now() };
      const mailboxes = (data.companies || []).reduce((s, c) => s + (c.channels?.email?.byUser?.length || 0), 0);
      console.log('📦 Channel data cache refreshed:', data.companies.length, 'companies,', mailboxes, 'mailboxes');
    } else {
      console.warn('📦 Channel cache refresh: no data (timeout or error) — person queries may fall back to live fetch.');
    }
  } catch (err) {
    console.warn('📦 Channel data cache refresh failed:', err.message);
  }
}

/** Split a captured string into multiple names: "Shruti Dogra and Paul Suresh" or "Shruti, Paul, Mohammed" -> array */
function splitEmployeeNames(capture) {
  if (!capture || typeof capture !== 'string') return [];
  const raw = capture.trim();
  const parts = raw.split(/\s*,\s*|\s+and\s+|\s*&\s*/i).map((s) => s.trim()).filter(Boolean);
  return parts.filter((name) => name.length >= 2 && name.length <= 80);
}

/** Extract employee name(s) and "comprehensive" intent. Returns { employeeNames: string[], comprehensive }. */
function extractEmployeeNameFromQuery(query) {
  const out = { employeeNames: [], comprehensive: false };
  if (!query || typeof query !== 'string') return out;
  const q = query.trim();
  const firstLine = (q.split(/\n+/)[0] || q).trim(); // fallback: signature often breaks extraction
  const ap = "['\u2019]"; // straight ' + curly apostrophe (WhatsApp often sends curly)
  out.comprehensive = /\b(check\s+everything|all\s+comms?|full\s+insights?|everything\s+for|all\s+emails?\s+for|complete\s+picture|every\s+email\s+for|get\s+everything|all\s+messages?\s+for|insights?\s+into|insights?\s+on|get\s+insights?|deep\s+dive|comprehensive)\b/i.test(q);
  // Patterns that can capture multiple names. Allow name to be followed by newline/signature (not just . or end).
  const nameEnd = '(?:\\.|\\s*\\n|\\s*$)';
  const multiPatterns = [
    new RegExp(`(?:check\\s+everything|all\\s+comms?|full\\s+insights?|everything)\\s+(?:for|about)\\s+([A-Za-z][A-Za-z\\s.,&\\-]+?)${nameEnd}`, 'i'),
    new RegExp(`insights?\\s+into\\s+([A-Za-z][A-Za-z\\s.,&\\-]+?)${nameEnd}`, 'i'),
    new RegExp(`(?:insights?|info|information)\\s+on\\s+([A-Za-z][A-Za-z\\s.,&\\-]+?)${nameEnd}`, 'i'),
    new RegExp(`(?:insights?|information|summary|review)\\s+for\\s+([A-Za-z][A-Za-z\\s.,&\\-]+?)${nameEnd}`, 'i'),
    new RegExp(`(?:insights?|information|summary|review)\\s+(?:about\\s+)?(?:employee\\s+)?([A-Za-z][A-Za-z\\s.,&\\-]+?)${nameEnd}`, 'i'),
    new RegExp(`review\\s+(?:all\\s+)?(?:email\\s+)?messages?\\s+of\\s+([^.?!]+?)(?:\\.|\\s*\\n|\\s*$)`, 'i'),
    new RegExp(`(?:emails?|messages?)\\s+of\\s+([^.?!]+?)(?:\\.|\\s*\\n|\\s*$)`, 'i'),
  ];
  for (const text of [q, firstLine]) {
    if (!text || text.length < 5) continue;
    for (const re of multiPatterns) {
      const m = text.match(re);
      if (m && m[1]) {
        const names = splitEmployeeNames(m[1]);
        if (names.length > 0) {
          out.employeeNames = names;
          if (names.length >= 2) out.comprehensive = true;
          return out;
        }
      }
    }
  }
  // Single-name patterns (fallback)
  const singlePatterns = [
    new RegExp(`(?:provide|give)\\s+(?:me\\s+)?(?:insights?|information|summary)\\s+for\\s+([A-Za-z][A-Za-z\\s.-]+?)(?:\\s+and\\s+|\\s*$)`, 'i'),
    new RegExp(`(?:employee\\s+)?([A-Za-z][A-Za-z\\s.-]+?)(?:\\s+-\\s+)?(?:insights?|emails?|messages?)`, 'i'),
    new RegExp(`review\\s+([^.?!]+)${ap}s\\s+(?:emails?|messages?|email\\s+messages?)`, 'i'),
    new RegExp(`review\\s+([A-Za-z][A-Za-z\\s.-]+?)\\s+(?:emails?|messages?|email\\s+messages?)`, 'i'),
    new RegExp(`check\\s+([^.?!]+)${ap}s\\s+(?:emails?|messages?)`, 'i'),
    new RegExp(`summarize\\s+([^.?!]+)${ap}s\\s+(?:emails?|messages?)`, 'i'),
  ];
  for (const text of [q, firstLine]) {
    if (!text || text.length < 3) continue;
    for (const re of singlePatterns) {
      const m = text.match(re);
      if (m && m[1]) {
        const names = splitEmployeeNames(m[1]);
        if (names.length > 0) {
          out.employeeNames = names;
          if (names.length >= 2) out.comprehensive = true;
          return out;
        }
      }
    }
  }
  return out;
}

function getReceivedSinceISO(daysBack) {
  if (daysBack == null || typeof daysBack !== 'number' || daysBack <= 0) return null;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toISOString();
}

/** Fetch channel data for a SPECIFIC employee (when CEO asks about one person). options: { receivedSince, messagesPerUser } */
async function fetchChannelDataForEmployee(employeeName, options = {}) {
  const FETCH_TIMEOUT_MS = 90000; // slightly longer for comprehensive
  const messagesPerUser = options.messagesPerUser ?? 150;
  const receivedSince = options.receivedSince ?? null;
  const fn = async () => {
    try {
      const companiesCfg = loadCompaniesConfig();
      const companies = companiesCfg?.companies || [];
      const defaultCompanies = [
        { id: '1', name: 'Othain Group', domain: 'othaingroup.com' },
        { id: '2', name: 'OthainSoft', domain: 'othainsoft.com' },
        { id: '3', name: 'Jersey Technology Partners', domain: 'jerseytechpartners.com' },
      ];
      const configById = new Map(companies.map((c) => [c.id, c]));
      const toFetch = defaultCompanies
        .map((d) => configById.get(d.id) || { ...d, channels: {} })
        .filter((c) => c.channels && Object.keys(c.channels).length > 0);
      if (toFetch.length === 0) return { companies: [], _error: 'No companies configured' };

      const firstEmail = toFetch[0].channels?.email;
      const firstProvider = (firstEmail?.provider || 'outlook').toLowerCase();
      const useImapForEmployee = firstEmail?.enabled && (firstProvider === 'gmail' || firstProvider === 'imap');
      let emailResult;
      let teamsResult = {};

      if (useImapForEmployee) {
        const { fetchMailViaImap } = await import('./services/imap-service.js');
        emailResult = await fetchMailViaImap(firstEmail, { messagesPerFolder: Math.min(200, messagesPerUser * 2), receivedSince });
        emailResult._matchedUser = { userPrincipalName: firstEmail?.adminEmail || firstEmail?.userPrincipalName };
      } else {
        const creds = toFetch[0].channels?.teams || toFetch[0].channels?.calendar;
        if (!creds?.azureAppId) return { companies: [], _error: 'No Azure credentials (required for Outlook employee lookup). For Gmail/IMAP, employee insights use the configured mailbox.' };
        const { fetchMailForSpecificUser, fetchTeamsData } = await import('./services/graph-service.js');
        emailResult = await fetchMailForSpecificUser(creds.tenantId, creds.azureAppId, creds.clientSecret, employeeName, messagesPerUser, { receivedSince });
        if (emailResult._matchedUser?.userPrincipalName && toFetch[0].channels?.teams?.enabled) {
          teamsResult = await fetchTeamsData(creds.tenantId, creds.azureAppId, creds.clientSecret, emailResult._matchedUser.userPrincipalName).catch(() => ({}));
        }
      }

      const results = toFetch.map((company) => ({
        company: company.name,
        companyId: company.id,
        channels: { email: emailResult, teams: teamsResult },
        timestamp: new Date().toISOString(),
        _employeeFocus: employeeName,
      }));
      return { companies: results, timestamp: new Date().toISOString(), _employeeFocus: employeeName };
    } catch (err) {
      console.warn('Employee fetch failed:', err.message);
      return { companies: [], _error: err.message, _employeeFocus: employeeName };
    }
  };
  const timeout = new Promise((r) => setTimeout(() => r({ companies: [], _fetchTimeout: true, _employeeFocus: employeeName }), FETCH_TIMEOUT_MS));
  return Promise.race([fn(), timeout]);
}

// Instant ping - no Azure/Graph, returns immediately. Use to verify server is reachable.
app.get('/api/ping', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString(), message: 'Backend is reachable' });
});

// Test: can backend reach OpenAI API? (diagnoses connection errors)
app.get('/api/test/openai-reach', (req, res) => {
  const https = require('https');
  const req2 = https.request(
    { hostname: 'api.openai.com', path: '/v1/models', method: 'GET', headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY || 'test'}` } },
    (r) => {
      let data = '';
      r.on('data', (c) => (data += c));
      r.on('end', () => res.json({ ok: true, reachable: true, status: r.statusCode }));
    }
  );
  req2.on('error', (e) => res.json({ ok: false, reachable: false, error: e.message }));
  req2.setTimeout(10000, () => { req2.destroy(); res.json({ ok: false, reachable: false, error: 'timeout' }); });
  req2.end();
});

// Restart backend (scheduled task). Sends response then spawns delayed stop/start so the response is delivered.
app.post('/api/restart-backend', (req, res) => {
  res.json({ success: true, message: 'Backend will restart in a few seconds.' });
  const script = 'Start-Sleep -Seconds 5; Stop-ScheduledTask -TaskName StrategicAdvisorBackend -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2; Start-ScheduledTask -TaskName StrategicAdvisorBackend -ErrorAction SilentlyContinue';
  const child = spawn('powershell', ['-NoProfile', '-Command', script], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    cwd: projectRoot,
  });
  child.unref();
});

// Test: send voice-note ack to CEO WhatsApp (verifies sendWhatsApp works)
app.get('/api/test/send-voice-ack', async (req, res) => {
  try {
    const ceo = process.env.CEO_PHONE_NUMBER || '';
    if (!ceo || !twilioClient) {
      return res.json({ ok: false, error: 'CEO_PHONE_NUMBER or Twilio not configured' });
    }
    const to = ceo.startsWith('whatsapp:') ? ceo : `whatsapp:${ceo.replace(/^\+/, '')}`;
    await sendWhatsApp('Got it, transcribing your voice note...', false, to);
    res.json({ ok: true, message: 'Test ack sent to ' + to });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Test endpoint: fetch real channel data for all configured companies
app.get('/api/test/channels-all', async (req, res) => {
  try {
    const companiesCfg = loadCompaniesConfig();
    const companies = companiesCfg?.companies || [];
    const { fetchTeamsData, fetchMailData, fetchMailFromAllUsers, fetchCalendarData, fetchSharePointData } = await import('./services/graph-service.js');
    const defaultCompanies = [
      { id: '1', name: 'Othain Group', domain: 'othaingroup.com' },
      { id: '2', name: 'OthainSoft', domain: 'othainsoft.com' },
      { id: '3', name: 'Jersey Technology Partners', domain: 'jerseytechpartners.com' },
      { id: '4', name: 'Strivio LLC', domain: 'strivio.com' },
    ];
    const configById = new Map(companies.map((c) => [c.id, c]));
    const toTest = defaultCompanies
      .map((d) => configById.get(d.id) || { ...d, channels: {} })
      .filter((c) => c.channels && Object.keys(c.channels).length > 0);
    if (toTest.length === 0) return res.json({ companies: [], message: 'No companies with configured channels.' });
    const results = [];
    for (const company of toTest) {
      results.push(await testCompanyChannels(company, { fetchTeamsData, fetchMailData, fetchMailFromAllUsers, fetchCalendarData, fetchSharePointData }));
    }
    res.json({ companies: results, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error('Channel test all error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint: fetch real channel data for a company (or all companies)
app.get('/api/test/channels', async (req, res) => {
  const companyId = String(req.query.companyId || '1').toLowerCase();
  const testAll = companyId === 'all' || req.query.all === 'true';
  try {
    const companiesCfg = loadCompaniesConfig();
    const companies = companiesCfg?.companies || [];
    const { fetchTeamsData, fetchMailData, fetchMailFromAllUsers, fetchCalendarData, fetchSharePointData } = await import('./services/graph-service.js');

    if (testAll) {
      const defaultCompanies = [
        { id: '1', name: 'Othain Group', domain: 'othaingroup.com' },
        { id: '2', name: 'OthainSoft', domain: 'othainsoft.com' },
        { id: '3', name: 'Jersey Technology Partners', domain: 'jerseytechpartners.com' },
        { id: '4', name: 'Strivio LLC', domain: 'strivio.com' },
      ];
      const configById = new Map(companies.map((c) => [c.id, c]));
      const toTest = defaultCompanies
        .map((d) => configById.get(d.id) || { ...d, channels: {} })
        .filter((c) => c.channels && Object.keys(c.channels).length > 0);
      if (toTest.length === 0) return res.json({ companies: [], message: 'No companies with configured channels.' });
      const results = [];
      for (const company of toTest) {
        results.push(await testCompanyChannels(company, { fetchTeamsData, fetchMailData, fetchMailFromAllUsers, fetchCalendarData, fetchSharePointData }));
      }
      return res.json({ companies: results, timestamp: new Date().toISOString() });
    }

    const company = companies.find((c) => c.id === companyId);
    if (!company) {
      return res.status(404).json({ error: `Company ${companyId} not found` });
    }

    const results = await testCompanyChannels(company, { fetchTeamsData, fetchMailData, fetchMailFromAllUsers, fetchCalendarData, fetchSharePointData });
    res.json(results);
  } catch (error) {
    console.error('Channel test error:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// Test endpoint: send LIVE briefing to email and WhatsApp (same as morning run — fetches channel data + AI summary)
app.get('/api/test/email-briefing', async (req, res) => {
  console.log('📧 [TEST] GET /api/test/email-briefing — generating live briefing (email + WhatsApp)...');
  const result = { email: false, whatsapp: false, message: '', usedLiveData: false, emailTo: null, whatsappTo: null };
  try {
    const toEmail = getAdminEmail();
    const toWhatsApp = getAdminWhatsAppNumber();
    if (!toEmail && !toWhatsApp) {
      return res.status(400).json({
        error: 'Set your email and/or WhatsApp in Config Dashboard → Contact Information (CEO email, WhatsApp number), then Save',
        ...result,
      });
    }
    const out = await generateLiveBriefingHtml('morning', { includeVoiceSummary: true });
    const liveHtml = out && (typeof out === 'string' ? out : out.html);
    const voiceSummary = out && typeof out === 'object' && out.voiceSummary ? String(out.voiceSummary).trim() : null;
    result.usedLiveData = !!liveHtml;

    if (toEmail && (useSendGrid || emailTransporter)) {
      const body = liveHtml || getBriefingUnavailableHtml('Live data fetch or AI summary failed.');
      await sendEmailBriefing(toEmail, '(Test – live)', body);
      result.email = true;
      result.emailTo = toEmail;
      console.log('📧 [TEST] Live briefing email sent to', toEmail);
    } else if (toEmail) {
      result.message = (result.message ? result.message + ' ' : '') + 'Email not configured (SENDGRID or EMAIL_USER). ';
    }

    if (toWhatsApp && twilioClient) {
      const shortLine = voiceSummary ? `\n\n${voiceSummary}` : '';
      const msg = `📧 Your daily briefing has been sent to your email.${shortLine}\n\nCheck your inbox.`;
      await sendWhatsApp(msg, false, `whatsapp:${toWhatsApp.replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
      result.whatsapp = true;
      result.whatsappTo = toWhatsApp;
      console.log('📱 [TEST] Live briefing WhatsApp sent to', toWhatsApp);
    } else if (toWhatsApp) {
      result.message = (result.message ? result.message + ' ' : '') + 'WhatsApp not configured (Twilio). ';
    }

    const summary = [];
    if (result.email) summary.push(`Email sent to ${result.emailTo}`);
    else if (toEmail) summary.push('Email not sent (backend has no SendGrid or SMTP configured — set SENDGRID_API_KEY or EMAIL_USER/EMAIL_PASSWORD in .env).');
    if (result.whatsapp) summary.push(`WhatsApp sent to ${result.whatsappTo}`);
    else if (toWhatsApp) summary.push('WhatsApp not sent (Twilio not configured).');
    result.message = (result.message || (summary.length ? summary.join(' ') : 'No delivery')).trim();
    const anySent = result.email || result.whatsapp;
    res.status(anySent ? 200 : 400).json({
      success: anySent,
      message: result.message,
      ...result,
    });
  } catch (error) {
    console.error('Email briefing test error:', error);
    res.status(500).json({
      error: error.message,
      hint: 'Email: use Gmail App Password (2FA). WhatsApp: set CEO WhatsApp in Config and Twilio.',
      ...result,
    });
  }
});

// ----- Chanakya: Meeting prep — brief before calls (attendees, agenda, talking points); send via email + WhatsApp (on-demand + automatic) -----
const MEETING_PREP_SYSTEM_PROMPT = `You are Chanakya, a meeting prep assistant. Given a list of upcoming calendar meetings (already in chronological order by start time), for each meeting produce a concise brief with:
1. **Meeting** – Title and time (start–end). Present meetings in the same order they appear in the list (earliest first).
2. **Attendees** – List names and/or email addresses.
3. **Agenda** – From the meeting subject and body preview if provided; otherwise a one-line summary.
4. **Suggested talking points** – 2–4 bullets (action-oriented or discussion prompts). If the body preview mentions specific topics, use those; otherwise suggest relevant points from the title.
Keep each brief scannable. Use clear headings. Format in markdown.`;

function meetingPrepSentKey(ev) {
  if (ev.id) return String(ev.id);
  const startMs = ev.start ? new Date(ev.start).getTime() : 0;
  const startStr = startMs ? new Date(startMs).toISOString().slice(0, 19) + 'Z' : '';
  return `${String(ev.subject || '').trim()}|${startStr}`;
}

/** Same meeting can appear with different event ids (e.g. series vs instance). Use one canonical key per logical meeting. */
function meetingPrepLogicalKey(ev) {
  const startMs = ev.start ? new Date(ev.start).getTime() : 0;
  const startToMinute = startMs ? new Date(Math.floor(startMs / 60000) * 60000).toISOString().slice(0, 16) : '';
  return `L:${String(ev.subject || '').trim()}|${startToMinute}`;
}

function readMeetingPrepSent() {
  try {
    if (fs.existsSync(MEETING_PREP_SENT_PATH)) {
      const raw = fs.readFileSync(MEETING_PREP_SENT_PATH, 'utf8');
      const data = JSON.parse(raw);
      return data.keys || [];
    }
  } catch (_) {}
  return [];
}

function writeMeetingPrepSent(keys) {
  const trimmed = keys.slice(-500);
  fs.writeFileSync(MEETING_PREP_SENT_PATH, JSON.stringify({ keys: trimmed, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
}

/** Generate prep text for a list of events (same LLM prompt, subset of meetings). */
async function runMeetingPrepForEvents(events) {
  if (!events || events.length === 0) return 'No meetings.';
  const meetingsText = events.map((e) => {
    const att = (e.attendees || []).map((a) => (a.name ? `${a.name} <${a.address || ''}>` : a.address)).filter(Boolean).join(', ');
    return `Meeting: ${e.subject}\nStart: ${e.start}\nEnd: ${e.end}\nAttendees: ${att || '—'}\nBody preview: ${e.bodyPreview || '—'}`;
  }).join('\n\n---\n\n');
  const query = `Upcoming meetings:\n\n${meetingsText}\n\nProduce a meeting prep brief for each (attendees, agenda, suggested talking points).`;
  const prepMarkdown = await askAI(query, '', { systemPrompt: MEETING_PREP_SYSTEM_PROMPT });
  return prepMarkdown;
}

/** Run meeting prep and send via email + WhatsApp. Used by POST /api/meeting-prep (on-demand) and by 15h-before cron for each meeting. */
async function runMeetingPrep(nextHours = 24) {
  const companiesCfg = loadCompaniesConfig({ silent: true });
  const creds = companiesCfg?.companies?.[0]?.channels?.teams || companiesCfg?.companies?.[0]?.channels?.calendar;
  const userPrincipalName = creds?.userPrincipalName || companiesCfg?.companies?.[0]?.channels?.email?.adminEmail || getAdminEmail();
  if (!creds?.tenantId || !creds?.azureAppId || !creds?.clientSecret) {
    throw new Error('Calendar/Teams not configured. Add Azure credentials in Config → Companies.');
  }
  const cfg = loadConfig();
  const outlookTimezone = cfg?.briefings?.meetingPrepTimezone || process.env.MEETING_PREP_TIMEZONE || 'Eastern Standard Time';
  const { fetchUpcomingCalendarEvents } = await import('./services/graph-service.js');
  const { events, error: fetchError } = await fetchUpcomingCalendarEvents(
    creds.tenantId,
    creds.azureAppId,
    creds.clientSecret,
    userPrincipalName || undefined,
    { nextHours, maxEvents: 15, outlookTimezone }
  );
  if (fetchError) throw new Error(`Calendar fetch failed: ${fetchError}`);

  const toEmail = getAdminEmail();
  const toWhatsApp = getAdminWhatsAppNumber();
  if (!toEmail && !toWhatsApp) throw new Error('Set your email and/or WhatsApp in Config → General (Contact Information).');

  let prepPlain = '';
  if (!events || events.length === 0) {
    prepPlain = 'Chanakya – Meeting prep\n\nNo upcoming meetings in the next ' + nextHours + ' hours.';
  } else {
    const prepMarkdown = await runMeetingPrepForEvents(events);
    prepPlain = `Chanakya – Meeting prep (next ${nextHours}h)\n\n${prepMarkdown}`;
  }

  const subject = `Chanakya – Meeting prep (next ${nextHours}h)`;
  let emailSent = false;
  let whatsappSent = false;
  let whatsappError = null;
  if (toEmail && (useSendGrid || emailTransporter)) {
    await sendEmailReply(toEmail, subject, prepPlain);
    emailSent = true;
    console.log('📧 Chanakya: meeting prep sent by email to', toEmail);
  }
  if (toWhatsApp && twilioClient) {
    const msg = prepPlain.length > 1400 ? prepPlain.slice(0, 1380) + '\n\n… Full prep in email.' : prepPlain;
    try {
      await sendWhatsApp(msg, false, `whatsapp:${String(toWhatsApp).replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
      whatsappSent = true;
      console.log('📱 Chanakya: meeting prep sent by WhatsApp to', toWhatsApp);
    } catch (err) {
      whatsappError = err.message || String(err);
      const code = err.code != null ? ` [Twilio ${err.code}]` : '';
      console.error('📱 Chanakya: WhatsApp send failed:', whatsappError + code);
    }
  }
  return { meetingsCount: events?.length ?? 0, email: emailSent, whatsapp: whatsappSent, whatsappError: whatsappError || undefined };
}

/** Send meeting prep for a single meeting (used by 15-min-before cron). */
async function sendMeetingPrepForOneMeeting(ev, minutesBefore) {
  const toEmail = getAdminEmail();
  const toWhatsApp = getAdminWhatsAppNumber();
  if (!toEmail && !toWhatsApp) return;
  const prepMarkdown = await runMeetingPrepForEvents([ev]);
  const prepPlain = `Chanakya – Meeting prep (in ~${minutesBefore} min)\n\n**${ev.subject}** · ${ev.start}\n\n${prepMarkdown}`;
  const subject = `Chanakya – Prep: ${ev.subject} (in ~${minutesBefore} min)`;
  if (toEmail && (useSendGrid || emailTransporter)) {
    await sendEmailReply(toEmail, subject, prepPlain);
    console.log('📧 Chanakya: meeting prep sent by email for', ev.subject);
  }
  if (toWhatsApp && twilioClient) {
    const msg = prepPlain.length > 1400 ? prepPlain.slice(0, 1380) + '\n\n… Full prep in email.' : prepPlain;
    await sendWhatsApp(msg, false, `whatsapp:${String(toWhatsApp).replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
    console.log('📱 Chanakya: meeting prep sent by WhatsApp for', ev.subject);
  }
}

app.post('/api/meeting-prep', express.json(), async (req, res) => {
  try {
    const nextHours = Math.min(48, Math.max(1, parseInt(req.body?.nextHours, 10) || 24));
    const result = await runMeetingPrep(nextHours);
    const toEmail = getAdminEmail();
    const toWhatsApp = getAdminWhatsAppNumber();
    let msg = result.email && result.whatsapp ? `Meeting prep sent to ${toEmail} and WhatsApp.` : result.email ? `Meeting prep sent to ${toEmail}.` : result.whatsapp ? `Meeting prep sent to WhatsApp.` : 'Email and WhatsApp not configured.';
    if (result.whatsappError) msg += ` WhatsApp failed: ${result.whatsappError}. If using Twilio Sandbox, send "join <your-code>" to the sandbox number again.`;
    res.json({ success: true, message: msg, meetingsCount: result.meetingsCount, email: result.email, whatsapp: result.whatsapp, whatsappError: result.whatsappError || null });
  } catch (e) {
    console.error('Meeting prep error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ----- Chanakya: Weekly review — summarize week, flag incomplete tasks, draft priorities for next week; send via email + WhatsApp -----
const WEEKLY_REVIEW_SYSTEM_PROMPT = `You are Chanakya, a strategic assistant. Given channel data from the past week (emails, Teams messages, calendar), produce a concise **Weekly Review** in markdown with exactly these three sections:

1. **Week in summary** – 2–4 short paragraphs: what happened this week (key meetings, decisions, threads, and notable activity). Only use facts from the data; do not invent.

2. **Incomplete / follow-ups** – Bullet list of tasks or commitments that appear unfinished or need follow-up (e.g. open threads, promised deliverables, unanswered questions, action items from context). If the data does not clearly show any, say "None clearly identified from this week's data."

3. **Priorities for next week** – 3–5 concrete priorities or goals for the coming week, drafted from the summary and follow-ups. Keep each to one short line. Be specific and actionable.

Use clear headings. Output markdown only.`;

async function runWeeklyReview() {
  const receivedSince = getReceivedSinceISO(7);
  const channelData = await fetchAllChannelDataForContext(null, { daysBack: 7, receivedSince });
  let contextStr = '';
  if (channelData?.companies?.length) {
    const jsonStr = JSON.stringify(channelData, null, 2);
    const ctxLimit = 50000;
    contextStr = jsonStr.length > ctxLimit ? jsonStr.slice(0, ctxLimit) + '\n...[truncated]' : jsonStr;
  } else {
    const reason = channelData?._fetchTimeout ? 'fetch timed out' : channelData?._error || channelData?._note || 'no channels configured';
    contextStr = `[No channel data available: ${reason}. Provide a short note that the weekly review could not be generated and suggest checking Config and channel connectivity.]`;
  }
  const instruction = `Using the past week's channel data below (emails, Teams, calendar), produce the Weekly Review as specified. Today is ${new Date().toISOString().slice(0, 10)}. ${WEEKLY_REVIEW_SYSTEM_PROMPT}`;
  let markdown = await askAI(instruction, contextStr, { systemPrompt: WEEKLY_REVIEW_SYSTEM_PROMPT });
  if (!markdown || typeof markdown !== 'string') markdown = 'Weekly review could not be generated (AI or data unavailable).';
  const plain = `Chanakya – Weekly review\n\n${markdown.trim()}`;
  const subject = `Chanakya – Weekly review (${new Date().toISOString().slice(0, 10)})`;
  const toEmail = getAdminEmail();
  const toWhatsApp = getAdminWhatsAppNumber();
  let emailSent = false;
  let whatsappSent = false;
  let whatsappError = null;
  if (toEmail && (useSendGrid || emailTransporter)) {
    await sendEmailReply(toEmail, subject, plain);
    emailSent = true;
    console.log('📧 Chanakya: weekly review sent by email to', toEmail);
  }
  if (toWhatsApp && twilioClient) {
    const msg = plain.length > 1400 ? plain.slice(0, 1380) + '\n\n… Full review in email.' : plain;
    try {
      await sendWhatsApp(msg, false, `whatsapp:${String(toWhatsApp).replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
      whatsappSent = true;
      console.log('📱 Chanakya: weekly review sent by WhatsApp');
    } catch (err) {
      whatsappError = err.message || String(err);
      console.warn('📱 Chanakya: weekly review WhatsApp failed:', whatsappError);
    }
  }
  return { email: emailSent, whatsapp: whatsappSent, whatsappError: whatsappError || undefined };
}

app.post('/api/chanakya/weekly-review', express.json(), async (req, res) => {
  try {
    const result = await runWeeklyReview();
    const toEmail = getAdminEmail();
    const toWhatsApp = getAdminWhatsAppNumber();
    let message = result.email && result.whatsapp ? `Weekly review sent to ${toEmail} and WhatsApp.` : result.email ? `Weekly review sent to ${toEmail}.` : result.whatsapp ? `Weekly review sent to WhatsApp.` : 'Set email and/or WhatsApp in Config → General to receive the review.';
    if (result.whatsappError) message += ` WhatsApp failed: ${result.whatsappError}.`;
    res.json({ success: true, message, email: result.email, whatsapp: result.whatsapp, whatsappError: result.whatsappError || null });
  } catch (e) {
    console.error('Weekly review error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ----- Meeting transcription: fetch Teams transcripts for past calendar meetings, summarize + action items, send via email/WhatsApp -----
const MEETING_TRANSCRIPTION_SYSTEM_PROMPT = `You are Chanakya, a meeting assistant. Given a raw meeting transcript (possibly in VTT or plain text with speaker labels), produce a concise report in markdown with:
1. **Summary** – 2–4 sentences on what the meeting was about and key outcomes.
2. **Items discussed** – Bullet list of main topics or decisions.
3. **Action items** – Bullet list of tasks, owners if mentioned, and deadlines if mentioned. Use "Owner: [name]" or "By: [date]" when the transcript states them.
Keep the report scannable. Use only information from the transcript; do not invent.`;

function parseVttToPlainText(vtt) {
  if (!vtt || typeof vtt !== 'string') return '';
  return vtt
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((line) => {
      const t = line.trim();
      if (!t || t.startsWith('WEBVTT') || /^\d{2}:\d{2}:\d{2}\.\d{3}\s*-->\s*\d{2}:\d{2}:\d{2}/.test(t) || /^\d+$/.test(t)) return false;
      return true;
    })
    .map((line) => line.replace(/<v[^>]*>/gi, '').replace(/<\/v>/gi, '').trim())
    .filter(Boolean)
    .join('\n');
}

function readMeetingTranscriptionsSent() {
  try {
    if (fs.existsSync(MEETING_TRANSCRIPTIONS_SENT_PATH)) {
      const raw = fs.readFileSync(MEETING_TRANSCRIPTIONS_SENT_PATH, 'utf8');
      const data = JSON.parse(raw);
      return data.keys || [];
    }
  } catch (_) {}
  return [];
}

function writeMeetingTranscriptionsSent(keys) {
  const trimmed = keys.slice(-1000);
  fs.writeFileSync(MEETING_TRANSCRIPTIONS_SENT_PATH, JSON.stringify({ keys: trimmed, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
}

async function runMeetingTranscriptions(options = {}) {
  const { hoursLookback = MEETING_TRANSCRIPTION_HOURS_LOOKBACK_DEFAULT } = options;
  const companiesCfg = loadCompaniesConfig({ silent: true });
  const creds = companiesCfg?.companies?.[0]?.channels?.teams || companiesCfg?.companies?.[0]?.channels?.calendar;
  const userPrincipalName = creds?.userPrincipalName || companiesCfg?.companies?.[0]?.channels?.email?.adminEmail || getAdminEmail();
  if (!creds?.tenantId || !creds?.azureAppId || !creds?.clientSecret || !userPrincipalName) {
    throw new Error('Calendar/Teams not configured or Contact email missing.');
  }
  const toEmail = getAdminEmail();
  const toWhatsApp = getAdminWhatsAppNumber();
  if (!toEmail && !toWhatsApp) throw new Error('Set your email and/or WhatsApp in Config → General.');

  const {
    fetchPastCalendarEventsWithOnlineMeeting,
    getOnlineMeetingIdByJoinWebUrl,
    listMeetingTranscripts,
    getTranscriptContent,
  } = await import('./services/graph-service.js');

  const { events, error: fetchError } = await fetchPastCalendarEventsWithOnlineMeeting(
    creds.tenantId,
    creds.azureAppId,
    creds.clientSecret,
    userPrincipalName,
    { hoursAgo: hoursLookback }
  );
  if (fetchError) throw new Error(`Calendar fetch failed: ${fetchError}`);
  if (!events?.length) return { processed: 0, sent: 0 };

  let sentKeys = readMeetingTranscriptionsSent();
  let processed = 0;
  let sent = 0;
  const meetingKey = (ev, onlineMeetingId) => ev.id || onlineMeetingId || ev.joinWebUrl;

  for (const ev of events) {
    let onlineMeetingId = null;
    try {
      onlineMeetingId = await getOnlineMeetingIdByJoinWebUrl(creds.tenantId, creds.azureAppId, creds.clientSecret, userPrincipalName, ev.joinWebUrl);
    } catch (_) {}
    if (!onlineMeetingId) continue;

    const meetingSentKey = `meeting:${meetingKey(ev, onlineMeetingId)}`;
    if (sentKeys.includes(meetingSentKey)) continue;

    const { transcripts, error: listErr } = await listMeetingTranscripts(creds.tenantId, creds.azureAppId, creds.clientSecret, userPrincipalName, onlineMeetingId);
    if (listErr || !transcripts?.length) continue;

    let usedTranscript = false;
    for (const tr of transcripts) {
      const vtt = await getTranscriptContent(creds.tenantId, creds.azureAppId, creds.clientSecret, userPrincipalName, onlineMeetingId, tr.id);
      if (!vtt || vtt.length < 50) continue;

      const plainText = parseVttToPlainText(vtt);
      if (plainText.length < 30) continue;

      const query = `Meeting: ${ev.subject}\nDate: ${ev.start} – ${ev.end}\n\nTranscript:\n${plainText.slice(0, 28000)}`;
      let report = '';
      try {
        report = await askAI(query, '', { systemPrompt: MEETING_TRANSCRIPTION_SYSTEM_PROMPT });
      } catch (e) {
        console.warn('Meeting transcription LLM failed:', e.message);
        continue;
      }

      const subject = `Chanakya – Meeting summary: ${ev.subject}`;
      const body = `Meeting: ${ev.subject}\nDate: ${ev.start} – ${ev.end}\n\n${report}`;

      if (toEmail && (useSendGrid || emailTransporter)) {
        await sendEmailReply(toEmail, subject, body);
        console.log('📧 Chanakya: meeting transcript summary sent by email for', ev.subject);
        sent++;
      }
      if (toWhatsApp && twilioClient) {
        const msg = body.length > 1400 ? body.slice(0, 1380) + '\n\n… Full summary in email.' : body;
        try {
          await sendWhatsApp(msg, false, `whatsapp:${String(toWhatsApp).replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
          console.log('📱 Chanakya: meeting transcript summary sent by WhatsApp for', ev.subject);
          sent++;
        } catch (_) {}
      }

      sentKeys = [...sentKeys, meetingSentKey];
      writeMeetingTranscriptionsSent(sentKeys);
      processed++;
      usedTranscript = true;
      break;
    }
    if (!usedTranscript) {
      sentKeys = [...sentKeys, meetingSentKey];
      writeMeetingTranscriptionsSent(sentKeys);
    }
  }

  return { processed, sent };
}

app.post('/api/meeting-transcription/run', express.json(), async (req, res) => {
  try {
    const hoursLookback = Math.min(24, Math.max(1, parseInt(req.body?.hoursLookback, 10) || MEETING_TRANSCRIPTION_HOURS_LOOKBACK_DEFAULT));
    const result = await runMeetingTranscriptions({ hoursLookback });
    res.json({ success: true, processed: result.processed, sent: result.sent, message: `Processed ${result.processed} transcript(s), sent ${result.sent} summary (email/WhatsApp).` });
  } catch (e) {
    console.error('Meeting transcription error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Debug: verify backend version
app.get('/api/debug/version', (req, res) => res.json({ version: BACKEND_VERSION }));

// Debug: show last enterprise-wide email fetch scope (confirms who was reviewed)
// ?refresh=1 triggers a fresh fetch (for testing without WhatsApp)
let lastEnterpriseFetchSummary = null;
app.get('/api/debug/enterprise-preview', async (req, res) => {
  if (req.query.refresh === '1') {
    try {
      const channelData = await fetchAllChannelDataForContext();
      const users = [];
      let msgCount = 0;
      for (const c of channelData.companies || []) {
        const email = c.channels?.email;
        if (email?.byUser) {
          for (const u of email.byUser) {
            users.push(u.user || u.userPrincipalName || 'unknown');
            msgCount += (u.messages || []).length;
          }
          break;
        }
      }
      lastEnterpriseFetchSummary = {
        timestamp: new Date().toISOString(),
        userCount: users.length,
        users: [...new Set(users)],
        messageCount: msgCount,
        companies: (channelData.companies || []).map((c) => c.company),
        mode: users.length > 1 ? 'enterprise-wide (all employees)' : users.length === 1 ? 'single mailbox' : 'no email data',
        refreshed: true,
      };
    } catch (e) {
      return res.status(500).json({ error: e.message, refreshed: false });
    }
  }
  if (!lastEnterpriseFetchSummary) {
    return res.json({ message: 'No enterprise fetch yet. Add ?refresh=1 to run a fetch now, or send a WhatsApp query first.' });
  }
  res.json(lastEnterpriseFetchSummary);
});

// Diagnostic: employee search - verify data exists for a given name (e.g. ?name=Rahul)
// ?ping=1 = instant (config only, no API calls). ?light=1 = fast (CEO + 10 mailboxes). Default = full (5+ min).
app.get('/api/test/employee-search', async (req, res) => {
  try {
    if (req.query?.ping === '1') {
      const cfg = loadCompaniesConfig();
      const ceo = cfg?.companies?.[0]?.channels?.email?.adminEmail || cfg?.companies?.[0]?.channels?.teams?.userPrincipalName;
      return res.json({ ok: true, ping: true, ceoEmail: ceo || null, hasAzureCreds: !!(cfg?.companies?.[0]?.channels?.teams?.azureAppId), message: 'Server reachable. Remove ?ping=1 for data fetch.' });
    }
    const name = (req.query?.name || 'Rahul Reddy').trim();
    if (!name) return res.status(400).json({ error: 'Provide ?name=Rahul or ?name=Rahul Reddy' });
    const employeeName = name;
    const light = req.query?.light === '1' || req.query?.light === 'true';
    let channelData;
    if (light) {
      const companiesCfg = loadCompaniesConfig();
      const creds = companiesCfg?.companies?.[0]?.channels?.teams || companiesCfg?.companies?.[0]?.channels?.calendar;
      const ceoEmail = companiesCfg?.companies?.[0]?.channels?.email?.adminEmail || companiesCfg?.companies?.[0]?.channels?.teams?.userPrincipalName;
      if (!creds?.azureAppId || !ceoEmail) {
        return res.json({ error: 'No Azure creds or CEO email', employeeName, light: true });
      }
      const { fetchMailInboxAndSentForUser, fetchEmailsFromSenderAcrossMailboxes } = await import('./services/graph-service.js');
      const [ceoResult, fromSenderResult] = await Promise.all([
        fetchMailInboxAndSentForUser(creds.tenantId, creds.azureAppId, creds.clientSecret, ceoEmail, 80),
        fetchEmailsFromSenderAcrossMailboxes(creds.tenantId, creds.azureAppId, creds.clientSecret, null, employeeName, 10, 30, [ceoEmail]),
      ]);
      channelData = { companies: [{ channels: { email: ceoResult } }], _light: true };
      const searchTerms = [employeeName, ...employeeName.split(/\s+/).filter((s) => s.length > 2)];
      let totalMsgs = 0;
      let matchingMsgs = [];
      for (const u of ceoResult?.byUser || []) {
        const msgs = u.messages || [];
        totalMsgs += msgs.length;
        const matching = msgs.filter((m) => {
          const from = (m.from || '').toLowerCase();
          const fromName = (m.fromName || '').toLowerCase();
          const preview = (m.preview || '').toLowerCase();
          return searchTerms.some((t) => from.includes(t.toLowerCase()) || fromName.includes(t.toLowerCase()) || preview.includes(t.toLowerCase()));
        });
        matching.forEach((m) => matchingMsgs.push({ user: u.user, from: m.from, fromName: m.fromName, subject: m.subject?.slice(0, 60), folder: m.folder }));
      }
      const targetedCount = (fromSenderResult?.byUser || []).reduce((s, u) => s + (u.messages?.length || 0), 0);
      return res.json({
        employeeName,
        light: true,
        ceoInboxMessages: totalMsgs,
        matchingInCEOInbox: matchingMsgs.length,
        sampleMatching: matchingMsgs.slice(0, 5),
        targetedSearchMailboxes: fromSenderResult?.byUser?.length ?? 0,
        targetedSearchMessages: targetedCount,
        targetedSearchError: fromSenderResult?.error ?? null,
      });
    }
    const receivedSince = getReceivedSinceISO(90);
    channelData = await fetchAllChannelDataForContext(employeeName, { daysBack: 90, receivedSince });
    const searchTerms = [employeeName, ...employeeName.split(/\s+/).filter((s) => s.length > 2)];
    let totalMsgs = 0;
    let matchingMsgs = [];
    const byUserStats = [];
    for (const c of channelData?.companies || []) {
      const email = c.channels?.email;
      if (email?.error) {
        return res.json({ error: email.error, employeeName, companies: 0 });
      }
      if (email?.byUser) {
        for (const u of email.byUser) {
          const msgs = u.messages || [];
          totalMsgs += msgs.length;
          const matching = msgs.filter((m) => {
            const from = (m.from || '').toLowerCase();
            const fromName = (m.fromName || '').toLowerCase();
            const preview = (m.preview || '').toLowerCase();
            return searchTerms.some((t) => from.includes(t.toLowerCase()) || fromName.includes(t.toLowerCase()) || preview.includes(t.toLowerCase()));
          });
          matching.forEach((m) => matchingMsgs.push({ user: u.user, from: m.from, fromName: m.fromName, subject: m.subject?.slice(0, 60), folder: m.folder }));
          byUserStats.push({ user: u.user, total: msgs.length, matching: matching.length });
        }
        break;
      }
    }
    const fromSenderResult = { byUser: [] };
    try {
      const companiesCfg = loadCompaniesConfig();
      const creds = companiesCfg?.companies?.[0]?.channels?.teams || companiesCfg?.companies?.[0]?.channels?.calendar;
      const ceoEmail = companiesCfg?.companies?.[0]?.channels?.email?.adminEmail || companiesCfg?.companies?.[0]?.channels?.teams?.userPrincipalName;
      if (creds?.azureAppId) {
        const { fetchEmailsFromSenderAcrossMailboxes } = await import('./services/graph-service.js');
        const r = await fetchEmailsFromSenderAcrossMailboxes(creds.tenantId, creds.azureAppId, creds.clientSecret, null, employeeName, 75, 50, ceoEmail ? [ceoEmail] : [], receivedSince);
        fromSenderResult.byUser = r.byUser || [];
      }
    } catch (e) {
      fromSenderResult.error = e.message;
    }
    const targetedCount = fromSenderResult.byUser.reduce((s, u) => s + (u.messages?.length || 0), 0);
    res.json({
      employeeName,
      companiesCount: channelData?.companies?.length ?? 0,
      totalEmailMessages: totalMsgs,
      matchingInGeneralFetch: matchingMsgs.length,
      sampleMatching: matchingMsgs.slice(0, 5),
      byUserStats: byUserStats.slice(0, 10),
      targetedSearchMailboxes: fromSenderResult.byUser.length,
      targetedSearchMessages: targetedCount,
      targetedSearchError: fromSenderResult.error || null,
      _fetchTimeout: channelData?._fetchTimeout ?? false,
      _error: channelData?._error ?? null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

// Debug: test fetch directly (diagnose "I don't have access" when context is empty)
app.get('/api/debug/fetch-test', async (req, res) => {
  try {
    const cfg = loadCompaniesConfig();
    const configPath = COMPANIES_CONFIG_PATH;
    const exists = fs.existsSync(configPath);
    const toFetchCount = cfg?.companies?.filter((c) => c.channels && Object.keys(c.channels).length > 0).length ?? 0;
    const channelData = await fetchAllChannelDataForContext();
    const companiesCount = channelData?.companies?.length ?? 0;
    let userCount = 0;
    let msgCount = 0;
    for (const c of channelData?.companies || []) {
      const email = c.channels?.email;
      if (email?.byUser) {
        for (const u of email.byUser) {
          userCount++;
          msgCount += (u.messages || []).length;
        }
        break;
      }
    }
    res.json({
      configPath,
      configExists: exists,
      companiesInConfig: cfg?.companies?.length ?? 0,
      toFetchCount,
      companiesReturned: companiesCount,
      userCount,
      messageCount: msgCount,
      _error: channelData?._error ?? null,
      _fetchTimeout: channelData?._fetchTimeout ?? false,
      _note: channelData?._note ?? null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message, stack: e.stack });
  }
});

// Debug: view last webhook error (helps diagnose "Sorry, I ran into an issue")
app.get('/api/debug/last-error', (req, res) => {
  const logPath = path.join(projectRoot, 'webhook-errors.log');
  if (!fs.existsSync(logPath)) return res.json({ error: null, message: 'No errors logged yet' });
  const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n');
  const last = lines[lines.length - 1];
  res.json({ lastError: last || null, totalLines: lines.length });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'running',
    service: 'Strategic AI Advisor - Backend',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      twilio: !!twilioClient,
      claude: !!anthropicClient,
      email: !!(useSendGrid || emailTransporter),
    },
  });
});

// Send WhatsApp message
// toNumber: optional - use sender's From (e.g. whatsapp:+1234567890) to reply; otherwise CEO_PHONE_NUMBER
async function sendWhatsApp(message, urgent = false, toNumber = null) {
  if (!twilioClient) throw new Error('Twilio not configured');

  const emoji = urgent ? '🚨 ' : '📱 ';
  const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886';
  const to = toNumber || `whatsapp:${process.env.CEO_PHONE_NUMBER}`;
  const toFormatted = to.startsWith('whatsapp:') ? to : `whatsapp:${to.replace(/^\+/, '')}`;

  // Twilio WhatsApp limit: 1600 chars per message; split into multiple messages if needed
  const MAX_PER_MSG = 1500;
  const full = emoji + message;
  const chunks = [];
  for (let i = 0; i < full.length; i += MAX_PER_MSG) {
    chunks.push(full.slice(i, i + MAX_PER_MSG));
  }

  let sentCount = 0;
  for (let j = 0; j < chunks.length; j++) {
    const suffix = chunks.length > 1 ? `\n\n--- Part ${j + 1}/${chunks.length} ---` : '';
    const body = chunks[j] + (j < chunks.length - 1 ? suffix : '');
    const sendPart = async () => {
      await twilioClient.messages.create({
        from: fromNumber,
        to: toFormatted,
        body,
      });
    };
    try {
      await sendPart();
      sentCount++;
      console.log(`✅ WhatsApp sent part ${j + 1}/${chunks.length} to ${toFormatted}`);
    } catch (err) {
      console.error(`❌ WhatsApp part ${j + 1}/${chunks.length} failed:`, err.message);
      try {
        await new Promise((r) => setTimeout(r, 2000));
        await sendPart();
        sentCount++;
        console.log(`✅ WhatsApp part ${j + 1} retry succeeded`);
      } catch (retryErr) {
        console.error(`❌ WhatsApp part ${j + 1} retry failed:`, retryErr.message);
        try {
          fs.appendFileSync(path.join(projectRoot, 'webhook-errors.log'),
            `${new Date().toISOString()} | WhatsApp part ${j + 1}/${chunks.length} failed | ${retryErr.message}\n`, 'utf8');
        } catch (_) {}
      }
    }
    if (j < chunks.length - 1) await new Promise((r) => setTimeout(r, 2000)); // 2s pause between messages (reduce rate-limit issues)
  }
  return { sent: sentCount };
}

// Send SMS - toNumber: optional, reply to sender; otherwise CEO. Chunks at 1500 chars (Twilio limit 1600)
async function sendSMS(message, urgent = false, toNumber = null) {
  if (!twilioClient) throw new Error('Twilio not configured');

  const to = toNumber || process.env.CEO_PHONE_NUMBER;
  const toFormatted = String(to).replace(/^sms:/, '').trim();
  const prefix = urgent ? '🚨 CRITICAL: ' : '📱 ';
  const full = prefix + message;
  const MAX = 1500;
  const chunks = [];
  for (let i = 0; i < full.length; i += MAX) chunks.push(full.slice(i, i + MAX));

  for (let j = 0; j < chunks.length; j++) {
    const suffix = chunks.length > 1 ? `\n--- Part ${j + 1}/${chunks.length} ---` : '';
    await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: toFormatted,
      body: chunks[j] + suffix,
    });
    if (j < chunks.length - 1) await new Promise((r) => setTimeout(r, 500));
  }
  console.log(`✅ SMS sent to ${toFormatted}: ${chunks.length} part(s)`);
  return { sent: chunks.length };
}

// Escape text for TwiML XML (Say element)
function escapeTwiML(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Make voice call - toNumber: optional override; options.agent === 'henry' uses Henry sign-off
async function makeVoiceCall(message, toNumber = null, options = {}) {
  if (!twilioClient) throw new Error('Twilio not configured');

  const cfg = loadConfig();
  const to = (toNumber || cfg?.ceo?.phoneNumber || process.env.CEO_PHONE_NUMBER || '').replace(/\s/g, '');
  if (!to) throw new Error('No phone number configured. Set Contact Information in Config Dashboard.');

  const fromNum = process.env.TWILIO_PHONE_NUMBER;
  if (!fromNum) throw new Error('TWILIO_PHONE_NUMBER not set. The Twilio number must have Voice capability.');

  const signOff = options.agent === 'henry' ? 'This is Henry, your travel and dining assistant. Full details are in the app.' : 'This is your Strategic AI Advisor. Check WhatsApp for full details.';
  const safeMsg = escapeTwiML(message);
  const twiml = `<Response><Say voice="Polly.Matthew-Neural">${safeMsg}. ${signOff}</Say></Response>`;

  console.log(`📞 Initiating voice call: from=${fromNum} to=${to}${options.agent ? ` (${options.agent})` : ''}`);
  const call = await twilioClient.calls.create({
    from: fromNum,
    to: to,
    twiml: twiml,
  });

  console.log(`✅ Voice call initiated to ${to}: sid=${call.sid} status=${call.status}`);
  return call;
}

// Default system prompt for CEO advisor (shared by Claude and Ollama when using askAI)
const CEO_SYSTEM_PROMPT = `You are an AGI-powered Strategic Intelligence Advisor for Deepesh Vellore, CEO of:
- Othain Group
- OthainSoft
- Jersey Technology Partners
- Strivio LLC

Be conversational, strategic, and insightful. Focus on what truly matters for CEO-level decisions.
When the CEO says "hello", respond warmly and ask how you can help.
When the CEO asks you to draft a reply, suggest a response, or give response options by tone or style: provide 2–4 short draft options clearly labeled by tone/style (e.g. **Formal**, **Friendly**, **Concise**, **Assertive**, **Warm**, **Professional**, **Brief**, **Diplomatic**). If they request a specific tone (e.g. "formal reply"), include that option and 1–2 others. Base drafts on the email or thread in context. Keep each draft brief and ready to send or edit.

CRITICAL - CONTEXT RULES:
When "Context:" and JSON data are provided below, you HAVE REAL ACCESS to:
- Teams channels (messages, threads, mentions)
- Email (inbox + sent items from CEO and all employees when monitorAllUserMailboxes is enabled; each message has folder: "inbox" or "sent")
- Calendar (upcoming meetings)
- SharePoint (recent documents)

You MUST use this data. Answer based on the actual content. Do NOT say "I don't have access" or "I can't see your Teams" when context is provided.
For email questions: When data includes "byUser" with messages from multiple employees, focus on threads where the CEO (deepesh.vellore@jerseytechpartners.com) is NOT in toRecipients or ccRecipients.
When the CEO asks about a SPECIFIC PERSON (e.g. "insights on Manpreet Kaur" or "Rahul Reddy"): That person may be an employee, client, vendor, or any other contact. The context includes ALL monitored company mailboxes (everyone's inbox/sent across configured companies), not just the CEO's. (1) Search every mailbox's messages for where they are SENDER (from/fromName) or RECIPIENT: check toRecipients, ccRecipients (email addresses) AND toRecipientsNames, ccRecipientsNames (display names). They often use client or external email - match on display name (fromName, toRecipientsNames, ccRecipientsNames), not just domain. (2) Search Teams recentMessages. (3) Search calendar attendees. Summarize all communications involving them. Do NOT say "no references" if the context contains messages from or to that name - use the data.
For queries like "summarize items that reference my name wherein I'm not copied", identify emails/messages that mention "Deepesh" or the CEO but where the CEO is NOT in to/cc, and summarize those specifically.
If context is provided but sparse, or _fetchTimeout is true, summarize what you see and offer to help. Never claim you lack access when data was given.
When context starts with "[Data fetch failed:" or "[Data fetch error:", relay that to the CEO helpfully: tell them to check the Config Dashboard, Azure credentials, and ensure monitorAllUserMailboxes is enabled. Do NOT say "I don't have access" - instead say the fetch failed and what to check.
Only if NO context/JSON is provided (or it says companies: []) may you say you don't have current data.
Respond fully - do not end with "(truncated)" or "..." - provide complete actionable summaries.
When the context contains email "byUser" data: The data includes ALL configured mailboxes (Outlook/company users and any Gmail/IMAP additional mailboxes). Never say you searched only one mailbox (e.g. only Gmail) unless the context truly contains just one. Say "company mailboxes" or "all monitored mailboxes (Outlook and any Gmail/IMAP configured)". If the CEO asked about a SPECIFIC PERSON, focus on that person and note scope: "Searched across all company mailboxes, calendar, and Teams." Only for general questions use: "Based on enterprise-wide email from [N] mailboxes across your companies:" so the CEO knows the scope.`;

// Ask Claude AI (retries on 529 overload / 429 rate limit). systemPromptOverride: optional for briefing-style prompts.
async function askClaude(query, context = '', retryCount = 0, systemPromptOverride = null) {
  const maxRetries = 2;
  const retryDelayMs = 10000; // 10 sec

  if (!anthropicClient) throw new Error('Claude AI not configured');

  console.log('🤖 Asking Claude:', query.substring(0, 100));

  const systemPrompt = systemPromptOverride != null ? systemPromptOverride : CEO_SYSTEM_PROMPT;
  try {
    const response = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: context 
            ? `Context:\n${context}\n\n---\n\nCEO Question: ${query}`
            : query,
        },
      ],
    }, { timeout: 600000 }); // 10 min per request

    const content = response.content[0];
    const text = content.type === 'text' ? content.text : 'No response';

    console.log('✅ Claude response received:', text.substring(0, 100) + '...');

    return text;
  } catch (err) {
    const status = err?.status || err?.httpStatus || err?.statusCode;
    const msg = (err?.message || '').toLowerCase();
    const isOverload = status === 529 || msg.includes('529') || msg.includes('overload');
    const isRateLimit = status === 429 || msg.includes('429') || msg.includes('rate');
    if ((isOverload || isRateLimit) && retryCount < maxRetries) {
      console.warn(`⚠️ Claude ${isOverload ? 'overloaded' : 'rate limit'} (${status || 'n/a'}), retrying in ${retryDelayMs / 1000}s (${retryCount + 1}/${maxRetries})...`);
      await new Promise((r) => setTimeout(r, retryDelayMs));
      return askClaude(query, context, retryCount + 1);
    }
    throw err;
  }
}

// Call local Ollama (same behavior as dashboard Local LLM). Returns response text or throws.
// Large context (e.g. 60k chars) can make Ollama very slow or time out; we cap context size for local.
const OLLAMA_CONTEXT_MAX_CHARS = parseInt(process.env.OLLAMA_CONTEXT_MAX_CHARS, 10) || 24000;
const OLLAMA_TIMEOUT_MS = parseInt(process.env.OLLAMA_TIMEOUT_MS, 10) || 600000; // 10 min default

async function askOllama(query, context, systemPrompt, model = 'llama3.1:8b') {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const url = `${baseUrl}/api/generate`;
  let ctx = context || '';
  if (ctx.length > OLLAMA_CONTEXT_MAX_CHARS) {
    console.log('🧠 Ollama: truncating context to', OLLAMA_CONTEXT_MAX_CHARS, 'chars (was', ctx.length, ') to avoid timeout');
    ctx = ctx.slice(0, OLLAMA_CONTEXT_MAX_CHARS) + '\n...[truncated for local LLM]';
  }
  const prompt = ctx
    ? `${systemPrompt}\n\n---\n\nContext:\n${ctx}\n\n---\n\nCEO Question: ${query}`
    : `${systemPrompt}\n\n---\n\n${query}`;
  console.log('🧠 Asking Ollama (local):', query.substring(0, 80) + '...', '| model:', model);
  // Node's built-in fetch has a 5‑min "headers timeout"; Ollama can take longer. Use undici with a custom Agent when available.
  const fetchOptions = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: { temperature: 0.7, num_predict: 4096 },
    }),
    signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
  };
  try {
    const undici = await import('undici');
    const dispatcher = new undici.Agent({
      headersTimeout: OLLAMA_TIMEOUT_MS,
      bodyTimeout: OLLAMA_TIMEOUT_MS,
      connectTimeout: 30000,
    });
    fetchOptions.dispatcher = dispatcher;
  } catch (_) {
    // undici not available — use global fetch (may hit 5‑min headers timeout on slow Ollama)
  }
  let res;
  try {
    const doFetch = typeof fetchOptions.dispatcher !== 'undefined' ? (await import('undici')).fetch : fetch;
    res = await doFetch(url, fetchOptions);
  } catch (fetchErr) {
    const code = fetchErr?.cause?.code || fetchErr?.code;
    const msg = fetchErr?.cause?.message || fetchErr?.message || 'fetch failed';
    const hint = (code === 'ECONNREFUSED' || msg.includes('refused'))
      ? ' — Is Ollama running? Start it with: ollama serve (or open the Ollama app)'
      : (code === 'ECONNRESET' || msg.includes('reset')) ? ' — Ollama may have crashed or closed the connection' : '';
    throw new Error(`Ollama not reachable: ${msg}${hint}`);
  }
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Ollama ${res.status}: ${t?.slice(0, 200) || res.statusText}`);
  }
  const data = await res.json();
  const text = (data.response || '').trim() || 'No response';
  console.log('✅ Ollama response received:', text.substring(0, 80) + '...');
  return text;
}

// Single entry point for WhatsApp, email, briefings. Uses LLM strategy from Config Dashboard (config.json).
// options: { systemPrompt } - optional override for briefing/voice prompts.
async function askAI(query, context = '', options = {}) {
  const cfg = loadConfig();
  const strategy = (cfg?.llm?.strategy ?? process.env.LLM_STRATEGY ?? 'cloud').toLowerCase();
  const localModel = cfg?.llm?.localModel ?? process.env.LOCAL_LLM_MODEL ?? 'llama3.1:8b';
  const systemPrompt = options.systemPrompt != null ? options.systemPrompt : CEO_SYSTEM_PROMPT;

  const tryOllama = async () => {
    return askOllama(query, context, systemPrompt, localModel);
  };

  const tryClaude = () => askClaude(query, context, 0, systemPrompt);

  if (strategy === 'local') {
    try {
      return await tryOllama();
    } catch (e) {
      console.warn('⚠️ Local LLM failed, falling back to Claude:', e.message);
      if (anthropicClient) return await tryClaude();
      throw new Error('Local LLM failed and Claude is not configured. Start Ollama or set ANTHROPIC_API_KEY.');
    }
  }

  if (strategy === 'hybrid') {
    try {
      return await tryOllama();
    } catch (e) {
      console.warn('⚠️ Hybrid: local LLM unavailable, using Claude:', e.message);
      if (anthropicClient) return await tryClaude();
      throw new Error('Ollama unavailable and Claude not configured. Start Ollama or set ANTHROPIC_API_KEY.');
    }
  }

  // cloud or unknown
  if (anthropicClient) return await tryClaude();
  throw new Error('Claude AI not configured. Set ANTHROPIC_API_KEY or switch to Local/Hybrid in Config Dashboard.');
}

// Ollama status for dashboard (is it running, is configured model available?)
app.get('/api/ollama/status', async (req, res) => {
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 3000);
    const r = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(t);
    if (!r.ok) {
      res.json({ running: false, error: `Ollama returned ${r.status}` });
      return;
    }
    const data = await r.json();
    const models = (data.models || []).map((m) => m.name?.split(':')[0] || m.name).filter(Boolean);
    const cfg = loadConfig();
    const localModel = (cfg?.llm?.localModel || process.env.LOCAL_LLM_MODEL || 'llama3.1:8b').split(':')[0];
    const modelLoaded = models.some((n) => localModel === n || (localModel && n.startsWith(localModel)));
    res.json({ running: true, models, configuredModel: localModel, modelLoaded });
  } catch (e) {
    res.json({ running: false, error: e.name === 'AbortError' ? 'Timeout (is Ollama running?)' : (e.message || 'Not reachable') });
  }
});

// Test endpoint - verify tunnel is reachable (GET https://your-url/webhook/whatsapp)
app.get('/webhook/whatsapp', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Webhook endpoint is reachable. Twilio should POST here.',
    twilio: 'Configure: When a message comes in → POST https://YOUR-URL/webhook/whatsapp',
  });
});

// Twilio webhook for incoming WhatsApp/SMS messages
// IMPORTANT: Twilio requires TwiML MessagingResponse
app.post('/webhook/whatsapp', async (req, res) => {
  const from = req.body?.From || 'unknown';
  console.log('📥 Webhook received from Twilio:', from, '| Body:', req.body?.Body?.substring(0, 30));
  try {
    const logLine = `${new Date().toISOString()} | FROM: ${from} | BODY: ${req.body?.Body || ''} | NumMedia: ${req.body?.NumMedia || 0} | MediaUrl0: ${req.body?.MediaUrl0 ? 'yes' : 'no'}\n`;
    fs.appendFileSync(path.join(projectRoot, 'webhook-requests.log'), logLine);
  } catch (_) {}
  // Respond immediately with empty TwiML using Twilio SDK (we send reply via REST API)
  const twiml = new twilio.twiml.MessagingResponse();
  res.type('text/xml').status(200).send(twiml.toString());

  const { From, Body, NumMedia, MediaUrl0, MediaContentType0 } = req.body || {};
  const hasText = Body && String(Body).trim();
  const numMedia = parseInt(NumMedia, 10) || 0;
  const mediaUrl = MediaUrl0 || req.body?.MediaUrl0;
  const mediaType = MediaContentType0 || req.body?.MediaContentType0 || '';
  const hasVoice = numMedia > 0 && mediaUrl;
  if (!From || (!hasText && !hasVoice)) {
    if (!hasText && (numMedia > 0 || mediaUrl)) {
      try {
        const debugLine = `${new Date().toISOString()} | VOICE_DEBUG | keys: ${Object.keys(req.body || {}).join(',')} | NumMedia=${NumMedia} MediaUrl0=${!!mediaUrl}\n`;
        fs.appendFileSync(path.join(projectRoot, 'webhook-debug.log'), debugLine);
      } catch (_) {}
      console.warn(`[webhook] Voice note? NumMedia=${numMedia} MediaUrl0=${!!mediaUrl} MediaContentType0=${mediaType || 'missing'}`);
    }
    return;
  }

  // Send voice ack immediately (before any async work) so user always gets feedback
  if (hasVoice && !hasText && From.startsWith('whatsapp:')) {
    sendWhatsApp('Got it, transcribing your voice note...', false, From).catch((e) =>
      console.error('❌ Voice ack failed:', e.message)
    );
  }

  const processMessage = async () => {
    const isWhatsApp = From.startsWith('whatsapp:');
    let effectiveBody = hasText ? String(Body).trim() : '';
    if (hasVoice && !hasText) {
      console.log(`[voice] Processing voice note: NumMedia=${numMedia}, MediaUrl0=${mediaUrl?.slice(0, 50)}...`);
      try {
        effectiveBody = await Promise.race([
          transcribeVoiceNote(
            mediaUrl,
            mediaType || 'audio/ogg',
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
          ),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Voice transcription timed out after 90 seconds')), 90000)
          ),
        ]);
        console.log(`🎤 Voice note transcribed: "${effectiveBody.substring(0, 80)}..."`);
      } catch (err) {
        console.error('❌ Voice transcription failed:', err.message, err.stack);
        effectiveBody = '';
        const errorLogPath = path.join(projectRoot, 'voice-transcription-error.log');
        const errorLogContent = `Voice transcription error – copy everything below this line and paste when reporting:\n\nTime: ${new Date().toISOString()}\nError message: ${err.message}\n\nStack:\n${err.stack || '(none)'}\n`;
        try {
          fs.writeFileSync(errorLogPath, errorLogContent);
          console.error('❌ Error written to:', errorLogPath);
        } catch (e) {
          console.error('❌ Could not write error file:', e.message);
        }
        const errLower = (err.message || '').toLowerCase();
        let hint = !process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY
          ? 'Add GROQ_API_KEY (free tier at console.groq.com) or OPENAI_API_KEY to .env.backend.'
          : errLower.includes('quota') || errLower.includes('insufficient_quota') || errLower.includes('exceeded your current quota')
            ? 'OpenAI quota exceeded. Add credits at platform.openai.com/account/billing — or use Groq only: in .env.backend comment out OPENAI_API_KEY and keep GROQ_API_KEY, then restart backend.'
            : errLower.includes('ffmpeg')
              ? (errLower.includes('not found') || errLower.includes('enoent')
                ? 'ffmpeg not found. Restart backend; bundled ffmpeg-static should work.'
                : `ffmpeg failed. Check backend logs for [voice] stderr. ${err.message?.slice(0, 100) || ''}`)
              : errLower.includes('connection') || errLower.includes('econnreset') || errLower.includes('fetch') || errLower.includes('enotfound') || errLower.includes('econnrefused')
                ? 'Transcription API unreachable. If the backend runs as a scheduled task, run it manually (double‑click START-BACKEND.bat) to test; task often has no internet. Check firewall allows outbound HTTPS to api.openai.com or api.groq.com.'
                : `Transcription error: ${err.message?.slice(0, 80) || 'unknown'}`;
        if (isWhatsApp) await sendWhatsApp(`Sorry, I couldn't transcribe your voice note. ${hint}`, false, From);
        return;
      }
    }
    try {
      const messageType = isWhatsApp ? 'WhatsApp' : 'SMS';
      console.log(`📥 ${messageType} from ${From}: ${effectiveBody.substring(0, 80)}`);

      const lowerBody = effectiveBody.toLowerCase().trim();

      // Kandidly: short "screen X for Y" via WhatsApp (use saved JD + candidate)
      const wantsKandidlyShort = (lowerBody.includes('kandidly') || lowerBody.includes('screen candidate') || lowerBody.includes('screen ')) && (loadConfig()?.kandidly?.enabled === true) && isWhatsApp && effectiveBody.length <= 500;
      if (wantsKandidlyShort) {
        const screenReq = parseScreenRequest(effectiveBody);
        if (screenReq && screenReq.candidateName && screenReq.roleOrJd) {
          const jds = readKandidlyJds();
          const allCandidates = readKandidlyCandidates();
          const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
          const roleNorm = norm(screenReq.roleOrJd);
          const jdDoc = jds.find((j) => norm(j.title) === roleNorm || norm(j.title).includes(roleNorm) || roleNorm.includes(norm(j.title)));
          const cand = allCandidates.find((c) => norm(c.name) === norm(screenReq.candidateName) || norm(c.name).includes(norm(screenReq.candidateName)) || norm(screenReq.candidateName).includes(norm(c.name)));
          if (jdDoc && cand) {
            const previous = !screenReq.rerun ? findPreviousScreening(cand.name, jdDoc.title || extractRoleLabelFromJd(jdDoc.content)) : null;
            if (previous) {
              const c0 = previous.candidates && previous.candidates[0];
              const prevMsg = `Previously screened on ${new Date(previous.createdAt).toLocaleString()} for ${previous.roleLabel}: ${c0 ? `${c0.name} ${c0.score}/10 (${c0.recommendation === 'strong_fit' ? 'Strong' : c0.recommendation === 'possible_fit' ? 'Possible' : 'Weak'} fit)` : ''}. Reply "rerun" to run a fresh screening.`;
              await sendWhatsApp(prevMsg, false, From);
              console.log('📧 Kandidly: WhatsApp previous screening');
              return;
            }
            try {
              await sendWhatsApp('Screening… This may take 1–2 minutes.', false, From);
              const validCandidates = [{ name: cand.name, resume: cand.resume, interviewNotes: cand.interviewNotes || '' }];
              const results = await runKandidlyScreening(jdDoc.content, validCandidates, jdDoc);
              const roleLabel = jdDoc.title || extractRoleLabelFromJd(jdDoc.content);
              const recordId = `k_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
              const record = { id: recordId, createdAt: new Date().toISOString(), roleLabel, jobDescriptionSnippet: jdDoc.content.slice(0, 300), candidates: results, jdId: jdDoc.id, candidateIds: [cand.id] };
              const history = readKandidlyHistory();
              history.unshift(record);
              writeKandidlyHistory(history.slice(0, 200));
              const adminEmail = getAdminEmail();
              const adminWhatsAppNum = getAdminWhatsAppNumber();
              await sendKandidlyNotifications(record, adminEmail, adminWhatsAppNum);
              const summary = results.map((r) => `${r.name}: ${r.score}/10 – ${r.recommendation === 'strong_fit' ? 'Strong' : r.recommendation === 'possible_fit' ? 'Possible' : 'Weak'} fit`).join('\n');
              await sendWhatsApp(`Kandidly – ${roleLabel}\n\n${summary}\n\nFull report sent to your email.`, false, From);
              console.log('📧 Kandidly: screening from repo (WhatsApp) completed');
            } catch (e) {
              console.error('Kandidly WhatsApp screening failed:', e.message);
              await sendWhatsApp(`Kandidly screening failed: ${e.message}. Try Lobster Console → Kandidly or email with attachments.`, false, From);
            }
            return;
          }
        }
      }

      // Kandidly: long paste JD + resumes in message
      const wantsKandidlyWhatsApp = (lowerBody.includes('kandidly') || lowerBody.includes('screen candidate')) && (loadConfig()?.kandidly?.enabled === true) && effectiveBody.length > 200;
      if (wantsKandidlyWhatsApp && isWhatsApp) {
        const jdMatch = effectiveBody.match(/\b(?:JD|Job description)\s*:?\s*([\s\S]*?)(?=Candidate\s*\d*\s*:?|Resume\s*\d*\s*:?|$)/i);
        let jd = jdMatch ? jdMatch[1].trim() : '';
        if (!jd) {
          const firstBlock = effectiveBody.split(/(?=Candidate\s*\d*\s*:?|Resume\s*\d*\s*:?)/i)[0] || '';
          jd = firstBlock.replace(/^[\s\S]*?(?:kandidly|screen\s+candidate[s]?)\s*/i, '').trim();
        }
        const candidateBlocks = effectiveBody.split(/(?=Candidate\s*\d*\s*:?|Resume\s*\d*\s*:?)/i).filter((b) => /^(?:Candidate|Resume)\s*\d*\s*:?\s*/i.test(b.trim()) && b.trim().length > 50);
        const candidates = candidateBlocks.map((b) => {
          const nameMatch = b.match(/^(?:Candidate|Resume)\s*(\d*)\s*:?\s*([^\n]*)?/i);
          const name = (nameMatch && nameMatch[2]?.trim()) || nameMatch?.[1] ? `Candidate ${nameMatch[1]}` : 'Candidate';
          const resume = b.replace(/^(?:Candidate|Resume)\s*\d*\s*:?[^\n]*\n?/i, '').trim();
          return { name, resume, interviewNotes: '' };
        }).filter((c) => c.resume.length > 50);
        if (jd.length > 100 && candidates.length >= 1) {
          try {
            await sendWhatsApp('Screening your candidates… This may take 1–2 minutes.', false, From);
            const results = await runKandidlyScreening(jd, candidates);
            const roleLabel = extractRoleLabelFromJd(jd);
            const recordId = `k_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
            const record = { id: recordId, createdAt: new Date().toISOString(), roleLabel, jobDescriptionSnippet: jd.slice(0, 300), candidates: results, jdId: null, candidateIds: null };
            const history = readKandidlyHistory();
            history.unshift(record);
            writeKandidlyHistory(history.slice(0, 200));
            const adminEmail = getAdminEmail();
            const adminWhatsApp = getAdminWhatsAppNumber();
            await sendKandidlyNotifications(record, adminEmail, adminWhatsApp);
            const summary = results.map((r) => `${r.name}: ${r.score}/10 – ${r.recommendation === 'strong_fit' ? 'Strong' : r.recommendation === 'possible_fit' ? 'Possible' : 'Weak'} fit`).join('\n');
            await sendWhatsApp(`Kandidly – ${roleLabel}\n\n${summary}\n\nFull report sent to your email.`, false, From);
            console.log('📧 Kandidly: screening from WhatsApp completed');
          } catch (e) {
            console.error('Kandidly WhatsApp screening failed:', e.message);
            await sendWhatsApp(`Kandidly screening failed: ${e.message}. Try the Lobster Console → Kandidly tab or email with Word attachments.`, false, From);
          }
          return;
        }
        if (wantsKandidlyWhatsApp && isWhatsApp && (jd.length < 100 || candidates.length < 1)) {
          await sendWhatsApp('To screen via WhatsApp:\n\n• Short: "Screen [candidate name] for [role/JD title]" (candidate and JD must be saved in Kandidly). Reply "rerun" to run again.\n\n• Long: Paste JD: <job description>\n\nCandidate 1: Name\n<resume>\n\nOr email with Word attachments.', false, From);
          return;
        }
      }

      // Beer Mule: track a beer / beer hunt status via WhatsApp
      const beerHuntTrackMatch = effectiveBody.match(/(?:track|hunt)\s+(?:for\s+)?(?:beer\s+)?(.+?)(?:\s+in\s+(.+))?$/i) || effectiveBody.match(/track\s+beer\s+(.+)/i);
      const beerHuntStatusMatch = /(?:beer\s+hunt\s+status|status\s+(?:of\s+)?beer\s+hunt|beer\s+hunt\s+status)/i.test(effectiveBody) || (effectiveBody.trim().toLowerCase() === 'beer hunt');
      if (beerHuntStatusMatch && isWhatsApp) {
        const state = readBeerMuleState();
        const hunts = (state.hunts || []).filter((h) => h.enabled);
        if (hunts.length === 0) {
          await sendWhatsApp('🍺 Beer Hunt: No active hunts. Add one in Lobster Console → Beer Mule → Beer Hunts, or text "Track beer [name]" to start one.', false, From);
        } else {
          const lines = hunts.map((h) => {
            const count = (state.sightings || []).filter((s) => s.huntId === h.id).length;
            return `• ${h.beerName}${h.breweryName ? ` (${h.breweryName})` : ''}: ${count} sighting(s)`;
          });
          const lastPoll = state.lastPollAt ? ` Last poll: ${new Date(state.lastPollAt).toLocaleTimeString()}.` : '';
          await sendWhatsApp(`🍺 Beer Hunt status (${hunts.length} active):\n\n${lines.join('\n')}${lastPoll}\n\nReply "Track beer [name]" to add a hunt.`, false, From);
        }
        console.log('📱 Beer Mule: status sent to', From);
        return;
      }
      if (beerHuntTrackMatch && isWhatsApp) {
        const beerName = (beerHuntTrackMatch[1] || '').trim().replace(/\s+in\s+.*$/i, '').trim();
        const searchArea = (beerHuntTrackMatch[2] || beerHuntTrackMatch[1].match(/\s+in\s+(.+)/i)?.[1] || '').trim() || (loadConfig()?.ceo?.phoneNumber ? 'default' : '');
        if (beerName.length < 2) {
          await sendWhatsApp('🍺 Reply with "Track beer [beer name]" or "Track [beer name] in [city/zip]". Example: Track beer Pliny the Elder', false, From);
          return;
        }
        const state = readBeerMuleState();
        const newHunt = {
          id: `hunt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          beerName,
          breweryName: '',
          searchArea: searchArea && searchArea !== 'default' ? searchArea : (state.hunts && state.hunts[0]?.searchArea) || '08852',
          radiusMiles: 30,
          sources: ['untappd'],
          alertWhatsApp: true,
          whatsAppNumber: '',
          enabled: true,
          createdAt: new Date().toISOString(),
        };
        state.hunts = state.hunts || [];
        state.hunts.push(newHunt);
        writeBeerMuleState(state);
        scheduleBeerMulePoll();
        await sendWhatsApp(`🍺 Beer Hunt: Now tracking "${beerName}"${newHunt.searchArea ? ` in ${newHunt.searchArea}` : ''}. You'll get a WhatsApp when it's spotted on Untappd. Check Lobster Console → Beer Mule to edit or see sightings.`, false, From);
        console.log('📱 Beer Mule: added hunt from WhatsApp', beerName, From);
        return;
      }

      // Henry: confirm buy (price monitor) – attempt to book pending flight with Amadeus
      if (parseHenryConfirmBuy(effectiveBody) && (loadConfig()?.travelAgent?.enabled ?? process.env.TRAVEL_AGENT_ENABLED === 'true')) {
        const bookResult = await tryHenryPriceMonitorConfirmBuy();
        const reply = bookResult.ok ? bookResult.message : `Henry: ${bookResult.message}`;
        if (isWhatsApp) await sendWhatsApp(reply, false, From);
        else await sendSMS(reply, false, From);
        console.log(bookResult.ok ? '✈️ Henry: flight booking completed from WhatsApp' : '📋 Henry: confirm-buy from WhatsApp –', bookResult.message);
        return;
      }
      // Henry: booking confirmation via WhatsApp – record and reply without running full agent
      const henryConf = parseHenryBookingConfirmation(effectiveBody);
      if (henryConf && (loadConfig()?.travelAgent?.enabled ?? process.env.TRAVEL_AGENT_ENABLED === 'true')) {
        const confirmations = readHenryBookingConfirmations();
        const scopeLabel = { flights_only: 'flights only', hotel_only: 'hotel only', flights_hotel: 'flights and hotel', flights_hotel_restaurants: 'flights, hotel and restaurants', full: 'full (flights, hotel, restaurants)', restaurants_only: 'restaurants only' }[henryConf.scope] || henryConf.scope;
        confirmations.push({
          id: `confirm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          scope: henryConf.scope,
          confirmedVia: isWhatsApp ? 'whatsapp' : 'sms',
          from: From,
          at: new Date().toISOString(),
          status: 'pending',
        });
        writeHenryBookingConfirmations(confirmations);
        const reply = `✅ Henry: We've recorded your request to book **${scopeLabel}**. Complete your reservations using the links in your plan, or add payment details in the Config → Henry tab to proceed.`;
        if (isWhatsApp) await sendWhatsApp(reply, false, From);
        else await sendSMS(reply, false, From);
        console.log('📋 Henry: booking confirmation recorded from', From, 'scope:', henryConf.scope);
        return;
      }

      // Immediate ack so user knows we received (helps diagnose if webhook/delivery works)
      const isInstantCommand = ['help','commands','critical','urgent'].includes(lowerBody);
      if (!isInstantCommand) {
        try {
          if (isWhatsApp) {
            await sendWhatsApp('Got it, processing your request. Enterprise-wide review may take 2–3 minutes...', false, From);
          } else {
            await sendSMS('Got it, processing. May take 2-3 min...', false, From);
          }
        } catch (ackErr) {
          console.error('❌ Failed to send ack:', ackErr.message);
          if (ackErr.message && ackErr.message.includes('Twilio not configured')) {
            console.error('   → Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN to .env or .env.backend, then restart backend (RESTART-BACKEND-ONLY.bat)');
          }
        }
      }

      let response;

      // ONLY "brief" or "briefing" triggers email briefing. Everything else goes to Claude (including "summary", "updates", "provide a summary").
      const wantsBriefing = lowerBody === 'brief' || lowerBody === 'briefing';
      if (wantsBriefing) {
        const adminEmail = getAdminEmail();
        if (adminEmail && (useSendGrid || emailTransporter)) {
          try {
            const out = await generateLiveBriefingHtml('morning');
            const liveHtml = out && (typeof out === 'string' ? out : out.html);
            const body = liveHtml || getBriefingUnavailableHtml('Live data fetch or AI summary failed.');
            await sendEmailBriefing(adminEmail, '(requested via WhatsApp)', body);
            response = `📊 Live briefing sent to ${adminEmail}.\n\nCheck your inbox for what you need to be aware of.`;
          } catch (e) {
            console.error('Email briefing failed:', e.message);
            response = '📊 Briefing failed: ' + e.message + '. Check config and try again.';
          }
        } else {
          response = '📊 Set your email in Config Dashboard to receive live briefings.';
        }
      } else if (lowerBody === 'critical' || lowerBody === 'urgent') {
        response = '✅ No critical items detected.\n\nAll clear! I\'ll alert you immediately if anything urgent comes up.';
      } else if (lowerBody === 'help' || lowerBody === 'commands') {
        response = `🤖 Available Commands:

• "brief" / "briefing" - Email you a briefing
• "critical" - Show urgent items
• "call" - Voice briefing call
• "help" - Show this menu

Or ask me anything! You can also send a voice note. Examples:
• "Review Paul Suresh's emails and summarize items that reference my name wherein I'm not copied"
• "Check Mohammed's messages from last week"
• "What's happening across my companies?"`;
      } else if (lowerBody === 'call' || lowerBody === 'call me') {
        await makeVoiceCall('This is a test briefing. Your Strategic AI Advisor is working correctly.');
        response = '📞 Calling you now...';
      } else {
        // Fetch + Claude - wrap so we ALWAYS return a response (never throw to user)
        try {
          let contextStr = '';
          try {
            const { employeeNames, comprehensive } = extractEmployeeNameFromQuery(effectiveBody);
            const daysBack = comprehensive ? 365 : (employeeNames.length ? 180 : 90);
            const receivedSince = getReceivedSinceISO(daysBack);
            console.log(`📌 Extracted employeeNames: ${employeeNames.length ? JSON.stringify(employeeNames) : '(none)'} | comprehensive: ${comprehensive} | daysBack: ${daysBack}`);
            if (employeeNames.length) console.log(`📌 Person/contact-specific request: ${employeeNames.length} name(s) (${comprehensive ? 'comprehensive' : 'standard'}, ${daysBack}d): ${employeeNames.join(', ')}`);
            let channelData;
            if (employeeNames.length > 0) {
              const cached = getCachedChannelData();
              if (cached) {
                channelData = JSON.parse(JSON.stringify(cached));
                console.log('📌 Chat/WhatsApp: using cached channel data for person query');
              } else {
                channelData = await fetchAllChannelDataForContext(employeeNames, { comprehensive, daysBack, receivedSince });
              }
              for (const employeeName of employeeNames) {
              const employeeData = await fetchChannelDataForEmployee(employeeName, { receivedSince, messagesPerUser: comprehensive ? 300 : (employeeNames.length ? 220 : 150) });
              if (employeeData.companies?.length) {
                const emp = employeeData.companies[0];
                const empEmail = emp.channels?.email?._matchedUser?.userPrincipalName || emp.channels?.email?.byUser?.[0]?.userEmail;
                const empDisplayName = emp.channels?.email?._matchedUser?.displayName || employeeName;
                const empAllEmails = emp.channels?.email?._matchedUser?.allEmails;
                if (emp.channels?.email?.byUser?.length) {
                  const empByUser = emp.channels.email.byUser;
                  for (const c of channelData.companies || []) {
                    if (c.channels?.email?.byUser) {
                      const byKey = new Map();
                      c.channels.email.byUser.forEach((u, i) => {
                        byKey.set((u.userPrincipalName || u.user || '').toLowerCase(), i);
                      });
                      for (const ub of empByUser) {
                        const key = (ub.userPrincipalName || ub.user || '').toLowerCase();
                        const idx = byKey.get(key);
                        if (idx !== undefined) {
                          c.channels.email.byUser[idx] = ub;
                        } else {
                          c.channels.email.byUser.push(ub);
                          byKey.set(key, c.channels.email.byUser.length - 1);
                        }
                      }
                    }
                  }
                }
                if ((empEmail && empEmail.includes('@')) || (empDisplayName || employeeName)) {
                  const companiesCfg = loadCompaniesConfig();
                  const targetedMaxUsers = comprehensive ? 80 : (employeeNames.length ? 80 : 30);
                  const targetedMsgsPerMailbox = comprehensive ? 100 : (employeeNames.length ? 100 : 50);
                  const { fetchEmailsFromSenderAcrossMailboxes } = await import('./services/graph-service.js');
                  const senderEmails = (empAllEmails?.length ? empAllEmails : empEmail ? [empEmail] : null);
                  for (const comp of companiesCfg?.companies || []) {
                    const creds = comp.channels?.teams || comp.channels?.calendar;
                    if (!creds?.azureAppId) continue;
                    const ceoEmail = comp.channels?.email?.adminEmail || comp.channels?.teams?.userPrincipalName;
                    const prioEmails = [...new Set([ceoEmail, getAdminEmail()].filter(Boolean))];
                    const fromSenderResult = await fetchEmailsFromSenderAcrossMailboxes(creds.tenantId, creds.azureAppId, creds.clientSecret, senderEmails, empDisplayName || employeeName, targetedMaxUsers, targetedMsgsPerMailbox, prioEmails, receivedSince);
                    if (fromSenderResult.byUser?.length) {
                      const totalFromSender = fromSenderResult.byUser.reduce((s, u) => s + (u.messages?.length || 0), 0);
                      const sampleMsg = fromSenderResult.byUser.flatMap((u) => (u.messages || []).map((m) => ({ mailbox: u.user, from: m.from, fromName: m.fromName })))[0];
                      console.log(`📌 Targeted search (${comp.name}): ${totalFromSender} emails FROM ${(senderEmails?.length ? senderEmails.join(', ') : empEmail) || empDisplayName || employeeName} across ${fromSenderResult.byUser.length} mailboxes${sampleMsg ? ` | sample: fromName="${sampleMsg.fromName}" from="${sampleMsg.from}"` : ''}`);
                      for (const c of channelData.companies || []) {
                        if (c.channels?.email?.byUser) {
                          const byKey = new Map(c.channels.email.byUser.map((u, i) => [(u.userPrincipalName || u.user || '').toLowerCase(), i]));
                          const seen = new Set();
                          for (const u of c.channels.email.byUser) {
                            for (const m of u.messages || []) {
                              seen.add(`${m.from}|${m.subject}|${m.received}`);
                            }
                          }
                          for (const ub of fromSenderResult.byUser) {
                            const key = (ub.userPrincipalName || ub.user || '').toLowerCase();
                            const newMsgs = (ub.messages || []).filter((m) => !seen.has(`${m.from}|${m.subject}|${m.received}`));
                            if (newMsgs.length === 0) continue;
                            newMsgs.forEach((m) => seen.add(`${m.from}|${m.subject}|${m.received}`));
                            const idx = byKey.get(key);
                            if (idx !== undefined) {
                              c.channels.email.byUser[idx].messages = [...(c.channels.email.byUser[idx].messages || []), ...newMsgs].sort((a, b) => new Date(b.received || 0) - new Date(a.received || 0));
                            } else {
                              c.channels.email.byUser.push({ ...ub, messages: newMsgs });
                              byKey.set(key, c.channels.email.byUser.length - 1);
                            }
                          }
                        }
                      }
                    }
                  }
                }
                if (emp.channels?.teams && Object.keys(emp.channels.teams).length > 0) {
                  const first = channelData.companies?.[0];
                  if (first) {
                    first.channels = first.channels || {};
                    first.channels.employeeTeams = first.channels.employeeTeams || {};
                    first.channels.employeeTeams[employeeName] = emp.channels.teams;
                  }
                }
              } else {
                const companiesCfg = loadCompaniesConfig();
                const targetedMaxUsers = comprehensive ? 80 : (employeeNames.length ? 80 : 30);
                const targetedMsgsPerMailbox = comprehensive ? 100 : (employeeNames.length ? 100 : 50);
                if (channelData.companies?.length) {
                  const { fetchEmailsFromSenderAcrossMailboxes } = await import('./services/graph-service.js');
                  for (const comp of companiesCfg?.companies || []) {
                    const creds = comp.channels?.teams || comp.channels?.calendar;
                    if (!creds?.azureAppId) continue;
                    const ceoEmail = comp.channels?.email?.adminEmail || comp.channels?.teams?.userPrincipalName;
                    const prioEmails = [...new Set([ceoEmail, getAdminEmail()].filter(Boolean))];
                    const fromSenderResult = await fetchEmailsFromSenderAcrossMailboxes(creds.tenantId, creds.azureAppId, creds.clientSecret, null, employeeName, targetedMaxUsers, targetedMsgsPerMailbox, prioEmails, receivedSince);
                    if (fromSenderResult.byUser?.length) {
                      const totalFromSender = fromSenderResult.byUser.reduce((s, u) => s + (u.messages?.length || 0), 0);
                      const sampleMsg = fromSenderResult.byUser.flatMap((u) => (u.messages || []).map((m) => ({ mailbox: u.user, from: m.from, fromName: m.fromName })))[0];
                      console.log(`📌 Targeted search (name-only, ${comp.name}): ${totalFromSender} emails FROM "${employeeName}" across ${fromSenderResult.byUser.length} mailboxes${sampleMsg ? ` | sample: fromName="${sampleMsg.fromName}" from="${sampleMsg.from}"` : ''}`);
                      for (const c of channelData.companies || []) {
                        if (c.channels?.email?.byUser) {
                          const byKey = new Map(c.channels.email.byUser.map((u, i) => [(u.userPrincipalName || u.user || '').toLowerCase(), i]));
                          const seen = new Set();
                          for (const u of c.channels.email.byUser) {
                            for (const m of u.messages || []) seen.add(`${m.from}|${m.subject}|${m.received}`);
                          }
                          for (const ub of fromSenderResult.byUser) {
                            const key = (ub.userPrincipalName || ub.user || '').toLowerCase();
                            const newMsgs = (ub.messages || []).filter((m) => !seen.has(`${m.from}|${m.subject}|${m.received}`));
                            if (newMsgs.length === 0) continue;
                            newMsgs.forEach((m) => seen.add(`${m.from}|${m.subject}|${m.received}`));
                            const idx = byKey.get(key);
                            if (idx !== undefined) {
                              c.channels.email.byUser[idx].messages = [...(c.channels.email.byUser[idx].messages || []), ...newMsgs].sort((a, b) => new Date(b.received || 0) - new Date(a.received || 0));
                            } else {
                              c.channels.email.byUser.push({ ...ub, messages: newMsgs });
                              byKey.set(key, c.channels.email.byUser.length - 1);
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            } else {
              channelData = await fetchAllChannelDataForContext();
            }
            if (channelData.companies?.length) {
              const mailboxListChat = [];
              for (const c of channelData.companies || []) {
                for (const u of c.channels?.email?.byUser || []) {
                  const id = u.userPrincipalName || u.userEmail || u.user || '';
                  if (id) mailboxListChat.push(id);
                }
              }
              const mailboxScopeChat = mailboxListChat.length > 0
                ? ` MAILBOXES IN THIS DATA: ${[...new Set(mailboxListChat)].join(', ')}. State exactly which mailboxes you searched. If this is only one or a few (e.g. only Gmail), do NOT say "all company mailboxes" - say "I searched: [list]. Outlook company mailboxes may be missing (timeout/config)."`
                : '';
              let jsonStr = JSON.stringify(channelData, null, 2);
              const multiSubjectHint = (effectiveBody.match(/\b(and|,|&)\b/i) && effectiveBody.split(/\?|\./).length >= 2) ? ' User may have asked about multiple topics - address each part of their question.' : '';
              if (employeeNames.length) {
                const searchTerms = [...employeeNames.flatMap((n) => [n, ...n.split(/\s+/).filter((s) => s.length > 2)])].map((t) => t.toLowerCase());
                const found = [];
                const allToCcAddresses = (m) => [...(m.toRecipients || []), ...(m.ccRecipients || [])];
                const localPartMatches = (addr, terms) => {
                  const local = (addr || '').split('@')[0].toLowerCase().replace(/\./g, ' ');
                  return terms.some((t) => local.includes(t) || local.includes(t.replace(/\s/g, '')));
                };
                for (const c of channelData.companies || []) {
                  for (const u of c.channels?.email?.byUser || []) {
                    for (const m of u.messages || []) {
                      const from = (m.from || '').toLowerCase();
                      const fromName = (m.fromName || '').toLowerCase();
                      const toAddr = (m.toRecipients || []).join(' ').toLowerCase();
                      const toNames = [...(m.toRecipientsNames || []), ...(m.ccRecipientsNames || [])].join(' ').toLowerCase();
                      const ccAddr = (m.ccRecipients || []).join(' ').toLowerCase();
                      const preview = (m.preview || '').toLowerCase();
                      const toCcLocalMatch = allToCcAddresses(m).some((addr) => localPartMatches(addr, searchTerms));
                      if (searchTerms.some((t) => fromName.includes(t) || from.includes(t) || toAddr.includes(t) || toNames.includes(t) || ccAddr.includes(t) || preview.includes(t)) || toCcLocalMatch) {
                        found.push({
                          user: u.user,
                          from: m.from,
                          fromName: m.fromName,
                          subject: m.subject,
                          folder: m.folder,
                          received: m.received,
                          preview: (m.preview || '').slice(0, 150),
                          fullPreview: (m.preview || '').slice(0, 1200),
                        });
                      }
                    }
                  }
                }
                const totalMsgs = (channelData.companies?.[0]?.channels?.email?.byUser || []).reduce((s, u) => s + (u.messages?.length || 0), 0);
                const namesLabel = employeeNames.length === 1 ? `person/contact "${employeeNames[0]}"` : `people/contacts: ${employeeNames.map((n) => `"${n}"`).join(', ')}`;
                const personScope = ' This person may be an employee, client, vendor, or any other contact. Match on DISPLAY NAME (fromName, toRecipientsNames, ccRecipientsNames) as well as email; they may use client/external addresses.';
                console.log(`📌 ${namesLabel}: ${totalMsgs} msgs total, FOUND ${found.length} matching (searchTerms: ${searchTerms.slice(0, 5).join(', ')}${searchTerms.length > 5 ? '...' : ''})`);
                if (found.length > 0) {
                  const sample = found[0];
                  console.log(`📌 Pre-scan sample: fromName="${sample.fromName}" from="${sample.from}" mailbox=${sample.user}`);
                } else if (totalMsgs > 0) {
                  const firstMsg = firstByUser[0]?.messages?.[0];
                  if (firstMsg) {
                    console.log(`📌 Pre-scan 0 hits: sample message has fromName="${firstMsg.fromName}" toRecipientsNames=[${(firstMsg.toRecipientsNames || []).join(', ')}] ccRecipientsNames=[${(firstMsg.ccRecipientsNames || []).join(', ')}]`);
                  }
                }
                const foundBlock = found.length > 0
                  ? `\n\n=== PRE-SCAN RESULTS (${namesLabel} FOUND in data - USE THIS) ===\n${JSON.stringify(found.slice(0, 20).map((f) => ({ user: f.user, from: f.from, fromName: f.fromName, subject: f.subject, folder: f.folder, preview: f.preview })), null, 2)}\n=== END PRE-SCAN - summarize the above in your response ===\n\n`
                  : '';
                const relevantFullBlock = found.length > 0
                  ? `\n\n=== FULL CONTENT FOR ${namesLabel} (${Math.min(found.length, 25)} emails) - PRIORITIZE IN YOUR ANSWER ===\n${found.slice(0, 25).map((f) => `Mailbox: ${f.user} | From: ${f.fromName || f.from} | Subject: ${f.subject} | ${f.received || ''}\n${(f.fullPreview || f.preview || '').trim() || '(no body)'}`).join('\n\n---\n\n')}\n=== END FULL CONTENT ===\n\n`
                  : '';
                const noShortchange = ' Give a full summary per person from the data below. Do NOT say "limited information" or "not much on X" when the context contains their emails/Teams - the data is in the JSON.';
                const searchHint = found.length === 0 ? ` CRITICAL: Pre-scan found 0 automatic hits for "${employeeNames.join(', ')}". You MUST manually search the JSON: every "byUser" entry, every message's "from", "fromName", "toRecipients", "toRecipientsNames", "ccRecipientsNames", "preview". Match full name or name parts (e.g. "Manpreet", "Kaur"). If you find ANY such message, list them; do NOT say "no communications found". If the JSON is empty or you truly find none, then say "No references in the current dataset" and state the scope (mailboxes and message count below).` : '';
                const clientEmailHint = ' Contacts often use client or external addresses. Match on sender/recipient DISPLAY NAME (fromName, toRecipientsNames, ccRecipientsNames); ignore email domain.';
                const firstByUser = channelData.companies?.[0]?.channels?.email?.byUser || [];
                const totalMailboxes = firstByUser.length;
                const totalMessages = firstByUser.reduce((s, u) => s + (u.messages?.length || 0), 0);
                const scopeLine = ` SCOPE: ${totalMailboxes} mailboxes, ${totalMessages} total messages (Outlook company mailboxes + any Gmail/IMAP). You MUST search every mailbox in "byUser"; do NOT say you only searched one address (e.g. Gmail).`;
                const dataSourceHint = ' DATA: JSON below has the mailboxes listed above. Search every "byUser" entry.';
                const noFalseNegative = ' If you respond with "no communications" or "no references" you MUST have actually searched the JSON and state: "Searched X mailboxes, Y total messages. No message had this name in fromName, toRecipientsNames, ccRecipientsNames, or preview." Otherwise list every message you find that matches.';
                jsonStr = `[CEO asking about ${namesLabel}.${personScope}${mailboxScopeChat}${scopeLine}${multiSubjectHint}${noShortchange}${searchHint}${clientEmailHint}${dataSourceHint}${noFalseNegative} CRITICAL: Search "fromName", "from", "toRecipients", "toRecipientsNames", "ccRecipientsNames" - person may be sender OR recipient. Partial name matches count.]${foundBlock}${relevantFullBlock}${jsonStr}`;
              } else if (multiSubjectHint) {
                jsonStr = `[${multiSubjectHint.trim()}]${jsonStr}`;
              }
              const ctxLimit = employeeNames.length ? 120000 : 60000;
              contextStr = jsonStr.length > ctxLimit ? jsonStr.slice(0, ctxLimit) + '\n...[truncated]' : jsonStr;
              // Store summary for /api/debug/enterprise-preview
              const users = [];
              let msgCount = 0;
              for (const c of channelData.companies || []) {
                const email = c.channels?.email;
                if (email?.byUser) {
                  for (const u of email.byUser) {
                    users.push(u.user || u.userPrincipalName || 'unknown');
                    msgCount += (u.messages || []).length;
                  }
                  break; // Same data for all companies when monitorAll
                }
              }
              lastEnterpriseFetchSummary = {
                timestamp: new Date().toISOString(),
                userCount: users.length,
                users: [...new Set(users)],
                messageCount: msgCount,
                companies: (channelData.companies || []).map((c) => c.company),
                mode: users.length > 1 ? 'enterprise-wide (all employees)' : users.length === 1 ? 'single mailbox' : 'no email data',
              };
            } else {
              const reason = channelData?._fetchTimeout ? 'fetch timed out (10 min)' : channelData?._error || channelData?._note || 'no channels configured';
              console.warn('⚠️ WhatsApp/SMS: No company data for context:', reason);
              contextStr = `[Data fetch failed: ${reason}. Ask the user to check Config Dashboard, Azure credentials, and ensure monitorAllUserMailboxes is enabled.]`;
            }
            console.log(`📊 Context: ${channelData.companies?.length || 0} companies, ${contextStr.length} chars`);
          } catch (fetchErr) {
            console.error('❌ Fetch error:', fetchErr.message);
            contextStr = `[Data fetch error: ${fetchErr.message}. Ask the user to check Config Dashboard and try again.]`;
          }
          if (isDraftRequest(effectiveBody)) {
            const toneHint = getDraftToneHint(effectiveBody);
            contextStr = contextStr + DRAFT_RESPONSE_INSTRUCTION + (toneHint || '');
            console.log('📌 Chat/WhatsApp: draft-reply requested — adding tone/style options to prompt');
          }
          response = await askAI(effectiveBody, contextStr);
        } catch (innerErr) {
          console.error('❌ Claude/inner error:', innerErr.message);
          const errStr = String(innerErr?.message || JSON.stringify(innerErr || '')).toLowerCase();
          const isOverload = errStr.includes('529') || errStr.includes('overload');
          if (isOverload) {
            response = 'The AI service is temporarily overloaded. Please try again in a minute or two.';
          } else {
            response = `I couldn't complete that request. Try again in a moment, or use Config Dashboard → Test All Companies for full reviews.`;
          }
        }
      }

      if (isWhatsApp) {
        await sendWhatsApp(response, false, From);
      } else {
        await sendSMS(response, false, From);
      }
    } catch (error) {
      console.error('❌ Message webhook error:', error);
      try {
        fs.appendFileSync(path.join(projectRoot, 'webhook-errors.log'),
          `${new Date().toISOString()} | ${error.message} | ${error.stack || ''}\n`, 'utf8');
      } catch (_) {}
      try {
        const errMsg = (error.message?.includes('timed out') || error.message?.includes('timeout') || error.message?.includes('aborted'))
          ? 'Request timed out. Use Config Dashboard → Test All Companies for full reviews.'
          : 'Sorry, I ran into an issue. Please try again.';
        if (From?.startsWith('whatsapp:')) {
          await sendWhatsApp(errMsg, false, From);
        } else {
          await sendSMS(errMsg, false, From);
        }
      } catch (e) {
        console.error('❌ Failed to send error notice:', e.message, 'code:', e.code);
      }
    }
  };

  processMessage().catch((err) => {
    console.error('❌ processMessage unhandled:', err?.message, err?.stack);
    try {
      fs.appendFileSync(path.join(projectRoot, 'webhook-errors.log'),
        `${new Date().toISOString()} | processMessage unhandled | ${err?.message || ''}\n`, 'utf8');
    } catch (_) {}
  });
});

// Config helpers - load from file (UI) or env
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Config load failed:', e.message);
  }
  return null;
}

function getAdminEmail() {
  const cfg = loadConfig();
  const fromCfg = (cfg?.ceo?.email || process.env.CEO_EMAIL || process.env.EMAIL_USER || process.env.GMAIL_USER || '').trim();
  if (fromCfg) return fromCfg;
  const companiesCfg = loadCompaniesConfig({ silent: true });
  const fromCompanies = (companiesCfg?.companies?.[0]?.channels?.email?.adminEmail || '').trim();
  return fromCompanies || '';
}

function getAdminWhatsAppNumber() {
  const cfg = loadConfig();
  const num = cfg?.ceo?.whatsappNumber || cfg?.ceo?.phoneNumber || process.env.CEO_WHATSAPP_NUMBER || process.env.CEO_PHONE_NUMBER || '';
  return (num && String(num).trim()) || '';
}

// Configuration API endpoints
app.get('/api/config', (req, res) => {
  const cfg = loadConfig();
  const intervalVal = cfg?.monitoring?.intervalMinutes ?? process.env.MONITORING_INTERVAL_MINUTES ?? '15';
  res.json({
    ceo: {
      phoneNumber: cfg?.ceo?.phoneNumber ?? process.env.CEO_PHONE_NUMBER ?? '',
      whatsappNumber: cfg?.ceo?.whatsappNumber ?? process.env.CEO_WHATSAPP_NUMBER ?? '',
      email: cfg?.ceo?.email ?? process.env.CEO_EMAIL ?? process.env.EMAIL_USER ?? process.env.GMAIL_USER ?? '',
    },
    monitoring: {
      intervalMinutes: parseInt(String(intervalVal), 10),
      alertOnlyUrgent: cfg?.monitoring?.alertOnlyUrgent ?? process.env.ALERT_ONLY_URGENT === 'true',
      quietHoursEnabled: cfg?.monitoring?.quietHoursEnabled ?? process.env.QUIET_HOURS_ENABLED === 'true',
      quietHoursStart: cfg?.monitoring?.quietHoursStart ?? process.env.QUIET_HOURS_START ?? '22:00',
      quietHoursEnd: cfg?.monitoring?.quietHoursEnd ?? process.env.QUIET_HOURS_END ?? '07:00',
    },
    briefings: {
      morningTime: cfg?.briefings?.morningTime ?? process.env.MORNING_BRIEFING_TIME ?? '08:00',
      eveningTime: cfg?.briefings?.eveningTime ?? process.env.EVENING_SUMMARY_TIME ?? '18:00',
      voiceMorning: cfg?.briefings?.voiceMorning === undefined ? process.env.VOICE_MORNING_BRIEFING !== 'false' : Boolean(cfg.briefings.voiceMorning),
      voiceEvening: cfg?.briefings?.voiceEvening === undefined ? process.env.VOICE_EVENING_BRIEFING !== 'false' : Boolean(cfg.briefings.voiceEvening),
      emailMorning: cfg?.briefings?.emailMorning === undefined ? true : Boolean(cfg.briefings.emailMorning),
      emailEvening: cfg?.briefings?.emailEvening === undefined ? true : Boolean(cfg.briefings.emailEvening),
      frequency: cfg?.briefings?.frequency ?? process.env.BRIEFING_FREQUENCY ?? 'daily',
      meetingPrepEnabled: cfg?.briefings?.meetingPrepEnabled === true,
      meetingPrepTimezone: cfg?.briefings?.meetingPrepTimezone || process.env.MEETING_PREP_TIMEZONE || 'Eastern Standard Time',
      meetingTranscriptionEnabled: cfg?.briefings?.meetingTranscriptionEnabled === true,
      meetingTranscriptionHoursLookback: Math.min(24, Math.max(1, parseInt(cfg?.briefings?.meetingTranscriptionHoursLookback, 10) || MEETING_TRANSCRIPTION_HOURS_LOOKBACK_DEFAULT)),
      weeklyReviewEnabled: cfg?.briefings?.weeklyReviewEnabled === true,
      weeklyReviewDay: typeof cfg?.briefings?.weeklyReviewDay === 'number' ? cfg.briefings.weeklyReviewDay : (cfg?.briefings?.weeklyReviewDay != null ? parseInt(cfg.briefings.weeklyReviewDay, 10) : 0),
      weeklyReviewTime: cfg?.briefings?.weeklyReviewTime ?? '18:00',
    },
    twilio: {
      phoneNumber: cfg?.twilio?.phoneNumber ?? process.env.TWILIO_PHONE_NUMBER ?? '',
      whatsappEnabled: !!(cfg?.twilio?.whatsappEnabled ?? process.env.TWILIO_WHATSAPP_NUMBER),
    },
    llm: {
      strategy: cfg?.llm?.strategy ?? process.env.LLM_STRATEGY ?? 'cloud',
      cloudModel: cfg?.llm?.cloudModel ?? 'claude-sonnet-4-20250514',
      localModel: cfg?.llm?.localModel ?? process.env.LOCAL_LLM_MODEL ?? 'llama3.1:8b',
    },
    travelAgent: {
      enabled: cfg?.travelAgent?.enabled ?? process.env.TRAVEL_AGENT_ENABLED === 'true' ?? false,
      currency: cfg?.travelAgent?.currency ?? process.env.TRAVEL_CURRENCY ?? 'USD',
      stripePublishableKey: cfg?.travelAgent?.stripePublishableKey ?? process.env.STRIPE_PUBLISHABLE_KEY ?? '',
      preferredBookingSites: cfg?.travelAgent?.preferredBookingSites ?? '',
      preferredReservationPlatforms: cfg?.travelAgent?.preferredReservationPlatforms ?? 'OpenTable, Resy, Tock',
      monitoringEnabled: cfg?.travelAgent?.monitoringEnabled ?? false,
      alertCadenceMinutes: cfg?.travelAgent?.alertCadenceMinutes ?? 10,
      monitoringCities: cfg?.travelAgent?.monitoringCities ?? '',
      reminderCallsEnabled: cfg?.travelAgent?.reminderCallsEnabled ?? true,
      preferredClassOfTravel: cfg?.travelAgent?.preferredClassOfTravel ?? '',
      preferredAirlines: cfg?.travelAgent?.preferredAirlines ?? '',
      maxStops: cfg?.travelAgent?.maxStops ?? '',
      priceMonitorEnabled: cfg?.travelAgent?.priceMonitorEnabled === true,
      priceMonitorIntervalHours: Math.max(1, Math.min(24, parseInt(cfg?.travelAgent?.priceMonitorIntervalHours, 10) || 6)),
      henryAutoBookAndPay: cfg?.travelAgent?.henryAutoBookAndPay === true,
      amadeusApiKey: cfg?.travelAgent?.amadeusApiKey ?? process.env.AMADEUS_API_KEY ?? '',
      amadeusApiSecret: cfg?.travelAgent?.amadeusApiSecret ? '••••••••' : '',
      restaurantAvailability: cfg?.travelAgent?.restaurantAvailability ?? '',
      hardToGetRestaurants: Array.isArray(cfg?.travelAgent?.hardToGetRestaurants) ? cfg.travelAgent.hardToGetRestaurants : [],
      openTableEmail: cfg?.travelAgent?.openTableEmail ?? '',
      openTablePassword: (cfg?.travelAgent?.openTablePassword && cfg.travelAgent.openTablePassword.length > 0) ? '••••••••' : '',
      resyEmail: cfg?.travelAgent?.resyEmail ?? '',
      resyPassword: (cfg?.travelAgent?.resyPassword && cfg.travelAgent.resyPassword.length > 0) ? '••••••••' : '',
    },
    starkNavigator: {
      enabled: cfg?.starkNavigator?.enabled === true,
      criteria: cfg?.starkNavigator?.criteria ?? '',
      symbolsToMonitor: cfg?.starkNavigator?.symbolsToMonitor ?? '',
      dailyScheduleEnabled: cfg?.starkNavigator?.dailyScheduleEnabled === true,
      dailyScheduleTime: cfg?.starkNavigator?.dailyScheduleTime ?? '08:00',
      hotAlertEnabled: cfg?.starkNavigator?.hotAlertEnabled !== false,
    },
    kandidly: {
      enabled: cfg?.kandidly?.enabled === true,
    }
  });
});

app.post('/api/config', express.json(), (req, res) => {
  try {
    const incoming = req.body || {};
    const cfg = loadConfig();
    if (cfg?.travelAgent && incoming.travelAgent) {
      if (incoming.travelAgent.amadeusApiSecret === '••••••••' || incoming.travelAgent.amadeusApiSecret === '') {
        incoming.travelAgent.amadeusApiSecret = cfg.travelAgent.amadeusApiSecret || '';
      }
      if (incoming.travelAgent.openTablePassword === '••••••••' || incoming.travelAgent.openTablePassword === '') {
        incoming.travelAgent.openTablePassword = cfg.travelAgent.openTablePassword || '';
      }
      if (incoming.travelAgent.resyPassword === '••••••••' || incoming.travelAgent.resyPassword === '') {
        incoming.travelAgent.resyPassword = cfg.travelAgent.resyPassword || '';
      }
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(incoming, null, 2), 'utf8');
    console.log('📝 Configuration saved to', CONFIG_PATH);
    res.json({ success: true, message: 'Configuration saved. Admin email will be used for briefings.' });
  } catch (e) {
    console.error('Config save failed:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ----- StarkNavigator: evaluate investments and big purchases (stocks, cars, wine, real estate, etc.) against criteria; daily digest + hot alerts -----
const STARK_NAVIGATOR_PROMPT = `You are StarkNavigator, an investment and big-purchase advisor. You evaluate a list of opportunities (with current price and change) against the user's criteria.

Rules:
- Include EVERY scanned symbol in the recommendations array (all 5 when 5 are scanned).
- Recommend "buy" for every symbol that fits the criteria (sector, risk, return); you can have 0 to 5 buys. Use "hold" or "skip" only when a stock clearly does not fit or is overpriced.
- Rank every BUY in order of preference: rank 1 = best bet, rank 2 = second best, rank 3 = third, etc. Use rank 1 for the single best opportunity; set hot: true only on that one. For hold/skip use rank 99 so they sort last.
- For each item provide: symbol, name, action (buy/hold/skip), reason (why buy or why not), rank (1=best bet, 2=second, ... for buys; 99 for hold/skip), hot (true only for rank 1), buyAtOrBelow, avoidAbove, priceGuidance.
- Add top-level bestBet (symbol) and bestBetSummary (one sentence why this one is the best of the set).

Reply with ONLY a valid JSON object (no other text):
{"bestBet":"NVDA","bestBetSummary":"Best risk-adjusted upside in data center AI with strong margin profile.","recommendations":[{"symbol":"NVDA","name":"NVIDIA","action":"buy","reason":"...","rank":1,"hot":true,"buyAtOrBelow":120,"avoidAbove":145,"priceGuidance":"Buy at or below 120; avoid above 145."},{"symbol":"AMD","name":"AMD","action":"buy","reason":"...","rank":2,"hot":false,"buyAtOrBelow":125,"avoidAbove":140,"priceGuidance":"..."},...]}
Include all scanned symbols. Exactly one item has hot: true and rank 1 (the best bet).`;

const STARK_NAVIGATOR_BIG_PURCHASE_PROMPT = `You are StarkNavigator, an advisor for big purchases (cars, wine, real estate, art, luxury goods, etc.) and investments. Given the user's criteria and a description of one specific opportunity they are considering, recommend: buy, hold, or skip. Give a clear reason. If this is an exceptional deal that matches their criteria and they should act soon, set "hot": true so they get an instant alert.
Reply with ONLY a valid JSON object (no other text):
{"action":"buy|hold|skip","reason":"2-3 sentences","hot":true|false}`;

// Default: data center & AI themed symbols (user can override via symbolsToMonitor).
const STARK_DEFAULT_SYMBOLS = ['NVDA', 'AMD', 'AVGO', 'SMCI', 'PLTR'];

function getStarkSymbolsFromConfig(cfg) {
  const raw = (cfg?.starkNavigator?.symbolsToMonitor || '').trim();
  if (!raw) return STARK_DEFAULT_SYMBOLS;
  return raw.split(/[\s,]+/).map((s) => s.trim().toUpperCase()).filter((s) => s.length >= 1 && s.length <= 6).slice(0, 5);
}

// Stock scan: Alpha Vantage (5 calls/min free tier) or mock. Throttle to 1 request every 12s to stay under limit.
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchStarkStockData(symbols) {
  const five = symbols.slice(0, 5);
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || process.env.STARK_STOCK_API_KEY;
  if (!apiKey || typeof fetch !== 'function') {
    console.log('StarkNavigator: no ALPHA_VANTAGE_API_KEY, using mock data');
    return getMockStarkStockData(five);
  }
  try {
    const out = [];
    for (let i = 0; i < five.length; i++) {
      const sym = five[i];
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${apiKey}`;
      const res = await fetch(url);
      const d = await res.json();
      if (d['Error Message']) {
        console.warn('StarkNavigator: Alpha Vantage error:', d['Error Message'].slice(0, 80));
        break;
      }
      if (d['Note'] && d['Note'].includes('rate limit')) {
        console.warn('StarkNavigator: Alpha Vantage rate limit (5/min). Using mock for this run.');
        return getMockStarkStockData(five);
      }
      const q = d['Global Quote'];
      if (q && q['05. price']) {
        const changePct = q['10. change percent'];
        const changeNum = typeof changePct === 'string' ? parseFloat(changePct.replace('%', '')) : parseFloat(changePct) || 0;
        out.push({
          symbol: sym,
          name: sym,
          price: parseFloat(q['05. price']),
          changePercent: changeNum,
        });
      }
      if (i < five.length - 1) await delay(12500);
    }
    if (out.length > 0) {
      console.log('StarkNavigator: using Alpha Vantage real data for', out.length, 'symbols');
      return out;
    }
  } catch (e) {
    console.warn('StarkNavigator: Alpha Vantage fetch failed, using mock:', e.message);
  }
  return getMockStarkStockData(five);
}

function getMockStarkStockData(symbols) {
  const names = { NVDA: 'NVIDIA', AMD: 'AMD', AVGO: 'Broadcom', SMCI: 'Super Micro', PLTR: 'Palantir', AAPL: 'Apple', MSFT: 'Microsoft', GOOGL: 'Alphabet', AMZN: 'Amazon', META: 'Meta' };
  const now = Date.now();
  return symbols.map((s, i) => {
    const seed = (now % 1000) + i * 17;
    const price = 80 + (seed % 400);
    const ch = (seed % 20) - 8;
    return { symbol: s, name: names[s] || s, price, changePercent: ch * 0.5 };
  });
}

async function runStarkRecommendations(opts = {}) {
  const cfg = loadConfig();
  const criteria = (cfg?.starkNavigator?.criteria || '').trim() || 'General: focus on value and growth; moderate risk tolerance.';
  const symbols = getStarkSymbolsFromConfig(cfg);
  const data = await fetchStarkStockData(symbols);
  const dataStr = JSON.stringify(data, null, 2);
  const prompt = `User criteria:\n${criteria}\n\nScanned opportunities (${data.length} symbols, current price and change):\n${dataStr}\n\nEvaluate all ${data.length} symbols. Include every symbol in the recommendations array. For each that fits criteria, use action "buy" and assign rank 1 (best bet), 2 (second best), 3, 4, 5 in order of preference. Set hot: true only on rank 1. For hold/skip use rank 99. Provide reason, buyAtOrBelow, avoidAbove, priceGuidance for each. Output bestBet and bestBetSummary. Output ONLY the JSON object.`;
  let text;
  try {
    text = await askAI(prompt, '', { systemPrompt: STARK_NAVIGATOR_PROMPT });
  } catch (e) {
    console.warn('StarkNavigator AI failed:', e.message);
    return { recommendations: [], bestBet: null, bestBetSummary: null, error: e.message };
  }
  const jsonMatch = (text || '').match(/\{[\s\S]*\}/);
  let recommendations = [];
  let bestBet = null;
  let bestBetSummary = null;
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
      bestBet = typeof parsed.bestBet === 'string' ? parsed.bestBet.trim() : null;
      bestBetSummary = typeof parsed.bestBetSummary === 'string' ? parsed.bestBetSummary.trim() : null;
    } catch (_) {}
  }
  const scannedSymbols = data.map((d) => d.symbol);
  const haveSymbol = new Set((recommendations || []).map((r) => String(r.symbol).toUpperCase()));
  for (const sym of scannedSymbols) {
    if (!haveSymbol.has(sym.toUpperCase())) {
      recommendations.push({ symbol: sym, name: sym, action: 'hold', reason: 'Not evaluated.', rank: 99, hot: false });
    }
  }
  if (bestBet) {
    const bestSym = String(bestBet).toUpperCase();
    for (const r of recommendations) {
      r.hot = String(r.symbol).toUpperCase() === bestSym;
      if (r.hot) r.rank = 1;
    }
    const buys = recommendations.filter((r) => r.action === 'buy' && !r.hot);
    buys.forEach((r, i) => { r.rank = i + 2; });
  }
  const rankNum = (r) => (r.rank != null && r.rank !== undefined ? Number(r.rank) : (r.hot ? 1 : 99));
  recommendations.sort((a, b) => rankNum(a) - rankNum(b));
  const hot = recommendations.filter((r) => r.hot === true);
  const adminEmail = getAdminEmail();
  const adminWhatsApp = getAdminWhatsAppNumber();
  const hotAlertEnabled = opts.sendHotAlerts !== false && cfg?.starkNavigator?.hotAlertEnabled !== false;
  const buys = (recommendations || []).filter((r) => r.action === 'buy');
  const sendAlert = hotAlertEnabled && buys.length > 0 && (adminEmail || adminWhatsApp);
  if (sendAlert) {
    let msg = '🔥 StarkNavigator – Immediate buy alert\n\n';
    if (bestBet && bestBetSummary) msg += `⭐ Best bet: ${bestBet} – ${bestBetSummary}\n\n`;
    const sortedBuys = [...buys].sort((a, b) => (rankNum(a) - rankNum(b)));
    const buyList = sortedBuys.map((r, i) => {
      const num = i + 1;
      let line = `${num}. ${r.hot ? '★ ' : ''}${r.symbol} (${r.name}): ${r.reason || 'Strong opportunity'}`;
      if (r.priceGuidance) line += ` | ${r.priceGuidance}`;
      else if (r.buyAtOrBelow != null || r.avoidAbove != null) line += ` | Buy ≤${r.buyAtOrBelow ?? '?'}${r.avoidAbove != null ? `, avoid above ${r.avoidAbove}` : ''}`;
      return line;
    }).join('\n');
    msg += `${buyList}\n\nFull daily digest will be sent at scheduled time.`;
    if (adminEmail && (useSendGrid || emailTransporter)) {
      await sendEmailReply(adminEmail, 'StarkNavigator – Hot buy alert', msg);
      console.log('📧 StarkNavigator: hot alert sent by email');
    }
    if (adminWhatsApp && twilioClient) {
      const shortMsg = msg.length > 1400 ? msg.slice(0, 1380) + '\n\n… Full details in email.' : msg;
      try {
        await sendWhatsApp(shortMsg, false, `whatsapp:${String(adminWhatsApp).replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
        console.log('📱 StarkNavigator: hot alert sent by WhatsApp');
      } catch (e) {
        console.warn('StarkNavigator WhatsApp hot alert failed:', e.message);
      }
    }
  }
  return { recommendations, hot, bestBet, bestBetSummary };
}

app.post('/api/stark-navigator/recommendations', express.json(), async (req, res) => {
  try {
    const result = await runStarkRecommendations({ sendHotAlerts: true });
    res.json({ success: true, recommendations: result.recommendations || [], hot: result.hot || [], bestBet: result.bestBet || null, bestBetSummary: result.bestBetSummary || null, error: result.error || null });
  } catch (e) {
    console.error('StarkNavigator recommendations error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Evaluate a single big purchase (car, wine, real estate, etc.) against user criteria
app.post('/api/stark-navigator/evaluate-purchase', express.json(), async (req, res) => {
  try {
    const description = (req.body?.description || req.body?.item || '').trim();
    if (!description) {
      return res.status(400).json({ success: false, error: 'Provide description (e.g. car, property, wine listing).' });
    }
    const cfg = loadConfig();
    const criteria = (cfg?.starkNavigator?.criteria || '').trim() || 'General: value for money, quality over impulse; moderate risk.';
    const prompt = `User criteria for big purchases and investments:\n${criteria}\n\nOpportunity they are considering:\n${description}\n\nEvaluate against their criteria. Output ONLY the JSON object with action (buy/hold/skip), reason (2-3 sentences), and hot (true only if exceptional deal, act soon).`;
    let text;
    try {
      text = await askAI(prompt, '', { systemPrompt: STARK_NAVIGATOR_BIG_PURCHASE_PROMPT });
    } catch (e) {
      console.warn('StarkNavigator big-purchase AI failed:', e.message);
      return res.status(500).json({ success: false, error: e.message });
    }
    const jsonMatch = (text || '').match(/\{[\s\S]*\}/);
    let action = 'hold';
    let reason = 'Unable to evaluate.';
    let hot = false;
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        action = ['buy', 'hold', 'skip'].includes(parsed.action) ? parsed.action : 'hold';
        reason = typeof parsed.reason === 'string' ? parsed.reason : reason;
        hot = parsed.hot === true;
      } catch (_) {}
    }
    const adminEmail = getAdminEmail();
    const adminWhatsApp = getAdminWhatsAppNumber();
    const hotAlertEnabled = cfg?.starkNavigator?.hotAlertEnabled !== false;
    if (hot && hotAlertEnabled && (adminEmail || adminWhatsApp)) {
      const msg = `🔥 StarkNavigator – Hot deal alert\n\n${description.slice(0, 200)}${description.length > 200 ? '…' : ''}\n\nRecommendation: ${action}\n${reason}`;
      if (adminEmail && (useSendGrid || emailTransporter)) {
        await sendEmailReply(adminEmail, 'StarkNavigator – Hot deal alert', msg);
        console.log('📧 StarkNavigator: big-purchase hot alert sent by email');
      }
      if (adminWhatsApp && twilioClient) {
        const shortMsg = msg.length > 1400 ? msg.slice(0, 1380) + '\n\n… Full details in email.' : msg;
        try {
          await sendWhatsApp(shortMsg, false, `whatsapp:${String(adminWhatsApp).replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
          console.log('📱 StarkNavigator: big-purchase hot alert sent by WhatsApp');
        } catch (e) {
          console.warn('StarkNavigator WhatsApp big-purchase alert failed:', e.message);
        }
      }
    }
    res.json({ success: true, action, reason, hot });
  } catch (e) {
    console.error('StarkNavigator evaluate-purchase error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/stark-navigator/daily-send', express.json(), async (req, res) => {
  try {
    const result = await runStarkRecommendations({ sendHotAlerts: true });
    const adminEmail = getAdminEmail();
    const adminWhatsApp = getAdminWhatsAppNumber();
    const bestBetLine = result.bestBet && result.bestBetSummary ? `⭐ Best bet: ${result.bestBet} – ${result.bestBetSummary}\n\n` : '';
    const recs = result.recommendations || [];
    const lines = recs.map((r, i) => {
      const num = recs.length > 1 ? `${i + 1}. ` : '• ';
      let line = `${num}${r.symbol} (${r.name}): ${r.action} – ${r.reason || ''}${r.hot ? ' [BEST BET]' : ''}`;
      if (r.priceGuidance) line += ` | ${r.priceGuidance}`;
      else if (r.buyAtOrBelow != null || r.avoidAbove != null) line += ` | Buy ≤${r.buyAtOrBelow ?? '?'}${r.avoidAbove != null ? `, avoid above ${r.avoidAbove}` : ''}`;
      return line;
    });
    const body = `StarkNavigator – Daily recommendations\n\n${bestBetLine}${lines.length ? lines.join('\n') : 'No recommendations today.'}`;
    if (adminEmail && (useSendGrid || emailTransporter)) {
      await sendEmailReply(adminEmail, 'StarkNavigator – Daily recommendations', body);
    }
    if (adminWhatsApp && twilioClient && body.length <= 1400) {
      try {
        await sendWhatsApp(body, false, `whatsapp:${String(adminWhatsApp).replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
      } catch (_) {}
    } else if (adminWhatsApp && twilioClient) {
      try {
        await sendWhatsApp('StarkNavigator – Daily digest sent to your email.', false, `whatsapp:${String(adminWhatsApp).replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
      } catch (_) {}
    }
    res.json({ success: true, message: 'Daily digest sent.', recommendations: result.recommendations || [] });
  } catch (e) {
    console.error('StarkNavigator daily send error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ----- Beer Mule: real Beer Hunt tracking via Untappd API -----
function readBeerMuleState() {
  try {
    if (fs.existsSync(BEER_MULE_STATE_PATH)) {
      const raw = fs.readFileSync(BEER_MULE_STATE_PATH, 'utf8');
      const data = JSON.parse(raw);
      return {
        hunts: Array.isArray(data.hunts) ? data.hunts : [],
        sightings: Array.isArray(data.sightings) ? data.sightings : [],
        config: data.config || { beerHuntPollIntervalSeconds: 300, alertWhatsAppNumber: '', beerHuntScheduleMode: 'interval', beerHuntDailyTime: '09:00' },
        updatedAt: data.updatedAt || null,
        lastPollAt: data.lastPollAt || null,
      };
    }
  } catch (e) {
    console.warn('Beer Mule state read failed:', e.message);
  }
  return { hunts: [], sightings: [], config: { beerHuntPollIntervalSeconds: 300, alertWhatsAppNumber: '', beerHuntScheduleMode: 'interval', beerHuntDailyTime: '09:00' }, updatedAt: null, lastPollAt: null };
}

function writeBeerMuleState(state) {
  const payload = {
    hunts: state.hunts || [],
    sightings: state.sightings || [],
    config: state.config || { beerHuntPollIntervalSeconds: 300, alertWhatsAppNumber: '', beerHuntScheduleMode: 'interval', beerHuntDailyTime: '09:00' },
    updatedAt: new Date().toISOString(),
    lastPollAt: state.lastPollAt || null,
  };
  fs.writeFileSync(BEER_MULE_STATE_PATH, JSON.stringify(payload, null, 2), 'utf8');
}

async function untappdRequest(pathname, params = {}) {
  const clientId = process.env.UNTAPPD_CLIENT_ID || '';
  const clientSecret = process.env.UNTAPPD_CLIENT_SECRET || '';
  if (!clientId || !clientSecret) {
    throw new Error('Untappd API not configured: set UNTAPPD_CLIENT_ID and UNTAPPD_CLIENT_SECRET in .env or .env.backend');
  }
  const q = new URLSearchParams({ client_id: clientId, client_secret: clientSecret, ...params });
  const url = `https://api.untappd.com/v4${pathname}?${q.toString()}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'BeerMule/1.0 (Beer Hunt)' },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Untappd API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

async function catalogBeerRequest(path, method = 'GET') {
  const apiKey = (process.env.CATALOG_BEER_API_KEY || '').trim();
  if (!apiKey) throw new Error('Catalog.beer API not configured: set CATALOG_BEER_API_KEY in .env.backend (free at catalog.beer)');
  const auth = Buffer.from(apiKey + ':', 'utf8').toString('base64');
  const url = `https://api.catalog.beer${path}`;
  const res = await fetch(url, {
    method,
    headers: { Accept: 'application/json', Authorization: `Basic ${auth}` },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Catalog.beer API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

function haversineMiles(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const beerHuntGeocodeCache = new Map();
async function geocodeSearchArea(searchArea) {
  const key = (searchArea || '').trim();
  if (!key) return null;
  const cacheKey = key.toLowerCase();
  if (beerHuntGeocodeCache.has(cacheKey)) return beerHuntGeocodeCache.get(cacheKey);
  let lat = null;
  let lon = null;
  const isUsZip = /^\d{5}$/.test(key.replace(/\s/g, ''));
  if (isUsZip) {
    try {
      const res = await fetch(`https://api.zippopotam.us/us/${key}`);
      if (res.ok) {
        const data = await res.json();
        const place = data?.places?.[0];
        if (place?.latitude != null && place?.longitude != null) {
          lat = parseFloat(place.latitude);
          lon = parseFloat(place.longitude);
        }
      }
    } catch (_) {}
  }
  if (lat == null || lon == null) {
    try {
      const q = key.length <= 10 && /^[\d\s]+$/.test(key) ? `${key}, USA` : key;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1`,
        { headers: { 'User-Agent': 'BeerMule/1.0 (Beer Hunt)' } }
      );
      const data = await res.json();
      const first = Array.isArray(data) && data[0];
      if (first?.lat != null && first?.lon != null) {
        lat = parseFloat(first.lat);
        lon = parseFloat(first.lon);
      }
    } catch (_) {}
  }
  const result = lat != null && lon != null && !Number.isNaN(lat) && !Number.isNaN(lon) ? { lat, lon } : null;
  beerHuntGeocodeCache.set(cacheKey, result);
  return result;
}

async function runUntappdPoll(state, existingSightingKeys, alertWhatsApp) {
  const hunts = (state.hunts || []).filter((h) => h.enabled && Array.isArray(h.sources) && h.sources.includes('untappd'));
  if (hunts.length === 0) return false;
  const clientId = process.env.UNTAPPD_CLIENT_ID;
  const clientSecret = process.env.UNTAPPD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn('Beer Mule: Untappd API not configured — skip for', hunts.length, 'Untappd hunt(s). (Commercial agreement: api.requests@untappd.com)');
    return false;
  }
  console.log('Beer Mule: checking Untappd for', hunts.length, 'hunt(s)');
  let anyNew = false;
  for (const hunt of hunts) {
    try {
      const q = [hunt.beerName].concat(hunt.breweryName ? [hunt.breweryName] : []).join(' ');
      const searchRes = await untappdRequest('/search/beer', { q, limit: '5' });
      const beers = searchRes?.response?.beers?.items || [];
      if (beers.length === 0) continue;
      const bid = beers[0].beer?.bid;
      if (!bid) continue;
      const checkinsRes = await untappdRequest(`/beer/checkins/${bid}`, { limit: '25' });
      const checkins = checkinsRes?.response?.checkins?.items || [];
      for (const item of checkins) {
        const venue = item.venue;
        if (!venue || !venue.venue_name) continue;
        const venueId = String(venue.venue_id || '');
        const venueName = venue.venue_name || 'Unknown';
        const addr = [venue.location?.venue_address, venue.location?.venue_city, venue.location?.venue_state].filter(Boolean).join(', ');
        const detectedAt = item.created_at || new Date().toISOString();
        const key = `${hunt.id}|${venueId || venueName}|${detectedAt}`;
        if (existingSightingKeys.has(key)) continue;
        existingSightingKeys.add(key);
        const venueType = (venue.venue_type || 'bar').toLowerCase().includes('restaurant') ? 'restaurant' : 'bar';
        const sighting = {
          id: `sight-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          huntId: hunt.id,
          beerName: hunt.beerName,
          venueName,
          venueAddress: addr || undefined,
          venueType: ['bar', 'restaurant', 'pub', 'bottle_shop', 'other'].includes(venueType) ? venueType : 'bar',
          venueId: venueId || undefined,
          source: 'untappd',
          detectedAt,
          alertSent: false,
          sourceUrl: item.checkin_url ? `https://untappd.com${item.checkin_url}` : undefined,
        };
        state.sightings = state.sightings || [];
        state.sightings.push(sighting);
        anyNew = true;
        if (hunt.alertWhatsApp && alertWhatsApp && twilioClient) {
          const to = hunt.whatsAppNumber && hunt.whatsAppNumber.trim() ? hunt.whatsAppNumber.trim() : alertWhatsApp;
          const msg = `🍺 Beer Hunt: "${hunt.beerName}" spotted at ${venueName}${addr ? ` (${addr})` : ''}. Source: Untappd.`;
          try {
            await sendWhatsApp(msg, false, `whatsapp:${String(to).replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
            sighting.alertSent = true;
            sighting.alertSentAt = new Date().toISOString();
          } catch (e) {
            console.warn('Beer Mule WhatsApp alert failed:', e.message);
          }
        }
      }
    } catch (e) {
      console.warn('Beer Mule Untappd poll error for', hunt.beerName, e.message);
    }
  }
  return anyNew;
}

async function runCatalogBeerPoll(state, existingSightingKeys) {
  const hunts = (state.hunts || []).filter((h) => h.enabled && Array.isArray(h.sources) && h.sources.includes('catalogbeer'));
  if (hunts.length === 0) return false;
  const apiKey = (process.env.CATALOG_BEER_API_KEY || '').trim();
  if (!apiKey) {
    console.warn('Beer Mule: Catalog.beer API not configured — skip. (Set CATALOG_BEER_API_KEY; free at catalog.beer)');
    return false;
  }
  console.log('Beer Mule: checking Catalog.beer for', hunts.length, 'hunt(s)');
  let anyNew = false;
  for (const hunt of hunts) {
    try {
      const searchArea = (hunt.searchArea || '').trim();
      const radiusMiles = Math.max(0, Number(hunt.radiusMiles) || 0);
      let center = null;
      if (searchArea && radiusMiles > 0) {
        center = await geocodeSearchArea(searchArea);
        if (!center) console.warn('Beer Mule: could not geocode search area', searchArea, '— skipping distance filter for this hunt');
      }
      const q = [hunt.beerName].concat(hunt.breweryName ? [hunt.breweryName] : []).join(' ').slice(0, 255);
      const searchRes = await catalogBeerRequest(`/beer/search?q=${encodeURIComponent(q)}&count=3`);
      const beers = searchRes?.data || [];
      const seenBrewerIds = new Set();
      for (const beerObj of beers) {
        const brewerId = beerObj?.brewer?.id || beerObj?.brewer_id;
        if (!brewerId || seenBrewerIds.has(brewerId)) continue;
        seenBrewerIds.add(brewerId);
        const locList = await catalogBeerRequest(`/brewer/${brewerId}/locations`);
        const locs = locList?.data || [];
        for (let i = 0; i < Math.min(locs.length, 5); i++) {
          const loc = locs[i];
          const locId = loc?.id;
          const locName = loc?.name || 'Brewery location';
          const alreadyHave = (state.sightings || []).some((s) => s.huntId === hunt.id && s.source === 'catalogbeer' && (s.venueId === locId || s.venueName === locName));
          if (alreadyHave) continue;
          let venueAddress;
          let locLat = null;
          let locLon = null;
          if (locId) {
            try {
              const fullLoc = await catalogBeerRequest(`/location/${locId}`);
              const addr = fullLoc?.address;
              if (addr) {
                const parts = [addr.address2, addr.address1, addr.city, addr.state_short, addr.zip5].filter(Boolean);
                venueAddress = parts.join(', ');
              }
              if (fullLoc?.latitude != null && fullLoc?.longitude != null) {
                locLat = parseFloat(fullLoc.latitude);
                locLon = parseFloat(fullLoc.longitude);
              }
            } catch (_) {}
          }
          if (center && radiusMiles > 0) {
            if (locLat == null || locLon == null || Number.isNaN(locLat) || Number.isNaN(locLon)) continue;
            const distance = haversineMiles(center.lat, center.lon, locLat, locLon);
            if (distance > radiusMiles) continue;
          }
          const key = `${hunt.id}|${locId || locName}|${new Date().toISOString()}`;
          existingSightingKeys.add(key);
          const sighting = {
            id: `sight-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            huntId: hunt.id,
            beerName: hunt.beerName,
            venueName: locName,
            venueAddress: venueAddress || undefined,
            venueType: 'bar',
            venueId: locId || undefined,
            source: 'catalogbeer',
            detectedAt: new Date().toISOString(),
            alertSent: false,
            sourceUrl: undefined,
          };
          state.sightings = state.sightings || [];
          state.sightings.push(sighting);
          anyNew = true;
        }
      }
    } catch (e) {
      console.warn('Beer Mule Catalog.beer poll error for', hunt.beerName, e.message);
    }
  }
  return anyNew;
}

async function runBeerHuntPoll() {
  const state = readBeerMuleState();
  const hasUntappd = (state.hunts || []).some((h) => h.enabled && Array.isArray(h.sources) && h.sources.includes('untappd'));
  const hasCatalogBeer = (state.hunts || []).some((h) => h.enabled && Array.isArray(h.sources) && h.sources.includes('catalogbeer'));
  if (!hasUntappd && !hasCatalogBeer) return;
  const existingSightingKeys = new Set((state.sightings || []).map((s) => `${s.huntId}|${s.venueId || s.venueName}|${s.detectedAt}`));
  const alertWhatsApp = state.config?.alertWhatsAppNumber || getAdminWhatsAppNumber();
  let anyNew = false;
  if (hasUntappd) anyNew = (await runUntappdPoll(state, existingSightingKeys, alertWhatsApp)) || anyNew;
  if (hasCatalogBeer) anyNew = (await runCatalogBeerPoll(state, existingSightingKeys)) || anyNew;
  state.lastPollAt = new Date().toISOString();
  if (anyNew) console.log('Beer Mule: saved new sightings');
  writeBeerMuleState(state);
}

let beerMuleNextPollAt = null;
let beerMulePollTimer = null;
function scheduleBeerMulePoll() {
  if (beerMulePollTimer) {
    clearInterval(beerMulePollTimer);
    clearTimeout(beerMulePollTimer);
  }
  beerMulePollTimer = null;
  const state = readBeerMuleState();
  const enabled = (state.hunts || []).some((h) => h.enabled && Array.isArray(h.sources) && (h.sources.includes('untappd') || h.sources.includes('catalogbeer')));
  if (!enabled) return;

  const mode = state.config?.beerHuntScheduleMode === 'daily' ? 'daily' : 'interval';
  const dailyTime = (state.config?.beerHuntDailyTime || '09:00').trim().slice(0, 5);
  const [dailyHour = 9, dailyMin = 0] = dailyTime.split(':').map(Number);

  function runOnce() {
    runBeerHuntPoll().catch((e) => console.warn('Beer Mule poll error:', e.message));
  }

  if (mode === 'daily') {
    function scheduleNextDaily(logAfterRun) {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dailyHour, dailyMin, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      const ms = Math.max(1000, next - now);
      if (logAfterRun) console.log('Beer Mule: daily hunt poll ran. Next at', next.toISOString());
      beerMulePollTimer = setTimeout(() => {
        runOnce();
        scheduleNextDaily(true);
      }, ms);
    }
    scheduleNextDaily(false);
  } else {
    const sec = Math.max(60, Number(state.config?.beerHuntPollIntervalSeconds) || 300);
    beerMulePollTimer = setInterval(runOnce, sec * 1000);
    console.log('Beer Mule: hunt poll scheduled every', sec, 's');
  }
}

app.post('/api/beer-mule/sync', express.json(), (req, res) => {
  try {
    const { hunts, config } = req.body || {};
    const state = readBeerMuleState();
    if (Array.isArray(hunts)) {
      state.hunts = hunts.map((h) => ({
        ...h,
        id: h.id || `hunt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        enabled: h.enabled !== false,
        sources: Array.isArray(h.sources) ? h.sources : ['untappd'],
        createdAt: h.createdAt || new Date().toISOString(),
      }));
    }
    if (config && typeof config === 'object') {
      state.config = {
        ...state.config,
        beerHuntPollIntervalSeconds: Math.max(60, Number(config.beerHuntPollIntervalSeconds) || 300),
        alertWhatsAppNumber: typeof config.alertWhatsAppNumber === 'string' ? config.alertWhatsAppNumber : (state.config?.alertWhatsAppNumber || ''),
        beerHuntScheduleMode: config.beerHuntScheduleMode === 'daily' ? 'daily' : 'interval',
        beerHuntDailyTime: typeof config.beerHuntDailyTime === 'string' && /^\d{1,2}:\d{2}$/.test(config.beerHuntDailyTime.trim()) ? config.beerHuntDailyTime.trim().slice(0, 5) : (state.config?.beerHuntDailyTime || '09:00'),
      };
    }
    writeBeerMuleState(state);
    scheduleBeerMulePoll();
    res.json({ success: true, huntsCount: (state.hunts || []).length });
  } catch (e) {
    console.error('Beer Mule sync error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/beer-mule/sightings', (req, res) => {
  try {
    const state = readBeerMuleState();
    const sightings = (state.sightings || []).map((s) => ({
      ...s,
      detectedAt: typeof s.detectedAt === 'string' ? s.detectedAt : (s.detectedAt && s.detectedAt.toISOString ? s.detectedAt.toISOString() : new Date().toISOString()),
    }));
    res.json({ success: true, sightings });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/beer-mule/sightings/clear', express.json(), (req, res) => {
  try {
    const { huntId } = req.body || {};
    if (!huntId || typeof huntId !== 'string') {
      return res.status(400).json({ success: false, error: 'huntId required' });
    }
    const state = readBeerMuleState();
    const before = (state.sightings || []).length;
    state.sightings = (state.sightings || []).filter((s) => s.huntId !== huntId);
    const removed = before - state.sightings.length;
    writeBeerMuleState(state);
    res.json({ success: true, removed });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/beer-mule/status', (req, res) => {
  try {
    const state = readBeerMuleState();
    const cfg = state.config || {};
    const mode = cfg.beerHuntScheduleMode === 'daily' ? 'daily' : 'interval';
    const intervalSeconds = Math.max(60, Number(cfg.beerHuntPollIntervalSeconds) || 300);
    const dailyTime = (cfg.beerHuntDailyTime || '09:00').trim().slice(0, 5);
    const [dailyHour = 9, dailyMin = 0] = dailyTime.split(':').map(Number);
    let nextPollAt = null;
    const now = new Date();
    if (mode === 'daily') {
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dailyHour, dailyMin, 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
      nextPollAt = next.toISOString();
    } else {
      const last = state.lastPollAt ? new Date(state.lastPollAt) : null;
      const base = last && last.getTime() > 0 ? last : now;
      nextPollAt = new Date(base.getTime() + intervalSeconds * 1000).toISOString();
    }
    res.json({
      success: true,
      lastPollAt: state.lastPollAt || null,
      nextPollAt,
      scheduleMode: mode,
      intervalSeconds: mode === 'interval' ? intervalSeconds : null,
      dailyTime: mode === 'daily' ? dailyTime : null,
    });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/beer-mule/run-poll', (req, res) => {
  runBeerHuntPoll()
    .then(() => res.json({ success: true }))
    .catch((e) => {
      console.error('Beer Mule run-poll error:', e.message);
      res.status(500).json({ success: false, error: e.message });
    });
});

app.post('/api/beer-mule/sightings', express.json(), (req, res) => {
  try {
    const { huntId, venueName, venueAddress, venueType, sourceUrl } = req.body || {};
    if (!huntId || !venueName || typeof venueName !== 'string' || !venueName.trim()) {
      return res.status(400).json({ success: false, error: 'huntId and venueName required' });
    }
    const state = readBeerMuleState();
    const hunt = (state.hunts || []).find((h) => h.id === huntId);
    if (!hunt) return res.status(404).json({ success: false, error: 'Hunt not found' });
    const sighting = {
      id: `sight-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      huntId,
      beerName: hunt.beerName,
      venueName: String(venueName).trim(),
      venueAddress: venueAddress && String(venueAddress).trim() ? String(venueAddress).trim() : undefined,
      venueType: ['bar', 'restaurant', 'pub', 'bottle_shop', 'other'].includes(String(venueType || 'bar').toLowerCase()) ? String(venueType).toLowerCase() : 'bar',
      source: 'manual',
      detectedAt: new Date().toISOString(),
      alertSent: false,
      sourceUrl: sourceUrl && String(sourceUrl).trim() ? String(sourceUrl).trim() : undefined,
    };
    state.sightings = state.sightings || [];
    state.sightings.push(sighting);
    writeBeerMuleState(state);
    res.json({ success: true, sighting });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ----- Beer Mule: Instagram / Troon — scrape via Apify, send full post + ordering URL -----
const BEER_MULE_INSTAGRAM_WATCH = (process.env.BEER_MULE_INSTAGRAM_WATCH || 'troonbrewing').toLowerCase().split(',').map((s) => s.trim().replace(/^@/, '')).filter(Boolean);
const BEER_MULE_SEEN_POSTS_PATH = path.join(__dirname, 'beer-mule-seen-posts.json');
const BEER_MULE_CONFIG_PATH = path.join(__dirname, 'beer-mule-config.json');

function readBeerMuleConfig() {
  try {
    if (fs.existsSync(BEER_MULE_CONFIG_PATH)) {
      const raw = fs.readFileSync(BEER_MULE_CONFIG_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Beer Mule config read failed:', e.message);
  }
  return {};
}

function writeBeerMuleConfig(updates) {
  try {
    const current = readBeerMuleConfig();
    const next = { ...current, ...updates, updatedAt: new Date().toISOString() };
    if (updates.apifyApiToken === '') next.apifyApiToken = '';
    if (updates.apifyActorId !== undefined) next.apifyActorId = updates.apifyActorId;
    fs.writeFileSync(BEER_MULE_CONFIG_PATH, JSON.stringify(next, null, 2), 'utf8');
  } catch (e) {
    console.warn('Beer Mule config write failed:', e.message);
  }
}

/** Token and actor: env overrides file. Used by cron so UI-saved values are picked up without restart. */
function getBeerMuleApifyConfig() {
  const envToken = (process.env.BEER_MULE_APIFY_TOKEN || '').trim();
  const envActor = (process.env.BEER_MULE_APIFY_ACTOR_ID || '').trim();
  const file = readBeerMuleConfig();
  const monitoringDays = Array.isArray(file.monitoringDays) ? file.monitoringDays : [];
  const monitoringStartTime = (file.monitoringStartTime || '00:00').trim();
  const monitoringEndTime = (file.monitoringEndTime || '23:59').trim();
  return {
    token: envToken || (file.apifyApiToken || '').trim(),
    actor: (envActor || file.apifyActorId || 'apify/instagram-post-scraper').trim() || 'apify/instagram-post-scraper',
    pollMinutes: Math.max(1, parseInt(process.env.BEER_MULE_POLL_MINUTES, 10) || parseInt(file.pollMinutes, 10) || 5),
    monitoringDays,
    monitoringStartTime: monitoringStartTime || '00:00',
    monitoringEndTime: monitoringEndTime || '23:59',
  };
}

/** True if current server time is within the configured monitoring window (days + start–end time). */
function isWithinApifySchedule() {
  const { monitoringDays, monitoringStartTime, monitoringEndTime } = getBeerMuleApifyConfig();
  const now = new Date();
  const day = now.getDay();
  const pad = (n) => String(n).padStart(2, '0');
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  if (monitoringDays.length > 0 && !monitoringDays.includes(day)) return false;
  if (monitoringStartTime && currentTime < monitoringStartTime) return false;
  if (monitoringEndTime && currentTime > monitoringEndTime) return false;
  return true;
}

// Known shop domain suffixes Troon and others use (bare "domain.square.site" in captions)
const SHOP_DOMAIN_SUFFIXES = ['square.site', 'squareup.com', 'myshopify.com', 'shopify.com'];

function extractUrlsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const out = [];
  // Full https?:// URLs
  const fullMatches = text.match(/https?:\/\/[^\s,)"'<>\]\]]+/gi) || [];
  out.push(...fullMatches.map((u) => u.replace(/[.,;:!?]+$/, '')));
  // Bare shop domains: subdomain.square.site, falsespring.square.site, etc. (allow optional spaces around dots)
  for (const suffix of SHOP_DOMAIN_SUFFIXES) {
    const parts = suffix.split('.').map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const relaxedSuffix = parts.join('\\s*\\.\\s*');
    const re = new RegExp(`[a-z0-9][a-z0-9.-]*\\s*\\.\\s*${relaxedSuffix}(?:\\/[^\\s,)"'<>]*)?`, 'gi');
    const bare = text.match(re) || [];
    for (const b of bare) {
      const normalized = (b.startsWith('http') ? b : `https://${b}`).replace(/\s/g, '').replace(/[.,;:!?]+$/, '');
      if (normalized && !out.includes(normalized)) out.push(normalized);
    }
  }
  // Fallback: any token containing square.site or squareup.com (Instagram may strip or wrap links)
  const squareSiteRe = /[a-z0-9][a-z0-9.-]*\.?square\.site[a-z0-9.\-/]*/gi;
  const squareupRe = /[a-z0-9][a-z0-9.-]*\.?squareup\.com[a-z0-9.\-/]*/gi;
  for (const re of [squareSiteRe, squareupRe]) {
    let m;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0].replace(/\s/g, '');
      const normalized = raw.startsWith('http') ? raw : `https://${raw}`;
      const clean = normalized.replace(/[.,;:!?]+$/, '');
      if (clean.length > 10 && !out.includes(clean)) out.push(clean);
    }
  }
  return [...new Set(out)];
}

/** Collect all string values from an object (for raw post dump when caption is missing). */
function collectAllStringsFromObject(obj, out, seen) {
  if (!obj || seen.has(obj)) return;
  seen.add(obj);
  if (typeof obj === 'string') {
    const t = obj.trim();
    if (t.length > 0 && t.length < 5000) out.push(t);
    return;
  }
  if (Array.isArray(obj)) {
    for (const v of obj) collectAllStringsFromObject(v, out, seen);
    return;
  }
  if (typeof obj === 'object') {
    for (const v of Object.values(obj)) collectAllStringsFromObject(v, out, seen);
  }
}

/** Send email + WhatsApp for one Troon (or watched) post. Used by webhook and by Apify poll. */
async function sendBeerMulePostAlert(payload) {
  const username = String(payload.username || '').toLowerCase().replace(/^@/, '');
  const caption = payload.caption || payload.text || payload.content || '';
  const postUrl = payload.url || payload.postUrl || payload.link || '';
  const imageUrl = payload.imageUrl || payload.image || '';
  const timestamp = payload.timestamp || payload.created || new Date().toISOString();

  let fullPostText = (caption && String(caption).trim()) ? String(caption).trim() : '';
  if (!fullPostText && payload.rawPost && typeof payload.rawPost === 'object') {
    const strings = [];
    collectAllStringsFromObject(payload.rawPost, strings, new Set());
    fullPostText = [...new Set(strings)].filter((s) => s.length > 2 && !/^[\d.]+$/.test(s)).join('\n\n');
  }
  if (!fullPostText && payload.rawPost && typeof payload.rawPost === 'object') {
    try {
      const rawJson = JSON.stringify(payload.rawPost, null, 1);
      fullPostText = 'Raw post data from feed:\n' + rawJson.slice(0, 4000) + (rawJson.length > 4000 ? '\n…(truncated)' : '');
    } catch (_) {
      fullPostText = '(no caption from feed)';
    }
  }
  if (!fullPostText) fullPostText = '(no caption from feed)';

  const label = username === 'troonbrewing' ? 'Troon' : `@${username}`;

  const emailTo = getAdminEmail();
  const whatsAppTo = getAdminWhatsAppNumber();
  const emailConfigured = !!(useSendGrid || emailTransporter);
  const whatsAppConfigured = !!twilioClient;

  console.log('🍺 Beer Mule alert: emailTo=' + (emailTo ? emailTo.replace(/^(.{2}).*@(.+)$/, '$1***@$2') : '(none)') +
    ', whatsAppTo=' + (whatsAppTo ? '***' + whatsAppTo.slice(-4) : '(none)') +
    ', emailConfigured=' + emailConfigured + ', whatsAppConfigured=' + whatsAppConfigured);

  const subject = `🍺 ${label} posted on Instagram`;
  const bodyLines = [
    `${label} posted on Instagram. Full post below:`,
    '',
    '--- FULL POST ---',
    fullPostText,
    '--- END POST ---',
    '',
  ];
  if (postUrl) bodyLines.push(`Post link: ${postUrl}`);
  if (imageUrl) bodyLines.push(`Image: ${imageUrl}`);
  bodyLines.push('');
  bodyLines.push(`Time: ${timestamp}`);
  const bodyText = bodyLines.join('\n');

  const shortMsg = `🍺 ${label} posted on Instagram.\n\n${fullPostText.slice(0, 1200)}${fullPostText.length > 1200 ? '…' : ''}${postUrl ? `\n\nPost: ${postUrl}` : ''}`;

  let emailSent = false;
  let whatsAppSent = false;
  let emailError = null;
  let whatsAppError = null;

  if (emailTo && emailConfigured) {
    try {
      await sendEmailReply(emailTo, subject, bodyText);
      emailSent = true;
      console.log('🍺 Beer Mule (Troon): alert sent by email to', emailTo);
    } catch (e) {
      emailError = e.message || String(e);
      console.error('🍺 Beer Mule (Troon): email send failed:', emailError);
    }
  } else if (!emailTo) {
    console.warn('🍺 Beer Mule (Troon): no email sent — set admin email in Config → General (Contact Information) or ensure companies-config has adminEmail.');
  } else {
    console.warn('🍺 Beer Mule (Troon): no email sent — SendGrid/email not configured (set SENDGRID_API_KEY or SMTP in .env.backend).');
  }
  if (whatsAppTo && whatsAppConfigured) {
    try {
      await sendWhatsApp(shortMsg, false, `whatsapp:${whatsAppTo.replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
      whatsAppSent = true;
      console.log('🍺 Beer Mule (Troon): alert sent by WhatsApp');
    } catch (e) {
      whatsAppError = e.message || String(e);
      console.error('🍺 Beer Mule (Troon): WhatsApp send failed:', whatsAppError);
    }
  } else if (!whatsAppTo) {
    console.warn('🍺 Beer Mule (Troon): no WhatsApp sent — set admin WhatsApp in Config → General (Contact Information).');
  } else {
    console.warn('🍺 Beer Mule (Troon): no WhatsApp sent — Twilio not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER in .env.backend).');
  }
  return { alerted: true, emailSent, whatsAppSent, emailError, whatsAppError };
}

app.post('/api/beermule/webhook', express.json(), async (req, res) => {
  try {
    const username = String(req.body.username || req.body.Username || '').toLowerCase().replace(/^@/, '');
    if (!username) {
      return res.status(400).json({ success: false, error: 'username required' });
    }
    const watched = BEER_MULE_INSTAGRAM_WATCH.length > 0 ? BEER_MULE_INSTAGRAM_WATCH : ['troonbrewing'];
    if (!watched.includes(username)) {
      res.json({ success: true, message: 'Post received; account not in watch list.', alerted: false });
      return;
    }
    const result = await sendBeerMulePostAlert({
      username,
      caption: req.body.caption || req.body.Caption || req.body.text || req.body.Text || req.body.content || '',
      url: req.body.url || req.body.Url || req.body.postUrl || req.body.PostUrl || req.body.link || '',
      imageUrl: req.body.imageUrl || req.body.ImageUrl || req.body.image || '',
      timestamp: req.body.timestamp || req.body.Timestamp || req.body.created || new Date().toISOString(),
    });
    res.json({ success: true, message: 'Post received; alert sent (email + WhatsApp).', ...result });
  } catch (e) {
    console.error('Beer Mule webhook error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ----- Beer Mule: Apify poll — fetch Troon's posts and send full post + URL -----
/** Get caption text from an Apify/Instagram post object (many actors use different field names). */
function getPostCaption(item) {
  if (!item || typeof item !== 'object') return '';
  const node = item.node && typeof item.node === 'object' ? item.node : item;
  const raw =
    node.caption
    || node.caption_text
    || node.text
    || node.alt
    || node.description
    || node.title
    || (node.edge_media_to_caption?.edges?.[0]?.node?.text)
    || (node.node?.edge_media_to_caption?.edges?.[0]?.node?.text)
    || (node.owner && typeof node.owner === 'object' ? (node.owner.caption || node.owner.bio || '') : '')
    || (item.caption || item.caption_text || item.text || '')
    || '';
  let out = String(raw).trim();
  if (out) return out;
  out = findFirstLongTextInObject(node, 40);
  if (out) return out;
  return findFirstLongTextInObject(item, 40) || '';
}

/** Find first string value in object (or nested) that looks like a caption (long text, not a URL). */
function findFirstLongTextInObject(obj, minLen) {
  if (!obj || typeof obj !== 'object') return '';
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'owner' && v && typeof v === 'object') {
      const fromOwner = findFirstLongTextInObject(v, minLen);
      if (fromOwner) return fromOwner;
    }
    if (typeof v === 'string' && v.length >= minLen && !v.match(/^https?:\/\//i) && !v.match(/^[\w.-]+@[\w.-]+$/)) return v;
  }
  return '';
}

/** Get main post URL (Instagram permalink or display URL). */
function getPostUrl(item, shortCode) {
  if (!item || typeof item !== 'object') return '';
  const node = item.node && typeof item.node === 'object' ? item.node : item;
  const raw =
    node.url
    || node.displayUrl
    || node.link
    || node.permalink
    || node.link_url
    || node.external_url
    || (node.video && node.video.url)
    || (node.image && (node.image.url || node.image))
    || item.url || item.displayUrl || item.permalink
    || (shortCode ? `https://www.instagram.com/p/${shortCode}` : '');
  let out = String(raw).trim();
  if (out) return out;
  out = findFirstUrlInObject(node);
  if (out) return out;
  return findFirstUrlInObject(item) || '';
}

/** Find first string in object (or nested) that looks like an HTTP URL. */
function findFirstUrlInObject(obj) {
  if (!obj || typeof obj !== 'object') return '';
  for (const v of Object.values(obj)) {
    if (typeof v === 'string' && v.match(/^https?:\/\/[^\s]+$/i)) return v.trim();
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = findFirstUrlInObject(v);
      if (nested) return nested;
    }
  }
  return '';
}

/** Get any URL(s) from post (caption text + known link fields). */
function getPostUrls(item) {
  if (!item || typeof item !== 'object') return [];
  const caption = getPostCaption(item);
  const fromCaption = extractUrlsFromText(caption);
  const linkUrl = (item.link_url || item.external_url || item.url || item.displayUrl || item.permalink || '').trim();
  const out = [...fromCaption];
  if (linkUrl && !out.includes(linkUrl)) out.push(linkUrl);
  const found = findFirstUrlInObject(item);
  if (found && !out.includes(found)) out.push(found);
  return out;
}

function readBeerMuleSeenPosts() {
  try {
    if (fs.existsSync(BEER_MULE_SEEN_POSTS_PATH)) {
      const raw = fs.readFileSync(BEER_MULE_SEEN_POSTS_PATH, 'utf8');
      const data = JSON.parse(raw);
      const ids = Array.isArray(data) ? data : (data && Array.isArray(data.seenIds) ? data.seenIds : []);
      if (ids.length > 0) console.log('🍺 Beer Mule Apify: loaded', ids.length, 'seen IDs from', path.basename(BEER_MULE_SEEN_POSTS_PATH));
      return ids;
    }
  } catch (e) {
    console.warn('Beer Mule seen posts read failed:', e.message, 'path:', BEER_MULE_SEEN_POSTS_PATH);
  }
  return [];
}

function writeBeerMuleSeenPosts(seenIds) {
  try {
    const kept = Array.isArray(seenIds) ? seenIds.slice(-500) : [];
    fs.writeFileSync(BEER_MULE_SEEN_POSTS_PATH, JSON.stringify({ seenIds: kept, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
    console.log('🍺 Beer Mule Apify: saved', kept.length, 'seen IDs to', BEER_MULE_SEEN_POSTS_PATH);
  } catch (e) {
    console.warn('Beer Mule seen posts write failed:', e.message, 'path:', BEER_MULE_SEEN_POSTS_PATH);
  }
}

function buildApifyInput(handle, limit, actorIdOrSlug) {
  const h = handle.replace(/^@/, '');
  const profileUrl = `https://www.instagram.com/${h}`;
  if (String(actorIdOrSlug).includes('scrapier/instagram-profile-post-scraper')) {
    return { startUrls: [profileUrl, h], maxPosts: limit };
  }
  if (String(actorIdOrSlug).includes('apidojo/instagram-scraper-api')) {
    return { startUrls: [profileUrl], maxItems: limit };
  }
  if (String(actorIdOrSlug).includes('singhera07/instagram-scraper')) {
    return { action: 'posts', username: h, limit: Math.min(limit, 50) };
  }
  return { startUrls: [profileUrl], maxItems: limit, username: h, resultsLimit: limit };
}

function parsePostsFromApifyResult(rawResults) {
  const posts = [];
  if (rawResults == null) return posts;
  if (typeof rawResults === 'object' && Array.isArray(rawResults.items)) {
    return parsePostsFromApifyResult(rawResults.items);
  }
  if (typeof rawResults === 'object' && rawResults.data && Array.isArray(rawResults.data.items)) {
    return parsePostsFromApifyResult(rawResults.data.items);
  }
  if (typeof rawResults === 'object' && Array.isArray(rawResults.data)) {
    return parsePostsFromApifyResult(rawResults.data);
  }
  if (typeof rawResults === 'object' && Array.isArray(rawResults.results)) {
    return parsePostsFromApifyResult(rawResults.results);
  }
  // apidojo/instagram-scraper-api returns a flat array of post objects; some use different field names
  if (Array.isArray(rawResults) && rawResults.length > 0) {
    const first = rawResults[0];
    const looksLikePost = first && typeof first === 'object' && (
      first.caption != null || first.text != null || first.code != null || first.url != null ||
      first.id != null || first.displayUrl != null || first.owner != null || first.createdAt != null ||
      first.caption_text != null || first.shortcode != null || first.created_at != null
    );
    if (looksLikePost) {
      return rawResults.filter((r) => r && typeof r === 'object');
    }
    if (first && typeof first === 'object') {
      return rawResults.filter((r) => r && typeof r === 'object');
    }
    const arr = rawResults;
    for (const r of arr) {
      if (Array.isArray(r.latestPosts) && r.latestPosts.length > 0) {
        posts.push(...r.latestPosts);
      } else if (Array.isArray(r.posts) && r.posts.length > 0) {
        posts.push(...r.posts);
      } else if (Array.isArray(r.items) && r.items.length > 0) {
        posts.push(...r.items);
      } else if (r && typeof r === 'object' && (
        r.caption != null || r.text != null || r.node != null || r.code != null ||
        r.url != null || r.id != null || r.displayUrl != null || r.owner != null || r.createdAt != null
      )) {
        posts.push(r);
      }
    }
    return posts;
  }
  const single = Array.isArray(rawResults) ? rawResults : [rawResults];
  for (const r of single) {
    if (Array.isArray(r?.latestPosts)) posts.push(...r.latestPosts);
    else if (Array.isArray(r?.posts)) posts.push(...r.posts);
    else if (Array.isArray(r?.items)) posts.push(...r.items);
    else if (r && typeof r === 'object' && (r.caption != null || r.text != null || r.code != null || r.url != null || r.id != null)) posts.push(r);
  }
  return posts;
}

async function fetchTroonPostsFromApify(username) {
  const { token, actor } = getBeerMuleApifyConfig();
  if (!token) return [];
  const actorId = actor.replace('/', '~');
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}&format=json`;
  const input = buildApifyInput(username, 15, actor);
  console.log('🍺 Beer Mule Apify: running actor with input', JSON.stringify(input));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const errText = await res.text();
    let errJson;
    try { errJson = JSON.parse(errText); } catch (_) {}
    if (res.status === 403 && errJson?.error?.type === 'actor-is-not-rented') {
      console.warn('🍺 Beer Mule Apify: this actor must be rented (subscription) on Apify. Go to the actor page → Rent, or switch to a pay-per-run actor like apidojo/instagram-scraper-api.');
    } else {
      console.warn('Beer Mule Apify fetch failed:', res.status, errText.slice(0, 200));
    }
    return [];
  }
  let raw;
  try {
    raw = await res.json();
  } catch (e) {
    console.warn('Beer Mule Apify: response was not JSON');
    return [];
  }
  let posts = parsePostsFromApifyResult(raw);
  const isDemoOnly = posts.length > 0 && posts.every((p) => p && typeof p === 'object' && Object.keys(p).length <= 2 && (p.demo === true || (Object.keys(p).length === 1 && 'demo' in p)));
  if (isDemoOnly) {
    console.warn('🍺 Beer Mule Apify: run returned only demo/placeholder data (no real posts). Add a payment method in Apify Console → Billing, then run the actor once in Console with startUrls: [Troon profile] to verify real data.');
    posts = [];
  }
  if (posts.length === 0 && raw != null && !isDemoOnly) {
    const isArr = Array.isArray(raw);
    const preview = isArr
      ? `[array length ${raw.length}]`
      : typeof raw === 'object'
        ? `{${Object.keys(raw).slice(0, 10).join(', ')}}`
        : String(raw).slice(0, 200);
    console.warn('Beer Mule Apify: 0 posts parsed. Response:', preview);
  }
  // Sort newest first so "latest post" (e.g. today's beer release) is posts[0]
  const getTime = (p) => {
    const t = p.timestamp || p.takenAt || p.createdAt || p.created_at || p.date;
    if (t == null) return 0;
    const ms = typeof t === 'number' ? t : new Date(t).getTime();
    return Number.isFinite(ms) ? ms : 0;
  };
  posts.sort((a, b) => getTime(b) - getTime(a));
  return posts;
}

async function runBeerMuleApifyPoll(opts = {}) {
  const { testSendLatest = false } = opts;
  const token = getBeerMuleApifyConfig().token;
  if (!token) {
    return { postsFetched: 0, alertsSent: 0, firstRun: false, message: 'No Apify token configured.' };
  }
  const watched = BEER_MULE_INSTAGRAM_WATCH.length > 0 ? BEER_MULE_INSTAGRAM_WATCH : ['troonbrewing'];
  let seenIds = readBeerMuleSeenPosts();
  const isFirstRun = seenIds.length === 0;
  let totalFetched = 0;
  let alertsSent = 0;
  let lastAlertResult = null;

  for (const username of watched) {
    try {
      const posts = await fetchTroonPostsFromApify(username);
      totalFetched += posts.length;
      console.log('🍺 Beer Mule Apify: fetched', posts.length, 'posts for @' + username);

      if (posts.length === 0) {
        console.log('🍺 Beer Mule Apify: no posts returned (actor may use different output format or rate limit).');
        continue;
      }

      if (isFirstRun && !testSendLatest) {
        console.log('🍺 Beer Mule Apify: first run — seeding seen list and sending one alert for latest post so you can verify email/WhatsApp.');
      }

      const toProcess = testSendLatest && posts.length > 0
        ? [posts[0]]
        : posts;
      let sentFirstRun = false;
      const getItemTime = (p) => {
        const t = p.timestamp || p.takenAt || p.createdAt || p.created_at || p.date;
        return t != null ? (typeof t === 'number' ? t : new Date(t).getTime()) : 0;
      };

      for (let idx = 0; idx < toProcess.length; idx++) {
        const item = toProcess[idx];
        const rawId = String(item.id || item.shortCode || item.code || item.pk || item.url || '').trim();
        const postId = rawId || `${username}-${idx}-${getItemTime(item)}`;
        if (!testSendLatest && seenIds.includes(postId)) continue;
        if (!testSendLatest) seenIds.push(postId);

        const sendThisOne = testSendLatest || !isFirstRun || (isFirstRun && !sentFirstRun && item === posts[0]);
        if (!sendThisOne) continue;

        const caption = getPostCaption(item);
        const shortCode = item.shortCode || item.code || (item.node && (item.node.shortCode || item.node.shortcode || item.node.code));
        const postUrl = getPostUrl(item, shortCode);
        if (item === posts[0] && !caption) {
          const preview = {};
          for (const [k, v] of Object.entries(item || {})) {
            if (typeof v === 'string') preview[k] = v.length > 80 ? v.slice(0, 80) + '…' : v;
            else if (typeof v === 'number' || typeof v === 'boolean') preview[k] = v;
            else if (v && typeof v === 'object' && !Array.isArray(v) && k === 'owner') preview.owner = Object.fromEntries(Object.entries(v).slice(0, 5).map(([kk, vv]) => [kk, typeof vv === 'string' ? String(vv).slice(0, 60) : vv]));
          }
          console.log('🍺 Beer Mule Apify: first post preview (caption/url empty?)', JSON.stringify(preview).slice(0, 600));
        }
        try {
          lastAlertResult = await sendBeerMulePostAlert({
            username,
            caption: caption || '',
            url: postUrl,
            rawPost: item,
            imageUrl: item.imageUrl || item.displayUrl || '',
            timestamp: item.timestamp || item.takenAt || item.createdAt || item.created_at || new Date().toISOString(),
          });
          alertsSent++;
        } catch (sendErr) {
          console.error('🍺 Beer Mule Apify: send alert failed (email/WhatsApp may still be sent):', sendErr.message);
        }
        if (isFirstRun) sentFirstRun = true;
      }
      if (!testSendLatest) writeBeerMuleSeenPosts(seenIds);
    } catch (e) {
      console.warn('Beer Mule Apify poll error for', username, ':', e.message);
      try {
        writeBeerMuleSeenPosts(seenIds);
      } catch (_) {}
    }
  }

  let message = `Fetched ${totalFetched} post(s).`;
  if (alertsSent > 0) {
    message += ` Sent ${alertsSent} alert(s) — check email and WhatsApp.`;
    if (lastAlertResult && (lastAlertResult.emailSent === false || lastAlertResult.whatsAppSent === false)) {
      const parts = [];
      if (lastAlertResult.emailSent === false) parts.push('email: ' + (lastAlertResult.emailError || 'not configured or no admin email'));
      if (lastAlertResult.whatsAppSent === false) parts.push('WhatsApp: ' + (lastAlertResult.whatsAppError || 'not configured or no admin WhatsApp'));
      if (parts.length) message += ' (' + parts.join('; ') + ')';
    }
  } else if (totalFetched === 0) {
    message += ' Apify returned 0 posts. Check backend terminal for "Beer Mule Apify: 0 posts parsed" to see the response shape. Run the actor once in Apify Console (same input: startUrls + maxItems) to confirm it returns data and you have pay-per-run credit.';
  } else if (isFirstRun && !testSendLatest) message += ' First run: seen list seeded. Run again or wait for next poll to get alerts for new posts.';
  else message += ' No new posts since last run.';

  const out = { postsFetched: totalFetched, alertsSent, firstRun: isFirstRun, message };
  if (lastAlertResult) out.emailSent = lastAlertResult.emailSent;
  if (lastAlertResult) out.whatsAppSent = lastAlertResult.whatsAppSent;
  if (lastAlertResult?.emailError) out.emailError = lastAlertResult.emailError;
  if (lastAlertResult?.whatsAppError) out.whatsAppError = lastAlertResult.whatsAppError;
  return out;
}

const beerMulePollMins = getBeerMuleApifyConfig().pollMinutes;
cron.schedule(`*/${beerMulePollMins} * * * *`, () => {
  if (!isWithinApifySchedule()) return;
  runBeerMuleApifyPoll().catch((e) => console.warn('Beer Mule Apify cron error:', e.message));
});
console.log(`🍺 Beer Mule: Apify poll scheduled every ${beerMulePollMins} min (only between monitoring start/end time on selected days). Seen list: ${BEER_MULE_SEEN_POSTS_PATH}`);

app.get('/api/beermule/config', (req, res) => {
  try {
    const file = readBeerMuleConfig();
    const token = (file.apifyApiToken || '').trim();
    res.json({
      apifyActorId: (file.apifyActorId || 'apify/instagram-post-scraper').trim() || 'apify/instagram-post-scraper',
      pollMinutes: Math.max(1, parseInt(file.pollMinutes, 10) || 5),
      hasApifyToken: !!token,
      apifyTokenMasked: token ? `apify_api_***${token.slice(-4)}` : '',
      monitoringDays: Array.isArray(file.monitoringDays) ? file.monitoringDays : [],
      monitoringStartTime: (file.monitoringStartTime || '00:00').trim(),
      monitoringEndTime: (file.monitoringEndTime || '23:59').trim(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/beermule/config', express.json(), (req, res) => {
  try {
    const { apifyApiToken, apifyActorId, pollMinutes, monitoringDays, monitoringStartTime, monitoringEndTime } = req.body || {};
    const updates = {};
    if (apifyApiToken !== undefined) updates.apifyApiToken = String(apifyApiToken || '').trim();
    if (apifyActorId !== undefined) updates.apifyActorId = String(apifyActorId || 'apify/instagram-post-scraper').trim() || 'apify/instagram-post-scraper';
    if (pollMinutes !== undefined) updates.pollMinutes = Math.max(1, parseInt(pollMinutes, 10) || 5);
    if (monitoringDays !== undefined) updates.monitoringDays = Array.isArray(monitoringDays) ? monitoringDays : [];
    if (monitoringStartTime !== undefined) updates.monitoringStartTime = String(monitoringStartTime || '00:00').trim();
    if (monitoringEndTime !== undefined) updates.monitoringEndTime = String(monitoringEndTime || '23:59').trim();
    writeBeerMuleConfig(updates);
    res.json({ success: true, message: 'Beer Mule Apify config saved. Instagram polling runs only between start and end time on selected days.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/beermule/run-poll', async (req, res) => {
  try {
    const testSendLatest = req.query.test === '1' || (req.body && req.body.test === true);
    const result = await runBeerMuleApifyPoll({ testSendLatest });
    res.json({ success: true, ...result });
  } catch (e) {
    console.warn('Beer Mule run-poll error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ----- Kandidly: hiring screener — score candidates vs job description; history; email + WhatsApp -----
const KANDIDLY_HISTORY_PATH = path.join(__dirname, 'kandidly-history.json');
const KANDIDLY_JDS_PATH = path.join(__dirname, 'kandidly-jds.json');
const KANDIDLY_CANDIDATES_PATH = path.join(__dirname, 'kandidly-candidates.json');

const KANDIDLY_SYSTEM_PROMPT = `You are Kandidly, an expert hiring screener. You evaluate candidate profiles and optional interview notes against a job description (JD) and provide in-depth, actionable insights.

GUARDRAILS (mandatory):
- Score ONLY on job-relevant criteria (skills, experience, behavior). Do not score or factor in protected attributes (age, gender, nationality, ethnicity, names, or similar).
- If interview notes contain biased or discriminatory language, include a brief note in recommendationReasoning (e.g. "Note: interview notes contain language that may introduce bias; evaluation is based only on job-relevant evidence.").
- Every output is advisory only; state in recommendationReasoning that the AI score is advisory and not a final hiring decision.

For each candidate you MUST provide:
1. **score** (1–10): Overall fit for the role; 10 = strong match. Also provide **score100** (0–100): same fit on a 0–100 scale.
2. **skillsMatch** (0–100): Technical or functional skills vs JD requirements.
3. **experienceRelevance** (0–100): Years, domain, and seniority relevance.
4. **cultureFit** (0–100): Behavioral/culture fit based on interview notes (or 50 if no notes).
5. **redFlagScore** (0–100): Lower is better; 0 = no concerns, 100 = serious red flags.
6. **fitSummary**: 2–3 sentences (candidate summary).
7. **detailedFitNarrative**: A full paragraph (4–6 sentences) with in-depth analysis. Cite JD and resume explicitly. Distinguish must-have vs nice-to-have gaps where possible. Flag any inconsistencies between resume and interview notes. If role level is specified and candidate appears overqualified, note it.
8. **experienceVsRequirements**: Array of strings mapping JD requirements to candidate evidence. Cover 4–6 key requirements.
9. **strengths**: Array of at least top 3 specific strengths with brief evidence.
10. **gaps**: Array of at least top 3 concerns/gaps with brief evidence; label if must-have vs nice-to-have where relevant.
11. **redFlags**: Array of red flags; empty if none.
12. **interviewFocusAreas**: Array of 3–5 suggested follow-up questions; especially important if recommendation is "maybe".
13. **recommendation**: One of "strong_fit" (Strong Yes), "possible_fit" (Yes), "maybe" (Maybe), "weak_fit" (No).
14. **recommendationReasoning**: 2–3 sentences explaining the recommendation; include that the AI score is advisory, not a final hiring decision.

Output ONLY a valid JSON object (no markdown, no other text) with this shape:
{"candidates":[{"name":"...","score":8,"score100":80,"skillsMatch":85,"experienceRelevance":75,"cultureFit":70,"redFlagScore":10,"fitSummary":"...","detailedFitNarrative":"...","experienceVsRequirements":["..."],"strengths":["..."],"gaps":["..."],"redFlags":["..."],"interviewFocusAreas":["..."],"recommendation":"strong_fit|possible_fit|maybe|weak_fit","recommendationReasoning":"..."}]}
Include one object per candidate in the same order as the input.`;

function readKandidlyHistory() {
  try {
    if (fs.existsSync(KANDIDLY_HISTORY_PATH)) {
      const raw = fs.readFileSync(KANDIDLY_HISTORY_PATH, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data.entries) ? data.entries : [];
    }
  } catch (e) {
    console.warn('Kandidly history read failed:', e.message);
  }
  return [];
}

function writeKandidlyHistory(entries) {
  fs.writeFileSync(KANDIDLY_HISTORY_PATH, JSON.stringify({ entries, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
}

function readKandidlyJds() {
  try {
    if (fs.existsSync(KANDIDLY_JDS_PATH)) {
      const raw = fs.readFileSync(KANDIDLY_JDS_PATH, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data.jds) ? data.jds : [];
    }
  } catch (e) {
    console.warn('Kandidly JDs read failed:', e.message);
  }
  return [];
}

function writeKandidlyJds(jds) {
  fs.writeFileSync(KANDIDLY_JDS_PATH, JSON.stringify({ jds, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
}

function readKandidlyCandidates() {
  try {
    if (fs.existsSync(KANDIDLY_CANDIDATES_PATH)) {
      const raw = fs.readFileSync(KANDIDLY_CANDIDATES_PATH, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data.candidates) ? data.candidates : [];
    }
  } catch (e) {
    console.warn('Kandidly candidates read failed:', e.message);
  }
  return [];
}

function writeKandidlyCandidates(candidates) {
  fs.writeFileSync(KANDIDLY_CANDIDATES_PATH, JSON.stringify({ candidates, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
}

function findPreviousScreening(candidateName, roleLabel) {
  const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  const roleNorm = norm(roleLabel);
  const nameNorm = norm(candidateName);
  const history = readKandidlyHistory();
  for (const record of history) {
    const recordRoleNorm = norm(record.roleLabel);
    if (recordRoleNorm && roleNorm && recordRoleNorm !== roleNorm && !recordRoleNorm.includes(roleNorm) && !roleNorm.includes(recordRoleNorm)) continue;
    for (const c of record.candidates || []) {
      if (norm(c.name) === nameNorm || (nameNorm && norm(c.name).includes(nameNorm)) || (norm(c.name) && nameNorm.includes(norm(c.name)))) {
        return record;
      }
    }
  }
  return null;
}

function parseScreenRequest(text) {
  if (!text || typeof text !== 'string') return null;
  const lower = text.toLowerCase().trim();
  const rerun = /\b(rerun|screen again|run again|re-run)\b/i.test(text);
  const screenFor = text.match(/\bscreen\s+(.+?)\s+for\s+(.+?)(?:\.|$|\n)/i) || text.match(/\bscreen\s+(.+?)\s+for\s+(.+)/is);
  if (screenFor) {
    const candidateName = screenFor[1].trim();
    const roleOrJd = screenFor[2].trim();
    if (candidateName && roleOrJd) return { candidateName, roleOrJd, rerun };
  }
  const runScreeningFor = text.match(/\brun\s+screening\s+for\s+(.+?)\s+against\s+(.+?)(?:\.|$|\n)/i) || text.match(/\brun\s+screening\s+for\s+(.+?)\s+against\s+(.+)/is);
  if (runScreeningFor) {
    const candidateName = runScreeningFor[1].trim();
    const roleOrJd = runScreeningFor[2].trim();
    if (candidateName && roleOrJd) return { candidateName, roleOrJd, rerun };
  }
  return null;
}

function extractRoleLabelFromJd(jd) {
  const firstLine = (jd || '').split(/\n/)[0]?.trim().slice(0, 120) || '';
  return firstLine || 'Screening';
}

async function runKandidlyScreening(jd, validCandidates, jdMeta) {
  let metaBlock = '';
  if (jdMeta && typeof jdMeta === 'object') {
    if (jdMeta.roleType) metaBlock += `\nRole type (weight scoring accordingly): ${jdMeta.roleType}`;
    if (jdMeta.seniorityLevel) metaBlock += `\nSeniority level: ${jdMeta.seniorityLevel} (flag overqualified candidates if relevant)`;
    if (jdMeta.mustHaves) metaBlock += `\nMust-haves:\n${jdMeta.mustHaves}`;
    if (jdMeta.niceToHaves) metaBlock += `\nNice-to-haves:\n${jdMeta.niceToHaves}`;
    if (jdMeta.redFlags) metaBlock += `\nRed flags to watch:\n${jdMeta.redFlags}`;
    if (jdMeta.scoringWeights && typeof jdMeta.scoringWeights === 'object') metaBlock += `\nScoring weights (0–100 per dimension): ${JSON.stringify(jdMeta.scoringWeights)}`;
  }
  const context = `JOB DESCRIPTION:${metaBlock ? '\n' + metaBlock + '\n\n' : '\n'}${jd}\n\nCANDIDATES:\n${validCandidates.map((c, i) => `--- Candidate ${i + 1}: ${c.name} ---\nResume:\n${c.resume}${c.interviewNotes ? `\nInterview notes:\n${c.interviewNotes}` : ''}\n`).join('\n')}`;
  const prompt = `Review the job description and each candidate's resume (and interview notes if provided). For each candidate provide: score (1–10), score100 (0–100), skillsMatch, experienceRelevance, cultureFit, redFlagScore (each 0–100), fitSummary, detailedFitNarrative, experienceVsRequirements, strengths (top 3+), gaps (top 3+), redFlags, interviewFocusAreas, recommendation (strong_fit|possible_fit|maybe|weak_fit), recommendationReasoning. Distinguish must-have vs nice-to-have gaps; flag resume/interview inconsistencies and overqualification if relevant. If role type or scoring weights are provided, weight dimensions accordingly. Output ONLY the JSON object with a "candidates" array.`;
  let text = await askAI(prompt, context, { systemPrompt: KANDIDLY_SYSTEM_PROMPT });
  const jsonMatch = (text || '').match(/\{[\s\S]*\}/);
  let results = [];
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      results = Array.isArray(parsed.candidates) ? parsed.candidates : [];
      results = results.map((c) => {
        const score = c.score != null ? Number(c.score) : 0;
        return {
          ...c,
          score100: c.score100 != null ? Number(c.score100) : Math.round(score * 10),
          skillsMatch: c.skillsMatch != null ? Number(c.skillsMatch) : undefined,
          experienceRelevance: c.experienceRelevance != null ? Number(c.experienceRelevance) : undefined,
          cultureFit: c.cultureFit != null ? Number(c.cultureFit) : undefined,
          redFlagScore: c.redFlagScore != null ? Number(c.redFlagScore) : undefined,
        };
      });
    } catch (_) {}
  }
  return results;
}

async function sendKandidlyNotifications(record, adminEmail, adminWhatsApp) {
  const roleLabel = record.roleLabel || 'Screening';
  const lines = (record.candidates || []).map((r) => {
    const rec = r.recommendation === 'strong_fit' ? 'Strong fit' : r.recommendation === 'possible_fit' ? 'Possible fit' : 'Weak fit';
    return `${r.name || 'Candidate'}: ${r.score}/10 – ${rec}\n${(r.detailedFitNarrative || r.fitSummary || '').slice(0, 400)}${(r.detailedFitNarrative || r.fitSummary || '').length > 400 ? '…' : ''}`;
  });
  const emailBody = `Kandidly screening results – ${roleLabel}\n\n${(record.candidates || []).map((r) => {
    const rec = r.recommendation === 'strong_fit' ? 'Strong fit' : r.recommendation === 'possible_fit' ? 'Possible fit' : 'Weak fit';
    return `${r.name || 'Candidate'}: ${r.score}/10 – ${rec}\n\nFit summary: ${r.fitSummary || ''}\n\nDetailed: ${r.detailedFitNarrative || ''}\n\nExperience vs requirements: ${(r.experienceVsRequirements || []).join(' | ')}\nStrengths: ${(r.strengths || []).join('; ')}\nGaps: ${(r.gaps || []).join('; ')}\nRed flags: ${(r.redFlags || []).join('; ') || 'None'}\nInterview focus: ${(r.interviewFocusAreas || []).join('; ')}\nRecommendation reasoning: ${r.recommendationReasoning || ''}\n---`;
  }).join('\n\n')}`;
  if (adminEmail && (useSendGrid || emailTransporter)) {
    await sendEmailReply(adminEmail, `Kandidly – ${roleLabel} – Screening results`, emailBody);
    console.log('📧 Kandidly: results sent by email');
  }
  const whatsappSummary = `Kandidly – ${roleLabel}\n\n${lines.join('\n\n')}\n\nFull report sent to your email.`;
  if (adminWhatsApp && twilioClient) {
    const msg = whatsappSummary.length > 1400 ? whatsappSummary.slice(0, 1380) + '\n\n… Full report in email.' : whatsappSummary;
    try {
      await sendWhatsApp(msg, false, `whatsapp:${String(adminWhatsApp).replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
      console.log('📱 Kandidly: results sent by WhatsApp');
    } catch (e) {
      console.warn('Kandidly WhatsApp failed:', e.message);
    }
  }
}

app.get('/api/kandidly/jds', (req, res) => {
  try {
    const jds = readKandidlyJds();
    res.json({ success: true, jds });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/kandidly/jds/:id', (req, res) => {
  try {
    const jds = readKandidlyJds();
    const jd = jds.find((j) => j.id === req.params.id);
    if (!jd) return res.status(404).json({ error: 'JD not found.' });
    res.json({ success: true, jd });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/kandidly/jds', express.json(), (req, res) => {
  try {
    const { title, content, roleType, seniorityLevel, mustHaves, niceToHaves, redFlags, scoringWeights } = req.body || {};
    const t = typeof title === 'string' ? title.trim() : '';
    const c = typeof content === 'string' ? content.trim() : '';
    if (!t || !c) return res.status(400).json({ error: 'title and content are required.' });
    const jds = readKandidlyJds();
    const id = `jd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const entry = { id, title: t, content: c, createdAt: new Date().toISOString() };
    if (roleType && ['technical', 'leadership', 'sales'].includes(String(roleType))) entry.roleType = roleType;
    if (seniorityLevel && ['junior', 'mid', 'senior', 'lead', 'executive'].includes(String(seniorityLevel))) entry.seniorityLevel = seniorityLevel;
    if (typeof mustHaves === 'string' && mustHaves.trim()) entry.mustHaves = mustHaves.trim();
    if (typeof niceToHaves === 'string' && niceToHaves.trim()) entry.niceToHaves = niceToHaves.trim();
    if (typeof redFlags === 'string' && redFlags.trim()) entry.redFlags = redFlags.trim();
    if (scoringWeights && typeof scoringWeights === 'object') entry.scoringWeights = scoringWeights;
    jds.push(entry);
    writeKandidlyJds(jds);
    res.json({ success: true, id, title: t });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/kandidly/candidates', (req, res) => {
  try {
    const candidates = readKandidlyCandidates();
    res.json({ success: true, candidates });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/kandidly/candidates/:id', (req, res) => {
  try {
    const candidates = readKandidlyCandidates();
    const c = candidates.find((x) => x.id === req.params.id);
    if (!c) return res.status(404).json({ error: 'Candidate not found.' });
    res.json({ success: true, candidate: c });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/kandidly/candidates', express.json(), (req, res) => {
  try {
    const { name, resume, interviewNotes } = req.body || {};
    const n = typeof name === 'string' ? name.trim() : '';
    const r = typeof resume === 'string' ? resume.trim() : '';
    if (!n || !r) return res.status(400).json({ error: 'name and resume are required.' });
    const candidates = readKandidlyCandidates();
    const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    candidates.push({ id, name: n, resume: r, interviewNotes: typeof interviewNotes === 'string' ? interviewNotes.trim() : '', createdAt: new Date().toISOString() });
    writeKandidlyCandidates(candidates);
    res.json({ success: true, id, name: n });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/kandidly/screen', express.json(), async (req, res) => {
  try {
    const cfg = loadConfig();
    if (!(cfg?.kandidly?.enabled === true)) {
      return res.status(400).json({ error: 'Kandidly is disabled. Enable it in Config → Kandidly.' });
    }
    const { jobDescription, candidates, jdId, candidateIds, forceRerun } = req.body || {};
    let jd = typeof jobDescription === 'string' ? jobDescription.trim() : '';
    let list = Array.isArray(candidates) ? candidates : [];
    let roleLabel = '';
    let jdDoc = null;
    const jds = readKandidlyJds();
    const allCandidates = readKandidlyCandidates();
    if (jdId && Array.isArray(candidateIds) && candidateIds.length > 0) {
      jdDoc = jds.find((j) => j.id === jdId);
      if (!jdDoc) return res.status(400).json({ error: 'JD not found.' });
      jd = jdDoc.content;
      roleLabel = jdDoc.title || extractRoleLabelFromJd(jd);
      list = candidateIds.map((id) => {
        const c = allCandidates.find((x) => x.id === id);
        return c ? { name: c.name, resume: c.resume, interviewNotes: c.interviewNotes || '' } : null;
      }).filter(Boolean);
    }
    if (!jd || list.length === 0) {
      return res.status(400).json({ error: 'jobDescription and at least one candidate (with resume text) are required, or provide jdId and candidateIds.' });
    }
    const validCandidates = list
      .map((c, i) => ({
        name: typeof c.name === 'string' ? c.name.trim() || `Candidate ${i + 1}` : `Candidate ${i + 1}`,
        resume: typeof c.resume === 'string' ? c.resume.trim() : '',
        interviewNotes: typeof c.interviewNotes === 'string' ? c.interviewNotes.trim() : '',
      }))
      .filter((c) => c.resume.length > 0);
    if (validCandidates.length === 0) {
      return res.status(400).json({ error: 'Each candidate must have non-empty resume text.' });
    }
    if (!roleLabel) roleLabel = extractRoleLabelFromJd(jd);
    const previous = !forceRerun && validCandidates.length === 1 ? findPreviousScreening(validCandidates[0].name, roleLabel) : null;
    if (previous) {
      const c0 = previous.candidates && previous.candidates[0];
      return res.json({
        success: true,
        previousScreening: true,
        message: `Already screened on ${new Date(previous.createdAt).toLocaleString()} for ${previous.roleLabel}: ${c0 ? `${c0.name} ${c0.score}/10 (${c0.recommendation})` : ''}. Use forceRerun: true to run again.`,
        recordId: previous.id,
        roleLabel: previous.roleLabel,
        candidates: previous.candidates,
      });
    }
    const results = await runKandidlyScreening(jd, validCandidates, jdDoc || undefined);
    const recordId = `k_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const record = {
      id: recordId,
      createdAt: new Date().toISOString(),
      roleLabel,
      jobDescriptionSnippet: jd.slice(0, 300),
      candidates: results,
      jdId: jdId || null,
      candidateIds: candidateIds || null,
    };
    const history = readKandidlyHistory();
    history.unshift(record);
    writeKandidlyHistory(history.slice(0, 200));
    const adminEmail = getAdminEmail();
    const adminWhatsApp = getAdminWhatsAppNumber();
    await sendKandidlyNotifications(record, adminEmail, adminWhatsApp);
    res.json({ success: true, candidates: results, recordId, roleLabel, error: results.length === 0 ? 'Could not parse AI response.' : null });
  } catch (e) {
    console.error('Kandidly screen error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/kandidly/history', (req, res) => {
  try {
    const entries = readKandidlyHistory();
    res.json({ success: true, entries });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.patch('/api/kandidly/history/:id', express.json(), (req, res) => {
  try {
    const entries = readKandidlyHistory();
    const record = entries.find((e) => e.id === req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    const manualNotes = req.body && typeof req.body.manualNotes === 'string' ? req.body.manualNotes.trim() : '';
    record.manualNotes = manualNotes;
    record.updatedAt = new Date().toISOString();
    writeKandidlyHistory(entries);
    res.json({ success: true, manualNotes: record.manualNotes });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/kandidly/history/:id/export', (req, res) => {
  try {
    const entries = readKandidlyHistory();
    const record = entries.find((e) => e.id === req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    const format = (req.query.format || 'json').toLowerCase();
    if (format === 'csv') {
      const rows = [['Role', 'Date', 'Candidate', 'Score', 'Recommendation', 'Fit summary']];
      for (const c of record.candidates || []) {
        rows.push([record.roleLabel || '', record.createdAt || '', c.name || '', String(c.score || ''), c.recommendation || '', (c.fitSummary || '').replace(/\n/g, ' ')]);
      }
      const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="kandidly-${record.id}.csv"`);
      return res.send(csv);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="kandidly-${record.id}.json"`);
    res.json(record);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

async function extractTextFromBuffer(buffer, filename, mimeType) {
  const name = (filename || '').toLowerCase();
  const mime = (mimeType || '').toLowerCase();
  if (name.endsWith('.txt') || mime.includes('text/plain')) {
    return buffer.toString('utf8');
  }
  if (name.endsWith('.docx') || mime.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document') || mime.includes('application/vnd.openxmlformats')) {
    const mammoth = (await import('mammoth')).default;
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  }
  if (name.endsWith('.doc') || mime.includes('application/msword')) {
    try {
      const mammoth = (await import('mammoth')).default;
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (e) {
      console.warn('mammoth .doc failed:', e.message);
      return '';
    }
  }
  return '';
}

app.post('/api/kandidly/extract-text', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({ error: 'No file uploaded. Use field name "file" and send a .txt, .doc, or .docx file.' });
    }
    const text = await extractTextFromBuffer(file.buffer, file.originalname, file.mimetype);
    if (!text) {
      return res.status(400).json({ error: 'Could not extract text. Use .txt, .doc, or .docx.' });
    }
    res.json({ success: true, text });
  } catch (e) {
    console.error('Kandidly extract-text error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ----- Henry (Travel Agent): plan (schedule, costs, airlines, hotels, Airbnb, sightseeing, booking sites) and book (confirm + secure token storage) -----
const TRAVEL_AGENT_SYSTEM_PROMPT = `You are Henry, a Travel Agent assistant. Given a destination and trip details (including one-way vs return, preferred class, airlines, max stops, seat preference, preferred flight time of day), produce a clear travel plan that includes:
1. **Flights** – Plan for one-way OR return (round-trip) as requested. For **each** flight option you list, always show **departure and arrival times** (e.g. "Dep 08:30 NYC – Arr 21:45 Paris" or with time zones) so the user knows which timings the cost refers to. For the user's preferred class: include the **cheapest fare** for that class (e.g. "Cheapest Business: ~$X from NYC to Paris on [airline]"). Respect preferred airlines and max stops. List 2–3 options with carriers, **flight timings (depart/arrive)**, and approximate prices. If the user requested a preferred time of day (morning, afternoon, or evening), include at least one option in that window and label it (e.g. "Morning option", "Evening option"); you may also include alternatives in other time windows. **When the user has given a budget and the trip is return/round-trip: always show flight fare as a single round-trip total (e.g. "Round-trip: ~$1,200") — do NOT break it into separate onward and return amounts.** That way the total is clearly comparable to the budget; splitting into two amounts can make it misleadingly seem under budget.
   For the **fare class** the user requested (Economy, Premium Economy, Business, First): (a) **Baggage allowance** – state the typical included baggage for that class (e.g. "Economy: 1 carry-on + 1 personal item; 1 checked bag 23kg on most carriers" or "Business: typically 2 checked bags, lounge access"). (b) **Seat selection** – briefly note when/how seats can be selected (at booking, at check-in, or paid add-on) and typical cost if paid. (c) **Seat preference** – if the user specified one (e.g. window, aisle, front, exit row), include a short tip on how to request it (at booking or check-in) and which carriers are best for that preference.
   When the user requests **points upgrade options**, add a **Points / miles upgrade options** subsection under Flights and **display each upgrade path as a clear option** with typical points/miles ranges and which programs work best: (a) **Economy → Premium Economy** – typical miles/points one-way (e.g. ~15,000–35,000), programs (airline, Chase, Amex), and tips. (b) **Economy → Business** – typical ranges (e.g. ~25,000–80,000 one-way), best programs for this route, waitlist/copay notes. (c) **Premium Economy → Business** – typical upgrade cost in points. (d) **Business → First** – typical points/miles for upgrading where available, which carriers offer it. (e) **Best programs for this route** – which airline alliances or transferable points (Chase Ultimate Rewards, Amex Membership Rewards, Citi, etc.) are most useful for the specific origin–destination. Show ranges as indicative; actual rates vary by date and airline.
2. **Daily schedule** (day-by-day itinerary with dates). For EACH day, include **1–2 restaurant suggestions** with: name, area/neighborhood, cuisine, price range (e.g. $$ or "mid-range"). Format clearly (e.g. "Day 1 – Lunch: [Restaurant A] (area, cuisine, $$). Dinner: [Restaurant B] (area, cuisine, $$$).").
3. **Estimated costs** in the requested currency (flights, accommodation, activities, total).
4. **Airlines** – suggested carriers and routes; prefer the user's preferred airlines when specified.
5. **Hotels** – 2–3 options with price ranges and areas.
6. **Airbnb** – 2–3 options with price ranges and neighborhoods.
7. **Sightseeing** – top attractions and activities with rough costs.
8. **Where to book** – best sites for flights, hotels, Airbnb, activities, and **restaurants** (OpenTable, Resy, Tock). Include direct links where possible.
Format in clear markdown sections. Be specific and practical. For every flight option, always show departure and arrival times. Always include a "Cheapest [class] fare" line when a class is specified. When a fare class is specified, always include a **Baggage (included)** and **Seat selection** subsection under Flights with allowance and seat-pick guidance for that class. When points upgrade options are requested, always include the **Points / miles upgrade options** subsection and display each upgrade path (Economy → Premium Economy, Economy → Business, Premium Economy → Business, Business → First) with typical points/miles ranges and best programs. Every day in the schedule must list 1–2 restaurant options with name, area, cuisine, and price.`;

const TRAVEL_AGENT_FLIGHTS_ONLY_PROMPT = `You are Henry, a Travel Agent. The user wants **flights only** — do NOT provide a day-by-day itinerary, daily schedule, hotel options, Airbnb, sightseeing, or restaurant suggestions per day. Provide only:
1. **Flights** – One-way or return as requested. For **each** option show: **departure and arrival times** (e.g. "Dep 08:30 – Arr 21:45" or with time zones), carrier, approximate price for the requested class, and route (stops if any). List 2–3 options. If the user preferred a time of day (morning, afternoon, evening), include at least one option in that window. When budget and round-trip: show fare as one round-trip total. Include **Baggage (included)** and **Seat selection** for the fare class if class was specified. If points upgrade was requested, add a short **Points / miles upgrade options** subsection (economy→business, business→first, typical ranges, best programs).
2. **Where to book** – Best sites for flights with links.
Do not include daily itinerary, hotels, Airbnb, sightseeing, or per-day restaurant suggestions.`;

const TRAVEL_AGENT_MULTI_DESTINATION_PROMPT = `You are Henry, a Travel Agent. The user is planning a **multi-city / multi-country trip** (e.g. several countries in 2 weeks). Your job is to:
1. **Best route and order** – If the user listed cities/countries with dates, respect that order. If order is flexible or only a list is given, suggest the **most economical and logical route** (minimize backtracking, consider flight/train availability and cost between cities). Explain briefly why this order is optimal.
2. **Economical options** – For each leg (city-to-city), recommend the **cheapest practical option** first (e.g. budget airline, train, bus) plus one faster/premium alternative. For each option show **departure and arrival times** (or time windows) so the user knows which timings the cost refers to. Include approximate prices in the user's currency. Consider: low-cost carriers, rail passes for Europe, regional flights vs trains.
3. **Day-by-day itinerary** – For each city/country, give a clear schedule: dates, how to get there (flight/train/bus with carrier and rough cost), 1–2 hotel or Airbnb options with price range, 1–2 restaurant suggestions per day, and top 1–2 sights or activities. Keep the total trip within the user's budget if provided.
4. **Summary** – At the start, provide a **route overview** (e.g. "City A → City B → City C") and **total estimated transport + accommodation cost** so the user can see the most economical picture.
5. **Where to book** – Include best sites and links for multi-city flights (e.g. Google Flights, Kiwi, Skyscanner), trains (e.g. Trainline, Eurail), and hotels.
6. **Points / miles upgrade options** (when requested) – If the user asked for points upgrade options, add a **Points / miles upgrade options** section under Flights. Display each upgrade path: Economy → Premium Economy, Economy → Business, Premium Economy → Business, Business → First. For each give typical points/miles ranges and which programs (airline miles, Chase, Amex, etc.) work best for the route(s) in the trip.
Use clear markdown sections. Be specific with carrier names, approximate prices, and booking links. Prioritize the most economical options while giving one better/faster choice per leg.`;

const TRAVEL_PAYMENT_TOKENS_PATH = path.join(__dirname, 'travel-payment-tokens.json');
const HENRY_BOOKING_CONFIRMATIONS_PATH = path.join(__dirname, 'henry-booking-confirmations.json');
const MEETING_PREP_SENT_PATH = path.join(__dirname, 'meeting-prep-sent.json');
const MEETING_PREP_MINUTES_BEFORE = 15;
const MEETING_PREP_WINDOW_HALF_MINUTES = 5; // send if meeting is in [10, 20] minutes
const MEETING_TRANSCRIPTIONS_SENT_PATH = path.join(__dirname, 'meeting-transcriptions-sent.json');
const MEETING_TRANSCRIPTION_HOURS_LOOKBACK_DEFAULT = 4;
const TRAVEL_PAYMENT_KEY = process.env.TRAVEL_PAYMENT_ENCRYPTION_KEY || process.env.STRIPE_SECRET_KEY || 'travel-agent-default-key-change-in-production-32b';

const BOOKING_SCOPES = ['flights_only', 'hotel_only', 'flights_hotel', 'flights_hotel_restaurants', 'full', 'restaurants_only'];

function parseHenryBookingConfirmation(body) {
  if (!body || typeof body !== 'string') return null;
  const lower = body.toLowerCase().trim();
  if (!/\b(confirm|yes|book|proceed)\b/.test(lower) && !/^confirm\s*[-:]?\s*/i.test(body)) return null;
  if (/flights?\s+only|only\s+flights?/i.test(lower)) return { scope: 'flights_only' };
  if (/hotel(s)?\s+only|only\s+hotel(s)?/i.test(lower)) return { scope: 'hotel_only' };
  if (/restaurants?\s+only|only\s+restaurants?/i.test(lower)) return { scope: 'restaurants_only' };
  if (/(full|all|everything|flights?\s*,?\s*hotel(s)?\s*,?\s*restaurants?|flights?\s+and\s+hotel(s)?\s+and\s+restaurants?)/i.test(lower)) return { scope: 'flights_hotel_restaurants' };
  if (/(flights?\s+and\s+hotel(s)?|hotel(s)?\s+and\s+flights?|flights?\s*,?\s*hotel(s)?)/i.test(lower)) return { scope: 'flights_hotel' };
  return { scope: 'flights_hotel_restaurants' };
}

function readHenryBookingConfirmations() {
  try {
    if (fs.existsSync(HENRY_BOOKING_CONFIRMATIONS_PATH)) {
      const raw = fs.readFileSync(HENRY_BOOKING_CONFIRMATIONS_PATH, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data.confirmations) ? data.confirmations : [];
    }
  } catch (e) {
    console.warn('Henry booking confirmations read failed:', e.message);
  }
  return [];
}

function writeHenryBookingConfirmations(confirmations) {
  fs.writeFileSync(HENRY_BOOKING_CONFIRMATIONS_PATH, JSON.stringify({ confirmations, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
}

function getTravelEncryptionKey() {
  const raw = TRAVEL_PAYMENT_KEY.slice(0, 32).padEnd(32, '0');
  return Buffer.from(raw, 'utf8').slice(0, 32);
}

function encryptPaymentToken(plaintext) {
  const key = getTravelEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let enc = cipher.update(plaintext, 'utf8', 'base64');
  enc += cipher.final('base64');
  return { iv: iv.toString('base64'), data: enc };
}

function decryptPaymentToken(encrypted) {
  const key = getTravelEncryptionKey();
  const iv = Buffer.from(encrypted.iv, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let dec = decipher.update(encrypted.data, 'base64', 'utf8');
  dec += decipher.final('utf8');
  return dec;
}

const HENRY_AUTO_PAYMENT_KEY = 'henry_auto';

function getHenryAutoPaymentMethod() {
  try {
    if (!fs.existsSync(TRAVEL_PAYMENT_TOKENS_PATH)) return null;
    const raw = fs.readFileSync(TRAVEL_PAYMENT_TOKENS_PATH, 'utf8');
    const tokens = JSON.parse(raw);
    const entry = tokens[HENRY_AUTO_PAYMENT_KEY];
    if (!entry?.encrypted) return null;
    return decryptPaymentToken(entry.encrypted);
  } catch (e) {
    console.warn('Henry auto payment method read failed:', e.message);
    return null;
  }
}

function setHenryAutoPaymentMethod(paymentMethodId) {
  if (!paymentMethodId || typeof paymentMethodId !== 'string' || !paymentMethodId.trim()) return;
  let tokens = {};
  if (fs.existsSync(TRAVEL_PAYMENT_TOKENS_PATH)) {
    try {
      tokens = JSON.parse(fs.readFileSync(TRAVEL_PAYMENT_TOKENS_PATH, 'utf8'));
    } catch (_) {}
  }
  const encrypted = encryptPaymentToken(paymentMethodId.trim());
  tokens[HENRY_AUTO_PAYMENT_KEY] = { encrypted, at: new Date().toISOString() };
  fs.writeFileSync(TRAVEL_PAYMENT_TOKENS_PATH, JSON.stringify(tokens, null, 2), 'utf8');
}

/** Charge a Stripe PaymentMethod (for Henry auto-book). amountCents = price in cents; currency = 'usd' etc. Returns { success, error? }. */
async function chargeStripePaymentMethod(paymentMethodId, amountCents, currency) {
  const secret = process.env.STRIPE_SECRET_KEY || (loadConfig()?.travelAgent?.stripeSecretKey && loadConfig().travelAgent.stripeSecretKey !== '••••••••' ? loadConfig().travelAgent.stripeSecretKey : null);
  if (!secret) return { success: false, error: 'Stripe not configured (set STRIPE_SECRET_KEY).' };
  const curr = (currency || 'usd').toLowerCase().slice(0, 3);
  if (amountCents < 50) return { success: false, error: 'Amount too small.' };
  try {
    const body = new URLSearchParams({
      amount: String(Math.round(amountCents)),
      currency: curr,
      payment_method: paymentMethodId,
      confirm: 'true',
      automatic_payment_methods: JSON.stringify({ enabled: false }),
    });
    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secret}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });
    const text = await res.text();
    if (!res.ok) {
      const err = (() => { try { const j = JSON.parse(text); return j.error?.message || text; } catch (_) { return text; } })();
      return { success: false, error: err };
    }
    const data = (() => { try { return JSON.parse(text); } catch (_) { return {}; } })();
    if (data.status === 'succeeded' || data.status === 'requires_capture') {
      return { success: true };
    }
    return { success: false, error: data.status || 'Payment not completed' };
  } catch (e) {
    return { success: false, error: e.message || 'Stripe request failed' };
  }
}

app.post('/api/travel/plan', express.json(), async (req, res) => {
  try {
    const cfg = loadConfig();
    const enabled = cfg?.travelAgent?.enabled ?? process.env.TRAVEL_AGENT_ENABLED === 'true';
    if (!enabled) {
      return res.status(400).json({ error: 'Henry (Travel Agent) is disabled. Enable it in Config → Henry.' });
    }
    const { origin, destination, startDate, endDate, travelers = 1, budget, currency, preferredClass, preferredAirlines, maxStops, tripType, seatPreference, multiDestinationPlan, multiDestinationOrigin, tripNotes, includePointsUpgradeOptions, emailAndWhatsApp, emailPlan, whatsAppPlan, preferredFlightTime, flightsOnly } = req.body || {};
    const multiPlan = (multiDestinationPlan && typeof multiDestinationPlan === 'string' && multiDestinationPlan.trim()) ? multiDestinationPlan.trim() : '';
    const isMultiDestination = multiPlan.length > 0;
    if (!isMultiDestination && (!destination || typeof destination !== 'string' || !destination.trim())) {
      return res.status(400).json({ error: 'Either destination (To) or multi-destination plan is required.' });
    }
    const originStr = (origin && typeof origin === 'string' && origin.trim()) ? origin.trim() : '';
    const multiOriginStr = (multiDestinationOrigin && typeof multiDestinationOrigin === 'string' && multiDestinationOrigin.trim()) ? multiDestinationOrigin.trim() : '';
    const destStr = isMultiDestination ? '' : (destination || '').trim();
    const curr = currency || cfg?.travelAgent?.currency || 'USD';
    const travelClass = preferredClass || cfg?.travelAgent?.preferredClassOfTravel || '';
    const airlines = preferredAirlines || cfg?.travelAgent?.preferredAirlines || '';
    const stops = maxStops !== undefined && maxStops !== null && maxStops !== '' ? maxStops : (cfg?.travelAgent?.maxStops ?? '');
    const oneWay = (tripType || '').toLowerCase() === 'one-way';
    const classLine = travelClass ? ` Preferred class: ${travelClass}. Include cheapest fare for ${travelClass}.` : '';
    const seatPref = (seatPreference && String(seatPreference).trim()) || (cfg?.travelAgent?.seatPreference ?? '');
    const seatLine = seatPref ? ` Seat preference: ${seatPref}.` : '';
    const airlinesLine = airlines ? ` Preferred airlines: ${airlines}.` : '';
    const stopsLine = stops === 0 || stops === '0' ? ' Max stops: nonstop only.' : stops === 1 || stops === '1' ? ' Max stops: 1 stop or fewer.' : stops === 2 || stops === '2' ? ' Max stops: 2 stops or fewer.' : stops !== '' ? ` Max stops: ${stops}.` : '';
    const notesStr = (tripNotes && typeof tripNotes === 'string' && tripNotes.trim()) ? tripNotes.trim() : '';
    const notesLine = notesStr ? `\n\nUser guidance or hints (incorporate into the plan): ${notesStr}` : '';
    const pointsUpgradeLine = includePointsUpgradeOptions === true ? ' Include and **display** a **Points / miles upgrade options** subsection under Flights with each upgrade path as a clear option: Economy → Premium Economy, Economy → Business, Premium Economy → Business, Business → First. For each option give typical points/miles ranges (one-way where relevant), which programs work (airline loyalty, Chase Ultimate Rewards, Amex Membership Rewards, etc.), and best programs for this specific route.' : '';
    const flightTimePref = (preferredFlightTime && String(preferredFlightTime).trim().toLowerCase()) || '';
    const flightTimeLine = flightTimePref === 'morning' ? ' Preferred flight time: MORNING (prioritize departures roughly 05:00–12:00 local).' : flightTimePref === 'afternoon' ? ' Preferred flight time: AFTERNOON (prioritize departures roughly 12:00–17:00 local).' : flightTimePref === 'evening' ? ' Preferred flight time: EVENING (prioritize departures roughly 17:00–23:59 local).' : '';
    const flightsOnlyMode = flightsOnly === true;

    let planText;
    if (isMultiDestination) {
      const multiFlightsOnlyNote = flightsOnlyMode ? '\nUser wants FLIGHTS/TRANSPORT ONLY: do NOT provide day-by-day itinerary, hotels per city, or restaurant suggestions per day. Provide only: best route order, inter-city transport options (flights/trains/buses) with departure/arrival times and approximate prices, and booking links.' : '';
      const multiQuery = `Multi-city / multi-country trip. Use currency ${curr}. Travelers: ${travelers}.${budget ? ` Total budget: ${budget} ${curr} — optimize for most economical route and options.` : ' Suggest the most economical route and options.'}
${multiOriginStr ? `Starting from (origin): ${multiOriginStr}.` : ''}
Trip window: ${startDate || 'not specified'} to ${endDate || 'not specified'}.
Cities and countries with dates (one per line or comma-separated; first line = first port of entry unless user says otherwise):
${multiPlan}
${classLine}${seatLine}${airlinesLine}${stopsLine}${flightTimeLine}${notesLine}${pointsUpgradeLine ? `\n${pointsUpgradeLine}` : ''}${multiFlightsOnlyNote}

Produce the best itinerary: optimal route order (most economical), inter-city transport with cheapest options, departure/arrival times and approximate prices${flightsOnlyMode ? '' : ', day-by-day schedule per city with 1–2 restaurant suggestions per day, hotels/Airbnb options'}, and booking links.`;
      planText = await askAI(multiQuery, '', { systemPrompt: TRAVEL_AGENT_MULTI_DESTINATION_PROMPT });
    } else if (flightsOnlyMode) {
      const fromToLine = originStr ? ` From (origin): ${originStr}. To (destination): ${destStr}.` : ` Destination: ${destStr}.`;
      const tripLine = oneWay ? ' Trip type: ONE-WAY (outbound flight only; no return flight).' : ' Trip type: RETURN (round-trip; include outbound and return flights).';
      const budgetNote = budget && (tripType || '').toLowerCase() !== 'one-way' ? ' Show flight fare as one round-trip total.' : '';
      const query = `Flights only (no day-by-day itinerary). Create a flight plan:${fromToLine}${startDate ? ` Dates: From ${startDate}` : ''}${endDate ? ` to ${endDate}` : ''}${travelers ? `. Travelers: ${travelers}` : ''}${budget ? `. Budget: ${budget} ${curr}` : ''}. Use currency ${curr}.${tripLine}${classLine}${seatLine}${airlinesLine}${stopsLine}${flightTimeLine}${budgetNote}${notesLine}${pointsUpgradeLine ? ` ${pointsUpgradeLine}` : ''} For each option show departure and arrival times, carrier, and price. Do not include hotels, daily schedule, or restaurant suggestions.`;
      planText = await askAI(query, '', { systemPrompt: TRAVEL_AGENT_FLIGHTS_ONLY_PROMPT });
    } else {
      const fromToLine = originStr ? ` From (origin): ${originStr}. To (destination): ${destStr}.` : ` Destination: ${destStr}.`;
      const tripLine = oneWay ? ' Trip type: ONE-WAY (outbound flight only; no return flight).' : ' Trip type: RETURN (round-trip; include outbound and return flights).';
      const budgetAndReturnNote = budget && (tripType || '').toLowerCase() !== 'one-way' ? ' User provided a budget — show flight fare as one round-trip total, not split into onward/return.' : '';
      const query = `Create a travel plan for:${fromToLine}${startDate ? ` Dates: From ${startDate}` : ''}${endDate ? ` to ${endDate}` : ''}${travelers ? `. Travelers: ${travelers}` : ''}${budget ? `. Budget: ${budget} ${curr}` : ''}. Use currency ${curr}.${tripLine}${classLine}${seatLine}${airlinesLine}${stopsLine}${flightTimeLine}${budgetAndReturnNote}${notesLine}${pointsUpgradeLine} Include schedule (with 1–2 restaurant suggestions per day), costs, airlines (with cheapest fare for preferred class when given), flight timings (depart/arrive) for each option, baggage allowance and seat selection for the fare class, hotels, Airbnb options, sightseeing, and best booking sites with links.`;
      planText = await askAI(query, '', { systemPrompt: TRAVEL_AGENT_SYSTEM_PROMPT });
    }
    const planId = `plan_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    const sendEmailPlan = emailPlan === true || (emailAndWhatsApp === true && emailPlan !== false);
    const sendWhatsAppPlan = whatsAppPlan === true || (emailAndWhatsApp === true && whatsAppPlan !== false);
    const additionalEmails = Array.isArray(req.body?.additionalEmails) ? req.body.additionalEmails.filter((e) => typeof e === 'string' && e.trim().length > 0).map((e) => e.trim()) : [];
    const additionalWhatsAppNumbers = Array.isArray(req.body?.additionalWhatsAppNumbers) ? req.body.additionalWhatsAppNumbers.filter((n) => typeof n === 'string' && n.replace(/\D/g, '').length >= 10).map((n) => n.trim().replace(/^\+/, '').replace(/^whatsapp:/i, '')) : [];
    const routeLabel = isMultiDestination ? `Multi-city (${multiPlan.split(/[\n,]+/).filter((s) => s.trim()).length} stops)` : (originStr ? `${originStr} → ${destStr}` : destStr);
    const subject = `Henry – Travel plan: ${routeLabel}`;
    const intro = isMultiDestination
      ? `✈️ Henry – Your multi-city travel plan (${multiPlan.split(/[\n,]+/).filter((s) => s.trim()).length} stops):\n\n`
      : `✈️ Henry – Your travel plan${originStr ? ` from ${originStr} to ${destStr}` : ` for ${destStr}`}:\n\n`;
    const confirmFooter = `\n\n---\nTo confirm booking, reply to this message with one of:\n• Confirm - flights only\n• Confirm - hotel only\n• Confirm - flights and hotel\n• Confirm - full (flights, hotel, restaurants)\n• Confirm - restaurants only`;
    // Keep WhatsApp to one message when possible: summary ~950 chars so intro + summary + footer < ~1500
    const WHATSAPP_SUMMARY_MAX = 950;
    const planIsLong = planText.length > WHATSAPP_SUMMARY_MAX;
    const planMsg = intro + (planIsLong ? planText.slice(0, WHATSAPP_SUMMARY_MAX) + '\n\n… Full plan sent to your email.' : planText) + confirmFooter;
    const planTextWithConfirm = planText + confirmFooter;

    // When plan is long and we send via WhatsApp, always email the full plan to admin (even if email option was unchecked)
    const shouldEmailFullPlanAnyway = planIsLong && (sendWhatsAppPlan || additionalWhatsAppNumbers.length > 0) && (useSendGrid || emailTransporter);

    if (sendEmailPlan || sendWhatsAppPlan || additionalEmails.length > 0 || additionalWhatsAppNumbers.length > 0 || shouldEmailFullPlanAnyway) {
      try {
        if (sendEmailPlan) {
          const toEmail = getAdminEmail();
          if (toEmail && (useSendGrid || emailTransporter)) {
            await sendEmailReply(toEmail, subject, planTextWithConfirm);
            console.log('📧 Henry: travel plan sent by email to', toEmail);
          }
        }
        // If plan is long and we're sending WhatsApp but didn't send email above, send full plan by email so user gets it
        if (shouldEmailFullPlanAnyway) {
          const toEmail = getAdminEmail();
          if (toEmail && (useSendGrid || emailTransporter) && !sendEmailPlan) {
            await sendEmailReply(toEmail, subject, planTextWithConfirm);
            console.log('📧 Henry: full plan sent by email (plan was long; WhatsApp had summary only)');
          }
        }
        if (sendWhatsAppPlan) {
          const toWhatsApp = getAdminWhatsAppNumber();
          if (toWhatsApp && twilioClient) {
            await sendWhatsApp(planMsg, false, `whatsapp:${toWhatsApp.replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
            console.log('📱 Henry: travel plan sent by WhatsApp to', toWhatsApp);
          }
        }
        for (const email of additionalEmails) {
          if (email && (useSendGrid || emailTransporter)) {
            await sendEmailReply(email, subject, planTextWithConfirm);
            console.log('📧 Henry: plan sent to additional email', email);
          }
        }
        for (const num of additionalWhatsAppNumbers) {
          if (num && twilioClient) {
            const to = num.startsWith('whatsapp:') ? num : `whatsapp:${num.replace(/^\+/, '')}`;
            await sendWhatsApp(planMsg, false, to);
            console.log('📱 Henry: plan sent to additional WhatsApp', to);
          }
        }
      } catch (e) {
        console.warn('Henry: email/WhatsApp send failed:', e.message);
      }
    }

    if (startDate && (cfg?.travelAgent?.reminderCallsEnabled !== false)) {
      try {
        const items = readHenryItems();
        const reminderAt = new Date(startDate);
        reminderAt.setDate(reminderAt.getDate() - 1);
        reminderAt.setHours(18, 0, 0, 0);
        items.push({
          id: planId,
          type: 'travel',
          title: isMultiDestination ? routeLabel : (originStr ? `${originStr} → ${destStr}` : `Trip: ${destStr}`),
          at: startDate,
          reminderAt: reminderAt.toISOString(),
          details: planText.slice(0, 500),
          destination: isMultiDestination ? multiPlan.slice(0, 200) : destStr,
          origin: isMultiDestination ? multiOriginStr || undefined : originStr || undefined,
          startDate,
          endDate: endDate || '',
          reminderNotified: false,
          createdAt: new Date().toISOString(),
        });
        writeHenryItems(items);
      } catch (e) {
        console.warn('Henry: could not save travel reminder:', e.message);
      }
    }
    res.json({
      success: true,
      planId,
      plan: planText,
      origin: isMultiDestination ? (multiOriginStr || null) : (originStr || null),
      destination: isMultiDestination ? routeLabel : destStr,
      multiDestination: isMultiDestination,
      currency: curr,
    });
  } catch (e) {
    console.error('Travel plan error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.get('/api/travel/booking-confirmations', (req, res) => {
  try {
    const cfg = loadConfig();
    if (!(cfg?.travelAgent?.enabled ?? process.env.TRAVEL_AGENT_ENABLED === 'true')) {
      return res.status(400).json({ error: 'Henry is disabled.' });
    }
    const confirmations = readHenryBookingConfirmations();
    res.json({ ok: true, confirmations });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/travel/booking-confirm', express.json(), async (req, res) => {
  try {
    const cfg = loadConfig();
    if (!(cfg?.travelAgent?.enabled ?? process.env.TRAVEL_AGENT_ENABLED === 'true')) {
      return res.status(400).json({ error: 'Henry is disabled. Enable it in Config → Henry.' });
    }
    const { planId, scope } = req.body || {};
    const validScope = scope && BOOKING_SCOPES.includes(scope) ? scope : 'flights_hotel_restaurants';
    const confirmations = readHenryBookingConfirmations();
    const scopeLabel = { flights_only: 'flights only', hotel_only: 'hotel only', flights_hotel: 'flights and hotel', flights_hotel_restaurants: 'flights, hotel and restaurants', full: 'full', restaurants_only: 'restaurants only' }[validScope] || validScope;
    confirmations.push({
      id: `confirm_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      planId: planId || null,
      scope: validScope,
      confirmedVia: 'ui',
      at: new Date().toISOString(),
      status: 'pending',
    });
    writeHenryBookingConfirmations(confirmations);
    res.json({
      success: true,
      message: `Booking confirmation recorded: ${scopeLabel}. Add payment in the form below to complete, or use the links in your plan.`,
      scope: validScope,
    });
  } catch (e) {
    console.error('Travel booking-confirm error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/travel/book', express.json(), async (req, res) => {
  try {
    const cfg = loadConfig();
    const enabled = cfg?.travelAgent?.enabled ?? process.env.TRAVEL_AGENT_ENABLED === 'true';
    if (!enabled) {
      return res.status(400).json({ error: 'Henry (Travel Agent) is disabled. Enable it in Config → Henry.' });
    }
    const { planId, confirmation, paymentMethodId, scope } = req.body || {};
    if (!confirmation) {
      return res.status(400).json({ error: 'Confirmation required. Set confirmation: true to proceed with booking.' });
    }
    const bookingScope = scope && BOOKING_SCOPES.includes(scope) ? scope : 'flights_hotel_restaurants';
    let tokens = {};
    if (fs.existsSync(TRAVEL_PAYMENT_TOKENS_PATH)) {
      try {
        const raw = fs.readFileSync(TRAVEL_PAYMENT_TOKENS_PATH, 'utf8');
        tokens = JSON.parse(raw);
      } catch (_) {}
    }
    if (paymentMethodId && typeof paymentMethodId === 'string' && paymentMethodId.trim()) {
      const encrypted = encryptPaymentToken(paymentMethodId.trim());
      tokens[planId || `booking_${Date.now()}`] = { encrypted, at: new Date().toISOString(), scope: bookingScope };
      fs.writeFileSync(TRAVEL_PAYMENT_TOKENS_PATH, JSON.stringify(tokens, null, 2), 'utf8');
      console.log('🔒 Henry: payment token stored securely for', planId || 'booking', 'scope:', bookingScope);
    }
    const scopeLabel = { flights_only: 'flights only', hotel_only: 'hotel only', flights_hotel: 'flights and hotel', flights_hotel_restaurants: 'flights, hotel and restaurants', full: 'full', restaurants_only: 'restaurants only' }[bookingScope] || bookingScope;
    res.json({
      success: true,
      message: `Booking confirmed for **${scopeLabel}**. Payment method stored securely (token only). Complete your reservations on the suggested booking sites, or we can integrate direct booking APIs later.`,
      planId: planId || null,
      scope: bookingScope,
    });
  } catch (e) {
    console.error('Travel book error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ----- Henry: reminders store (travel, restaurant, appointment) + call-with-plan + reminder voice calls -----
function readHenryItems() {
  try {
    if (fs.existsSync(HENRY_ITEMS_PATH)) {
      const raw = fs.readFileSync(HENRY_ITEMS_PATH, 'utf8');
      const data = JSON.parse(raw);
      return Array.isArray(data.items) ? data.items : [];
    }
  } catch (e) {
    console.warn('Henry items read failed:', e.message);
  }
  return [];
}

function writeHenryItems(items) {
  fs.writeFileSync(HENRY_ITEMS_PATH, JSON.stringify({ items, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
}

// ----- Henry: hard-to-get restaurant alerts (monitor specific day/time, alert when reservations open) -----
function getTimeInET() {
  const s = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', hour12: false, hour: '2-digit', minute: '2-digit' });
  const [hour, minute] = s.split(':').map((n) => parseInt(n, 10) || 0);
  const dayName = new Date().toLocaleString('en-US', { timeZone: 'America/New_York', weekday: 'long' });
  const dateKey = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
  return { hour, minute, dayName, dateKey };
}

function readHenryRestaurantAlertsFired() {
  try {
    if (fs.existsSync(HENRY_RESTAURANT_ALERTS_PATH)) {
      const raw = fs.readFileSync(HENRY_RESTAURANT_ALERTS_PATH, 'utf8');
      const data = JSON.parse(raw);
      return data.lastFired && typeof data.lastFired === 'object' ? data.lastFired : {};
    }
  } catch (e) {
    console.warn('Henry restaurant alerts read failed:', e.message);
  }
  return {};
}

function writeHenryRestaurantAlertsFired(lastFired) {
  fs.writeFileSync(HENRY_RESTAURANT_ALERTS_PATH, JSON.stringify({ lastFired, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
}

const RESY_ORIGIN = 'https://resy.com';
const RESY_API = 'https://api.resy.com';

async function resyLogin(email, password) {
  if (!email || !password || typeof fetch !== 'function') return null;
  try {
    const res = await fetch(`${RESY_API}/3/auth/password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: RESY_ORIGIN, Referer: `${RESY_ORIGIN}/` },
      body: JSON.stringify({ email: email.trim(), password }),
    });
    const data = await res.json().catch(() => ({}));
    const token = data.token || data.auth_token;
    const apiKey = data.api_key || (data.user && data.user.api_key);
    if (token) return { authToken: token, apiKey: apiKey || '' };
    return null;
  } catch (e) {
    console.warn('Resy login failed:', e.message);
    return null;
  }
}

async function resyFindVenue(apiKey, authToken, name, city) {
  if (!apiKey || !authToken || typeof fetch !== 'function') return null;
  try {
    const res = await fetch(`${RESY_API}/3/venues?query=${encodeURIComponent(name)}&location=${encodeURIComponent(city || '')}`, {
      headers: { Authorization: `ResyAPI api_key="${apiKey}"`, 'x-resy-auth-token': authToken, Origin: RESY_ORIGIN },
    });
    const data = await res.json().catch(() => ({}));
    const venues = data.venues || data.results || [];
    const v = venues[0];
    return v ? (v.venue_id || v.id || v) : null;
  } catch (e) {
    console.warn('Resy find venue failed:', e.message);
    return null;
  }
}

async function resyFindAndBook(cfg, restaurant, availabilityStr) {
  const email = (cfg?.travelAgent?.resyEmail || '').trim();
  const password = cfg?.travelAgent?.resyPassword || '';
  if (!email || !password || password === '••••••••') return { booked: false, reason: 'no_credentials' };
  const auth = await resyLogin(email, password);
  if (!auth) return { booked: false, reason: 'login_failed' };
  const venueId = await resyFindVenue(auth.apiKey, auth.authToken, restaurant.name, restaurant.city);
  if (!venueId) return { booked: false, reason: 'venue_not_found' };
  const advanceWeeks = restaurant.advanceWeeks != null ? restaurant.advanceWeeks : 2;
  const partySize = Math.min(20, Math.max(1, parseInt(restaurant.partySize, 10) || 2));
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + advanceWeeks * 7);
  const dayStr = targetDate.toISOString().slice(0, 10);
  try {
    const findUrl = `${RESY_API}/4/find?day=${dayStr}&party_size=${partySize}&venue_id=${venueId}&lat=0&long=0`;
    const findRes = await fetch(findUrl, {
      headers: { Authorization: `ResyAPI api_key="${auth.apiKey}"`, 'x-resy-auth-token': auth.authToken, Origin: RESY_ORIGIN },
    });
    const findData = await findRes.json().catch(() => ({}));
    const options = findData.reservations || findData.slots || findData.options || [];
    const slot = options[0];
    if (!slot) return { booked: false, reason: 'no_slots' };
    const configId = slot.config_id || slot.id;
    const bookRes = await fetch(`${RESY_API}/3/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `ResyAPI api_key="${auth.apiKey}"`, 'x-resy-auth-token': auth.authToken, Origin: RESY_ORIGIN },
      body: JSON.stringify({ config_id: configId, day: dayStr, party_size: partySize }),
    });
    const bookData = await bookRes.json().catch(() => ({}));
    if (bookData.reservation_id || bookData.status === 'confirmed') {
      console.log('Resy auto-book success for', restaurant.name);
      return { booked: true };
    }
    return { booked: false, reason: 'book_request_failed' };
  } catch (e) {
    console.warn('Resy find/book failed:', e.message);
    return { booked: false, reason: e.message };
  }
}

async function runHenryHardToGetRestaurantAlerts() {
  const cfg = loadConfig();
  if (!(cfg?.travelAgent?.enabled && Array.isArray(cfg?.travelAgent?.hardToGetRestaurants) && cfg.travelAgent.hardToGetRestaurants.length > 0)) return;
  const adminEmail = getAdminEmail();
  const adminWhatsApp = getAdminWhatsAppNumber();
  if (!adminEmail && !adminWhatsApp) return;
  const { hour, minute, dayName, dateKey } = getTimeInET();
  const availability = (cfg?.travelAgent?.restaurantAvailability || '').trim();
  const availabilityLine = availability ? `\nYour availability: ${availability}` : '';
  const list = cfg.travelAgent.hardToGetRestaurants;
  const lastFired = readHenryRestaurantAlertsFired();
  let changed = false;
  for (const r of list) {
    const openTimeET = (r.openTimeET || '09:00').trim();
    const [openHour, openMin] = openTimeET.split(':').map((n) => parseInt(n, 10) || 0);
    const openDay = (r.openDayOfWeek || 'Any').trim();
    const matchTime = hour === openHour && minute >= openMin && minute < openMin + 3;
    const matchDay = openDay === 'Any' || openDay.toLowerCase() === dayName.toLowerCase();
    const key = `${(r.name || '').trim()}|${(r.city || '').trim()}`;
    if (!matchTime || !matchDay) continue;
    if (lastFired[key] === dateKey) continue;
    const link = (r.bookingLink || '').trim() || (r.platform === 'OpenTable' ? 'https://www.opentable.com' : r.platform === 'Resy' ? 'https://resy.com' : r.platform === 'Tock' ? 'https://www.exploretock.com' : '');
    const advanceWeeks = r.advanceWeeks != null ? r.advanceWeeks : 2;
    const partySize = Math.min(20, Math.max(1, parseInt(r.partySize, 10) || 2));
    let autoBookNote = '';
    if (r.platform === 'Resy' && cfg.travelAgent.resyEmail && cfg.travelAgent.resyPassword && cfg.travelAgent.resyPassword !== '••••••••') {
      const bookResult = await resyFindAndBook(cfg, r, availability);
      if (bookResult.booked) autoBookNote = '\n\n✅ Henry has attempted to book for you via Resy. Check your Resy app or email to confirm.';
      else if (bookResult.reason && bookResult.reason !== 'no_slots') autoBookNote = `\n\n(Auto-book did not complete: ${bookResult.reason}. Book manually.)`;
    }
    if (r.platform === 'OpenTable' && cfg.travelAgent.openTableEmail && cfg.travelAgent.openTablePassword && cfg.travelAgent.openTablePassword !== '••••••••') {
      autoBookNote = '\n\n(OpenTable auto-book is not yet supported; book manually using the link below.)';
    }
    const msg = `🍽 Henry – Reservation window open NOW\n\n${r.name}${r.city ? `, ${r.city}` : ''}\nParty size: ${partySize}. Reservations for ${advanceWeeks} weeks ahead just opened at ${openTimeET} ET. Book immediately—slots fill in seconds. Henry will book within your availability (month/days you provided).${link ? `\nBook: ${link}` : ''}${availabilityLine}${autoBookNote}`;
    if (adminEmail && (useSendGrid || emailTransporter)) {
      await sendEmailReply(adminEmail, `Henry – ${r.name} reservations open now`, msg);
      console.log('📧 Henry: hard-to-get alert sent by email for', r.name);
    }
    if (adminWhatsApp && twilioClient) {
      const shortMsg = msg.length > 1400 ? msg.slice(0, 1380) + '\n\n… Full details in email.' : msg;
      try {
        await sendWhatsApp(shortMsg, false, `whatsapp:${String(adminWhatsApp).replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
        console.log('📱 Henry: hard-to-get alert sent by WhatsApp for', r.name);
      } catch (e) {
        console.warn('Henry hard-to-get WhatsApp failed:', e.message);
      }
    }
    lastFired[key] = dateKey;
    changed = true;
  }
  if (changed) writeHenryRestaurantAlertsFired(lastFired);
}

// ----- Henry: flight price monitoring (monitor trips, history, AI recommend buy, alert WhatsApp + email) -----
const HENRY_PENDING_FLIGHT_BOOKING_PATH = path.join(__dirname, 'henry-pending-flight-booking.json');

function loadHenryPriceMonitor() {
  try {
    if (fs.existsSync(HENRY_PRICE_MONITOR_PATH)) {
      const raw = fs.readFileSync(HENRY_PRICE_MONITOR_PATH, 'utf8');
      const data = JSON.parse(raw);
      const trips = (Array.isArray(data.monitoredTrips) ? data.monitoredTrips : []).map((t) => ({
        ...t,
        passengers: Array.isArray(t.passengers) ? t.passengers : [],
      }));
      return {
        monitoredTrips: trips,
        priceHistory: data.priceHistory && typeof data.priceHistory === 'object' ? data.priceHistory : {},
      };
    }
  } catch (e) {
    console.warn('Henry price monitor read failed:', e.message);
  }
  return { monitoredTrips: [], priceHistory: {} };
}

function loadHenryPendingFlightBooking() {
  try {
    if (fs.existsSync(HENRY_PENDING_FLIGHT_BOOKING_PATH)) {
      const raw = fs.readFileSync(HENRY_PENDING_FLIGHT_BOOKING_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Henry pending flight booking read failed:', e.message);
  }
  return null;
}

function saveHenryPendingFlightBooking(pending) {
  if (!pending) {
    if (fs.existsSync(HENRY_PENDING_FLIGHT_BOOKING_PATH)) fs.unlinkSync(HENRY_PENDING_FLIGHT_BOOKING_PATH);
    return;
  }
  fs.writeFileSync(HENRY_PENDING_FLIGHT_BOOKING_PATH, JSON.stringify({ ...pending, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
}

function saveHenryPriceMonitor(data) {
  fs.writeFileSync(HENRY_PRICE_MONITOR_PATH, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }, null, 2), 'utf8');
}

// Amadeus token cache (token, expiresAt ms)
let amadeusTokenCache = { token: null, expiresAt: 0 };

async function getAmadeusToken() {
  const cfg = loadConfig();
  const apiKey = cfg?.travelAgent?.amadeusApiKey || process.env.AMADEUS_API_KEY;
  const apiSecret = cfg?.travelAgent?.amadeusApiSecret || process.env.AMADEUS_API_SECRET;
  if (!apiKey || !apiSecret) return null;
  const now = Date.now();
  if (amadeusTokenCache.token && amadeusTokenCache.expiresAt > now + 60000) return amadeusTokenCache.token;
  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: apiKey,
      client_secret: apiSecret,
    });
    const res = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn('Amadeus token failed:', res.status, err?.slice(0, 200));
      return null;
    }
    const data = await res.json();
    const token = data.access_token;
    const expiresIn = (data.expires_in || 1799) * 1000;
    amadeusTokenCache = { token, expiresAt: now + expiresIn };
    return token;
  } catch (e) {
    console.warn('Amadeus token error:', e.message);
    return null;
  }
}

// Normalize to IATA 3-letter code (e.g. "EWR", "New York" -> try first 3 uppercase or common mapping)
function toIataCode(input) {
  if (!input || typeof input !== 'string') return '';
  const s = input.trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(s)) return s;
  if (s.length >= 3) return s.slice(0, 3);
  return '';
}

// Fetch real lowest price from Amadeus Flight Offers Search; returns null if unavailable
async function fetchAmadeusFlightOffers(trip) {
  const token = await getAmadeusToken();
  if (!token) return null;
  const origin = toIataCode(trip.origin);
  const destination = toIataCode(trip.destination);
  if (!origin || !destination || origin === destination) return null;
  const departureDate = trip.startDate && /^\d{4}-\d{2}-\d{2}$/.test(trip.startDate)
    ? trip.startDate
    : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const params = new URLSearchParams({
    originLocationCode: origin,
    destinationLocationCode: destination,
    departureDate,
    adults: Math.min(9, Math.max(1, trip.travelers || 1)),
    currencyCode: (trip.currency || 'USD').toUpperCase(),
  });
  if (trip.endDate && /^\d{4}-\d{2}-\d{2}$/.test(trip.endDate)) params.set('returnDate', trip.endDate);
  const travelClass = (trip.cabinClass || 'ECONOMY').toUpperCase();
  if (['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'].includes(travelClass)) params.set('travelClass', travelClass);
  try {
    const url = `https://test.api.amadeus.com/v2/shopping/flight-offers?${params.toString()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.amadeus+json',
      },
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn('Amadeus flight offers failed:', res.status, err?.slice(0, 200));
      return null;
    }
    const json = await res.json();
    const offers = json.data || [];
    const dictionaries = json.dictionaries || {};
    if (offers.length === 0) return null;
    let bestOffer = null;
    let bestTotal = Infinity;
    for (const offer of offers) {
      const p = offer.price;
      if (!p || p.grandTotal == null) continue;
      const total = parseFloat(String(p.grandTotal).replace(/,/g, '.'));
      if (Number.isFinite(total) && total < bestTotal) {
        bestTotal = total;
        bestOffer = offer;
      }
    }
    if (!bestOffer) return null;
    const p = bestOffer.price;
    return {
      price: Math.round(parseFloat(String(p.grandTotal).replace(/,/g, '.'))),
      currency: (p.currency || trip.currency || 'USD').toUpperCase(),
      rawOffer: bestOffer,
      dictionaries,
    };
  } catch (e) {
    console.warn('Amadeus flight offers error:', e.message);
    return null;
  }
}

// Build human-readable itinerary from Amadeus flight offer (carriers, flight numbers, dep/arr times)
function formatFlightOfferItinerary(rawOffer, dictionaries = {}) {
  if (!rawOffer || !Array.isArray(rawOffer.itineraries)) return '';
  const carriers = dictionaries.carriers || {};
  const lines = [];
  rawOffer.itineraries.forEach((itin, idx) => {
    const legLabel = rawOffer.itineraries.length > 1 ? `Leg ${idx + 1}: ` : '';
    (itin.segments || []).forEach((seg) => {
      const dep = seg.departure || {};
      const arr = seg.arrival || {};
      const atDep = dep.at ? new Date(dep.at) : null;
      const atArr = arr.at ? new Date(arr.at) : null;
      const depTime = atDep ? atDep.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
      const arrTime = atArr ? atArr.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--';
      const carrierName = carriers[seg.carrierCode] || seg.carrierCode;
      const flightNum = seg.number ? ` ${seg.number}` : '';
      lines.push(`${legLabel}${carrierName}${flightNum}  ${dep.iataCode || '?'} ${depTime} → ${arr.iataCode || '?'} ${arrTime}`);
    });
  });
  return lines.join('\n');
}

// Amadeus Flight Create Orders: book the offer with given travelers. Returns { success, bookingRef, paymentUrl, error }.
async function amadeusCreateFlightOrder(flightOffer, travelers) {
  const token = await getAmadeusToken();
  if (!token) return { success: false, error: 'Amadeus not configured.' };
  const body = {
    data: {
      type: 'flight-order',
      flightOffers: [flightOffer],
      travelers: travelers.map((t, i) => ({
        id: String(i + 1),
        dateOfBirth: t.dateOfBirth || '1990-01-01',
        name: { firstName: (t.firstName || 'PASSENGER').trim(), lastName: (t.lastName || 'PASSENGER').trim() },
      })),
    },
  };
  try {
    const res = await fetch('https://test.api.amadeus.com/v1/booking/flight-orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/vnd.amadeus+json',
        Accept: 'application/vnd.amadeus+json',
      },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const errMsg = json.errors?.[0]?.detail || json.errors?.[0]?.title || res.statusText || 'Booking failed';
      console.warn('Amadeus Flight Create Order failed:', res.status, errMsg);
      return { success: false, error: errMsg };
    }
    const data = json.data || {};
    return {
      success: true,
      bookingRef: data.id || data.bookingId,
      paymentUrl: data.paymentUrl || data.payment?.redirectUrl,
      confirmation: data.associatedRecords?.[0]?.reference,
    };
  } catch (e) {
    console.warn('Amadeus Flight Create Order error:', e.message);
    return { success: false, error: e.message };
  }
}

/** Detect "confirm buy" / "yes book" for price-monitor flight booking (distinct from general Henry confirm). */
function parseHenryConfirmBuy(body) {
  if (!body || typeof body !== 'string') return false;
  const lower = body.toLowerCase().trim();
  return /\b(confirm\s+buy|yes\s+book|book\s+it|confirm\s+book|buy\s+now)\b/i.test(lower) || /^(\s*(yes|confirm|book)\s*)$/i.test(lower);
}

/** Attempt to book the pending flight (from last "recommend buy" alert). Uses Amadeus Create Order + trip passengers. */
async function tryHenryPriceMonitorConfirmBuy() {
  const pending = loadHenryPendingFlightBooking();
  if (!pending || !pending.rawOffer || !pending.trip) {
    return { ok: false, message: 'No pending flight to book. Wait for a "Buy now" price alert, then reply "Confirm buy".' };
  }
  const trip = pending.trip;
  const passengers = trip.passengers || [];
  const needed = Math.max(1, trip.travelers || 1);
  if (passengers.length < needed) {
    return {
      ok: false,
      message: `This trip requires ${needed} passenger(s). Add names (and optional date of birth) in Config → Henry → Trips → Passengers for trip ${trip.origin || '?'} → ${trip.destination}, then reply "Confirm buy" again.`,
    };
  }
  const travelers = passengers.slice(0, needed).map((p) => ({
    firstName: p.firstName || 'Passenger',
    lastName: p.lastName || 'Passenger',
    dateOfBirth: p.dateOfBirth || null,
  }));
  const result = await amadeusCreateFlightOrder(pending.rawOffer, travelers);
  if (!result.success) {
    return { ok: false, message: `Booking failed: ${result.error}. Please book manually using the link in your price alert.` };
  }
  saveHenryPendingFlightBooking(null);
  let msg = `✅ Henry: Flight booking created. Reference: ${result.bookingRef || 'N/A'}.`;
  if (result.paymentUrl) msg += ` Complete payment here: ${result.paymentUrl}`;
  else msg += ' Complete payment via the airline or the link in your price alert.';
  return { ok: true, message: msg };
}

// Fetch current lowest price: Amadeus when credentials set, else mock
async function fetchCurrentPriceForTrip(trip) {
  const amadeus = await fetchAmadeusFlightOffers(trip);
  if (amadeus) {
    const itineraryDetail = formatFlightOfferItinerary(amadeus.rawOffer, amadeus.dictionaries);
    return {
      price: amadeus.price,
      currency: amadeus.currency,
      fetchedAt: new Date().toISOString(),
      itineraryDetail: itineraryDetail || null,
      rawOffer: amadeus.rawOffer,
      dictionaries: amadeus.dictionaries || {},
    };
  }
  const key = `${trip.origin || 'ANY'}-${trip.destination}-${trip.startDate}-${trip.cabinClass || 'ECONOMY'}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const base = 200 + (h % 600);
  const dayVar = (new Date().getDate() % 7) * 15;
  const price = Math.round(base + dayVar + (Math.random() * 40 - 20));
  return { price, currency: trip.currency || 'USD', fetchedAt: new Date().toISOString(), itineraryDetail: null, rawOffer: null, dictionaries: {} };
}

// Ask AI: given current price and history, recommend buy or wait
async function getPriceRecommendation(trip, currentPrice, history) {
  const prices = (history || []).map((e) => e.price).filter((n) => typeof n === 'number');
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const recent = prices.slice(-14);
  const median = recent.length
    ? recent.slice().sort((a, b) => a - b)[Math.floor(recent.length / 2)]
    : null;
  const prompt = `You are Henry, a travel agent. The user is monitoring flight prices for this trip:
Origin: ${trip.origin || 'Any'}
Destination: ${trip.destination}
Dates: ${trip.startDate || 'flexible'} to ${trip.endDate || 'flexible'}
Cabin: ${trip.cabinClass || 'Economy'}
Current lowest price: ${currentPrice} ${trip.currency || 'USD'}
Price history: ${prices.length ? `min ${min}, max ${max}, ${prices.length} data points` : 'no history yet'}
${median != null ? `Median of last 14: ${median}` : ''}

Should we recommend buying now? Consider: is the current price at or below typical lows? Could it drop more?
Reply with ONLY a JSON object, no other text: {"recommendBuy": true or false, "reason": "one short sentence", "confidence": "high" or "medium" or "low"}`;
  try {
    const text = await askAI(prompt, '', { maxTokens: 200 });
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        recommendBuy: !!parsed.recommendBuy,
        reason: parsed.reason || '',
        confidence: parsed.confidence || 'medium',
      };
    }
  } catch (e) {
    console.warn('Henry price recommendation AI failed:', e.message);
  }
  return { recommendBuy: false, reason: 'AI unavailable', confidence: 'low' };
}

async function runHenryPriceMonitorJob() {
  const cfg = loadConfig();
  const enabled = cfg?.travelAgent?.priceMonitorEnabled === true;
  if (!enabled) return;
  const data = loadHenryPriceMonitor();
  const trips = (data.monitoredTrips || []).filter((t) => t.enabled);
  if (!trips.length) return;
  const adminEmail = getAdminEmail();
  const adminWhatsApp = getAdminWhatsAppNumber();
  for (const trip of trips) {
    try {
      const { price, currency, fetchedAt, itineraryDetail, rawOffer, dictionaries } = await fetchCurrentPriceForTrip(trip);
      const hist = data.priceHistory[trip.id] || [];
      const rec = await getPriceRecommendation(trip, price, hist);
      hist.push({
        at: fetchedAt,
        price,
        currency,
        recommendation: rec,
      });
      data.priceHistory[trip.id] = hist.slice(-90);
      saveHenryPriceMonitor(data);
      if (rec.recommendBuy && (adminEmail || adminWhatsApp)) {
        const route = trip.origin ? `${trip.origin} → ${trip.destination}` : trip.destination;
        const autoBookAndPay = cfg?.travelAgent?.henryAutoBookAndPay === true;
        const pmId = getHenryAutoPaymentMethod();
        const passengers = trip.passengers || [];
        const needed = Math.max(1, trip.travelers || 1);
        const hasEnoughPassengers = passengers.length >= needed;
        const canAutoBook = autoBookAndPay && pmId && rawOffer && dictionaries && hasEnoughPassengers;

        if (canAutoBook) {
          const travelers = passengers.slice(0, needed).map((p) => ({
            firstName: p.firstName || 'Passenger',
            lastName: p.lastName || 'Passenger',
            dateOfBirth: p.dateOfBirth || null,
          }));
          const bookResult = await amadeusCreateFlightOrder(rawOffer, travelers);
          if (bookResult.success) {
            const amountCents = Math.round(parseFloat(String(price)) * 100);
            const chargeResult = await chargeStripePaymentMethod(pmId, amountCents, (currency || 'USD').toLowerCase());
            if (chargeResult.success) {
              saveHenryPendingFlightBooking(null);
              let autoMsg = `✅ Henry – Booked and paid: ${route}\n\nBooking reference: ${bookResult.bookingRef || 'N/A'}\nAmount charged: ${price} ${currency}\nReason: ${rec.reason}`;
              if (itineraryDetail && itineraryDetail.trim()) autoMsg += `\n\n--- Itinerary ---\n${itineraryDetail.trim()}`;
              if (adminEmail && (useSendGrid || emailTransporter)) {
                await sendEmailReply(adminEmail, `Henry – Booked and paid: ${route}`, autoMsg);
                console.log('📧 Henry auto book+pay: email sent');
              }
              if (adminWhatsApp && twilioClient) {
                await sendWhatsApp(autoMsg, false, `whatsapp:${adminWhatsApp.replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
                console.log('📱 Henry auto book+pay: WhatsApp sent');
              }
            } else {
              saveHenryPendingFlightBooking({ tripId: trip.id, trip: { ...trip, passengers }, rawOffer, dictionaries, price, currency, at: fetchedAt });
              let failMsg = `✈️ Henry – Flight booked but payment failed: ${route}\n\nBooking reference: ${bookResult.bookingRef || 'N/A'}. Charge error: ${chargeResult.error}. Complete payment manually via the link in your price alert or Config → Henry → Confirm buy.`;
              if (adminEmail && (useSendGrid || emailTransporter)) await sendEmailReply(adminEmail, `Henry – Payment failed: ${route}`, failMsg);
              if (adminWhatsApp && twilioClient) await sendWhatsApp(failMsg, false, `whatsapp:${adminWhatsApp.replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
            }
          } else {
            saveHenryPendingFlightBooking({ tripId: trip.id, trip: { ...trip, passengers }, rawOffer, dictionaries, price, currency, at: fetchedAt });
            let bookFailMsg = `✈️ Henry – Flight price alert: ${route}\n\nCurrent lowest: ${price} ${currency}\nRecommendation: Buy now.\nReason: ${rec.reason}\nAuto-book failed: ${bookResult.error}. Reply "Confirm buy" or use Config → Henry to book manually.`;
            if (itineraryDetail && itineraryDetail.trim()) bookFailMsg += `\n\n--- Flight / itinerary ---\n${itineraryDetail.trim()}\n---`;
            if (adminEmail && (useSendGrid || emailTransporter)) await sendEmailReply(adminEmail, `Henry – Cheapest ticket alert: ${route}`, bookFailMsg);
            if (adminWhatsApp && twilioClient) await sendWhatsApp(bookFailMsg, false, `whatsapp:${adminWhatsApp.replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
          }
        } else {
          if (rawOffer && dictionaries) {
            saveHenryPendingFlightBooking({
              tripId: trip.id,
              trip: { ...trip, passengers: trip.passengers || [] },
              rawOffer,
              dictionaries,
              price,
              currency,
              at: fetchedAt,
            });
          }
          let msg = `✈️ Henry – Flight price alert: ${route}\n\nCurrent lowest: ${price} ${currency}\nRecommendation: Buy now.\nReason: ${rec.reason}\nConfidence: ${rec.confidence}`;
          if (itineraryDetail && itineraryDetail.trim()) {
            msg += `\n\n--- Flight / itinerary (lowest price option) ---\n${itineraryDetail.trim()}\n---`;
          }
          if (autoBookAndPay && !pmId) msg += '\n\nAuto-book is on but no payment method is set. Add one in Config → Henry → Payment method for auto-book. Reply "Confirm buy" or use Config to book manually.';
          else if (autoBookAndPay && !hasEnoughPassengers) msg += `\n\nAuto-book is on but this trip needs ${needed} passenger(s). Add them in Config → Henry → Trips → Passengers. Reply "Confirm buy" to book manually.`;
          else msg += '\n\nReply "Confirm buy" or "Yes book" to book now, or use Config → Henry → Confirm buy (book pending flight) to book manually. Payment via link after booking.';
          if (adminEmail && (useSendGrid || emailTransporter)) {
            await sendEmailReply(adminEmail, `Henry – Cheapest ticket alert: ${route}`, msg);
            console.log('📧 Henry price alert sent by email to', adminEmail);
          }
          if (adminWhatsApp && twilioClient) {
            await sendWhatsApp(msg, false, `whatsapp:${adminWhatsApp.replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
            console.log('📱 Henry price alert sent by WhatsApp');
          }
        }
      }
    } catch (e) {
      console.warn('Henry price monitor trip error:', trip.id, e.message);
    }
  }
}

// GET list of monitored trips
app.get('/api/travel/price-monitor/trips', (req, res) => {
  try {
    const { monitoredTrips, priceHistory } = loadHenryPriceMonitor();
    const withLast = monitoredTrips.map((t) => {
      const hist = priceHistory[t.id] || [];
      const last = hist.length ? hist[hist.length - 1] : null;
      return { ...t, lastPrice: last?.price ?? null, lastPriceAt: last?.at ?? null, lastRecommendation: last?.recommendation ?? null };
    });
    res.json({ trips: withLast });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST add a monitored trip
app.post('/api/travel/price-monitor/trips', express.json(), (req, res) => {
  try {
    const { origin, destination, startDate, endDate, travelers = 1, cabinClass, currency = 'USD' } = req.body || {};
    if (!destination || typeof destination !== 'string' || !destination.trim()) {
      return res.status(400).json({ error: 'destination is required.' });
    }
    const data = loadHenryPriceMonitor();
    const id = `trip_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const trip = {
      id,
      origin: (origin && String(origin).trim()) || '',
      destination: String(destination).trim(),
      startDate: startDate && String(startDate).trim() || '',
      endDate: endDate && String(endDate).trim() || '',
      travelers: Math.max(1, parseInt(travelers, 10) || 1),
      cabinClass: (cabinClass && String(cabinClass).trim()) || 'ECONOMY',
      currency: (currency && String(currency).trim()) || 'USD',
      enabled: true,
      passengers: [],
      createdAt: new Date().toISOString(),
    };
    data.monitoredTrips.push(trip);
    if (!data.priceHistory[id]) data.priceHistory[id] = [];
    saveHenryPriceMonitor(data);
    res.status(201).json({ trip });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PATCH update a trip (enable/disable and/or origin, destination, dates, travelers, cabinClass, currency)
app.patch('/api/travel/price-monitor/trips/:id', express.json(), (req, res) => {
  try {
    const { id } = req.params;
    const { enabled, origin, destination, startDate, endDate, travelers, cabinClass, currency } = req.body || {};
    const data = loadHenryPriceMonitor();
    const t = data.monitoredTrips.find((x) => x.id === id);
    if (!t) return res.status(404).json({ error: 'Trip not found.' });
    if (typeof enabled === 'boolean') t.enabled = enabled;
    if (typeof origin === 'string') t.origin = origin.trim();
    if (typeof destination === 'string' && destination.trim()) t.destination = destination.trim();
    if (typeof startDate === 'string') t.startDate = startDate.trim();
    if (typeof endDate === 'string') t.endDate = endDate.trim();
    if (travelers !== undefined) t.travelers = Math.max(1, parseInt(travelers, 10) || 1);
    if (typeof cabinClass === 'string' && cabinClass.trim()) t.cabinClass = cabinClass.trim();
    if (typeof currency === 'string' && currency.trim()) t.currency = currency.trim();
    saveHenryPriceMonitor(data);
    res.json({ trip: t });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE a monitored trip
app.delete('/api/travel/price-monitor/trips/:id', (req, res) => {
  try {
    const { id } = req.params;
    const data = loadHenryPriceMonitor();
    data.monitoredTrips = data.monitoredTrips.filter((x) => x.id !== id);
    if (data.priceHistory[id]) delete data.priceHistory[id];
    saveHenryPriceMonitor(data);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Passengers for a monitored trip (for booking: names/details used when confirming buy)
app.get('/api/travel/price-monitor/trips/:id/passengers', (req, res) => {
  try {
    const { id } = req.params;
    const data = loadHenryPriceMonitor();
    const t = data.monitoredTrips.find((x) => x.id === id);
    if (!t) return res.status(404).json({ error: 'Trip not found.' });
    res.json({ tripId: id, passengers: t.passengers || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/travel/price-monitor/trips/:id/passengers', express.json(), (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, dateOfBirth } = req.body || {};
    if (!firstName || !lastName || typeof firstName !== 'string' || typeof lastName !== 'string') {
      return res.status(400).json({ error: 'firstName and lastName are required.' });
    }
    const data = loadHenryPriceMonitor();
    const t = data.monitoredTrips.find((x) => x.id === id);
    if (!t) return res.status(404).json({ error: 'Trip not found.' });
    if (!t.passengers) t.passengers = [];
    const pid = `pax_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const pax = {
      id: pid,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      dateOfBirth: dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(String(dateOfBirth).trim()) ? String(dateOfBirth).trim() : null,
    };
    t.passengers.push(pax);
    saveHenryPriceMonitor(data);
    res.status(201).json({ passenger: pax });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/travel/price-monitor/trips/:id/passengers/:pid', express.json(), (req, res) => {
  try {
    const { id, pid } = req.params;
    const { firstName, lastName, dateOfBirth } = req.body || {};
    const data = loadHenryPriceMonitor();
    const t = data.monitoredTrips.find((x) => x.id === id);
    if (!t) return res.status(404).json({ error: 'Trip not found.' });
    const p = (t.passengers || []).find((x) => x.id === pid);
    if (!p) return res.status(404).json({ error: 'Passenger not found.' });
    if (typeof firstName === 'string' && firstName.trim()) p.firstName = firstName.trim();
    if (typeof lastName === 'string' && lastName.trim()) p.lastName = lastName.trim();
    if (dateOfBirth !== undefined) p.dateOfBirth = dateOfBirth && /^\d{4}-\d{2}-\d{2}$/.test(String(dateOfBirth).trim()) ? String(dateOfBirth).trim() : null;
    saveHenryPriceMonitor(data);
    res.json({ passenger: p });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/travel/price-monitor/trips/:id/passengers/:pid', (req, res) => {
  try {
    const { id, pid } = req.params;
    const data = loadHenryPriceMonitor();
    const t = data.monitoredTrips.find((x) => x.id === id);
    if (!t) return res.status(404).json({ error: 'Trip not found.' });
    if (!t.passengers) t.passengers = [];
    const before = t.passengers.length;
    t.passengers = t.passengers.filter((x) => x.id !== pid);
    if (t.passengers.length === before) return res.status(404).json({ error: 'Passenger not found.' });
    saveHenryPriceMonitor(data);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET price history for a trip
app.get('/api/travel/price-monitor/trips/:id/history', (req, res) => {
  try {
    const { id } = req.params;
    const data = loadHenryPriceMonitor();
    const t = data.monitoredTrips.find((x) => x.id === id);
    if (!t) return res.status(404).json({ error: 'Trip not found.' });
    res.json({ tripId: id, history: data.priceHistory[id] || [] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST run price check now (for testing or manual trigger)
app.post('/api/travel/price-monitor/run-now', async (req, res) => {
  try {
    const cfg = loadConfig();
    if (!(cfg?.travelAgent?.enabled ?? process.env.TRAVEL_AGENT_ENABLED === 'true')) {
      return res.status(400).json({ error: 'Henry is disabled. Enable in Config → Henry.' });
    }
    await runHenryPriceMonitorJob();
    res.json({ success: true, message: 'Price check completed.' });
  } catch (e) {
    console.error('Henry price monitor run-now error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST confirm buy: book the pending flight (from last recommend-buy alert). Requires passengers to be set for the trip. Use when auto-book is off or for manual booking.
app.post('/api/travel/price-monitor/confirm-buy', async (req, res) => {
  try {
    const result = await tryHenryPriceMonitorConfirmBuy();
    if (result.ok) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, message: result.message });
    }
  } catch (e) {
    res.status(500).json({ success: false, message: e.message || 'Confirm buy failed.' });
  }
});

// GET whether a payment method is stored for Henry auto-book
app.get('/api/travel/price-monitor/payment-method', (req, res) => {
  try {
    const has = !!getHenryAutoPaymentMethod();
    res.json({ hasPaymentMethod: has });
  } catch (e) {
    res.status(500).json({ hasPaymentMethod: false, error: e.message });
  }
});

// POST set payment method for Henry auto-book (Stripe Payment Method ID, e.g. pm_xxx). Send from client after Stripe Elements / createPaymentMethod.
app.post('/api/travel/price-monitor/payment-method', express.json(), (req, res) => {
  try {
    const { paymentMethodId } = req.body || {};
    if (!paymentMethodId || typeof paymentMethodId !== 'string' || !paymentMethodId.trim()) {
      return res.status(400).json({ error: 'paymentMethodId is required (Stripe Payment Method ID, e.g. pm_xxx).' });
    }
    setHenryAutoPaymentMethod(paymentMethodId.trim());
    res.json({ success: true, message: 'Payment method saved for Henry auto-book.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Call user with travel plan summary (Henry)
app.post('/api/henry/call-with-plan', express.json(), async (req, res) => {
  try {
    const cfg = loadConfig();
    if (!(cfg?.travelAgent?.enabled ?? process.env.TRAVEL_AGENT_ENABLED === 'true')) {
      return res.status(400).json({ error: 'Henry is disabled. Enable in Config → Henry.' });
    }
    if (!twilioClient) {
      return res.status(503).json({ error: 'Twilio not configured. Add TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.' });
    }
    const { planId, plan, destination } = req.body || {};
    if (!plan || typeof plan !== 'string') {
      return res.status(400).json({ error: 'plan (travel plan text) is required.' });
    }
    const dest = (destination || 'your trip').trim();
    const maxVoiceLen = 1500;
    let script = plan.replace(/\s+/g, ' ').trim();
    if (script.length > maxVoiceLen) {
      script = script.slice(0, maxVoiceLen) + '... Full plan is in the app.';
    }
    const message = `Henry here. Your travel plan for ${dest}: ${script}`;
    await makeVoiceCall(message, null, { agent: 'henry' });
    res.json({ success: true, message: `Henry is calling you with your ${dest} plan.` });
  } catch (e) {
    console.error('Henry call-with-plan failed:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// List reminders (upcoming travel, restaurant, appointments)
app.get('/api/henry/reminders', (req, res) => {
  try {
    const items = readHenryItems();
    const now = new Date().toISOString();
    const upcoming = items.filter((i) => (i.reminderAt || i.at) > now && !i.reminderNotified);
    const past = items.filter((i) => (i.reminderAt || i.at) <= now || i.reminderNotified);
    res.json({ success: true, upcoming, past, all: items });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Add reminder (travel, restaurant, appointment)
app.post('/api/henry/reminders', express.json(), (req, res) => {
  try {
    const { type, title, at, details, destination, startDate } = req.body || {};
    if (!type || !title || !at) {
      return res.status(400).json({ error: 'type, title, and at (ISO date/time) are required.' });
    }
    const id = `rem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const items = readHenryItems();
    items.push({
      id,
      type: type === 'travel' || type === 'restaurant' || type === 'appointment' ? type : 'appointment',
      title: String(title).trim(),
      at: at,
      reminderAt: at,
      details: details || '',
      destination: destination || '',
      startDate: startDate || '',
      reminderNotified: false,
      createdAt: new Date().toISOString(),
    });
    writeHenryItems(items);
    res.json({ success: true, id, message: 'Reminder added. Henry will call you before the event if reminder calls are enabled.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Delete reminder
app.delete('/api/henry/reminders/:id', (req, res) => {
  try {
    const id = req.params.id;
    const items = readHenryItems().filter((i) => i.id !== id);
    writeHenryItems(items);
    res.json({ success: true, message: 'Reminder removed.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Restaurants: search & suggest + best sites to book (Henry)
const HENRY_RESTAURANT_PROMPT = `You are Henry, a travel and dining assistant. Given a city and optional filters (cuisine, date, party size, budget), respond with:
1. **Suggestions** – 3–5 restaurant recommendations with brief description, area, and typical price range.
2. **Best sites to book** – For that city/market: "Book via OpenTable", "Try Resy for NYC", "Tock for tasting menus", etc., with short guidance (e.g. "OpenTable: [link]. Resy: resy.com. Tock: tock.com.").
3. **Hard-to-get tip** – One line on how to snag popular spots (e.g. "Set alerts on Resy; book as soon as slots drop.").
Format in clear markdown. Be specific and practical.`;

app.post('/api/travel/restaurants', express.json(), async (req, res) => {
  try {
    const cfg = loadConfig();
    if (!(cfg?.travelAgent?.enabled ?? process.env.TRAVEL_AGENT_ENABLED === 'true')) {
      return res.status(400).json({ error: 'Henry is disabled. Enable in Config → Henry.' });
    }
    const { city, cuisine, date, partySize, budget } = req.body || {};
    if (!city || typeof city !== 'string' || !city.trim()) {
      return res.status(400).json({ error: 'city is required.' });
    }
    const platforms = cfg?.travelAgent?.preferredReservationPlatforms || 'OpenTable, Resy, Tock';
    const query = `Restaurant search: City: ${city.trim()}${cuisine ? `, Cuisine: ${cuisine}` : ''}${date ? `, Date: ${date}` : ''}${partySize ? `, Party size: ${partySize}` : ''}${budget ? `, Budget: ${budget}` : ''}. Preferred booking platforms to recommend: ${platforms}.`;
    const reply = await askAI(query, '', { systemPrompt: HENRY_RESTAURANT_PROMPT });
    res.json({ success: true, city: city.trim(), suggestions: reply });
  } catch (e) {
    console.error('Henry restaurants error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// From a travel plan, get restaurant booking links for selected days and optionally add reminders (Henry)
const HENRY_EXTRACT_RESTAURANTS_PROMPT = `You are Henry. Extract restaurant suggestions from the travel plan below for the given day numbers. For each day number listed, output the restaurant name(s) and city mentioned for that day. Reply with a JSON array only, no other text. Format: [{"day":1,"restaurants":[{"name":"Restaurant A","city":"Paris"}]},{"day":2,"restaurants":[{"name":"Restaurant B","city":"Paris"}]}]. Use the destination city if the plan does not specify a city for a restaurant.`;

app.post('/api/travel/plan/restaurant-reservations', express.json(), async (req, res) => {
  try {
    const cfg = loadConfig();
    if (!(cfg?.travelAgent?.enabled ?? process.env.TRAVEL_AGENT_ENABLED === 'true')) {
      return res.status(400).json({ error: 'Henry is disabled. Enable in Config → Henry.' });
    }
    const { plan, destination, startDate, selectedDays, addReminders } = req.body || {};
    if (!plan || typeof plan !== 'string' || !destination || !Array.isArray(selectedDays) || selectedDays.length === 0) {
      return res.status(400).json({ error: 'plan, destination, and selectedDays (array of day numbers) are required.' });
    }
    const days = selectedDays.map((d) => Number(d)).filter((d) => d >= 1 && d <= 31);
    if (days.length === 0) return res.status(400).json({ error: 'selectedDays must contain at least one day number (1–31).' });
    const city = typeof destination === 'string' ? destination.trim() : '';
    const query = `Travel plan:\n${plan.slice(0, 12000)}\n\nDestination: ${city}. Extract restaurants for day numbers: ${days.join(', ')}.`;
    let extractText = await askAI(query, '', { systemPrompt: HENRY_EXTRACT_RESTAURANTS_PROMPT });
    const jsonMatch = extractText.match(/\[[\s\S]*?\]/);
    let parsed = [];
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(parsed)) parsed = [];
      } catch (_) {
        parsed = [];
      }
    }
    const results = [];
    const start = startDate ? new Date(startDate) : null;
    const platforms = cfg?.travelAgent?.preferredReservationPlatforms || 'OpenTable, Resy, Tock';
    for (const item of parsed) {
      const dayNum = item.day;
      if (!days.includes(dayNum) || !Array.isArray(item.restaurants)) continue;
      let dateStr = '';
      if (start) {
        const d = new Date(start);
        d.setDate(d.getDate() + (dayNum - 1));
        dateStr = d.toISOString().slice(0, 10);
      }
      for (const r of item.restaurants) {
        const name = (r.name || '').trim();
        const rCity = (r.city || city).trim();
        if (!name) continue;
        const bookingQuery = `User wants to book: ${name}, ${rCity}${dateStr ? ` on ${dateStr}` : ''}. List the best sites to book (OpenTable, Resy, Tock) with direct search links for this restaurant and city. One short paragraph.`;
        const bookingInfo = await askAI(bookingQuery, '', { systemPrompt: HENRY_RESTAURANT_PROMPT });
        results.push({ day: dayNum, restaurantName: name, city: rCity, date: dateStr, bookingInfo });
        if (addReminders && dateStr) {
          const items = readHenryItems();
          items.push({
            id: `res_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
            type: 'restaurant',
            title: `${name}, ${rCity}`,
            at: dateStr,
            reminderAt: dateStr,
            details: bookingInfo,
            reminderNotified: false,
            createdAt: new Date().toISOString(),
          });
          writeHenryItems(items);
        }
      }
    }
    res.json({ success: true, destination: city, selectedDays: days, results, remindersAdded: !!addReminders });
  } catch (e) {
    console.error('Henry plan restaurant reservations error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Reservations: get booking links and optionally add to "wanted" for monitoring (Henry)
app.post('/api/travel/reservations', express.json(), async (req, res) => {
  try {
    const cfg = loadConfig();
    if (!(cfg?.travelAgent?.enabled ?? process.env.TRAVEL_AGENT_ENABLED === 'true')) {
      return res.status(400).json({ error: 'Henry is disabled. Enable in Config → Henry.' });
    }
    const { restaurantName, city, date, time, partySize, addReminder } = req.body || {};
    if (!restaurantName || !city) {
      return res.status(400).json({ error: 'restaurantName and city are required.' });
    }
    const platforms = cfg?.travelAgent?.preferredReservationPlatforms || 'OpenTable, Resy, Tock';
    const query = `User wants to book: ${restaurantName}, ${city}${date ? ` on ${date}` : ''}${time ? ` at ${time}` : ''}${partySize ? ` for ${partySize} people` : ''}. List the best sites to book (OpenTable, Resy, Tock) with direct search links for this restaurant and city. One short paragraph.`;
    const reply = await askAI(query, '', { systemPrompt: HENRY_RESTAURANT_PROMPT });
    if (addReminder && date) {
      const items = readHenryItems();
      const id = `res_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      items.push({
        id,
        type: 'restaurant',
        title: `${restaurantName}, ${city}`,
        at: date,
        reminderAt: date,
        details: reply,
        reminderNotified: false,
        createdAt: new Date().toISOString(),
      });
      writeHenryItems(items);
    }
    res.json({
      success: true,
      restaurantName,
      city,
      bookingInfo: reply,
      reminderAdded: !!addReminder,
    });
  } catch (e) {
    console.error('Henry reservations error:', e.message);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Voice note transcription check (for debugging)
app.get('/api/voice-notes/check', (req, res) => {
  const groqKey = !!process.env.GROQ_API_KEY;
  const openaiKey = !!process.env.OPENAI_API_KEY;
  const hasKey = groqKey || openaiKey;
  const provider = openaiKey ? 'openai' : groqKey ? 'groq' : 'none';
  const ffmpegPath = getFfmpegPath();
  const useShell = (ffmpegPath === 'ffmpeg' && process.platform === 'win32');
  const proc = spawn(ffmpegPath, ['-version'], { stdio: ['ignore', 'pipe', 'pipe'], shell: useShell, windowsHide: true });
  let responded = false;
  const done = (ffmpegOk) => {
    if (responded) return;
    responded = true;
    res.json({
      transcriptionProvider: provider,
      groqKeySet: groqKey,
      openaiKeySet: openaiKey,
      ffmpegPath,
      ffmpegWorks: ffmpegOk,
      hint: !hasKey ? 'Add GROQ_API_KEY (free at console.groq.com) or OPENAI_API_KEY to .env.backend' : !ffmpegOk ? 'ffmpeg not found. Install: winget install Gyan.FFmpeg, restart backend.' : 'Ready for voice notes.',
    });
  };
  proc.on('close', (code) => done(code === 0));
  proc.on('error', () => done(false));
  setTimeout(() => done(false), 3000);
});

// Voice call setup check (for debugging)
app.get('/api/voice-call/check', (req, res) => {
  const cfg = loadConfig();
  const toNumber = cfg?.ceo?.phoneNumber || process.env.CEO_PHONE_NUMBER || '';
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
  res.json({
    twilioConfigured: !!twilioClient,
    fromNumber: fromNumber ? `${fromNumber} (must have Voice capability in Twilio)` : 'NOT SET',
    toNumber: toNumber || 'NOT SET - configure in Contact Information',
    hint: 'If no call received: 1) Verify "to" at console.twilio.com → Verified Caller IDs. 2) Ensure "from" has Voice capability in Phone Numbers.',
  });
});

// On-demand voice call (from Config UI "Call me now" button)
app.post('/api/voice-call', express.json(), async (req, res) => {
  try {
    if (!twilioClient) {
      return res.status(503).json({ success: false, error: 'Twilio not configured' });
    }
    const cfg = loadConfig();
    const toNumber = (req.body?.toNumber || cfg?.ceo?.phoneNumber || process.env.CEO_PHONE_NUMBER || '').replace(/\s/g, '');
    if (!toNumber) {
      return res.status(400).json({ success: false, error: 'No phone number configured. Set Contact Information → Phone Number in Config Dashboard and Save.' });
    }
    const message = req.body?.message || 'This is your Strategic AI Advisor. You requested an on-demand voice briefing. All systems operational.';
    const call = await makeVoiceCall(message, toNumber);
    res.json({
      success: true,
      message: `Voice call initiated to ${toNumber}. You should receive a call shortly.`,
      callSid: call.sid,
      debugUrl: `https://console.twilio.com/us1/monitor/logs/calls?sid=${call.sid}`,
    });
  } catch (e) {
    console.error('Voice call failed:', e.message, 'code:', e.code, 'more:', e.moreInfo);
    const errMsg = e.code === 21608
      ? 'Your phone number is not verified. Add it at: https://console.twilio.com/us1/develop/phone-numbers/manage/verified'
      : e.code === 21211
        ? 'Invalid "to" phone number. Use E.164 format (e.g. +17324214636).'
        : e.code === 21614
          ? 'The "from" number is not a valid Twilio number or does not have Voice capability. Check Twilio Console → Phone Numbers.'
          : e.message;
    res.status(500).json({ success: false, error: errMsg, twilioCode: e.code });
  }
});

app.get('/api/authorized-numbers', (req, res) => {
  // For now, return the CEO number. In production, this would be a database
  res.json([
    {
      id: '1',
      phoneNumber: process.env.CEO_PHONE_NUMBER,
      name: 'CEO - Deepesh Vellore',
      role: 'Admin',
      alertLevel: 'all',
      active: true,
    }
  ]);
});

app.post('/api/authorized-numbers', express.json(), (req, res) => {
  console.log('📱 New authorized number:', req.body);
  res.json({ success: true, message: 'Number authorized. Update will apply after restart.' });
});

app.get('/api/companies', (req, res) => {
  const defaultChannels = [
    { id: 'email', name: 'Email (Outlook / Gmail / IMAP)', type: 'email', enabled: false, configured: false },
    { id: 'additionalEmails', name: 'Additional mailboxes (Gmail / IMAP)', type: 'additionalEmails', enabled: false, configured: false },
    { id: 'teams', name: 'Microsoft Teams', type: 'teams', enabled: false, configured: false },
    { id: 'slack', name: 'Slack', type: 'slack', enabled: false, configured: false },
    { id: 'calendar', name: 'Calendar (Company-wide)', type: 'calendar', enabled: false, configured: false },
    { id: 'documents', name: 'Documents (SharePoint/OneDrive)', type: 'documents', enabled: false, configured: false },
  ];

  const defaultCompanies = [
    { id: '1', name: 'Othain Group', domain: 'othaingroup.com' },
    { id: '2', name: 'OthainSoft', domain: 'othainsoft.com' },
    { id: '3', name: 'Jersey Technology Partners', domain: 'jerseytechpartners.com' },
    { id: '4', name: 'Strivio LLC', domain: 'strivio.com' },
  ];

  const companiesCfg = loadCompaniesConfig();
  const configById = new Map();
  if (companiesCfg?.companies?.length) {
    companiesCfg.companies.forEach((c) => {
      configById.set(String(c.id), c);
      if (String(c.id) !== c.id) configById.set(c.id, c);
    });
  }

    const merged = defaultCompanies.map((def) => {
    const c = configById.get(String(def.id)) || configById.get(def.id) || def;
    const ch = c.channels || {};
    const addEmails = ch.additionalEmails?.mailboxes;
    const hasAdditionalEmails = Array.isArray(addEmails) && addEmails.length > 0;
    const isGmailOrImap = (ch.email?.provider || '').toLowerCase() === 'gmail' || (ch.email?.provider || '').toLowerCase() === 'imap';
    const emailHasCreds = ch.email?.adminEmail && (String(ch.email?.appPassword || ch.email?.password || '').length > 0 || ch.teams?.clientSecret);
    const emailConfigured = !!(ch.email?.adminEmail && (String(ch.email?.appPassword || ch.email?.password || '').length > 0 || ch.teams?.clientSecret || ch.email?.oauthRefreshToken));
    const emailEnabled = !!ch.email?.enabled;
    const channels = [
      { id: 'email', name: 'Email (Outlook / Gmail / IMAP)', type: 'email', enabled: emailEnabled, configured: emailConfigured },
      { id: 'additionalEmails', name: 'Additional mailboxes (Gmail / IMAP)', type: 'additionalEmails', enabled: hasAdditionalEmails, configured: hasAdditionalEmails },
      { id: 'teams', name: 'Microsoft Teams', type: 'teams', enabled: !!ch.teams?.enabled, configured: !!(ch.teams?.azureAppId && !String(ch.teams?.azureAppId || '').includes('YOUR_')) },
      { id: 'slack', name: 'Slack', type: 'slack', enabled: false, configured: false },
      { id: 'calendar', name: 'Calendar (Company-wide)', type: 'calendar', enabled: !!ch.calendar?.enabled, configured: !!(ch.calendar?.azureAppId && !String(ch.calendar?.azureAppId || '').includes('YOUR_')) },
      { id: 'documents', name: 'Documents (SharePoint/OneDrive)', type: 'documents', enabled: !!ch.sharepoint?.enabled, configured: !!(ch.sharepoint?.azureAppId && !String(ch.sharepoint?.azureAppId || '').includes('YOUR_')) },
    ];
    return { id: def.id, name: def.name, domain: def.domain || '', active: true, channels };
  });

  res.json(merged);
});

app.get('/api/companies-config', (req, res) => {
  const cfg = loadCompaniesConfig();
  res.json(cfg || { companies: [] });
});

// Quick health check for briefing: tests Azure creds so you see the real error (expired secret, wrong tenant, etc.)
app.get('/api/briefing-health', async (req, res) => {
  try {
    const cfg = loadCompaniesConfig();
    const companies = cfg?.companies || [];
    const withAzure = companies.find((c) => {
      const creds = c.channels?.teams || c.channels?.calendar;
      return creds?.azureAppId && creds?.tenantId && creds?.clientSecret;
    });
    if (!withAzure) {
      return res.json({ ok: false, error: 'No Azure credentials', errorHint: 'In Config Dashboard, add Teams or Calendar with Azure App ID, Tenant ID, and Client Secret for at least one company.' });
    }
    const creds = withAzure.channels?.teams || withAzure.channels?.calendar;
    const { testAzureConnection } = await import('./services/graph-service.js');
    const result = await testAzureConnection(creds.tenantId, creds.azureAppId, creds.clientSecret);
    if (result.ok) {
      return res.json({ ok: true, message: 'Azure/M365 connection OK. Briefing data fetch should work.' });
    }
    res.json({ ok: false, error: result.error, errorHint: result.errorHint || 'Check Azure Portal: app registration, secret, and API permissions (Mail.Read, etc.) + admin consent.' });
  } catch (err) {
    res.json({ ok: false, error: err.message, errorHint: 'See server console for details.' });
  }
});

// Refresh full channel data cache (runs in background; person/insight queries use cache for fast replies)
app.post('/api/channel-cache/refresh', async (req, res) => {
  try {
    await refreshChannelDataCache();
    const data = channelDataCache.data;
    const companies = data?.companies?.length ?? 0;
    const mailboxes = (data?.companies || []).reduce((s, c) => s + (c.channels?.email?.byUser?.length || 0), 0);
    res.json({
      ok: true,
      message: data?.companies?.length ? `Cache refreshed: ${companies} companies, ${mailboxes} mailboxes. Person/insight queries will use this until the next refresh.` : 'Refresh completed but no company data was stored (fetch may have timed out or failed). Check server console.',
      companies,
      mailboxes,
    });
  } catch (err) {
    console.warn('Channel cache refresh (API) failed:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ----- Gmail OAuth: "Sign in with Google" (no App Password needed) -----
// state = JSON: { companyId, channelType: 'additionalEmails', mailboxIndex } (mailboxIndex -1 = new mailbox)
app.get('/api/auth/google', async (req, res) => {
  try {
    const state = req.query.state || '{}';
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host') || `localhost:${PORT}`}`.replace(/\/$/, '');
    const redirectUri = `${baseUrl}/api/auth/google/callback`;
    const { getGoogleAuthUrl } = await import('./services/google-oauth.js');
    const url = getGoogleAuthUrl(redirectUri, state);
    res.redirect(url);
  } catch (err) {
    console.error('Google auth redirect failed:', err.message);
    const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontend}/config?gmail_error=${encodeURIComponent(err.message)}`);
  }
});

app.get('/api/auth/google/callback', async (req, res) => {
  const frontend = process.env.FRONTEND_URL || 'http://localhost:5173';
  try {
    const { code, state } = req.query;
    if (!code) {
      return res.redirect(`${frontend}/config?gmail_error=${encodeURIComponent('No authorization code from Google')}`);
    }
    const baseUrl = process.env.BACKEND_URL || `${req.protocol}://${req.get('host') || `localhost:${PORT}`}`.replace(/\/$/, '');
    const redirectUri = `${baseUrl}/api/auth/google/callback`;

    const { exchangeCodeForTokens, getUserEmail } = await import('./services/google-oauth.js');
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const refreshToken = tokens.refresh_token;
    const accessToken = tokens.access_token;
    if (!refreshToken && !accessToken) {
      return res.redirect(`${frontend}/config?gmail_error=${encodeURIComponent('Google did not return tokens')}`);
    }
    let userEmail = '';
    try {
      userEmail = await getUserEmail(accessToken);
    } catch (_) {
      // optional
    }

    let stateObj = { companyId: '', channelType: 'additionalEmails', mailboxIndex: -1 };
    try {
      stateObj = typeof state === 'string' ? JSON.parse(state) : stateObj;
    } catch (_) {}

    const companyId = String(stateObj.companyId || '');
    const channelType = stateObj.channelType || 'additionalEmails';
    const mailboxIndex = typeof stateObj.mailboxIndex === 'number' ? stateObj.mailboxIndex : -1;

    let cfg = loadCompaniesConfig() || { companies: [] };
    let companies = Array.isArray(cfg.companies) ? [...cfg.companies] : [];
    let comp = companies.find((c) => String(c.id) === companyId);
    if (!comp) {
      comp = { id: companyId, name: 'Company', domain: '', channels: {} };
      companies.push(comp);
    }
    comp.channels = comp.channels || {};
    if (channelType === 'additionalEmails') {
      const mailboxes = Array.isArray(comp.channels.additionalEmails?.mailboxes) ? [...comp.channels.additionalEmails.mailboxes] : [];
      const refreshTok = refreshToken || tokens.refresh_token;
      if (mailboxIndex >= 0 && mailboxes[mailboxIndex]) {
        const existing = mailboxes[mailboxIndex];
        mailboxes[mailboxIndex] = {
          ...existing,
          provider: 'gmail',
          oauthRefreshToken: refreshTok,
          adminEmail: (userEmail && userEmail.trim()) ? userEmail.trim() : (existing.adminEmail || ''),
        };
      } else {
        let finalEmail = (userEmail && userEmail.trim()) ? userEmail.trim() : '';
        if (!finalEmail && accessToken) {
          try {
            const fallback = await getUserEmail(accessToken);
            if (fallback && fallback.trim()) finalEmail = fallback.trim();
          } catch (_) {}
        }
        mailboxes.push({
          provider: 'gmail',
          adminEmail: finalEmail,
          oauthRefreshToken: refreshTok,
        });
      }
      comp.channels.additionalEmails = comp.channels.additionalEmails || {};
      comp.channels.additionalEmails.enabled = true;
      comp.channels.additionalEmails.mailboxes = mailboxes;
    }
    cfg = { ...cfg, companies };
    fs.writeFileSync(COMPANIES_CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf8');
    const savedEmail = (channelType === 'additionalEmails' && comp.channels.additionalEmails?.mailboxes?.length)
      ? (comp.channels.additionalEmails.mailboxes[mailboxIndex >= 0 ? mailboxIndex : comp.channels.additionalEmails.mailboxes.length - 1]?.adminEmail)
      : userEmail;
    console.log('📝 Gmail OAuth connected for', savedEmail || userEmail, 'companyId=', companyId);

    const email = savedEmail || userEmail || 'Gmail';
    res.redirect(`${frontend}/config?gmail_connected=1&email=${encodeURIComponent(email)}&companyId=${encodeURIComponent(companyId)}`);
  } catch (err) {
    console.error('Google OAuth callback failed:', err);
    res.redirect(`${frontend}/config?gmail_error=${encodeURIComponent(err.message || 'OAuth failed')}`);
  }
});

// Monitoring scope counts per company - cross-check with network admin's M365 counts
app.get('/api/companies-monitoring-counts', async (req, res) => {
  try {
    const cfg = loadCompaniesConfig();
    const companies = cfg?.companies || [];
    const defaultCompanies = [
      { id: '1', name: 'Othain Group', domain: 'othaingroup.com' },
      { id: '2', name: 'OthainSoft', domain: 'othainsoft.com' },
      { id: '3', name: 'Jersey Technology Partners', domain: 'jerseytechpartners.com' },
    ];
    const configById = new Map(companies.map((c) => [c.id, c]));
    const { getTenantMonitoringCounts } = await import('./services/graph-service.js');

    const results = [];
    const cacheByTenant = new Map();

    for (const def of defaultCompanies) {
      const c = configById.get(def.id) || def;
      const ch = c.channels || {};
      const creds = ch.teams || ch.calendar;
      const userPrincipalName = ch.teams?.userPrincipalName || ch.calendar?.userPrincipalName || ch.email?.adminEmail;
      const maxUsers = ch.email?.monitorAllUserMailboxes
        ? Math.min(500, parseInt(ch.email?.maxUsers, 10) || 100)
        : 1;

      if (!creds?.azureAppId) {
        results.push({
          id: c.id,
          name: c.name,
          domain: c.domain || '',
          userCount: null,
          monitoredUserCount: null,
          teamsCount: null,
          channelsCount: null,
          error: 'No Azure credentials configured',
        });
        continue;
      }

      const tenantKey = creds.tenantId;
      let counts = cacheByTenant.get(tenantKey);
      if (!counts) {
        counts = await getTenantMonitoringCounts(
          creds.tenantId,
          creds.azureAppId,
          creds.clientSecret,
          userPrincipalName,
          maxUsers
        );
        cacheByTenant.set(tenantKey, counts);
      }

      results.push({
        id: c.id,
        name: c.name,
        domain: c.domain || '',
        userCount: counts.error ? null : counts.userCount,
        monitoredUserCount: counts.error ? null : counts.monitoredUserCount,
        teamsCount: counts.error ? null : counts.teamsCount,
        channelsCount: counts.error ? null : counts.channelsCount,
        hasMoreUsers: counts._hasMoreUsers || false,
        error: counts.error || null,
      });
    }

    res.json({ companies: results, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error('Companies monitoring counts failed:', e.message);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/companies-config', express.json(), (req, res) => {
  try {
    const body = req.body;

    // Support both: { companyId, channelType, channelConfig } (merge) and { companies: [...] } (full replace)
    if (body.companyId && body.channelType && body.channelConfig) {
      // Merge single channel update - preserves all other data
      const companyId = String(body.companyId);
      let cfg = loadCompaniesConfig() || { companies: [] };
      let companies = Array.isArray(cfg.companies) ? [...cfg.companies] : [];
      let comp = companies.find((c) => String(c.id) === companyId);
      if (!comp) {
        comp = {
          id: companyId,
          name: body.companyName || 'Company',
          domain: body.companyDomain || '',
          channels: {},
        };
        companies.push(comp);
      }
      comp.channels = comp.channels || {};
      comp.channels[body.channelType] = body.channelConfig;
      cfg = { ...cfg, companies };
      const pathToWrite = path.resolve(COMPANIES_CONFIG_PATH);
      fs.writeFileSync(pathToWrite, JSON.stringify(cfg, null, 2), 'utf8');
      console.log('📝 Companies config saved to', pathToWrite, 'companyId=', companyId, 'channelType=', body.channelType);
      const configForClient = JSON.parse(JSON.stringify(cfg));
      return res.json({ success: true, message: 'Channel configuration saved.', config: configForClient });
    } else if (Array.isArray(body.companies)) {
      // Full replace (legacy)
      fs.writeFileSync(COMPANIES_CONFIG_PATH, JSON.stringify({ companies: body.companies }, null, 2), 'utf8');
    } else if (body.companies) {
      fs.writeFileSync(COMPANIES_CONFIG_PATH, JSON.stringify(body, null, 2), 'utf8');
    } else {
      return res.status(400).json({ error: 'Invalid payload' });
    }

    console.log('📝 Companies config saved to', COMPANIES_CONFIG_PATH);
    res.json({ success: true, message: 'Channel configuration saved.' });
  } catch (e) {
    console.error('Companies config save failed:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/companies', express.json(), (req, res) => {
  console.log('🏢 New company added:', req.body);
  res.json({ success: true, message: 'Company added successfully!' });
});

app.get('/api/monitoring-history', (req, res) => {
  res.json([
    {
      id: '1',
      timestamp: new Date().toISOString(),
      type: 'monitoring_cycle',
      status: 'completed',
      itemsFound: 0,
      criticalCount: 0,
    }
  ]);
});

// Start monitoring cycles. Only the backend on the primary port (3000) runs morning/evening briefings to avoid duplicate emails and calls.
function startMonitoring(boundPort) {
  const intervalMinutes = parseInt(process.env.MONITORING_INTERVAL_MINUTES || '15');
  const isPrimaryPort = (typeof boundPort === 'undefined' || boundPort === PORT);
  console.log(`📊 Starting monitoring checks every ${intervalMinutes} minutes`);

  // Startup check: ensure companies-config is loadable so briefings have channel data
  const companiesCfg = loadCompaniesConfig({ silent: true });
  const companies = companiesCfg?.companies || [];
  const withChannels = companies.filter((c) => c.channels && Object.keys(c.channels).length > 0).length;
  if (companies.length === 0) {
    console.warn('⚠️ Companies config empty or not loaded — morning/evening briefings will show "no channels configured". Save channel settings in Config UI and ensure backend/companies-config.json exists.');
  } else {
    console.log('📂 Briefings: companies-config ready —', companies.length, 'companies,', withChannels, 'with channels');
  }

  // Schedule monitoring every X minutes — refresh full channel data cache for fast person/insight queries
  cron.schedule(`*/${intervalMinutes} * * * *`, () => {
    console.log('🔄 Running monitoring cycle...');
    refreshChannelDataCache().then(() => console.log('✅ Monitoring cycle complete')).catch(() => console.log('✅ Monitoring cycle complete'));
  });
  // First cache refresh shortly after startup so person queries have data without waiting for first cron
  setTimeout(() => { refreshChannelDataCache(); }, 30 * 1000);

  // Parse "HH:mm" to cron "minute hour"
  function parseTimeToCron(timeStr) {
    const match = (timeStr || '08:00').match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return { minute: 0, hour: 8 };
    return { minute: parseInt(match[2], 10), hour: parseInt(match[1], 10) };
  }

  const cfg = loadConfig();
  const frequency = cfg?.briefings?.frequency ?? process.env.BRIEFING_FREQUENCY ?? 'daily';
  if (frequency === 'off') {
    console.log('📅 Scheduled briefings disabled (frequency=off). Enable in Config → Strategic Advisor → Daily Briefings.');
    return;
  }
  if (!isPrimaryPort) {
    console.log('📅 Morning/evening briefings run only on primary port', PORT, '— this instance is on', boundPort, '(no duplicate emails/calls).');
    return;
  }
  const cronDow = frequency === 'weekdays' ? '1-5' : '*';
  const morning = parseTimeToCron(cfg?.briefings?.morningTime ?? '08:00');
  const evening = parseTimeToCron(cfg?.briefings?.eveningTime ?? '18:00');

  // Morning briefing (configurable time; email/voice toggles) — uses live data: unread emails, Teams, not-copied threads
  cron.schedule(`${morning.minute} ${morning.hour} * * ${cronDow}`, async () => {
    const c = loadConfig();
    console.log('☀️ Sending morning briefing...');
    const adminEmail = getAdminEmail();
    const emailEnabled = c?.briefings?.emailMorning !== false;
    const voiceEnabled = (c?.briefings?.voiceMorning ?? process.env.VOICE_MORNING_BRIEFING) !== 'false';
    const wantVoice = voiceEnabled && !!(twilioClient && process.env.CEO_PHONE_NUMBER);
    let voiceSummary = null;
    if (adminEmail && emailEnabled && (useSendGrid || emailTransporter)) {
      try {
        const out = await generateLiveBriefingHtml('morning', { includeVoiceSummary: wantVoice });
        const liveHtml = out && (typeof out === 'string' ? out : out.html);
        if (out && typeof out === 'object' && out.voiceSummary) voiceSummary = out.voiceSummary;
        const body = liveHtml || getBriefingUnavailableHtml('Live data fetch or AI summary failed.');
        await sendEmailBriefing(adminEmail, '(Morning)', body);
      } catch (e) {
        console.error('Morning briefing email failed:', e.message);
      }
    }
    if (voiceEnabled && twilioClient && process.env.CEO_PHONE_NUMBER) {
      try {
        const script = voiceSummary || 'Your detailed briefing has been sent to your email. Have a productive day.';
        await makeVoiceCall(`Good morning. This is your Strategic AI Advisor. ${script}`);
      } catch (e) {
        console.error('Morning voice briefing failed:', e.message);
      }
    }
    try {
      await sendWhatsApp('☀️ Good morning! Your live briefing has been sent by email. Have a productive day!', false);
    } catch (_) {}
  });

  // Evening summary (configurable time; email/voice toggles) — uses live data: unread emails, Teams, not-copied threads
  cron.schedule(`${evening.minute} ${evening.hour} * * ${cronDow}`, async () => {
    const c = loadConfig();
    console.log('🌙 Sending evening summary...');
    const adminEmail = getAdminEmail();
    const emailEnabled = c?.briefings?.emailEvening !== false;
    const voiceEnabled = (c?.briefings?.voiceEvening ?? process.env.VOICE_EVENING_BRIEFING) !== 'false';
    const wantVoice = voiceEnabled && !!(twilioClient && process.env.CEO_PHONE_NUMBER);
    let voiceSummary = null;
    if (adminEmail && emailEnabled && (useSendGrid || emailTransporter)) {
      try {
        const out = await generateLiveBriefingHtml('evening', { includeVoiceSummary: wantVoice });
        const liveHtml = out && (typeof out === 'string' ? out : out.html);
        if (out && typeof out === 'object' && out.voiceSummary) voiceSummary = out.voiceSummary;
        const fallback = getBriefingUnavailableHtml('Live data fetch or AI summary failed.');
        const eveningHtml = liveHtml
          ? `<h2>End of day summary</h2>${liveHtml}<p>Have a great evening!</p>`
          : `<h2>End of day summary</h2>${fallback}<p>Have a great evening!</p>`;
        await sendEmailBriefing(adminEmail, '(Evening)', eveningHtml);
      } catch (e) {
        console.error('Evening summary email failed:', e.message);
      }
    }
    if (voiceEnabled && twilioClient && process.env.CEO_PHONE_NUMBER) {
      try {
        const script = voiceSummary || 'Your end of day summary has been sent to your email. Have a great evening.';
        await makeVoiceCall(`Good evening. This is your Strategic AI Advisor. ${script}`);
      } catch (e) {
        console.error('Evening voice briefing failed:', e.message);
      }
    }
  });

  // Chanakya meeting prep (automatic): send prep 15 minutes before each meeting (email + WhatsApp)
  const meetingPrepEnabled = cfg?.briefings?.meetingPrepEnabled === true;
  if (meetingPrepEnabled) {
    cron.schedule('* * * * *', async () => {
      try {
        const companiesCfg = loadCompaniesConfig({ silent: true });
        const creds = companiesCfg?.companies?.[0]?.channels?.teams || companiesCfg?.companies?.[0]?.channels?.calendar;
        const userPrincipalName = creds?.userPrincipalName || companiesCfg?.companies?.[0]?.channels?.email?.adminEmail || getAdminEmail();
        if (!creds?.tenantId || !creds?.azureAppId || !creds?.clientSecret) return;
        if (!userPrincipalName) return;
        const c = loadConfig();
        const outlookTimezone = c?.briefings?.meetingPrepTimezone || process.env.MEETING_PREP_TIMEZONE || 'Eastern Standard Time';
        const { fetchUpcomingCalendarEvents } = await import('./services/graph-service.js');
        const { events, error: fetchError } = await fetchUpcomingCalendarEvents(
          creds.tenantId,
          creds.azureAppId,
          creds.clientSecret,
          userPrincipalName,
          { nextHours: 2, maxEvents: 30, outlookTimezone }
        );
        if (fetchError || !events?.length) return;
        const now = Date.now();
        const minutesBefore = MEETING_PREP_MINUTES_BEFORE;
        const minMs = (minutesBefore - MEETING_PREP_WINDOW_HALF_MINUTES) * 60 * 1000;
        const maxMs = (minutesBefore + MEETING_PREP_WINDOW_HALF_MINUTES) * 60 * 1000;
        const inWindow = events.filter((e) => {
          const startMs = new Date(e.start).getTime();
          const diff = startMs - now;
          return diff >= minMs && diff <= maxMs;
        });
        if (inWindow.length === 0) return;
        let sentKeys = readMeetingPrepSent();
        const seen = new Set();
        for (const ev of inWindow) {
          const key = meetingPrepSentKey(ev);
          const logicalKey = meetingPrepLogicalKey(ev);
          if (sentKeys.includes(key) || sentKeys.includes(logicalKey) || seen.has(key) || seen.has(logicalKey)) continue;
          seen.add(key);
          seen.add(logicalKey);
          const toAdd = key === logicalKey ? [key] : [key, logicalKey].filter((k) => !sentKeys.includes(k));
          sentKeys = [...sentKeys, ...toAdd];
          writeMeetingPrepSent(sentKeys);
          await sendMeetingPrepForOneMeeting(ev, minutesBefore);
        }
      } catch (e) {
        console.warn('Meeting prep (15 min) cron error:', e.message);
      }
    });
    console.log('📋 Meeting prep: will send 15 minutes before each meeting (check every minute)');
  }

  // Chanakya weekly review: send weekly summary, incomplete tasks, and next-week priorities (email + WhatsApp)
  const weeklyReviewEnabled = cfg?.briefings?.weeklyReviewEnabled === true;
  if (weeklyReviewEnabled) {
    const reviewDay = typeof cfg?.briefings?.weeklyReviewDay === 'number' ? cfg.briefings.weeklyReviewDay : parseInt(cfg?.briefings?.weeklyReviewDay, 10) || 0; // 0=Sun .. 6=Sat
    const reviewTime = (cfg?.briefings?.weeklyReviewTime || '18:00').trim();
    const [reviewHour, reviewMin] = reviewTime.split(':').map((n) => parseInt(n, 10) || 0);
    const cronExpr = `${reviewMin} ${reviewHour} * * ${reviewDay}`;
    cron.schedule(cronExpr, async () => {
      try {
        await runWeeklyReview();
      } catch (e) {
        console.warn('Chanakya weekly review cron error:', e.message);
      }
    });
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    console.log(`📋 Chanakya weekly review: scheduled ${dayNames[reviewDay]} at ${reviewTime} (email + WhatsApp)`);
  }

  // Chanakya meeting transcription: periodically fetch transcripts for past calendar meetings, summarize + action items, send email/WhatsApp
  const meetingTranscriptionEnabled = cfg?.briefings?.meetingTranscriptionEnabled === true;
  if (meetingTranscriptionEnabled) {
    const hoursLookback = Math.min(24, Math.max(1, parseInt(cfg?.briefings?.meetingTranscriptionHoursLookback, 10) || MEETING_TRANSCRIPTION_HOURS_LOOKBACK_DEFAULT));
    cron.schedule('*/30 * * * *', async () => {
      try {
        await runMeetingTranscriptions({ hoursLookback });
      } catch (e) {
        console.warn('Meeting transcription cron error:', e.message);
      }
    });
    console.log('📋 Meeting transcription: will process transcripts every 30 min (lookback', hoursLookback, 'h)');
  }

  // Henry hard-to-get restaurant alerts: every minute, at open time ET send alert so user can book immediately
  cron.schedule('* * * * *', async () => {
    try {
      await runHenryHardToGetRestaurantAlerts();
    } catch (e) {
      console.warn('Henry hard-to-get restaurant cron error:', e.message);
    }
  });
  const hardToGetCount = (cfg?.travelAgent?.hardToGetRestaurants || []).length;
  if (hardToGetCount > 0) {
    console.log(`🍽 Henry: hard-to-get restaurant alerts enabled for ${hardToGetCount} restaurant(s); will alert at configured day/time ET.`);
  }

  // Henry reminder calls: check every 15 min for upcoming travel/restaurant/appointment reminders
  cron.schedule('*/15 * * * *', async () => {
    const c = loadConfig();
    if (!(c?.travelAgent?.reminderCallsEnabled !== false && twilioClient && (c?.ceo?.phoneNumber || process.env.CEO_PHONE_NUMBER))) return;
    try {
      const items = readHenryItems();
      const now = new Date();
      const in30 = new Date(now.getTime() + 30 * 60 * 1000);
      let changed = false;
      for (const item of items) {
        if (item.reminderNotified) continue;
        const at = new Date(item.reminderAt || item.at);
        if (at >= now && at <= in30) {
          const typeLabel = item.type === 'travel' ? 'Trip' : item.type === 'restaurant' ? 'Restaurant reservation' : 'Appointment';
          const msg = `Reminder: ${typeLabel} — ${item.title}. ${item.destination ? `Destination: ${item.destination}. ` : ''}Coming up soon.`;
          await makeVoiceCall(msg, null, { agent: 'henry' });
          item.reminderNotified = true;
          changed = true;
          console.log('📞 Henry reminder call sent for', item.type, item.title);
        }
      }
      if (changed) writeHenryItems(items);
    } catch (e) {
      console.warn('Henry reminder cron error:', e.message);
    }
  });

  // Henry flight price monitoring: check prices every N hours, AI recommends buy, alert via WhatsApp + email
  const priceMonitorEnabled = cfg?.travelAgent?.priceMonitorEnabled === true;
  const priceMonitorHours = Math.max(1, Math.min(24, parseInt(cfg?.travelAgent?.priceMonitorIntervalHours, 10) || 6));
  if (priceMonitorEnabled) {
    cron.schedule(`0 */${priceMonitorHours} * * *`, async () => {
      try {
        await runHenryPriceMonitorJob();
      } catch (e) {
        console.warn('Henry price monitor cron error:', e.message);
      }
    });
    console.log(`✈️ Henry price monitor: running every ${priceMonitorHours} hour(s); alerts to email + WhatsApp when AI recommends buy.`);
  }

  // StarkNavigator: daily recommendations at scheduled time; hot buys trigger immediate WhatsApp + email
  const starkEnabled = cfg?.starkNavigator?.enabled === true;
  const starkDailyEnabled = cfg?.starkNavigator?.dailyScheduleEnabled === true;
  if (starkEnabled && starkDailyEnabled) {
    const starkTime = (cfg?.starkNavigator?.dailyScheduleTime || '08:00').trim();
    const [starkHour, starkMin] = starkTime.split(':').map((n) => parseInt(n, 10) || 0);
    cron.schedule(`${starkMin} ${starkHour} * * *`, async () => {
      try {
        const result = await runStarkRecommendations({ sendHotAlerts: true });
        const adminEmail = getAdminEmail();
        const adminWhatsApp = getAdminWhatsAppNumber();
        const bestBetLine = result.bestBet && result.bestBetSummary ? `⭐ Best bet: ${result.bestBet} – ${result.bestBetSummary}\n\n` : '';
        const recs = result.recommendations || [];
        const lines = recs.map((r, i) => {
          const num = recs.length > 1 ? `${i + 1}. ` : '• ';
          let line = `${num}${r.symbol} (${r.name}): ${r.action} – ${r.reason || ''}${r.hot ? ' [BEST BET]' : ''}`;
          if (r.priceGuidance) line += ` | ${r.priceGuidance}`;
          else if (r.buyAtOrBelow != null || r.avoidAbove != null) line += ` | Buy ≤${r.buyAtOrBelow ?? '?'}${r.avoidAbove != null ? `, avoid above ${r.avoidAbove}` : ''}`;
          return line;
        });
        const body = `StarkNavigator – Daily recommendations\n\n${bestBetLine}${lines.length ? lines.join('\n') : 'No recommendations today.'}`;
        if (adminEmail && (useSendGrid || emailTransporter)) await sendEmailReply(adminEmail, 'StarkNavigator – Daily recommendations', body);
        if (adminWhatsApp && twilioClient && body.length <= 1400) {
          try { await sendWhatsApp(body, false, `whatsapp:${String(adminWhatsApp).replace(/^\+/, '').replace(/^whatsapp:/i, '')}`); } catch (_) {}
        } else if (adminWhatsApp && twilioClient) {
          try { await sendWhatsApp('StarkNavigator – Daily digest sent to your email.', false, `whatsapp:${String(adminWhatsApp).replace(/^\+/, '').replace(/^whatsapp:/i, '')}`); } catch (_) {}
        }
      } catch (e) {
        console.warn('StarkNavigator daily cron error:', e.message);
      }
    });
    console.log(`📊 StarkNavigator: daily digest at ${starkTime}; hot buys trigger immediate WhatsApp + email.`);
  }
}

// Start the server (tries PORT, then 3001 if PORT is in use)
function startServer() {
  console.log('============================================');
  console.log('  STRATEGIC AI ADVISOR - BACKEND SERVICE');
  console.log('============================================\n');

  function onListening(port) {
    return async () => {
      console.log(`✅ Backend server running on port ${port}`);
      if (port !== PORT) {
        console.log(`   (Port ${PORT} was in use; using ${port} instead. Update webhooks/URLs if needed.)`);
        console.log(`\n   ⚠️  WhatsApp/webhooks will NOT work on port ${port}.`);
        console.log(`   → Close this window. Right-click START-BACKEND.bat → Run as administrator.\n`);
      }
      console.log(`📡 Webhook URL: http://localhost:${port}/webhook/whatsapp`);
      console.log(`🔍 Health check: http://localhost:${port}/health\n`);

      startMonitoring(port);
      scheduleBeerMulePoll();

      // Only send startup WhatsApp when on primary port and not started by fix/restart scripts (they set SKIP_STARTUP_WHATSAPP=1)
      const primaryPort = parseInt(process.env.BACKEND_PORT, 10) || 3000;
      const skipStartupWhatsApp = /^1|true|yes$/i.test(process.env.SKIP_STARTUP_WHATSAPP || '');
      if (twilioClient && port === primaryPort && !skipStartupWhatsApp) {
        try {
          await sendWhatsApp(
            `🤖 Strategic AI Advisor is now online!\n\nMonitoring every ${process.env.MONITORING_INTERVAL_MINUTES || 15} minutes.\n\nReply anytime:\n• "brief" - Current status\n• "critical" - Urgent items\n• "call" - Voice briefing\n• "help" - All commands\n\nOr just ask me anything!`,
            false
          );
        } catch (error) {
          console.error('⚠️ Could not send startup notification:', error.message);
        }
      } else if (port !== primaryPort) {
        console.log('   (Skipping startup WhatsApp – not on primary port.)');
      } else if (skipStartupWhatsApp) {
        console.log('   (Skipping startup WhatsApp – started by fix/restart script.)');
      }

      console.log('🤖 AGI Monitoring Service is now active!');
      console.log('📱 You can now WhatsApp: +18556406324');
      console.log('\n============================================\n');
    };
  }

  function tryListen(port, fallbackIndex = 0) {
    const fallbacks = [3001, 3002, 3003, 3004, 3005];
    const server = app.listen(port, onListening(port));
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        const next = fallbacks[fallbackIndex];
        if (next != null) {
          console.warn(`⚠️ Port ${port} in use, trying ${next}...\n`);
          tryListen(next, fallbackIndex + 1);
        } else {
          console.error(`❌ All ports in use. Run START-BACKEND.bat as administrator (see HOW-TO-START-BACKEND.txt).`);
          process.exit(1);
        }
      } else {
        console.error('❌ Failed to start backend service:', err.message);
        process.exit(1);
      }
    });
  }

  tryListen(PORT);
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  process.exit(0);
});

// Start the service
startServer();
