# Email Setup – Outlook 365 / Microsoft 365

For business email (e.g. yourname@company.com via Outlook 365), add these to `.env.backend`:

```env
# Outlook 365 / Microsoft 365
EMAIL_USER=yourname@yourcompany.com
EMAIL_PASSWORD=your_account_password_or_app_password
EMAIL_PROVIDER=outlook
```

## Steps

1. **Use your full email address**  
   `EMAIL_USER` must be your full Microsoft 365 address (e.g. `deepesh@jerseytechpartners.com`).

2. **Use your password**  
   - **Without MFA:** Your normal account password  
   - **With MFA:** An [App Password](https://support.microsoft.com/en-us/account-billing/create-app-passwords-from-the-security-info-preview-a599edc5-73f9-4d02-8d51-c6f757f6e2bc) from Microsoft account security settings

3. **Enable SMTP if needed**  
   Some tenants disable SMTP. An admin may need to run in Exchange Online PowerShell:

   ```powershell
   Set-TransportConfig -SmtpClientAuthenticationDisabled $false
   Set-CASMailbox -Identity yourname@company.com -SmtpClientAuthenticationDisabled $false
   ```

4. **Restart the backend**  
   After editing `.env.backend`, restart the backend service.

## Testing

Open: `http://localhost:3000/api/test/email-briefing`

If you see a success message, check your inbox for the briefing.

## Troubleshooting

- **"Authentication unsuccessful"** – SMTP auth may be disabled for your tenant; ask IT to enable it.
- **"Connection refused"** – Firewall or network may block port 587.
- **"Invalid login"** – Use an App Password if MFA is enabled.
