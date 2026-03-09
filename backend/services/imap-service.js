/**
 * IMAP email fetch for Gmail and other providers.
 * Returns the same shape as Graph (byUser, messages with from, toRecipients, subject, received, etc.)
 * so existing server.js and LLM context code work unchanged.
 */
import { ImapFlow } from 'imapflow';

/**
 * Build IMAP client config from channel email config.
 * Supports password (appPassword) or OAuth (accessToken) for Gmail.
 * @param {Object} emailConfig - { provider, adminEmail, appPassword?, accessToken?, oauthRefreshToken?, imapHost?, imapPort?, imapSecure? }
 */
function getImapConfig(emailConfig) {
  const provider = (emailConfig?.provider || 'imap').toLowerCase();
  const user = (emailConfig?.adminEmail || '').trim();
  const pass = (emailConfig?.appPassword || emailConfig?.password || '').trim();
  const accessToken = emailConfig?.accessToken;
  const useOAuth = !!(provider === 'gmail' && accessToken);
  if (!user) return null;
  if (!useOAuth && !pass) return null;
  if (provider === 'gmail') {
    return {
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: useOAuth ? { user, accessToken } : { user, pass },
    };
  }
  const host = (emailConfig?.imapHost || '').trim();
  if (!host) return null;
  const port = parseInt(emailConfig?.imapPort, 10) || 993;
  const secure = emailConfig?.imapSecure !== false;
  return {
    host,
    port,
    secure,
    auth: { user, pass },
  };
}

/**
 * Map IMAP envelope to the same shape as Graph API messages.
 * ImapFlow envelope: from[], to[], cc[], bcc[], subject, date, messageId, etc.
 */
function mapEnvelopeToMessage(envelope, folder) {
  const fromAddr = envelope?.from?.[0];
  const from = typeof fromAddr === 'object' && fromAddr?.address
    ? fromAddr.address
    : (Array.isArray(envelope?.from) && envelope.from[0] ? String(envelope.from[0]) : '');
  const fromName = typeof fromAddr === 'object' && fromAddr?.name
    ? fromAddr.name
    : '';
  const toRecipients = (envelope?.to || []).map((r) => (typeof r === 'object' && r?.address ? r.address : String(r))).filter(Boolean);
  const ccRecipients = (envelope?.cc || []).map((r) => (typeof r === 'object' && r?.address ? r.address : String(r))).filter(Boolean);
  const received = envelope?.date ? (envelope.date instanceof Date ? envelope.date.toISOString() : new Date(envelope.date).toISOString()) : null;
  return {
    subject: envelope?.subject || '(no subject)',
    from,
    fromName,
    toRecipients,
    ccRecipients,
    received,
    isRead: true,
    preview: null,
    folder,
  };
}

/**
 * Fetch inbox + sent for a single mailbox via IMAP.
 * Returns { byUser: [{ user, userPrincipalName, userEmail, messages }], error }.
 * options: { messagesPerFolder?, receivedSince? (ISO date string) }
 */
export async function fetchMailViaImap(emailConfig, options = {}) {
  const result = { byUser: [], error: null };
  const provider = (emailConfig?.provider || 'imap').toLowerCase();
  let config = null;

  // Gmail with OAuth: get access token from refresh token
  if (provider === 'gmail' && emailConfig?.oauthRefreshToken) {
    try {
      const { refreshAccessToken } = await import('./google-oauth.js');
      const tokens = await refreshAccessToken(emailConfig.oauthRefreshToken);
      config = getImapConfig({ ...emailConfig, accessToken: tokens.access_token });
    } catch (err) {
      result.error = `Gmail OAuth failed: ${err?.message || 'Could not refresh token'}. Try reconnecting with Sign in with Google.`;
      return result;
    }
  } else {
    config = getImapConfig(emailConfig);
  }

  if (!config) {
    result.error = 'IMAP config missing: for Gmail use Sign in with Google or an App Password; for other IMAP need adminEmail, password, and imapHost.';
    return result;
  }
  const user = (emailConfig?.adminEmail || '').trim();
  const displayName = user.split('@')[0] || user;
  const messagesPerFolder = Math.min(100, Math.max(1, parseInt(options.messagesPerFolder, 10) || 50));

  /**
   * Build a user-friendly error message from IMAP/ImapFlow errors.
   * "Command failed" is generic; add server response and Gmail hints when possible.
   */
  function formatImapError(err, context) {
    const msg = err?.message || 'IMAP error';
    const code = err?.code;
    const response = err?.response || err?.responseText || err?.responseCode;
    const parts = [msg];
    if (response) parts.push(`Server: ${typeof response === 'string' ? response : JSON.stringify(response)}`);
    if (code) parts.push(`Code: ${code}`);
    let out = parts.join('. ');
    if (out === 'Command failed' || (msg === 'Command failed' && !response)) {
      const provider = (emailConfig?.provider || '').toLowerCase();
      const hint = provider === 'gmail'
        ? ' For Gmail: use an App Password (Google Account → Security → 2-Step Verification → App passwords), and enable IMAP in Gmail settings.'
        : ' Check credentials and that IMAP is enabled for this account.';
      out = `Command failed.${hint}`;
    }
    return out;
  }

  let client;
  try {
    client = new ImapFlow(config);
    await client.connect();
  } catch (err) {
    result.error = formatImapError(err, 'connect');
    return result;
  }

  const messages = [];
  try {
    const fetchOneMailbox = async (mailboxName, folder) => {
      try {
        const lock = await client.getMailboxLock(mailboxName);
        try {
          const total = client.mailbox.exists || 0;
          if (total === 0) return;
          const start = Math.max(1, total - messagesPerFolder + 1);
          const range = `${start}:${total}`;
          const list = await client.fetch(range, { envelope: true, uid: true });
          for await (const msg of list) {
            if (msg?.envelope) {
              messages.push(mapEnvelopeToMessage(msg.envelope, folder));
            }
          }
        } finally {
          lock.release();
        }
      } catch (e) {
        // e.g. Sent folder might be named "Sent" or "[Gmail]/Sent Mail"
        if (mailboxName === 'INBOX') throw e;
      }
    };

    await fetchOneMailbox('INBOX', 'inbox');
    // Gmail uses "[Gmail]/Sent Mail"; other IMAP often use "Sent". Try the right one first to avoid NONEXISTENT errors.
    const sentFolder = provider === 'gmail' ? '[Gmail]/Sent Mail' : 'Sent';
    const sentFallback = provider === 'gmail' ? 'Sent' : '[Gmail]/Sent Mail';
    await fetchOneMailbox(sentFolder, 'sent').catch(() => fetchOneMailbox(sentFallback, 'sent').catch(() => {}));
  } catch (err) {
    result.error = formatImapError(err, 'fetch');
    return result;
  } finally {
    try {
      await client.logout();
    } catch (_) {
      client.close();
    }
  }

  const receivedSince = options?.receivedSince;
  let filtered = messages;
  if (receivedSince) {
    const since = new Date(receivedSince).getTime();
    filtered = messages.filter((m) => m.received && new Date(m.received).getTime() >= since);
  }
  filtered.sort((a, b) => new Date(b.received || 0) - new Date(a.received || 0));

  result.byUser.push({
    user: displayName,
    userPrincipalName: user,
    userEmail: user,
    messages: filtered,
  });
  return result;
}
