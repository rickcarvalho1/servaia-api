import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function Home() {
  const industries = [
    'HVAC',
    'Plumbing',
    'Electrical',
    'Landscaping',
    'Pool Cleaning',
    'Handyman',
    'Pressure Washing',
    'Window Cleaning',
    'Gutter Cleaning',
    'Roofing',
    'Pest Control',
    'Carpet Cleaning',
    'House Cleaning',
    'Junk Removal',
    'Tree Service',
    'Painting',
    'Appliance Repair',
    'Garage Door Service',
    'Irrigation',
    'Snow Removal',
    'Auto Detailing',
    'Moving Services',
    'Locksmith',
    'Hardscaping',
  ]

  return (
    <div className="min-h-screen bg-ink text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-slate bg-ink/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold font-display tracking-tight">
            <span className="text-gold">S</span>ervaia
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-mist hover:text-white transition">
              How It Works
            </a>
            <a href="#pricing" className="text-mist hover:text-white transition">
              Pricing
            </a>
            <Link href="/login" className="text-mist hover:text-white transition">
              Login
            </Link>
          </div>
          <Link
            href="/get-started"
            className="bg-gold text-ink px-6 py-2 rounded-lg font-semibold hover:bg-gold/90 transition whitespace-nowrap"
          >
            Start Free Trial
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="text-center space-y-6">
          <h1 className="text-5xl md:text-6xl font-bold font-display leading-tight tracking-tight">
            Done with the wait.
          </h1>
          <p className="text-xl md:text-2xl text-mist max-w-3xl mx-auto leading-relaxed">
            Your crew marks the job done. The customer's card charges automatically. Money in your account — no invoice, no follow-up, no waiting.
          </p>
          <div className="pt-8">
            <Link
              href="/get-started"
              className="inline-block bg-gold text-ink px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gold/90 transition"
            >
              Start Your Free 30-Day Trial →
            </Link>
            <p className="text-mist text-sm mt-4">
              No credit card required. Cancel anytime.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-slate py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold font-display text-center mb-16">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: '1',
                title: 'Customer Saves Card',
                description: 'Your customer enters their card once. No invoices. No payment requests.',
              },
              {
                step: '2',
                title: 'Crew Marks Job Done',
                description: 'When the job is complete, your team marks it in the app.',
              },
              {
                step: '3',
                title: 'You Get Paid Instantly',
                description: 'The charge goes through automatically. Money in your account same day.',
              },
            ].map((item, idx) => (
              <div key={idx} className="space-y-4">
                <div className="w-12 h-12 bg-gold text-ink rounded-lg flex items-center justify-center font-bold text-xl">
                  {item.step}
                </div>
                <h3 className="text-2xl font-bold">{item.title}</h3>
                <p className="text-mist">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section className="max-w-7xl mx-auto px-6 py-20 md:py-28">
        <h2 className="text-4xl md:text-5xl font-bold font-display text-center mb-16">
          Built for Your Industry
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {industries.map((industry) => (
            <div
              key={industry}
              className="bg-slate border border-slate hover:border-gold rounded-lg px-4 py-3 text-center transition"
            >
              <p className="font-semibold text-white">{industry}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-slate py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold font-display text-center mb-6">
            Simple pricing. No surprises.
          </h2>
          <div className="max-w-2xl mx-auto bg-ink border border-slate rounded-2xl p-8 md:p-12 space-y-8">
            <div className="space-y-2">
              <div className="text-5xl font-bold">
                <span className="text-gold">$49</span>
                <span className="text-2xl text-mist">/month</span>
              </div>
              <p className="text-mist">Plus 3.5% per transaction</p>
            </div>

            <div className="space-y-4">
              {[
                '30-day free trial',
                'No credit card required',
                'Cancel anytime',
                'No contracts',
                'Lock in $49/month forever',
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-gold flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <p className="text-center text-mist italic">
              Sign up today and lock in $49/month forever.
            </p>

            <Link
              href="/get-started"
              className="block w-full bg-gold text-ink py-4 rounded-lg font-semibold text-center hover:bg-gold/90 transition text-lg"
            >
              Start Your Free 30-Day Trial
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate bg-ink py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-2xl font-bold font-display">
              <span className="text-gold">S</span>ervaia
            </div>
            <div className="flex items-center gap-8">
              <Link href="/privacy" className="text-mist hover:text-white transition">
                Privacy
              </Link>
              <Link href="/terms" className="text-mist hover:text-white transition">
                Terms
              </Link>
            </div>
            <p className="text-mist text-sm">© 2026 Servaia</p>
          </div>
        </div>
      </footer>
    </div>
  )
}