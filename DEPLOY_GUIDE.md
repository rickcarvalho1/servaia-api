# Session 9 - Stripe Live Mode & Final Deployment

## What's Been Built

### 1. Marketing Landing Page (`/`)
- Full-featured landing page with hero, how-it-works, industries, pricing, footer
- All CTAs link to `/get-started`
- Pricing clearly shows $49/month + 3.5% transaction fee
- 30-day free trial messaging throughout

### 2. Logo Assets
- `public/logo-dark.svg` — Dark version (navy S, dark text)
- `public/logo-light.svg` — Light version (gold S, white text)
- `public/icon.svg` — Favicon (navy square, gold S)

### 3. Onboarding & Welcome Emails
- **Signup flow** automatically:
  - Sets `trial_ends_at` to 30 days from signup
  - Sets `subscription_status` to 'trial'
  - Sends welcome email from rick@servaiapay.com
  - Sends welcome SMS (if phone provided)
- **Welcome email** includes:
  - Personalized greeting
  - Stripe connect CTA
  - Dashboard link
  - Trial details & features
  - Grandfather clause info

### 4. Trial & Subscription Management
- **Dashboard banner** shows when trial < 5 days
- **Dashboard banner** shows when trial expired and not subscribed
- **Billing page** (`/dashboard/billing`):
  - Shows trial countdown
  - Shows pricing details
  - Button to start subscription
  - Subscription status display
- **Subscription API** (`/api/stripe/subscription/create`):
  - Creates Stripe Checkout session for $49/month
  - Redirects to Stripe for payment
- **Webhook handler** updates status to 'active' when subscription completes
- **Job completion** blocked if trial expired and not subscribed

### 5. Database Migrations
- `trial_ends_at` — When free trial expires
- `subscription_status` — 'trial' or 'active'
- `stripe_customer_id` — For subscription management

## What Still Needs Configuration

### 1. Stripe Setup
You need to:
1. Create a **Product** in Stripe called "Servaia Monthly"
2. Create a **Price** of $49/month (recurring)
3. Copy the **Price ID** (format: `price_xxx`)

Then set in `.env.local`:
```
STRIPE_MONTHLY_PRICE_ID=price_xxx
```

### 2. Switch Keys from Test to Live
In `.env.local`, change:
```
# FROM:
STRIPE_PUBLIC_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_test_xxx

# TO:
STRIPE_PUBLIC_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxx
```

### 3. Vercel Environment Variables
Deploy to Vercel and set these Production env vars:
```
STRIPE_PUBLIC_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_live_xxx
STRIPE_MONTHLY_PRICE_ID=price_xxx
RESEND_API_KEY=re_xxxxx
RESEND_FROM_EMAIL=rick@servaiapay.com
RESEND_FROM_DOMAIN=servaiapay.com
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx
NEXT_PUBLIC_APP_URL=https://app.servaiapay.com
```

### 4. Domain Setup
1. Point `servaiapay.com` to Vercel deployment
2. Or use Vercel's domain management

### 5. Stripe Webhook
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint:
   - URL: `https://app.servaiapay.com/api/webhook/stripe`
   - Events: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
3. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

## Pre-Launch Checklist

- [ ] Stripe Product created with correct pricing
- [ ] All Stripe keys switched to live
- [ ] Stripe webhook configured
- [ ] Vercel env vars set for production
- [ ] Domain pointing to app.servaiapay.com
- [ ] Test signup flow creates trial correctly
- [ ] Test welcome email sends correctly
- [ ] Test welcome SMS sends correctly (if configured)
- [ ] Test subscription creation flow
- [ ] Test job blocking when trial expired
- [ ] Database migrations applied

## Testing in Production

### Quick Smoke Test
1. Visit https://app.servaiapay.com
2. Click "Start Free Trial"
3. Fill signup form and submit
4. Should redirect to dashboard
5. Check email for welcome message
6. Check SMS for welcome text
7. Go to /dashboard/billing
8. Click "Start Subscription Now"
9. Complete Stripe checkout
10. Should see "Subscription activated!" message

## Post-Launch Monitoring

- [ ] Monitor Stripe dashboard for transactions
- [ ] Check email delivery (Resend analytics)
- [ ] Check SMS delivery (Twilio logs)
- [ ] Monitor app errors (Vercel logs)
- [ ] Check webhook processing (Stripe logs)

## Future Tasks

Once live:
1. **Trial reminders** — Set up cron jobs for day 25, 28, 30 SMS
2. **Invoice generation** — Send monthly invoices to customers
3. **Subscription renewal** — Auto-charge monthly subscription
4. **Analytics** — Track conversion from trial to paid
5. **Customer support** — Set up help desk for billing questions
