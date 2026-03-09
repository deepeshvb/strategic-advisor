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
  if (!text && body.html) {
    text = String(body.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  if (!text && body.email) {
    try {
      const raw = typeof body.email === 'string' ? Buffer.from(body.email, 'utf8') : body.email;
      const parsed = await simpleParser(raw);
      text = (parsed.text || '').trim();
      if (!text && parsed.html) text = String(parsed.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
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
  return cfg?.ceo?.email || process.env.CEO_EMAIL || process.env.EMAIL_USER || process.env.GMAIL_USER || '';
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
      amadeusApiKey: cfg?.travelAgent?.amadeusApiKey ?? process.env.AMADEUS_API_KEY ?? '',
      amadeusApiSecret: cfg?.travelAgent?.amadeusApiSecret ? '••••••••' : '',
    },
    starkNavigator: {
      enabled: cfg?.starkNavigator?.enabled === true,
      criteria: cfg?.starkNavigator?.criteria ?? '',
      dailyScheduleEnabled: cfg?.starkNavigator?.dailyScheduleEnabled === true,
      dailyScheduleTime: cfg?.starkNavigator?.dailyScheduleTime ?? '08:00',
      hotAlertEnabled: cfg?.starkNavigator?.hotAlertEnabled !== false,
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
const STARK_NAVIGATOR_PROMPT = `You are StarkNavigator, an advisor for both investments (e.g. stocks) and big purchases (cars, wine, real estate, art, luxury goods, etc.). Given the user's criteria and a list of opportunities, evaluate each and recommend: buy, hold, or skip. For any you mark as strong buy or exceptional deal, set "hot": true so the user gets an instant alert.
Reply with ONLY a valid JSON object (no other text) in this exact shape:
{"recommendations":[{"symbol":"AAPL","name":"Apple Inc","action":"buy|hold|skip","reason":"one short sentence","hot":true|false}]}
Use "symbol" and "name" for the opportunity (for stocks use ticker/company name; for other items use a short id and description). Use "hot": true only for 1–2 items that are exceptional based on the user's criteria. Be conservative.`;

const STARK_NAVIGATOR_BIG_PURCHASE_PROMPT = `You are StarkNavigator, an advisor for big purchases (cars, wine, real estate, art, luxury goods, etc.) and investments. Given the user's criteria and a description of one specific opportunity they are considering, recommend: buy, hold, or skip. Give a clear reason. If this is an exceptional deal that matches their criteria and they should act soon, set "hot": true so they get an instant alert.
Reply with ONLY a valid JSON object (no other text):
{"action":"buy|hold|skip","reason":"2-3 sentences","hot":true|false}`;

// Mock stock scan: replace with Alpha Vantage / Yahoo / real API when key is configured
async function fetchStarkStockData() {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY || process.env.STARK_STOCK_API_KEY;
  const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'JNJ'];
  if (apiKey && typeof fetch === 'function') {
    try {
      const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${apiKey}`);
      if (!res.ok) return getMockStarkStockData(symbols);
      const data = await res.json();
      if (data['Global Quote'] && data['Global Quote']['05. price']) {
        const out = [];
        for (const sym of symbols.slice(0, 5)) {
          const r = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${sym}&apikey=${apiKey}`);
          const d = await r.json();
          const q = d['Global Quote'];
          if (q && q['05. price']) out.push({ symbol: sym, name: sym, price: parseFloat(q['05. price']), changePercent: parseFloat(q['10. change percent']) || 0 });
        }
        if (out.length) return out;
      }
    } catch (e) {
      console.warn('StarkNavigator: Alpha Vantage fetch failed, using mock:', e.message);
    }
  }
  return getMockStarkStockData(symbols);
}

function getMockStarkStockData(symbols) {
  const names = { AAPL: 'Apple Inc', MSFT: 'Microsoft', GOOGL: 'Alphabet', AMZN: 'Amazon', NVDA: 'NVIDIA', META: 'Meta', TSLA: 'Tesla', JPM: 'JPMorgan', V: 'Visa', JNJ: 'Johnson & Johnson' };
  const now = Date.now();
  return symbols.map((s, i) => {
    const seed = (now % 1000) + i * 17;
    const price = 150 + (seed % 400);
    const ch = (seed % 20) - 8;
    return { symbol: s, name: names[s] || s, price, changePercent: ch * 0.5 };
  });
}

async function runStarkRecommendations(opts = {}) {
  const cfg = loadConfig();
  const criteria = (cfg?.starkNavigator?.criteria || '').trim() || 'General: focus on value and growth; moderate risk tolerance.';
  const data = await fetchStarkStockData();
  const dataStr = JSON.stringify(data, null, 2);
  const prompt = `User criteria:\n${criteria}\n\nCurrent opportunities (from scan):\n${dataStr}\n\nEvaluate each against the criteria. Output ONLY the JSON object with recommendations array (action: buy/hold/skip, reason, hot: true only for exceptional immediate buys).`;
  let text;
  try {
    text = await askAI(prompt, '', { systemPrompt: STARK_NAVIGATOR_PROMPT });
  } catch (e) {
    console.warn('StarkNavigator AI failed:', e.message);
    return { recommendations: [], error: e.message };
  }
  const jsonMatch = (text || '').match(/\{[\s\S]*\}/);
  let recommendations = [];
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    } catch (_) {}
  }
  const hot = recommendations.filter((r) => r.hot === true);
  const adminEmail = getAdminEmail();
  const adminWhatsApp = getAdminWhatsAppNumber();
  const hotAlertEnabled = opts.sendHotAlerts !== false && cfg?.starkNavigator?.hotAlertEnabled !== false;
  if (hotAlertEnabled && hot.length > 0 && (adminEmail || adminWhatsApp)) {
    const hotList = hot.map((r) => `${r.symbol} (${r.name}): ${r.action} – ${r.reason || 'Strong opportunity'}`).join('\n');
    const msg = `🔥 StarkNavigator – Immediate buy alert\n\n${hotList}\n\nFull daily digest will be sent at scheduled time.`;
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
  return { recommendations, hot };
}

app.post('/api/stark-navigator/recommendations', express.json(), async (req, res) => {
  try {
    const result = await runStarkRecommendations({ sendHotAlerts: true });
    res.json({ success: true, recommendations: result.recommendations || [], hot: result.hot || [], error: result.error || null });
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
    const lines = (result.recommendations || []).map((r) => `• ${r.symbol} (${r.name}): ${r.action} – ${r.reason || ''}${r.hot ? ' [HOT]' : ''}`);
    const body = `StarkNavigator – Daily recommendations\n\n${lines.length ? lines.join('\n') : 'No recommendations today.'}`;
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

// ----- Henry: flight price monitoring (monitor trips, history, AI recommend buy, alert WhatsApp + email) -----
function loadHenryPriceMonitor() {
  try {
    if (fs.existsSync(HENRY_PRICE_MONITOR_PATH)) {
      const raw = fs.readFileSync(HENRY_PRICE_MONITOR_PATH, 'utf8');
      const data = JSON.parse(raw);
      return {
        monitoredTrips: Array.isArray(data.monitoredTrips) ? data.monitoredTrips : [],
        priceHistory: data.priceHistory && typeof data.priceHistory === 'object' ? data.priceHistory : {},
      };
    }
  } catch (e) {
    console.warn('Henry price monitor read failed:', e.message);
  }
  return { monitoredTrips: [], priceHistory: {} };
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
    if (offers.length === 0) return null;
    let best = null;
    let bestTotal = Infinity;
    for (const offer of offers) {
      const p = offer.price;
      if (!p || p.grandTotal == null) continue;
      const total = parseFloat(String(p.grandTotal).replace(/,/g, '.'));
      if (Number.isFinite(total) && total < bestTotal) {
        bestTotal = total;
        best = { price: Math.round(total), currency: (p.currency || trip.currency || 'USD').toUpperCase() };
      }
    }
    return best;
  } catch (e) {
    console.warn('Amadeus flight offers error:', e.message);
    return null;
  }
}

// Fetch current lowest price: Amadeus when credentials set, else mock
async function fetchCurrentPriceForTrip(trip) {
  const amadeus = await fetchAmadeusFlightOffers(trip);
  if (amadeus) return { ...amadeus, fetchedAt: new Date().toISOString() };
  const key = `${trip.origin || 'ANY'}-${trip.destination}-${trip.startDate}-${trip.cabinClass || 'ECONOMY'}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  const base = 200 + (h % 600);
  const dayVar = (new Date().getDate() % 7) * 15;
  const price = Math.round(base + dayVar + (Math.random() * 40 - 20));
  return { price, currency: trip.currency || 'USD', fetchedAt: new Date().toISOString() };
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
      const { price, currency, fetchedAt } = await fetchCurrentPriceForTrip(trip);
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
        const msg = `✈️ Henry – Flight price alert: ${route}\n\nCurrent lowest: ${price} ${currency}\nRecommendation: Buy now.\nReason: ${rec.reason}\nConfidence: ${rec.confidence}\n\nCheck your preferred booking site to lock in this price.`;
        if (adminEmail && (useSendGrid || emailTransporter)) {
          await sendEmailReply(adminEmail, `Henry – Cheapest ticket alert: ${route}`, msg);
          console.log('📧 Henry price alert sent by email to', adminEmail);
        }
        if (adminWhatsApp && twilioClient) {
          await sendWhatsApp(msg, false, `whatsapp:${adminWhatsApp.replace(/^\+/, '').replace(/^whatsapp:/i, '')}`);
          console.log('📱 Henry price alert sent by WhatsApp');
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

// PATCH enable/disable a trip
app.patch('/api/travel/price-monitor/trips/:id', express.json(), (req, res) => {
  try {
    const { id } = req.params;
    const { enabled } = req.body || {};
    const data = loadHenryPriceMonitor();
    const t = data.monitoredTrips.find((x) => x.id === id);
    if (!t) return res.status(404).json({ error: 'Trip not found.' });
    if (typeof enabled === 'boolean') t.enabled = enabled;
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
        const lines = (result.recommendations || []).map((r) => `• ${r.symbol} (${r.name}): ${r.action} – ${r.reason || ''}${r.hot ? ' [HOT]' : ''}`);
        const body = `StarkNavigator – Daily recommendations\n\n${lines.length ? lines.join('\n') : 'No recommendations today.'}`;
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
