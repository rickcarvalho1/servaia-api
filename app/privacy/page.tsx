import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0E1117] text-white px-4 py-16">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-white/5 p-10 shadow-xl shadow-black/20 backdrop-blur-md">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold">Privacy Policy</h1>
          <p className="text-slate-300">Servaia is committed to protecting your privacy and handling your data responsibly.</p>
        </div>

        <section className="mt-10 space-y-6 text-slate-200">
          <div>
            <h2 className="text-xl font-semibold">Data collection</h2>
            <p className="mt-3 leading-8 text-slate-300">We collect the information needed to create and operate your account, including business details, owner contact information, and any customer data entered into the platform.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Stripe payments</h2>
            <p className="mt-3 leading-8 text-slate-300">Payments are processed through Stripe. We do not store card details on our servers. Stripe handles payment authorization and secure card storage.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">SMS and email communications</h2>
            <p className="mt-3 leading-8 text-slate-300">We may send emails and text messages related to account activity, service notifications, and transaction updates. You can manage communication preferences from your dashboard.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Data retention</h2>
            <p className="mt-3 leading-8 text-slate-300">We retain your information as long as your account exists and as needed to provide the service, comply with legal obligations, and resolve disputes.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Contact</h2>
            <p className="mt-3 leading-8 text-slate-300">Servaia | Contact: <a href="mailto:rickcarvalho1@gmail.com" className="text-blue-300 hover:text-blue-200">rickcarvalho1@gmail.com</a></p>
          </div>
        </section>

        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/get-started" className="text-blue-300 hover:text-blue-100">Get started</Link>
          <Link href="/terms" className="text-slate-300 hover:text-white">Terms of Service</Link>
        </div>
      </div>
    </div>
  )
}
