import Link from 'next/link'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0E1117] text-white px-4 py-16">
      <div className="mx-auto max-w-4xl rounded-[28px] border border-white/10 bg-white/5 p-10 shadow-xl shadow-black/20 backdrop-blur-md">
        <div className="space-y-4">
          <h1 className="text-4xl font-semibold">Terms of Service</h1>
          <p className="text-slate-300">These terms govern your use of Servaia and our service offering.</p>
        </div>

        <section className="mt-10 space-y-6 text-slate-200">
          <div>
            <h2 className="text-xl font-semibold">Free trial</h2>
            <p className="mt-3 leading-8 text-slate-300">New accounts receive a 30-day free trial. No credit card is required at signup.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Subscription pricing</h2>
            <p className="mt-3 leading-8 text-slate-300">After the trial, the service is billed at $49 per month plus 3.5% + $0.30 per transaction.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Cancellation</h2>
            <p className="mt-3 leading-8 text-slate-300">Cancel anytime with no long-term contract. You retain access through the paid period and will not be billed further afterward.</p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Grandfathered pricing</h2>
            <p className="mt-3 leading-8 text-slate-300">Early signups will keep the $49/month rate permanently as long as their account remains active.</p>
          </div>
        </section>

        <div className="mt-10 border-t border-white/10 pt-6 text-sm text-slate-400 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/get-started" className="text-blue-300 hover:text-blue-100">Get started</Link>
          <Link href="/privacy" className="text-slate-300 hover:text-white">Privacy Policy</Link>
        </div>
      </div>
    </div>
  )
}
