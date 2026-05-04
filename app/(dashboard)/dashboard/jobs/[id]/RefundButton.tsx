'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RefundButton({
  jobId,
  stripeChargeId,
  amount,
}: {
  jobId: string
  stripeChargeId: string
  amount: number
}) {
  const router = useRouter()
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRefund() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/jobs/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, stripeChargeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Refund failed')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  if (!showConfirm) {
    return (
      <button
        onClick={() => setShowConfirm(true)}
        className="text-sm text-[#E05252] hover:text-red-600 font-medium transition-colors">
        Issue Refund
      </button>
    )
  }

  return (
    <div className="bg-[rgba(224,82,82,0.05)] border border-[rgba(224,82,82,0.2)] rounded-xl p-4">
      <p className="text-sm font-semibold text-[#0E1117] mb-1">Issue full refund?</p>
      <p className="text-xs text-[#6B7490] mb-4">
        ${amount.toFixed(2)} will be refunded to the customer's card. This cannot be undone.
      </p>
      {error && (
        <p className="text-xs text-[#E05252] mb-3">{error}</p>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => setShowConfirm(false)}
          className="flex-1 py-2 border border-[#DDE1EC] text-[#6B7490] text-sm rounded-lg hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={handleRefund}
          disabled={loading}
          className="flex-1 py-2 bg-[#E05252] text-white text-sm font-semibold rounded-lg hover:bg-red-600 disabled:opacity-50">
          {loading ? 'Refunding...' : 'Confirm Refund'}
        </button>
      </div>
    </div>
  )
}