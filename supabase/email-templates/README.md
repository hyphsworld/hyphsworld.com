# HYPHSWORLD authentication emails

These HTML files are for the hosted Supabase project's Authentication → Email Templates. Resend delivers the messages through the existing SMTP integration.

**Activated in production on October 6, 2026 UTC with explicit owner authorization.** All three hosted subjects and complete HTML bodies were re-opened and matched to these files. The existing redirect allow list covers account.html and update-password.html. Original templates were retained for rollback. Live mailbox and end-to-end login/recovery tests are still pending.

Merging repository files does not activate hosted templates; activation was performed separately in the dashboard. Hosted Auth templates are separate from repository files. There is no new Auth hook, migration, SMTP credential, or frontend auth-flow change.

| Supabase template | File | Subject |
| --- | --- | --- |
| Confirm signup | confirmation.html | Confirm your HYPHSWORLD ID |
| Magic Link | magic-link.html | Your HYPHSWORLD sign-in link |
| Reset Password | recovery.html | Reset your HYPHSWORLD password |

## Activate in project yuhxtdkhsltaqiagrtys

1. Record the existing subjects and HTML in a private location so they can be restored.
2. Open Authentication → Email Templates in the Supabase dashboard.
3. For each row above, paste the matching HTML and subject, then save.
4. Keep the existing SMTP credentials and sender settings. Confirm the sender name is HYPHSWORLD and sending address is no-reply@auth.hyphsworld.com before changing any sender setting.
5. Confirm the Auth redirect allow list includes these exact production URLs without replacing other entries:
   - https://hyphsworld.com/account.html
   - https://hyphsworld.com/update-password.html
6. Keep Resend click tracking disabled for auth.hyphsworld.com.

All actionable links use `{{ .ConfirmationURL }}`. Supabase generates the verification URL and retains the redirect passed by the existing client; a plain account URL must not replace it. Signup and magic links currently request account.html; password recovery requests update-password.html. Expiry copy does not promise a duration that has not been verified in the project settings.

## Verify after activation

Use an owner-approved test account and recipient. Do not send test mail to other users.

- Signup: email has the new subject and branding, confirmation opens account.html, and the account is confirmed.
- Magic link: existing account signs in, opens account.html, and retains its profile and Cool Points.
- Recovery: link opens update-password.html, permits a new password, and the new password signs in to the same account.
- Reused/expired links: no fresh access is granted; the user can request a new email.
- Check Resend delivery events and mailbox appearance on iPhone and desktop, including dark mode. A delivered event alone does not establish inbox placement or successful sign-in.

## Validation performed before activation

Reviewed current auth-client.js and password-reset.js redirect values and confirmed both destination files exist. Templates use inline styles, presentation tables, meaningful link labels, lang/dir, titles, and high-contrast text. No remote images, scripts, tracking links, user metadata, or secrets are embedded.

As of October 6, 2026 UTC, all 18 messages returned by the recent Resend email listing were marked delivered. This is historical evidence for the current setup, not a live test of these new templates.

The connected Supabase MCP tools cannot read or write hosted Auth email template settings. Dashboard access or an authorized Management API token is required for activation and readback.

References:
- https://supabase.com/docs/guides/auth/auth-email-templates
- https://supabase.com/docs/guides/auth/auth-smtp
