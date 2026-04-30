# Session 9 Build - Testing & Deployment Checklist

## Environment Variables Needed

### Resend Email
```
RESEND_API_KEY=<your_resend_key>
RESEND_FROM_EMAIL=rick@servaiapay.com
RESEND_FROM_DOMAIN=servaiapay.com
```

### Twilio SMS
```
TWILIO_ACCOUNT_SID=<your_sid>
TWILIO_AUTH_TOKEN=<your_token>
TWILIO_PHONE_NUMBER=<your_twilio_number>
```

### Stripe (Sandbox → Live)
```
STRIPE_PUBLIC_KEY=pk_live_... (currently pk_test_...)
STRIPE_SECRET_KEY=sk_live_... (currently sk_test_...)
STRIPE_WEBHOOK_SECRET=whsec_... (needs live key)
STRIPE_MONTHLY_PRICE_ID=price_... (Stripe product ID for $49/month)
```

### App URLs
```
NEXT_PUBLIC_APP_URL=https://app.servaiapay.com
```

## End-to-End Test Flow

### Phase 1: Signup & Trial Creation
- [ ] User visits servaiapay.com (root page with marketing landing)
- [ ] Click "Start Free Trial" → /get-started
- [ ] Complete onboarding form
- [ ] Check database: trial_ends_at set to 30 days from now
- [ ] Check database: subscription_status = 'trial'

### Phase 2: Welcome Notifications
- [ ] Welcome email received (rick@servaiapay.com as from)
- [ ] Email includes Stripe connect CTA, dashboard link, trial info
- [ ] Welcome SMS received (if phone provided)
- [ ] SMS includes dashboard link

### Phase 3: Dashboard & Trial Status
- [ ] Login to dashboard
- [ ] Trial countdown shows correct days remaining
- [ ] When trial < 5 days: Warning banner appears with "View Billing" link
- [ ] When trial expired: Error banner appears with "Subscribe Now" link

### Phase 4: Billing Page
- [ ] Navigate to /dashboard/billing
- [ ] See trial status with days remaining
- [ ] See pricing: $49/month + 3.5% per transaction
- [ ] See features list and grandfather clause info
- [ ] Click "Start Subscription Now"

### Phase 5: Stripe Checkout
- [ ] Redirected to Stripe Checkout session
- [ ] Can enter card details
- [ ] Complete payment
- [ ] Returned to /dashboard/billing?success=true
- [ ] Database updated: subscription_status = 'active'
- [ ] Success banner shows "Subscription activated!"

### Phase 6: Job Completion (Trial Active)
- [ ] Add customer and mark job complete
- [ ] Payment processes normally
- [ ] Customer receives SMS receipt
- [ ] Customer receives email receipt

### Phase 7: Job Completion (Trial Expired, Not Subscribed)
- [ ] Manually set trial_ends_at to past date in database
- [ ] Set subscription_status = 'trial'
- [ ] Try to mark job complete
- [ ] Get error: "Your trial has ended. Please subscribe to continue"
- [ ] Cannot process payment

### Phase 8: Job Completion (Trial Expired, Subscribed)
- [ ] Set subscription_status = 'active'
- [ ] Try to mark job complete
- [ ] Payment processes normally ✅

## Deployment Checklist

### Pre-Launch
- [ ] All Stripe keys switched from test to live
- [ ] Resend API key configured for production
- [ ] Twilio keys configured
- [ ] Database migrations applied
- [ ] Domain pointed to app.servaiapay.com
- [ ] SSL certificate configured

### Post-Launch Monitoring
- [ ] Monitor Stripe dashboard for charges
- [ ] Monitor email delivery rate (Resend)
- [ ] Monitor SMS delivery (Twilio logs)
- [ ] Check error logs for failures
- [ ] Verify webhook processing for subscriptions

## Notes

1. **Trial Setup**: When user signs up, the onboarding flow should call an API that:
   - Sets trial_ends_at to 30 days from current date
   - Sets subscription_status to 'trial'
   - Sends welcome email
   - Sends welcome SMS (if phone)

2. **Cron Jobs Needed** (for future):
   - Day 25: Send trial reminder SMS "5 days left in trial"
   - Day 28: Send trial reminder SMS "2 days left in trial"
   - Day 30: Send trial expiry SMS "Trial ends today — subscribe now"

3. **Stripe Setup**:
   - Create product "Servaia Monthly" with price $49/month
   - Copy price ID to STRIPE_MONTHLY_PRICE_ID
   - Enable webhook for checkout.session.completed
   - Set webhook URL to /api/webhook/stripe

4. **Grandfather Clause Implementation**:
   - All signups during launch phase lock in $49/month forever
   - Store `early_adopter: true` on signup
   - Future price increases don't apply to early adopters
