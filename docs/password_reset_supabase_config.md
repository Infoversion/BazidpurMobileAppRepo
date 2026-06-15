# Password Reset — Supabase Configuration

The forgot-password flow (web and mobile) is fully implemented in code:

- Web `POST /api/auth/forgot-password` generates a Supabase recovery link
  via `auth.admin.generateLink({ type: 'recovery' })` and sends a branded
  email from **support@bazidpur.com** via Resend.
- Mobile `(auth)/forgot-password.tsx` posts to the same endpoint.
- Web `/auth/reset-password` page processes either the URL hash
  (`#access_token=…`) or the PKCE `?code=` query param, then lets the user
  set a new password and signs them out so they have to sign in fresh.

**Two one-time tweaks are required in the Supabase project dashboard** so
the recovery link actually lands on the reset page (not the home page):

1. **Authentication → URL Configuration → Site URL** → set to
   `https://www.bazidpur.com` (use the **www** variant — not the apex).

   The apex `https://bazidpur.com` 308-redirects to www, and on most
   browsers a 308 redirect drops the URL fragment, which is where Supabase
   embeds the `#access_token=…` recovery token. Using the www host
   directly keeps the chain to a single hop and preserves the token.

2. **Authentication → URL Configuration → Redirect URLs** → add both:
   - `https://www.bazidpur.com/auth/reset-password`
   - `https://bazidpur.com/auth/reset-password` (defensive — some mail
     clients rewrite URLs before the user clicks)

Without (2) Supabase falls back to the Site URL (the landing page) after
verifying the recovery token, which is the symptom that was reported.

## Optional clean-up

The previous flow used `supabase.auth.resetPasswordForEmail()` which sent
the bare Supabase Auth template. Now that we use Resend, the Supabase
"Reset Password" email template doesn't matter — but you can still edit
it in **Authentication → Email Templates → Reset Password** if anything
else in the app ever calls `resetPasswordForEmail()` directly.

## Suspended members

The endpoint silently no-ops for suspended members so an offender can't
use the forgot-password flow to bounce back in after a suspension. The
log entry `auth.forgot_password.suspended` records each such attempt.
