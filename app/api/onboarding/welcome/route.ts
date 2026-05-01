import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, sendSMS } from '@/lib/notifications'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const email = body?.email
  const name = body?.name
  const company = body?.company
  const phone = body?.phone

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const firstName = name?.split(' ')[0] || 'there'
  const subject = `Welcome to Servaia, ${firstName} — Your 30-Day Free Trial Starts Now`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; color: #1a1a1a; line-height: 1.6; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 32px 16px; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .header { background: #0E1117; padding: 40px 32px; text-align: center; }
    .header .logo { font-size: 28px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; }
    .header .logo span { color: #C9A84C; }
    .header p { margin: 8px 0 0; color: #9ca3af; font-size: 15px; }
    .body { padding: 32px; }
    .greeting { font-size: 17px; margin-bottom: 16px; }
    .intro { color: #4b5563; font-size: 15px; margin-bottom: 32px; }
    .cta-block { background: #0E1117; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 32px; }
    .cta-block p { color: #9ca3af; font-size: 14px; margin: 0 0 16px; }
    .cta-btn { display: inline-block; background: #C9A84C; color: #0E1117; padding: 14px 28px; border-radius: 999px; font-weight: 700; font-size: 15px; text-decoration: none; }
    .section { margin-bottom: 28px; }
    .section-title { font-size: 16px; font-weight: 700; color: #0E1117; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
    .steps { list-style: none; padding: 0; margin: 0; }
    .steps li { display: flex; gap: 14px; padding: 12px 0; border-bottom: 1px solid #f3f4f6; }
    .steps li:last-child { border-bottom: none; }
    .step-num { width: 24px; font-weight: 700; font-size: 15px; color: #C9A84C; flex-shrink: 0; margin-top: 2px; }
    .step-content span { font-size: 13px; color: #6b7280; }
    .step-link { display: inline-block; margin-top: 6px; font-size: 12px; color: #4F8EF7; font-weight: 600; text-decoration: none; }
    .faq { background: #f9fafb; border-radius: 12px; padding: 24px; margin-bottom: 28px; }
    .faq-title { font-size: 16px; font-weight: 700; color: #0E1117; margin: 0 0 16px; }
    .faq-item { margin-bottom: 16px; }
    .faq-item:last-child { margin-bottom: 0; }
    .faq-q { font-size: 14px; font-weight: 600; color: #0E1117; margin-bottom: 4px; }
    .faq-a { font-size: 13px; color: #6b7280; }
    .crew-box { background: #eff6ff; border: 1px solid #dbeafe; border-radius: 12px; padding: 20px; margin-bottom: 28px; }
    .crew-box strong { display: block; font-size: 14px; color: #1e40af; margin-bottom: 6px; }
    .crew-box p { font-size: 13px; color: #3b82f6; margin: 0; }
    .pricing-box { background: #fefce8; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; margin-bottom: 28px; }
    .pricing-box strong { display: block; font-size: 14px; color: #92400e; margin-bottom: 6px; }
    .pricing-box p { font-size: 13px; color: #b45309; margin: 0; }
    .sig { font-size: 14px; color: #6b7280; border-top: 1px solid #f3f4f6; padding-top: 24px; margin-top: 8px; }
    .sig strong { color: #0E1117; }
    .footer { text-align: center; margin-top: 24px; }
    .footer p { font-size: 12px; color: #9ca3af; margin: 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="logo"><span>S</span>ervaia</div>
        <p>Get paid the moment the job's done</p>
      </div>
      <div class="body">

        <p class="greeting">Hey ${firstName} 👋</p>
        <p class="intro">
          Welcome to Servaia! Your account for <strong>${company || 'your business'}</strong> is live and your 30-day free trial has started.
          No monthly fee during your trial — you only pay standard transaction fees when you collect payments.
        </p>

        <div class="cta-block">
          <p>Your dashboard is ready. Let's get your first payment set up.</p>
          <a href="https://app.servaiapay.com/dashboard" class="cta-btn">Go to Your Dashboard →</a>
        </div>

        <!-- Onboarding Steps -->
        <div class="section">
          <div class="section-title">🚀 Get set up in 8 steps</div>
          <ul class="steps">
            <li>
              <div class="step-num">1</div>
              <div class="step-content">
                <strong>Connect your Stripe account</strong>
                <span>Required to collect payments. Takes 5 minutes — you'll need your bank details.</span>
                <a href="https://app.servaiapay.com/dashboard/settings/stripe-connect" class="step-link">Connect Stripe →</a>
              </div>
            </li>
            <li>
              <div class="step-num">2</div>
              <div class="step-content">
                <strong>Add your first customer</strong>
                <span>Name, phone, email, and service address. Takes 30 seconds.</span>
                <a href="https://app.servaiapay.com/dashboard/customers/new" class="step-link">Add Customer →</a>
              </div>
            </li>
            <li>
              <div class="step-num">3</div>
              <div class="step-content">
                <strong>Send a card authorization link</strong>
                <span>Your customer gets a text with a link to save their card on file. They do it once — you never ask again.</span>
                <a href="https://app.servaiapay.com/dashboard/customers" class="step-link">Go to Customers →</a>
              </div>
            </li>
            <li>
              <div class="step-num">4</div>
              <div class="step-content">
                <strong>Set up your service menu</strong>
                <span>Add the services you offer with default prices. You can override per customer anytime.</span>
                <a href="https://app.servaiapay.com/dashboard/settings" class="step-link">Open Settings →</a>
              </div>
            </li>
            <li>
              <div class="step-num">5</div>
              <div class="step-content">
                <strong>Schedule your first job</strong>
                <span>Assign a job to your crew with a date, time, and services. They'll see it on their phone.</span>
                <a href="https://app.servaiapay.com/dashboard/jobs/schedule" class="step-link">Schedule Job →</a>
              </div>
            </li>
            <li>
              <div class="step-num">6</div>
              <div class="step-content">
                <strong>Share the crew link with your team</strong>
                <span>Your crew goes to app.servaiapay.com/crew on their phone. They see their jobs, take photos, and mark done. That's it.</span>
              </div>
            </li>
            <li>
              <div class="step-num">7</div>
              <div class="step-content">
                <strong>Mark your first job done</strong>
                <span>Crew taps "Charge" — customer's card is charged automatically. Money hits your account same day.</span>
                <a href="https://app.servaiapay.com/dashboard/jobs" class="step-link">View Jobs →</a>
              </div>
            </li>
            <li>
              <div class="step-num">8</div>
              <div class="step-content">
                <strong>Invite your team members</strong>
                <span>Add crew and managers so they can log in and see their assigned jobs.</span>
                <a href="https://app.servaiapay.com/dashboard/team" class="step-link">Invite Team →</a>
              </div>
            </li>
          </ul>
        </div>

        <!-- Crew instructions box -->
        <div class="crew-box">
          <strong>📱 For your crew members</strong>
          <p>Tell them to go to <strong>app.servaiapay.com/crew</strong> on their phone and log in. They'll see today's jobs, can navigate to other dates, take job photos, and mark jobs done. That's all they need to do.</p>
        </div>

        <!-- FAQ -->
        <div class="faq">
          <div class="faq-title">❓ Common Questions</div>

          <div class="faq-item">
            <div class="faq-q">When does my customer's card get charged?</div>
            <div class="faq-a">The moment your crew marks the job done. Not before, not after. Automatic and instant.</div>
          </div>

          <div class="faq-item">
            <div class="faq-q">Does my customer need to do anything after saving their card?</div>
            <div class="faq-a">No. They save their card once and that's it. Every future job charges automatically — they just get an email receipt.</div>
          </div>

          <div class="faq-item">
            <div class="faq-q">What if a customer pays by cash or check?</div>
            <div class="faq-a">Set their payment method to "Cash/Check" when adding them. No card required — your crew marks the job done and you collect manually. Everything still gets tracked in your dashboard.</div>
          </div>

          <div class="faq-item">
            <div class="faq-q">How does my crew use Servaia?</div>
            <div class="faq-a">They go to app.servaiapay.com/crew on their phone. They see their scheduled jobs, can navigate by date, take completion photos, and tap to charge. No app download needed.</div>
          </div>

          <div class="faq-item">
            <div class="faq-q">When does the money hit my bank?</div>
            <div class="faq-a">Stripe typically deposits within 1-2 business days. Once your account is verified and active, payouts are automatic.</div>
          </div>

          <div class="faq-item">
            <div class="faq-q">Can I set different prices per customer?</div>
            <div class="faq-a">Yes. Each customer has their own pricing that overrides your default service menu. Go to any customer's detail page to set custom prices.</div>
          </div>

          <div class="faq-item">
            <div class="faq-q">What happens after my 30-day trial?</div>
            <div class="faq-a">You'll need to subscribe at $49/month to keep using Servaia. If you don't subscribe, your dashboard access is paused until you do. No charges happen automatically — you choose when to subscribe.</div>
          </div>

          <div class="faq-item">
            <div class="faq-q">Can I cancel anytime?</div>
            <div class="faq-a">Yes. No contracts, no cancellation fees. Cancel from your billing page anytime.</div>
          </div>

          <div class="faq-item">
            <div class="faq-q">Is there a surcharge I can pass to customers?</div>
            <div class="faq-a">Yes — optional. Go to Settings → Payment Settings to enable a card surcharge. Make sure it's permitted in your state before enabling.</div>
          </div>

          <div class="faq-item">
            <div class="faq-q">Something isn't working — what do I do?</div>
            <div class="faq-a">Reply to this email or email rick@servaiapay.com directly. We respond fast.</div>
          </div>
        </div>

        <!-- Pricing reminder -->
        <div class="pricing-box">
          <strong>💰 Your trial pricing</strong>
          <p>Free for 30 days. No monthly fee during your trial — you only pay 3.5% + $0.30 per transaction when you collect payments. After 30 days: $49/month + transaction fees. Early signups lock in $49/month forever.</p>
        </div>

        <div class="sig">
          Questions? Just reply to this email.<br><br>
          <strong>— Rick Carvalho</strong><br>
          Founder, Servaia<br>
          rick@servaiapay.com<br>
          <a href="https://calendly.com/rick-servaiapay" style="color: #4F8EF7; text-decoration: none;">Book a call →</a>
        </div>

      </div>
    </div>
    <div class="footer">
      <p>© 2026 Servaia · <a href="https://servaiapay.com/privacy" style="color: #9ca3af;">Privacy</a> · <a href="https://servaiapay.com/terms" style="color: #9ca3af;">Terms</a></p>
    </div>
  </div>
</body>
</html>
  `

  const { success, error } = await sendEmail({
    to: email,
    subject,
    html,
  })

  if (!success) {
    return NextResponse.json({ error: error || 'Failed to send welcome email' }, { status: 500 })
  }

  if (phone) {
    const smsBody = `Hey ${firstName}, welcome to Servaia! Your 30-day free trial is active. First step — connect your Stripe account: https://app.servaiapay.com/dashboard/settings/stripe-connect`
    await sendSMS({ to: phone, body: smsBody })
  }

  return NextResponse.json({ success: true })
}