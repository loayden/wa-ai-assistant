# Manual Production Actions

These items cannot be completed safely from code alone. Finish them before opening kallem to public customers.

## Critical

1. Replace Paymob test keys with live production keys in Vercel.
   - Current code disables checkout when keys look like test keys.
   - Update `PAYMOB_PUBLIC_KEY`, `PAYMOB_SECRET_KEY`, `PAYMOB_HMAC_SECRET`, and `PAYMOB_CARD_INTEGRATION_ID`.

2. Fix OpenAI billing/quota.
   - The app now hides provider details from users, but production replies still need an active funded OpenAI account.
   - Verify `OPENAI_API_KEY` and `OPENAI_MODEL` in Vercel.

3. Complete Meta App Review.
   - Messenger needs approved page messaging permissions for public users.
   - Instagram DMs need Meta approval before the Instagram card should be enabled for customers.

4. Use a production WhatsApp Business number.
   - A Meta test number can only message approved test recipients.
   - Real customers need a verified production WhatsApp Business phone number.

## Branding and Auth

5. Update Google OAuth branding.
   - Configure the OAuth consent screen and authorized domains so customers see kallem branding, not the Supabase project domain.
   - Confirm redirect URLs include the production app URL.

6. Review Supabase auth email templates.
   - Ensure signup, magic link, and reset-password emails use the kallem name and production URLs.

## Final Checks

7. Run a full payment test with live Paymob in a controlled account.
8. Confirm Meta webhooks are subscribed after connecting a production page/phone.
9. Test first-time signup, wrong password, WhatsApp connect, Messenger connect, and support ticket creation in a clean browser.
