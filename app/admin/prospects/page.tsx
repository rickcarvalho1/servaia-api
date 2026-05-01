'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

const INDUSTRIES = [
  'HVAC', 'Landscaping', 'Hardscaping', 'Auto Detail',
  'Plumbing', 'Electrical', 'Pool Service', 'Pest Control', 'Cleaning', 'Other'
]

const SOURCES = ['Warm Contact', 'Cold Outreach', 'Referral', 'Social Media', 'Other']

const STATUSES = ['New', 'Contacted', 'Replied', 'Demo Booked', 'Signed Up', 'Dead']

const STATUS_COLORS: Record<string, string> = {
  'New': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Contacted': 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  'Replied': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Demo Booked': 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Signed Up': 'bg-green-500/10 text-green-400 border-green-500/20',
  'Dead': 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

type Prospect = {
  id: string
  created_at: string
  business_name: string
  owner_name: string
  phone: string
  email: string
  industry: string
  notes: string
  source: string
  status: string
  sequence_active: boolean
}

type Reply = {
  id: string
  created_at: string
  from_phone: string
  message: string
  read: boolean
  prospect_id: string
}

export default function ProspectsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const router = useRouter()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [replies, setReplies] = useState<Reply[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'prospects' | 'replies'>('prospects')

  const [form, setForm] = useState({
    business_name: '',
    owner_name: '',
    phone: '',
    email: '',
    industry: 'HVAC',
    notes: '',
    source: 'Warm Contact',
  })

  useEffect(() => {
    checkAuth()
    loadData()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || user.email !== 'rickcarvalho1@gmail.com') {
      router.push('/dashboard')
    }
  }

  async function loadData() {
    setLoading(true)
    const [{ data: p }, { data: r }] = await Promise.all([
      supabase.from('prospects').select('*').order('created_at', { ascending: false }),
      supabase.from('prospect_replies').select('*').order('created_at', { ascending: false }),
    ])
    setProspects(p || [])
    setReplies(r || [])
    setLoading(false)
  }

  async function addProspect() {
    if (!form.business_name || !form.owner_name || !form.phone) return
    setSaving(true)
    const res = await fetch('/api/admin/prospects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({ business_name: '', owner_name: '', phone: '', email: '', industry: 'HVAC', notes: '', source: 'Warm Contact' })
      setShowForm(false)
      loadData()
    }
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('prospects').update({ status }).eq('id', id)
    setProspects(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  async function markReplyRead(id: string) {
    await supabase.from('prospect_replies').update({ read: true }).eq('id', id)
    setReplies(prev => prev.map(r => r.id === id ? { ...r, read: true } : r))
  }

  const unreadCount = replies.filter(r => !r.read).length

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-400 text-sm">Loading prospects...</div>
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Prospect CRM</h1>
          <p className="text-gray-400 text-sm mt-1">Private — Rick only</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Add Prospect
        </button>
      </div>

      {showForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-white font-semibold mb-4">New Prospect</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Business Name *</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                value={form.business_name}
                onChange={e => setForm({ ...form, business_name: e.target.value })}
                placeholder="StoneWorks Hardscaping"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Owner Name *</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                value={form.owner_name}
                onChange={e => setForm({ ...form, owner_name: e.target.value })}
                placeholder="Tyler Smith"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Phone *</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                value={form.phone}
                onChange={e => setForm({ ...form, phone: e.target.value })}
                placeholder="+16175551234"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Email</label>
              <input
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="tyler@stoneworks.com"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Industry</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                value={form.industry}
                onChange={e => setForm({ ...form, industry: e.target.value })}
              >
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Source</label>
              <select
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                value={form.source}
                onChange={e => setForm({ ...form, source: e.target.value })}
              >
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-gray-400 mb-1 block">Notes</label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-amber-500"
                value={form.notes}
                onChange={e => setForm({ ...form, notes: e.target.value })}
                placeholder="Warm contact — met at local chamber event..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={addProspect}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Adding...' : 'Add & Start Sequence'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-white text-sm px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-6 border-b border-gray-800">
        <button
          onClick={() => setActiveTab('prospects')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === 'prospects' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-white'}`}
        >
          Prospects ({prospects.length})
        </button>
        <button
          onClick={() => setActiveTab('replies')}
          className={`px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'replies' ? 'text-amber-400 border-b-2 border-amber-400' : 'text-gray-400 hover:text-white'}`}
        >
          Replies
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{unreadCount}</span>
          )}
        </button>
      </div>

      {activeTab === 'prospects' && (
        <div className="space-y-3">
          {prospects.length === 0 && (
            <div className="text-center py-16 text-gray-500 text-sm">No prospects yet. Add your first one above.</div>
          )}
          {prospects.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-white font-semibold text-sm">{p.business_name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLORS[p.status]}`}>{p.status}</span>
                  {p.sequence_active && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">Sequence active</span>
                  )}
                </div>
                <div className="text-gray-400 text-xs flex flex-wrap gap-3">
                  <span>{p.owner_name}</span>
                  <span>{p.phone}</span>
                  {p.email && <span>{p.email}</span>}
                  <span className="text-gray-600">•</span>
                  <span>{p.industry}</span>
                  <span className="text-gray-600">•</span>
                  <span>{p.source}</span>
                </div>
                {p.notes && <div className="text-gray-500 text-xs mt-1 truncate">{p.notes}</div>}
              </div>
              <div className="flex-shrink-0">
                <select
                  value={p.status}
                  onChange={e => updateStatus(p.id, e.target.value)}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
                >
                  {STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'replies' && (
        <div className="space-y-3">
          {replies.length === 0 && (
            <div className="text-center py-16 text-gray-500 text-sm">No replies yet. Replies from prospects will appear here.</div>
          )}
          {replies.map(r => {
            const prospect = prospects.find(p => p.id === r.prospect_id)
            return (
              <div key={r.id} className={`bg-gray-900 border rounded-xl p-4 ${r.read ? 'border-gray-800' : 'border-amber-500/30'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {!r.read && <span className="w-2 h-2 bg-amber-400 rounded-full flex-shrink-0"></span>}
                      <span className="text-white text-sm font-medium">
                        {prospect ? `${prospect.owner_name} — ${prospect.business_name}` : r.from_phone}
                      </span>
                      <span className="text-gray-600 text-xs">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-gray-300 text-sm">{r.message}</p>
                    <p className="text-gray-600 text-xs mt-1">{r.from_phone}</p>
                  </div>
                  {!r.read && (
                    <button
                      onClick={() => markReplyRead(r.id)}
                      className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg px-3 py-1 flex-shrink-0"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}