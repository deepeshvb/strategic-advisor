# Strategic Advisor – Channel Configuration Request

**To:** IT Administrator  
**From:** [Your Name]  
**Date:** [Date]  
**Purpose:** Please fill in the values below and return this document so I can configure the Strategic Advisor monitoring channels for Microsoft 365, Teams, SharePoint, and Email.

---

## How to Use This Document

1. Send this file to your IT admin.
2. Admin fills in the values in the right-hand column of each table.
3. Admin returns the completed document to you.
4. Use the values to configure channels in the Strategic Advisor Config UI (Settings → Companies → Configure for each channel).

---

## 1. Microsoft Teams

| Field | Value (admin to fill) |
|-------|----------------------|
| Azure Application (client) ID | |
| Azure Client Secret | |
| Azure Directory (tenant) ID | |
| Admin consent granted? (Yes/No) | |

**Permissions required:** Channel.ReadBasic.All, ChannelMessage.Read.All, Chat.Read.All, ChatMessage.Read.All, Team.ReadBasic.All, TeamMember.Read.All, User.Read.All

---

## 2. SharePoint / OneDrive (Documents)

| Field | Value (admin to fill) |
|-------|----------------------|
| Company SharePoint URL (e.g. https://company.sharepoint.com) | |
| Azure Application ID (can reuse from Teams) | |
| Azure Client Secret (can reuse from Teams) | |
| Azure Tenant ID (can reuse from Teams) | |
| Admin consent granted? (Yes/No) | |

**Permissions required:** Sites.Read.All, Files.Read.All

---

## 3. Microsoft 365 Calendar

| Field | Value (admin to fill) |
|-------|----------------------|
| Azure Application ID (can reuse from Teams) | |
| Azure Client Secret (can reuse from Teams) | |
| Azure Tenant ID (can reuse from Teams) | |
| Admin consent granted? (Yes/No) | |

**Permissions required:** Calendars.Read, User.Read.All

---

## 4. Corporate Email (Microsoft Exchange/Outlook)

| Field | Value (admin to fill) |
|-------|----------------------|
| Service account email (e.g. strategic-monitor@company.com) | |
| App password or service account password | |
| Exchange server (usually outlook.office365.com) | |
| ApplicationImpersonation role assigned? (Yes/No) | |

**For "Monitor all employee mailboxes" (CEO visibility into threads where they're not copied):**  
Add **Mail.Read** (Application) and **User.ReadBasic.All** (Application) to the Azure app. Grant admin consent.

---

## 5. Notes / Additional Info

| Field | Value (admin to fill) |
|-------|----------------------|
| Any restrictions or conditions? | |
| Secret expiration date (if applicable) | |
| Contact for questions | |

---

## Instructions for Admin

**Option A – Single Azure app (recommended)**  
Create one Azure AD app with all Teams, SharePoint, and Calendar permissions. Use the same App ID, Client Secret, and Tenant ID for those three channels.

**Option B – Separate apps**  
You may create separate apps per channel if preferred. Fill in the corresponding sections with the appropriate credentials.

**Where to create:** Azure Portal → Azure Active Directory → App registrations → New registration

**Admin consent:** After adding Microsoft Graph API permissions, click **Grant admin consent for [Organization]**.

---

*Return this document (with values filled in) to the requester.*
