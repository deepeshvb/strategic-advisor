# Email Setup – SendGrid (Easiest – No SMTP Password)

SendGrid uses an API key instead of SMTP passwords. Works with any recipient email.

## Steps

1. **Sign up**: https://signup.sendgrid.com/ (free tier: 100 emails/day)

2. **Create API key**:
   - SendGrid Dashboard → Settings → API Keys → Create API Key
   - Name it "Strategic Advisor", choose "Restricted Access" → Mail Send = Full
   - Copy the key (shown only once)

3. **Verify sender** (required for first send):
   - SendGrid Dashboard → Settings → Sender Authentication
   - Verify Single Sender: add your email (e.g. yourname@company.com)
   - SendGrid will email you a verification link

4. **Add to `.env.backend`**:

```env
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxx
SENDGRID_FROM=yourname@company.com
```

Use the same email you verified in step 3 for `SENDGRID_FROM`.

5. **Set your recipient email** in Config Dashboard → Contact Information → Email, then Save.

6. **Restart the backend** and test: http://localhost:3000/api/test/email-briefing
