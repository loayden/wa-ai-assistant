# Kallem Pro Setup Guide

This guide is for buyers of the Pro Source Code package. It explains the required third-party setup to run and deploy Kallem.

Kallem is source code only. It does not include API keys, Meta approvals, OpenAI credits, Paymob live keys, Supabase hosting, Vercel hosting, or production business verification.

## 1. Requirements

- Node.js 20+
- pnpm
- Supabase project
- Vercel account
- OpenAI API account with billing enabled
- Meta Developer app
- WhatsApp Business setup
- Facebook Page for Messenger
- Instagram Professional account linked to the Facebook Page
- Paymob merchant account for billing

## 2. Local Setup

Install dependencies:

```bash
pnpm install
```

Create environment file:

```bash
cp .env.example .env.local
```

Fill `.env.local` with your own development keys. Do not commit real secrets.

Run the app:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

## 3. Database Setup

Create a Supabase project, then copy:

- Project URL
- Anon key
- Service role key
- Database URL
- Direct database URL

Apply Prisma migrations:

```bash
pnpm prisma migrate deploy
```

Generate Prisma client:

```bash
pnpm prisma generate
```

For production, back up your database before applying migrations.

## 4. Supabase Auth Setup

In Supabase Auth settings:

- Site URL: your production domain
- Redirect URLs:
  - `https://your-domain.com/**`
  - `https://your-domain.com/login`
  - `http://localhost:3000/**`

For production email delivery, configure SMTP with a verified email domain. Do not use placeholder emails such as `noreply@example.com`.

## 5. OpenAI Setup

Create an OpenAI API key and enable billing.

Required environment variables:

```text
OPENAI_API_KEY=
OPENAI_MODEL=
```

Recommended starting model:

```text
gpt-4o-mini
```

Without OpenAI billing or quota, AI auto-replies will fail.

## 6. Meta Setup

Create a Meta Developer app and configure:

- Facebook Login for Business
- Webhooks
- WhatsApp Business product
- Messenger permissions
- Instagram messaging permissions

Required permissions may include:

```text
pages_show_list
pages_messaging
pages_manage_metadata
pages_read_engagement
instagram_basic
instagram_manage_messages
business_management
```

Production use requires Meta App Review approval for Messenger and Instagram DMs.

## 7. WhatsApp Business Setup

For testing, Meta test numbers only work with approved test recipients.

For real customers, connect a production WhatsApp Business phone number.

Webhook URL:

```text
https://your-domain.com/api/webhooks/whatsapp
```

Verify token must match your environment variable:

```text
META_VERIFY_TOKEN=
```

## 8. Messenger and Instagram Setup

Messenger requires a Facebook Page.

Instagram requires:

- Instagram Professional account
- Linked Facebook Page
- Approved Instagram messaging permissions

Webhook URL:

```text
https://your-domain.com/api/webhooks/meta
```

After connecting, test:

- Messenger inbound message
- Messenger auto-reply
- Instagram DM inbound message
- Instagram auto-reply

## 9. Paymob Setup

Create a Paymob merchant account and add production keys to Vercel.

Required environment variables:

```text
PAYMOB_PUBLIC_KEY=
PAYMOB_SECRET_KEY=
PAYMOB_API_KEY=
PAYMOB_HMAC_SECRET=
PAYMOB_CARD_INTEGRATION_ID=
PAYMOB_CURRENCY=EGP
PAYMOB_PRO_AMOUNT_CENTS=
PAYMOB_BUSINESS_AMOUNT_CENTS=
```

The app disables checkout when Paymob appears to be in test mode.

Run a small controlled live payment test before accepting customers.

## 10. Vercel Deployment

Push the project to GitHub and import it into Vercel.

Add all production environment variables in:

```text
Vercel Project > Settings > Environment Variables
```

Deploy from the main branch.

After deployment, test:

- Signup
- Login
- Google login if enabled
- Connect channels
- AI test reply
- Payment checkout
- Webhooks
- Readiness page

## 11. Production Readiness Checklist

Before selling Kallem to real customers:

- OpenAI billing is active.
- Supabase Auth URLs are correct.
- Supabase SMTP is configured with a verified sender domain.
- Meta App Review is approved for public users.
- WhatsApp uses a production phone number.
- Messenger Page webhook is subscribed.
- Instagram Professional account is linked to the Facebook Page.
- Paymob live keys are configured.
- A live payment test is completed.
- The readiness page is checked.
- Error monitoring/logging is reviewed.

## 12. Security Notes

Never expose or commit:

- `.env`
- `.env.local`
- OpenAI keys
- Supabase service role key
- Meta app secret
- Paymob keys
- Resend keys
- Vercel tokens

Use `.env.example` only for placeholders.

## 13. Buyer Notes

This code is a strong production-grade starting point, but every deployment depends on the buyer's own third-party accounts, approvals, billing, domains, and hosting setup.

Meta approvals, OpenAI billing, Paymob activation, and verified email sending cannot be included inside source code.
