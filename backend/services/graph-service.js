/**
 * Microsoft Graph API service for Teams, Email, Calendar, SharePoint
 * Uses MSAL client credentials flow (app-only)
 */
import { ConfidentialClientApplication } from '@azure/msal-node';

/** Return ISO string for N days ago (UTC). Used for receivedDateTime ge filter. */
function getReceivedSinceISO(daysBack) {
  if (daysBack == null || typeof daysBack !== 'number' || daysBack <= 0) return null;
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - daysBack);
  return d.toISOString();
}
import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';

/**
 * Normalize Azure AD errors into user-friendly messages
 */
function normalizeAzureError(err) {
  const msg = err?.message || String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('aadsts700016') || lower.includes('700016')) {
    return {
      error: 'App not found in tenant',
      errorHint: 'The Azure app is not registered in your company tenant. Create a new app in Azure Portal while signed into your company tenant (Othain Group), or use an app that was registered there. See ADMIN-CONFIG-REQUEST.md for steps.',
    };
  }
  if (lower.includes('aadsts7000215') || lower.includes('7000215')) {
    return {
      error: 'Invalid client secret',
      errorHint: 'The client secret may have expired or is incorrect. Create a new secret in Azure Portal → App registrations → Your app → Certificates & secrets.',
    };
  }
  if (lower.includes('aadsts7000222') || lower.includes('7000222')) {
    return {
      error: 'Client secret expired',
      errorHint: 'The client secret has expired. Create a new secret in Azure Portal and update your configuration.',
    };
  }
  if (lower.includes('aadsts70011') || lower.includes('70011')) {
    return {
      error: 'Invalid scope or permissions',
      errorHint: 'The app may lack required permissions. Add Microsoft Graph API permissions (Channel.ReadBasic.All, Mail.Read, etc.) and grant admin consent.',
    };
  }
  if (lower.includes('invalid_client') || lower.includes('unauthorized_client')) {
    return {
      error: 'Authentication failed',
      errorHint: 'Check App ID, Client Secret, and Tenant ID. Ensure the app is registered in the correct tenant (your company, not personal Microsoft account).',
    };
  }
  if (lower.includes('access is denied') || lower.includes('access_denied')) {
    return {
      error: 'Access is denied',
      errorHint: 'The app lacks permission to read mail. In Azure Portal → App registrations → Your app → API permissions: add Mail.Read (Application), then click Grant admin consent for [Organization].',
    };
  }

  return { error: msg, errorHint: null };
}

/**
 * Get access token using client credentials
 */
async function getAccessToken(tenantId, clientId, clientSecret) {
  const msalConfig = {
    auth: {
      clientId,
      authority: `https://login.microsoftonline.com/${tenantId}`,
      clientSecret,
    },
  };
  const cca = new ConfidentialClientApplication(msalConfig);
  const result = await cca.acquireTokenByClientCredential({
    scopes: ['https://graph.microsoft.com/.default'],
  });
  return result?.accessToken || null;
}

/**
 * Test Azure/M365 connectivity for briefing health check. Returns { ok: true } or { ok: false, error, errorHint }.
 */
export async function testAzureConnection(tenantId, clientId, clientSecret) {
  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) return { ok: false, error: 'No access token', errorHint: 'Check App ID, Tenant ID, and Client Secret in Config.' };
    const client = createGraphClient(token);
    await client.api('/organization').top(1).get();
    return { ok: true };
  } catch (err) {
    const normalized = normalizeAzureError(err);
    return { ok: false, error: normalized.error, errorHint: normalized.errorHint };
  }
}

/**
 * Create authenticated Graph client
 */
function createGraphClient(accessToken) {
  return Client.init({
    authProvider: (done) => done(null, accessToken),
  });
}

/**
 * Fetch Teams data: joined teams, unread messages, mentions
 * userPrincipalName: required for app-only (e.g. strategic-monitor@company.com)
 */
export async function fetchTeamsData(tenantId, clientId, clientSecret, userPrincipalName = null) {
  const result = { teams: [], unreadMessages: 0, mentions: [], recentMessages: [], error: null };
  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) throw new Error('Failed to get access token');

    const client = createGraphClient(token);
    const userPath = userPrincipalName ? `/users/${encodeURIComponent(userPrincipalName)}` : '/me';

    // Get joined teams (app-only requires /users/{id})
    const teamsResponse = await client.api(`${userPath}/joinedTeams`).get();
    const teams = teamsResponse?.value || [];
    result.teams = teams.map((t) => ({ id: t.id, name: t.displayName }));

    // Get messages from first team's first channel (sample)
    for (const team of teams.slice(0, 5)) {
      try {
        const channelsRes = await client.api(`/teams/${team.id}/channels`).get();
        const channels = channelsRes?.value || [];
        for (const ch of channels.slice(0, 4)) {
          try {
            const messagesRes = await client.api(
              `/teams/${team.id}/channels/${ch.id}/messages`
            ).top(20).get();
            const messages = messagesRes?.value || [];
            for (const msg of messages) {
              if (msg.lastModifiedDateTime) {
                result.unreadMessages++;
              }
              const preview = msg.body?.content?.replace(/<[^>]+>/g, ' ').substring(0, 300) || '';
              if (msg.mentions?.length) {
                result.mentions.push({
                  team: team.displayName,
                  channel: ch.displayName,
                  from: msg.from?.user?.displayName,
                  preview: preview || msg.body?.content?.substring(0, 100),
                });
              }
              // Include all messages for name search (e.g. "Vishnu" in body text, not just @mentions)
              result.recentMessages.push({
                team: team.displayName,
                channel: ch.displayName,
                from: msg.from?.user?.displayName,
                preview,
                created: msg.createdDateTime,
              });
            }
          } catch (_) {
            // Channel may not support messages
          }
        }
      } catch (_) {
        // Team may not have channels
      }
    }

    return result;
  } catch (err) {
    const normalized = normalizeAzureError(err);
    result.error = normalized.error;
    if (normalized.errorHint) result.errorHint = normalized.errorHint;
    return result;
  }
}

/**
 * Fetch mail data: unread count, recent messages
 * userPrincipalName: required for app-only (e.g. strategic-monitor@company.com)
 */
export async function fetchMailData(tenantId, clientId, clientSecret, userPrincipalName = null) {
  const result = { unreadCount: 0, messages: [], error: null };
  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) throw new Error('Failed to get access token');

    const client = createGraphClient(token);
    const userPath = userPrincipalName ? `/users/${encodeURIComponent(userPrincipalName)}` : '/me';

    const inboxRes = await client.api(`${userPath}/mailFolders/inbox/messages`).top(20).get();
    const messages = inboxRes?.value || [];
    result.unreadCount = messages.filter((m) => !m.isRead).length;
    result.messages = messages.slice(0, 10).map((m) => ({
      subject: m.subject,
      from: m.from?.emailAddress?.address,
      received: m.receivedDateTime,
      isRead: m.isRead,
      preview: m.bodyPreview?.substring(0, 80),
    }));

    return result;
  } catch (err) {
    const normalized = normalizeAzureError(err);
    result.error = normalized.error;
    if (normalized.errorHint) result.errorHint = normalized.errorHint;
    return result;
  }
}

/**
 * Fetch inbox + sent for a SINGLE user by email/UPN - used to guarantee CEO mailbox is included for employee insights
 * options: { receivedSince } - optional ISO date string; only messages received on or after this date (UTC)
 */
export async function fetchMailInboxAndSentForUser(tenantId, clientId, clientSecret, userPrincipalName, messagesPerFolder = 60, options = {}) {
  const result = { byUser: [], error: null };
  if (!userPrincipalName) return result;
  const receivedSince = options?.receivedSince || null;
  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) throw new Error('Failed to get access token');
    const client = createGraphClient(token);
    const userRes = await client.api(`/users/${encodeURIComponent(userPrincipalName)}`).select('id,displayName,mail,userPrincipalName').get();
    const user = userRes;
    const mapMsg = (m, folder) => ({
      user: user.displayName || user.mail || user.userPrincipalName,
      userEmail: user.mail || user.userPrincipalName,
      subject: m.subject,
      from: m.from?.emailAddress?.address,
      fromName: m.from?.emailAddress?.name,
      toRecipients: (m.toRecipients || []).map((r) => r.emailAddress?.address).filter(Boolean),
      ccRecipients: (m.ccRecipients || []).map((r) => r.emailAddress?.address).filter(Boolean),
      toRecipientsNames: (m.toRecipients || []).map((r) => r.emailAddress?.name).filter(Boolean),
      ccRecipientsNames: (m.ccRecipients || []).map((r) => r.emailAddress?.name).filter(Boolean),
      received: m.receivedDateTime,
      isRead: m.isRead,
      preview: m.bodyPreview?.substring(0, 600),
      folder,
    });
    const dateFilter = receivedSince ? `receivedDateTime ge '${receivedSince}'` : null;
    const inboxReq = client.api(`/users/${user.id}/mailFolders/inbox/messages`).top(messagesPerFolder);
    const sentReq = client.api(`/users/${user.id}/mailFolders/sentitems/messages`).top(messagesPerFolder);
    if (dateFilter) {
      inboxReq.filter(dateFilter);
      sentReq.filter(dateFilter);
    }
    const [inboxRes, sentRes] = await Promise.all([inboxReq.get(), sentReq.get()]);
    const inboxMsgs = (inboxRes?.value || []).map((m) => mapMsg(m, 'inbox'));
    const sentMsgs = (sentRes?.value || []).map((m) => mapMsg(m, 'sent'));
    const messages = [...inboxMsgs, ...sentMsgs].sort((a, b) => new Date(b.received || 0) - new Date(a.received || 0));
    result.byUser.push({ user: user.displayName || user.mail, userPrincipalName: user.userPrincipalName, messages });
    return result;
  } catch (err) {
    const normalized = normalizeAzureError(err);
    result.error = normalized.error;
    if (normalized.errorHint) result.errorHint = normalized.errorHint;
    return result;
  }
}

/**
 * Fetch mail from ALL users in the tenant (requires Mail.Read + User.ReadBasic.All application permissions)
 * Returns combined inbox data with user attribution for CEO "what do I need to know where I'm not copied" queries
 * prioritizeUserEmails: optional array of emails/UPNs to fetch first (e.g. CEO, requested employee)
 * receivedSince: optional ISO date string; only messages received on or after this date (UTC)
 */
export async function fetchMailFromAllUsers(tenantId, clientId, clientSecret, maxUsers = 15, messagesPerUser = 5, prioritizeUserEmails = [], receivedSince = null) {
  const result = { byUser: [], error: null };
  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) throw new Error('Failed to get access token');

    const client = createGraphClient(token);

    // List users (exclude guests) - up to 500 per request (Graph max $top=999)
    const usersRes = await client.api('/users').select('id,displayName,mail,userPrincipalName').top(500).get();
    let users = (usersRes?.value || []).filter((u) => {
      const upn = (u.userPrincipalName || '').toLowerCase();
      return !upn.includes('#ext#'); // Exclude guest accounts
    });

    // Prioritize CEO and requested employee so they're fetched first (critical for employee insights)
    const prioSet = new Set(prioritizeUserEmails.map((e) => (e || '').toLowerCase()).filter(Boolean));
    if (prioSet.size > 0) {
      const priority = [];
      const rest = [];
      for (const u of users) {
        const key = (u.mail || u.userPrincipalName || '').toLowerCase();
        const dn = (u.displayName || '').toLowerCase();
        let match = key && prioSet.has(key) || prioritizeUserEmails.some((p) => dn.includes((p || '').toLowerCase()));
        // Also prioritize when query is "Manpreet Kaur" and display is "Manpreet K." (first name + last initial)
        if (!match && prioritizeUserEmails.some((p) => {
          const q = (p || '').toLowerCase().trim();
          if (!q.includes('@') && q.includes(' ')) {
            const [first, ...restParts] = q.split(/\s+/).filter(Boolean);
            const last = restParts.join(' ');
            return dn.startsWith(first + ' ') && (dn.includes(last) || (last.length >= 1 && dn.includes(last[0] + '.')));
          }
          return false;
        })) match = true;
        if (match) priority.push(u);
        else rest.push(u);
      }
      users = [...priority, ...rest];
    }

    const mapMsg = (m, folder) => ({
      user: null,
      userEmail: null,
      subject: m.subject,
      from: m.from?.emailAddress?.address,
      fromName: m.from?.emailAddress?.name,
      toRecipients: (m.toRecipients || []).map((r) => r.emailAddress?.address).filter(Boolean),
      ccRecipients: (m.ccRecipients || []).map((r) => r.emailAddress?.address).filter(Boolean),
      toRecipientsNames: (m.toRecipients || []).map((r) => r.emailAddress?.name).filter(Boolean),
      ccRecipientsNames: (m.ccRecipients || []).map((r) => r.emailAddress?.name).filter(Boolean),
      received: m.receivedDateTime,
      isRead: m.isRead,
      preview: m.bodyPreview?.substring(0, 500),
      folder,
    });

    const dateFilter = receivedSince ? `receivedDateTime ge '${receivedSince}'` : null;
    for (const user of users.slice(0, maxUsers)) {
      try {
        const perUser = messagesPerUser;
        const inboxReq = client.api(`/users/${user.id}/mailFolders/inbox/messages`).top(perUser);
        const sentReq = client.api(`/users/${user.id}/mailFolders/sentitems/messages`).top(perUser);
        if (dateFilter) {
          inboxReq.filter(dateFilter);
          sentReq.filter(dateFilter);
        }
        const [inboxRes, sentRes] = await Promise.all([inboxReq.get(), sentReq.get()]);
        const inboxMsgs = (inboxRes?.value || []).map((m) => ({ ...mapMsg(m, 'inbox'), user: user.displayName || user.mail || user.userPrincipalName, userEmail: user.mail || user.userPrincipalName }));
        const sentMsgs = (sentRes?.value || []).map((m) => ({ ...mapMsg(m, 'sent'), user: user.displayName || user.mail || user.userPrincipalName, userEmail: user.mail || user.userPrincipalName }));
        const messages = [...inboxMsgs, ...sentMsgs].sort((a, b) => new Date(b.received || 0) - new Date(a.received || 0));
        result.byUser.push({ user: user.displayName || user.mail, userPrincipalName: user.userPrincipalName, messages });
      } catch (_) {
        // User may not have mailbox or access denied
      }
    }

    return result;
  } catch (err) {
    const normalized = normalizeAzureError(err);
    result.error = normalized.error;
    if (normalized.errorHint) result.errorHint = normalized.errorHint;
    return result;
  }
}

/**
 * Fetch emails FROM a specific sender across multiple mailboxes.
 * Also fetches emails TO the employee (from SENT folders).
 * Searches by: (1) all known email addresses, (2) sender display name ($search).
 * prioritizeUserEmails: CEO/admin email to search first (critical - their inbox has the most relevant emails).
 * receivedSince: optional ISO date string; only messages received on or after this date (UTC).
 */
export async function fetchEmailsFromSenderAcrossMailboxes(tenantId, clientId, clientSecret, senderEmailsOrSingle, senderDisplayName = null, maxUsers = 25, messagesPerMailbox = 50, prioritizeUserEmails = [], receivedSince = null) {
  const result = { byUser: [], error: null };
  const emails = Array.isArray(senderEmailsOrSingle)
    ? senderEmailsOrSingle
    : senderEmailsOrSingle ? [senderEmailsOrSingle] : [];
  const senderEmails = [...new Set(emails.map((e) => (e || '').trim().toLowerCase()).filter((e) => e && e.includes('@')))];
  const hasEmails = senderEmails.length > 0;
  const displayName = (senderDisplayName || '').trim();
  const hasName = displayName.length >= 2;

  if (!hasEmails && !hasName) return result;
  const dateClause = receivedSince ? ` and receivedDateTime ge '${receivedSince}'` : '';

  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) throw new Error('Failed to get access token');
    const client = createGraphClient(token);

    const usersRes = await client.api('/users').select('id,displayName,mail,userPrincipalName').top(500).get();
    let users = (usersRes?.value || []).filter((u) => {
      const upn = (u.userPrincipalName || '').toLowerCase();
      return !upn.includes('#ext#');
    });

    // Prioritize CEO/admin mailbox first - their inbox has emails from the employee
    const prioSet = new Set((prioritizeUserEmails || []).map((e) => (e || '').toLowerCase()).filter(Boolean));
    if (prioSet.size > 0) {
      const priority = [];
      const rest = [];
      for (const u of users) {
        const key = (u.mail || u.userPrincipalName || '').toLowerCase();
        if (key && prioSet.has(key)) priority.push(u);
        else rest.push(u);
      }
      users = [...priority, ...rest];
    }

    const mapMsg = (m, folder) => ({
      user: null,
      userEmail: null,
      subject: m.subject,
      from: m.from?.emailAddress?.address,
      fromName: m.from?.emailAddress?.name,
      toRecipients: (m.toRecipients || []).map((r) => r.emailAddress?.address).filter(Boolean),
      ccRecipients: (m.ccRecipients || []).map((r) => r.emailAddress?.address).filter(Boolean),
      toRecipientsNames: (m.toRecipients || []).map((r) => r.emailAddress?.name).filter(Boolean),
      ccRecipientsNames: (m.ccRecipients || []).map((r) => r.emailAddress?.name).filter(Boolean),
      received: m.receivedDateTime,
      isRead: m.isRead,
      preview: m.bodyPreview?.substring(0, 500),
      folder,
    });

    const seen = new Set();
    const addToResult = (user, messages) => {
      if (!messages?.length) return;
      const deduped = messages.filter((m) => {
        const key = `${m.from}|${m.subject}|${m.received}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (deduped.length === 0) return;
      const existing = result.byUser.find((u) => (u.userPrincipalName || u.user || '').toLowerCase() === (user.userPrincipalName || '').toLowerCase());
      if (existing) {
        existing.messages = [...(existing.messages || []), ...deduped].sort((a, b) => new Date(b.received || 0) - new Date(a.received || 0));
      } else {
        result.byUser.push({ user: user.displayName || user.mail, userPrincipalName: user.userPrincipalName, messages: deduped });
      }
    };

    const namePartsForFilter = hasName ? displayName.toLowerCase().split(/\s+/).filter((p) => p.length >= 2) : [];
    const userList = users.slice(0, maxUsers);
    for (let uIdx = 0; uIdx < userList.length; uIdx++) {
      const user = userList[uIdx];
      try {
        // INBOX: emails FROM the employee
        if (hasEmails) {
          for (const email of senderEmails) {
            const filter = `from/emailAddress/address eq '${email.replace(/'/g, "''")}'${dateClause}`;
            const inboxRes = await client.api(`/users/${user.id}/mailFolders/inbox/messages`).filter(filter).top(messagesPerMailbox).get();
            let messages = (inboxRes?.value || []).map((m) => ({ ...mapMsg(m, 'inbox'), user: user.displayName || user.mail || user.userPrincipalName, userEmail: user.mail || user.userPrincipalName }));
            if (receivedSince) {
              const since = new Date(receivedSince).getTime();
              messages = messages.filter((m) => new Date(m.received || 0).getTime() >= since);
            }
            addToResult(user, messages);
          }
        }
        if (hasName) {
          const searchTerms = [displayName];
          const firstName = displayName.split(/\s+/)[0];
          if (firstName && firstName.length >= 2 && displayName.includes(' ')) searchTerms.push(firstName);
          for (const term of searchTerms) {
            const searchStr = `"from:${term.replace(/"/g, '')}"`;
            let searchMessages = (await client.api(`/users/${user.id}/mailFolders/inbox/messages`).search(searchStr).top(messagesPerMailbox).get())?.value || [];
            if (receivedSince) {
              const since = new Date(receivedSince).getTime();
              searchMessages = searchMessages.filter((m) => new Date(m.receivedDateTime || 0).getTime() >= since);
            }
            const messages = searchMessages.map((m) => ({ ...mapMsg(m, 'inbox'), user: user.displayName || user.mail || user.userPrincipalName, userEmail: user.mail || user.userPrincipalName }));
            addToResult(user, messages);
          }
          // Fallback: employee may send from client/external address (e.g. manpreet@client.com). Match by display name (fromName) only - no domain filter.
          if (namePartsForFilter.length > 0) {
            try {
              const recentLimit = uIdx < 5 ? 250 : 120;
              const recentReq = client.api(`/users/${user.id}/mailFolders/inbox/messages`).top(recentLimit);
              if (receivedSince) recentReq.filter(`receivedDateTime ge '${receivedSince}'`);
              const recentRes = await recentReq.get();
              const recent = (recentRes?.value || []).filter((m) => {
                const fromName = (m.from?.emailAddress?.name || '').toLowerCase();
                const fromAddr = (m.from?.emailAddress?.address || '').toLowerCase();
                const localPart = fromAddr.split('@')[0] || '';
                return namePartsForFilter.some((p) => fromName.includes(p) || localPart.includes(p));
              });
              if (recent.length > 0) {
                const since = receivedSince ? new Date(receivedSince).getTime() : 0;
                const filtered = recent.filter((m) => !since || new Date(m.receivedDateTime || 0).getTime() >= since);
                const messages = filtered.map((m) => ({ ...mapMsg(m, 'inbox'), user: user.displayName || user.mail || user.userPrincipalName, userEmail: user.mail || user.userPrincipalName }));
                addToResult(user, messages);
                if (filtered.length > 0 && typeof process !== 'undefined' && process.env?.NODE_ENV !== 'test') {
                  const ex = filtered[0]?.from?.emailAddress;
                  const addr = (ex?.address || '').toString();
                  const name = (ex?.name || '').toString();
                  console.log(`📌 From-name fallback (client/external): ${filtered.length} msgs in ${user.displayName || user.mail} | sample from: "${name}" <${addr}>`);
                }
              }
            } catch (_) { /* skip fallback on error */ }
          }
        }
        // SENT: emails TO the employee (e.g. CEO's emails to Rahul)
        if (hasEmails) {
          for (const email of senderEmails) {
            const filter = `toRecipients/any(r: r/emailAddress/address eq '${email.replace(/'/g, "''")}')${dateClause}`;
            const sentRes = await client.api(`/users/${user.id}/mailFolders/sentitems/messages`).filter(filter).top(messagesPerMailbox).get();
            let messages = (sentRes?.value || []).map((m) => ({ ...mapMsg(m, 'sent'), user: user.displayName || user.mail || user.userPrincipalName, userEmail: user.mail || user.userPrincipalName }));
            if (receivedSince) {
              const since = new Date(receivedSince).getTime();
              messages = messages.filter((m) => new Date(m.received || 0).getTime() >= since);
            }
            addToResult(user, messages);
          }
        }
        if (hasName) {
          const toSearchTerms = [displayName];
          const toFirstName = displayName.split(/\s+/)[0];
          if (toFirstName && toFirstName.length >= 2 && displayName.includes(' ')) toSearchTerms.push(toFirstName);
          for (const term of toSearchTerms) {
            const searchStr = `"to:${term.replace(/"/g, '')}"`;
            let sentSearchMessages = (await client.api(`/users/${user.id}/mailFolders/sentitems/messages`).search(searchStr).top(messagesPerMailbox).get())?.value || [];
            if (receivedSince) {
              const since = new Date(receivedSince).getTime();
              sentSearchMessages = sentSearchMessages.filter((m) => new Date(m.receivedDateTime || 0).getTime() >= since);
            }
            const messages = sentSearchMessages.map((m) => ({ ...mapMsg(m, 'sent'), user: user.displayName || user.mail || user.userPrincipalName, userEmail: user.mail || user.userPrincipalName }));
            addToResult(user, messages);
          }
        }
      } catch (_) { /* User may not have mailbox or search not supported */ }
    }
    return result;
  } catch (err) {
    const normalized = normalizeAzureError(err);
    result.error = normalized.error;
    return result;
  }
}

/**
 * Fetch mail for a SPECIFIC employee by name (e.g. "Paul Suresh", "Mohammed Abdul Ghani")
 * Used when CEO asks: "review Paul Suresh's emails and summarize items where I'm not copied"
 * Returns same byUser format with more messages per user (default 25)
 * options: { receivedSince } - optional ISO date string; only messages received on or after this date (UTC)
 */
export async function fetchMailForSpecificUser(tenantId, clientId, clientSecret, employeeName, messagesPerUser = 25, options = {}) {
  const result = { byUser: [], error: null };
  if (!employeeName || typeof employeeName !== 'string') return result;
  const searchName = employeeName.trim().toLowerCase();
  if (!searchName) return result;
  const receivedSince = options?.receivedSince || null;

  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) throw new Error('Failed to get access token');

    const client = createGraphClient(token);
    const usersRes = await client.api('/users').select('id,displayName,mail,userPrincipalName').top(500).get();
    const users = (usersRes?.value || []).filter((u) => {
      const upn = (u.userPrincipalName || '').toLowerCase();
      return !upn.includes('#ext#'); // Exclude guest accounts
    });

    // Build name parts and email prefixes: "Paul Suresh" -> ps@, paul@, suresh, etc.
    const nameParts = searchName.split(/\s+/).filter(Boolean);
    const emailPrefixes = [];
    if (nameParts.length >= 2) {
      emailPrefixes.push(nameParts[0], nameParts[1]); // paul, suresh
      emailPrefixes.push(nameParts[0][0] + nameParts[1]); // psuresh
      emailPrefixes.push(nameParts[0][0] + nameParts[1][0]); // ps
    } else {
      emailPrefixes.push(searchName);
    }

    // Common spelling variants so "Shurti" still matches "Shruti"
    const spellingVariants = { shurti: 'shruti', shruti: 'shurti' };
    const namesToTry = [searchName];
    if (nameParts.length >= 1 && spellingVariants[nameParts[0]]) {
      const alt = nameParts.slice();
      alt[0] = spellingVariants[nameParts[0]];
      namesToTry.push(alt.join(' '));
    }

    function userMatches(sn, parts, prefixes) {
      const p = (sn || '').split(/\s+/).filter(Boolean);
      const prefs = p.length >= 2 ? [p[0], p[1], p[0][0] + p[1], p[0][0] + p[1][0]] : [sn];
      return (u) => {
        const dn = (u.displayName || '').toLowerCase();
        const mail = (u.mail || '').toLowerCase();
        const upn = (u.userPrincipalName || '').toLowerCase();
        const localPart = (mail || upn).split('@')[0] || '';
        if (dn === sn || dn.startsWith(sn + ' ')) return true;
        if (dn.includes(sn)) return true;
        if (p.length >= 2 && p.every((part) => dn.includes(part))) return true;
        // "Manpreet Kaur" matches "Manpreet K." or "Manpreet K" (last name as initial)
        if (p.length >= 2 && dn.startsWith(p[0] + ' ') && (dn.includes(p[1]) || dn.includes(p[1][0] + '.') || dn.endsWith(' ' + p[1][0]))) return true;
        // "LastName, FirstName" (e.g. "Kaur, Manpreet")
        if (p.length >= 2 && dn.includes(',') && p.every((part) => dn.includes(part))) return true;
        if (prefs.some((pf) => localPart.startsWith(pf) || localPart === pf || localPart.startsWith(pf + '.'))) return true;
        return false;
      };
    }

    // Find user - try primary name then spelling variants (handles "Shurti" -> "Shruti")
    let match = null;
    for (const tryName of namesToTry) {
      const tryParts = tryName.split(/\s+/).filter(Boolean);
      const tryPrefixes = tryParts.length >= 2 ? [tryParts[0], tryParts[1], tryParts[0][0] + tryParts[1], tryParts[0][0] + tryParts[1][0]] : [tryName];
      match = users.find(userMatches(tryName, tryParts, tryPrefixes));
      if (match) break;
    }

    if (!match) {
      result.error = `No employee found matching "${employeeName}"`;
      return result;
    }

    // Fetch alternate emails (otherMails, proxyAddresses) so we can search across ALL of employee's addresses
    const allEmails = new Set();
    [match.mail, match.userPrincipalName].filter(Boolean).forEach((e) => allEmails.add((e || '').trim().toLowerCase()));
    try {
      const fullUser = await client.api(`/users/${match.id}`).select('mail,userPrincipalName,otherMails,proxyAddresses').get();
      [fullUser.mail, fullUser.userPrincipalName].filter(Boolean).forEach((e) => allEmails.add((e || '').trim().toLowerCase()));
      (fullUser.otherMails || []).forEach((e) => allEmails.add((e || '').trim().toLowerCase()));
      (fullUser.proxyAddresses || []).forEach((addr) => {
        const m = (addr || '').match(/^(?:smtp|SMTP):(.+)$/i);
        if (m) allEmails.add(m[1].trim().toLowerCase());
      });
    } catch (_) { /* otherMails/proxyAddresses may require extra permissions */ }

    result._matchedUser = {
      userPrincipalName: match.userPrincipalName,
      displayName: match.displayName,
      allEmails: [...allEmails].filter((e) => e && e.includes('@')),
    };

    try {
      const perUser = Math.min(500, messagesPerUser);
      const dateFilter = receivedSince ? `receivedDateTime ge '${receivedSince}'` : null;
      const inboxReq = client.api(`/users/${match.id}/mailFolders/inbox/messages`).top(perUser);
      const sentReq = client.api(`/users/${match.id}/mailFolders/sentitems/messages`).top(perUser);
      if (dateFilter) {
        inboxReq.filter(dateFilter);
        sentReq.filter(dateFilter);
      }
      const [inboxRes, sentRes] = await Promise.all([inboxReq.get(), sentReq.get()]);
      const mapMsg = (m, folder) => ({
        user: match.displayName || match.mail || match.userPrincipalName,
        userEmail: match.mail || match.userPrincipalName,
        subject: m.subject,
        from: m.from?.emailAddress?.address,
        fromName: m.from?.emailAddress?.name,
        toRecipients: (m.toRecipients || []).map((r) => r.emailAddress?.address).filter(Boolean),
        ccRecipients: (m.ccRecipients || []).map((r) => r.emailAddress?.address).filter(Boolean),
        toRecipientsNames: (m.toRecipients || []).map((r) => r.emailAddress?.name).filter(Boolean),
        ccRecipientsNames: (m.ccRecipients || []).map((r) => r.emailAddress?.name).filter(Boolean),
        received: m.receivedDateTime,
        isRead: m.isRead,
        preview: m.bodyPreview?.substring(0, 300),
        folder,
      });
      const inboxMsgs = (inboxRes?.value || []).map((m) => mapMsg(m, 'inbox'));
      const sentMsgs = (sentRes?.value || []).map((m) => mapMsg(m, 'sent'));
      const messages = [...inboxMsgs, ...sentMsgs].sort((a, b) => new Date(b.received || 0) - new Date(a.received || 0));
      result.byUser.push({ user: match.displayName || match.mail, userPrincipalName: match.userPrincipalName, messages });
    } catch (_) {
      result.error = `Could not read mailbox for ${match.displayName || match.mail}`;
    }

    return result;
  } catch (err) {
    const normalized = normalizeAzureError(err);
    result.error = normalized.error;
    if (normalized.errorHint) result.errorHint = normalized.errorHint;
    return result;
  }
}

/**
 * Fetch Calendar data: today's events, upcoming
 */
export async function fetchCalendarData(tenantId, clientId, clientSecret, userPrincipalName = null) {
  const result = { todayEvents: [], upcoming: [], error: null };
  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) throw new Error('Failed to get access token');

    const client = createGraphClient(token);
    const userPath = userPrincipalName ? `/users/${encodeURIComponent(userPrincipalName)}` : '/me';

    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setDate(end.getDate() + 7);

    const filter = `start/datetime ge '${start.toISOString()}' and end/datetime le '${end.toISOString()}'`;
    const eventsRes = await client.api(`${userPath}/calendar/events`).filter(filter).top(25).get();
    const events = eventsRes?.value || [];

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const formatEvent = (e) => ({
      subject: e.subject,
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location?.displayName,
      attendees: (e.attendees || []).map((a) => a.emailAddress?.name || a.emailAddress?.address).filter(Boolean),
    });
    result.todayEvents = events.filter((e) => {
      const startDt = new Date(e.start?.dateTime || e.start?.date);
      return startDt >= start && startDt <= todayEnd;
    }).map(formatEvent);

    result.upcoming = events.slice(0, 15).map(formatEvent);

    return result;
  } catch (err) {
    const normalized = normalizeAzureError(err);
    result.error = normalized.error;
    if (normalized.errorHint) result.errorHint = normalized.errorHint;
    return result;
  }
}

/**
 * Fetch upcoming calendar events (meetings) in a time range. Uses calendarView for reliable range queries.
 * @param {number} [nextHours=24] - window in hours from now
 * @param {number} [maxEvents=50] - max events to return
 * @param {string} [outlookTimezone] - e.g. "Eastern Standard Time" so response start/end are in that timezone
 * @returns {Promise<{ events: Array<{ id, subject, start, end, attendees, bodyPreview }>, error?: string }>}
 */
export async function fetchUpcomingCalendarEvents(tenantId, clientId, clientSecret, userPrincipalName = null, { nextHours = 24, maxEvents = 50, outlookTimezone = 'Eastern Standard Time' } = {}) {
  const result = { events: [], error: null };
  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) throw new Error('Failed to get access token');

    const client = createGraphClient(token);
    if (!userPrincipalName) {
      result.error = 'Calendar user (userPrincipalName) is required for application (client credentials) flow. Set it in Config → Companies → Teams or Calendar channel, or set Contact email in General.';
      return result;
    }
    const userPath = `/users/${encodeURIComponent(userPrincipalName)}`;

    const now = new Date();
    const end = new Date(now.getTime() + nextHours * 60 * 60 * 1000);
    const startIso = now.toISOString();
    const endIso = end.toISOString();

    const request = client
      .api(`${userPath}/calendar/calendarView`)
      .query({ startDateTime: startIso, endDateTime: endIso })
      .top(Math.min(maxEvents, 100));
    if (outlookTimezone) {
      request.header('Prefer', `outlook.timezone="${outlookTimezone}"`);
    }
    const eventsRes = await request.get();
    const raw = eventsRes?.value || [];

    const mapped = raw.map((e) => ({
      id: e.id || null,
      subject: e.subject || '(No subject)',
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
      location: e.location?.displayName || null,
      attendees: (e.attendees || []).map((a) => ({ name: a.emailAddress?.name, address: a.emailAddress?.address })).filter((a) => a.name || a.address),
      bodyPreview: (e.bodyPreview && e.bodyPreview.trim()) ? e.bodyPreview.trim() : null,
    }));
    result.events = mapped.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return result;
  } catch (err) {
    const normalized = normalizeAzureError(err);
    result.error = normalized.error;
    if (normalized.errorHint) result.errorHint = normalized.errorHint;
    return result;
  }
}

/**
 * Fetch calendar events that ended in the last N hours and have a Teams join URL (for transcript fetch).
 * Requires OnlineMeetingTranscript.Read.All for transcript APIs; calendarView uses existing Calendar.Read.
 * @param {number} [hoursAgo=4] - look back window
 * @returns {Promise<{ events: Array<{ id, subject, start, end, joinWebUrl }>, error?: string }>}
 */
export async function fetchPastCalendarEventsWithOnlineMeeting(tenantId, clientId, clientSecret, userPrincipalName, { hoursAgo = 4 } = {}) {
  const result = { events: [], error: null };
  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) throw new Error('Failed to get access token');
    if (!userPrincipalName) {
      result.error = 'userPrincipalName is required';
      return result;
    }
    const client = createGraphClient(token);
    const userPath = `/users/${encodeURIComponent(userPrincipalName)}`;
    const now = new Date();
    const start = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    const request = client
      .api(`${userPath}/calendar/calendarView`)
      .query({ startDateTime: start.toISOString(), endDateTime: now.toISOString() })
      .top(50);
    const eventsRes = await request.get();
    const raw = eventsRes?.value || [];
    const nowMs = now.getTime();
    for (const e of raw) {
      const endStr = e.end?.dateTime || e.end?.date;
      if (!endStr || new Date(endStr).getTime() > nowMs) continue;
      const joinUrl = e.onlineMeeting?.joinUrl || e.onlineMeetingUrl;
      if (!joinUrl || typeof joinUrl !== 'string') continue;
      result.events.push({
        id: e.id,
        subject: e.subject || '(No subject)',
        start: e.start?.dateTime || e.start?.date,
        end: endStr,
        joinWebUrl: joinUrl.trim(),
      });
    }
    return result;
  } catch (err) {
    const normalized = normalizeAzureError(err);
    result.error = normalized.error;
    if (normalized.errorHint) result.errorHint = normalized.errorHint;
    return result;
  }
}

/**
 * Resolve onlineMeetingId from join URL. Requires OnlineMeetingTranscript.Read.All / application access policy.
 */
export async function getOnlineMeetingIdByJoinWebUrl(tenantId, clientId, clientSecret, userPrincipalName, joinWebUrl) {
  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) throw new Error('Failed to get access token');
    const client = createGraphClient(token);
    const userPath = `/users/${encodeURIComponent(userPrincipalName)}`;
    const escaped = String(joinWebUrl).replace(/'/g, "''");
    const res = await client
      .api(`${userPath}/onlineMeetings`)
      .filter(`joinWebUrl eq '${escaped}'`)
      .top(1)
      .get();
    const value = res?.value?.[0];
    return value?.id || null;
  } catch (err) {
    return null;
  }
}

/**
 * List call transcripts for an online meeting. Requires OnlineMeetingTranscript.Read.All.
 */
export async function listMeetingTranscripts(tenantId, clientId, clientSecret, userPrincipalName, onlineMeetingId) {
  const result = { transcripts: [], error: null };
  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) throw new Error('Failed to get access token');
    const client = createGraphClient(token);
    const userPath = `/users/${encodeURIComponent(userPrincipalName)}`;
    const res = await client
      .api(`${userPath}/onlineMeetings/${encodeURIComponent(onlineMeetingId)}/transcripts`)
      .get();
    result.transcripts = (res?.value || []).map((t) => ({ id: t.id, createdDateTime: t.createdDateTime, endDateTime: t.endDateTime }));
    return result;
  } catch (err) {
    const normalized = normalizeAzureError(err);
    result.error = normalized.error;
    return result;
  }
}

/**
 * Get transcript content (VTT text). Requires OnlineMeetingTranscript.Read.All.
 */
export async function getTranscriptContent(tenantId, clientId, clientSecret, userPrincipalName, onlineMeetingId, transcriptId) {
  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) throw new Error('Failed to get access token');
    const client = createGraphClient(token);
    const userPath = `/users/${encodeURIComponent(userPrincipalName)}`;
    const url = `${userPath}/onlineMeetings/${encodeURIComponent(onlineMeetingId)}/transcripts/${encodeURIComponent(transcriptId)}/content`;
    const stream = await client.api(url).getStream();
    const chunks = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    const buf = Buffer.concat(chunks);
    return buf.toString('utf8');
  } catch (err) {
    return null;
  }
}

/**
 * Fetch SharePoint sites / recent files
 */
export async function fetchSharePointData(tenantId, clientId, clientSecret, sharePointUrl = null) {
  const result = { sites: [], recentFiles: [], error: null };
  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) throw new Error('Failed to get access token');

    const client = createGraphClient(token);

    // Get root site
    const siteRes = await client.api('/sites/root').get();
    result.sites.push({ name: siteRes?.displayName || 'Root', url: siteRes?.webUrl });

    // Get recent files (drive items) - use root if no user
    try {
      const drivePath = sharePointUrl ? '/sites/root/drive' : '/sites/root/drive';
      const driveRes = await client.api(`${drivePath}/recent`).get();
      const items = driveRes?.value || [];
      result.recentFiles = items.slice(0, 10).map((i) => ({
        name: i.name,
        lastModified: i.lastModifiedDateTime,
        webUrl: i.webUrl,
      }));
    } catch (_) {
      // Drive may not be available
    }

    return result;
  } catch (err) {
    const normalized = normalizeAzureError(err);
    result.error = normalized.error;
    if (normalized.errorHint) result.errorHint = normalized.errorHint;
    return result;
  }
}

/**
 * Get tenant monitoring scope counts for Config Dashboard - total users (emails) and Teams channels.
 * Used to cross-check with network admin's M365 counts.
 * userPrincipalName: required for Teams (gets teams/channels this user can access)
 */
export async function getTenantMonitoringCounts(tenantId, clientId, clientSecret, userPrincipalName, maxUsersFromConfig = 100) {
  const result = { userCount: 0, monitoredUserCount: 0, teamsCount: 0, channelsCount: 0, error: null };
  try {
    const token = await getAccessToken(tenantId, clientId, clientSecret);
    if (!token) throw new Error('Failed to get access token');

    const client = createGraphClient(token);

    // Total users in tenant (exclude guests)
    const usersRes = await client.api('/users').select('id,userPrincipalName').top(999).get();
    const users = usersRes?.value || [];
    const userCount = users.filter((u) => !(u.userPrincipalName || '').toLowerCase().includes('#ext#')).length;
    result.userCount = userCount;
    result._hasMoreUsers = users.length >= 999;
    result.monitoredUserCount = Math.min(userCount, maxUsersFromConfig);

    // Teams and channels (from configured user's perspective)
    if (userPrincipalName) {
      try {
        const teamsRes = await client.api(`/users/${encodeURIComponent(userPrincipalName)}/joinedTeams`).get();
        const teams = teamsRes?.value || [];
        result.teamsCount = teams.length;
        let channelsTotal = 0;
        for (const team of teams.slice(0, 50)) {
          try {
            const chRes = await client.api(`/teams/${team.id}/channels`).get();
            channelsTotal += (chRes?.value || []).length;
          } catch (_) {}
        }
        result.channelsCount = channelsTotal;
      } catch (_) {
        result.teamsCount = 0;
        result.channelsCount = 0;
      }
    }

    return result;
  } catch (err) {
    const normalized = normalizeAzureError(err);
    result.error = normalized.error;
    if (normalized.errorHint) result.errorHint = normalized.errorHint;
    return result;
  }
}
