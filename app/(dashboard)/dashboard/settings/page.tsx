'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, TrendingUp, Save, CheckCircle2 } from 'lucide-react'

const UNITS = ['visit', 'job', 'hour', 'event', 'sq ft']
const EMOJIS = ['🔧','⚙️','🌿','✂️','🌾','🍂','🌱','🪵','🌳','🧹','✨','📦','🪟','🏢','🚿','💧','🚽','❄️','🔥','🌬️','⚡','🐛','💧','🚨','⭐']

export default function SettingsPage() {
  const supabase = createClient()
  const [services, setServices]     = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [businessId, setBusinessId] = useState('')
  const [bizName, setBizName]       = useState('')
  const [success, setSuccess]       = useState<string | null>(null)
  const [showBulk, setShowBulk]     = useState(false)
  const [bulkType, setBulkType]     = useState<'pct' | 'flat'>('pct')
  const [bulkValue, setBulkValue]   = useState('')
  const [bulkScope, setBulkScope]   = useState<'all' | 'defaults'>('all')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: member } = await supabase
        .from('team_members')
        .select('service_companies(id, name)')
        .eq('user_id', user.id)
        .single()
      if (!member) return
      const biz = member.service_companies as any
      setBusinessId(biz.id)
      setBizName(biz.name)
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('business_id', biz.id)
        .order('sort_order')
      setServices(data || [])
      setLoading(false)
    }
    load()
  }, [])

  function flash(msg: string) {
    setSuccess(msg)
    setTimeout(() => setSuccess(null), 3000)
  }

  async function saveServices() {
    setSaving(true)
    try {
      for (const svc of services) {
        if (svc.id.startsWith('new_')) {
          await supabase.from('services').insert({
            business_id: businessId, name: svc.name, emoji: svc.emoji,
            unit: svc.unit, default_price: svc.default_price,
            active: svc.active, sort_order: svc.sort_order,
          })
        } else {
          await supabase.from('services').update({
            name: svc.name, emoji: svc.emoji, unit: svc.unit,
            default_price: svc.default_price, active: svc.active,
          }).eq('id', svc.id)
        }
      }
      flash('Services saved')
    } finally {
      setSaving(false)
    }
  }

  async function deleteService(id: string) {
    if (id.startsWith('new_')) { setServices(prev => prev.filter(s => s.id !== id)); return }
    await supabase.from('services').delete().eq('id', id)
    setServices(prev => prev.filter(s => s.id !== id))
  }

  function addService() {
    setServices(prev => [...prev, {
      id: `new_${Date.now()}`, business_id: businessId,
      name: '', emoji: '🔧', unit: 'visit', default_price: 0,
      active: true, sort_order: prev.length, created_at: new Date().toISOString(),
    }])
  }

  function updateService(id: string, field: string, value: any) {
    setServices(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  async function handleBulkPrice() {
    if (!bulkValue || parseFloat(bulkValue) === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/services/bulk-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, type: bulkType, value: parseFloat(bulkValue), scope: bulkScope }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const { data: updated } = await supabase.from('services').select('*').eq('business_id', businessId).order('sort_order')
      setServices(updated || [])
      setShowBulk(false)
      setBulkValue('')
      flash(data.message || 'Prices updated')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-8 text-[#6B7490] text-sm">Loading settings...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0E1117]"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Settings</h1>
          <p className="text-sm mt-1 text-[#6B7490]">{bizName}</p>
        </div>
      </div>

      {success && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-[#3DBF7F] font-medium bg-[rgba(61,191,127,0.1)] border border-[rgba(61,191,127,0.2)]">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm mb-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DDE1EC]">
          <div>
            <h2 className="font-semibold text-[#0E1117]">Service Menu & Default Prices</h2>
            <p className="text-xs text-[#6B7490] mt-0.5">Override per customer anytime</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowBulk(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-[#DDE1EC] text-[#6B7490] text-xs font-semibold rounded-lg hover:bg-[#F8F9FC]">
              <TrendingUp size={13} /> Bulk Price Change
            </button>
            <button onClick={addService}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#F8F9FC] border border-[#DDE1EC] text-[#0E1117] text-xs font-semibold rounded-lg hover:bg-[#DDE1EC]">
              <Plus size={13} /> Add Service
            </button>
          </div>
        </div>

        <div className="divide-y divide-[#DDE1EC]">
          {services.map(svc => (
            <div key={svc.id} className="flex items-center gap-3 px-6 py-3">
              <select value={svc.emoji} onChange={e => updateService(svc.id, 'emoji', e.target.value)}
                className="w-12 text-xl bg-[#F8F9FC] border border-[#DDE1EC] rounded-lg text-center outline-none focus:border-[#4F8EF7] py-1.5 cursor-pointer">
                {EMOJIS.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
              <input type="text" value={svc.name} onChange={e => updateService(svc.id, 'name', e.target.value)}
                placeholder="Service name"
                className="flex-1 px-3 py-2 border border-[#DDE1EC] rounded-lg text-sm outline-none focus:border-[#4F8EF7] bg-[#F8F9FC]" />
              <div className="flex items-center gap-1">
                <span className="text-[#6B7490] text-sm">$</span>
                <input type="number" value={svc.default_price}
                  onChange={e => updateService(svc.id, 'default_price', parseFloat(e.target.value) || 0)}
                  className="w-20 px-3 py-2 border border-[#DDE1EC] rounded-lg text-sm text-right outline-none focus:border-[#4F8EF7] bg-[#F8F9FC] font-mono" />
              </div>
              <select value={svc.unit} onChange={e => updateService(svc.id, 'unit', e.target.value)}
                className="px-3 py-2 border border-[#DDE1EC] rounded-lg text-sm outline-none focus:border-[#4F8EF7] bg-[#F8F9FC] appearance-none">
                {UNITS.map(u => <option key={u} value={u}>/{u}</option>)}
              </select>
              <button onClick={() => updateService(svc.id, 'active', !svc.active)}
                className={`w-8 h-4 rounded-full transition-colors flex-shrink-0 ${svc.active ? 'bg-[#3DBF7F]' : 'bg-[#DDE1EC]'}`} />
              <button onClick={() => deleteService(svc.id)}
                className="text-[#6B7490] hover:text-[#E05252] transition-colors flex-shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-[#DDE1EC]">
          <button onClick={saveServices} disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0E1117] text-white text-sm font-semibold rounded-lg hover:bg-[#4F8EF7] transition-colors disabled:opacity-50">
            <Save size={15} /> {saving ? 'Saving...' : 'Save Service Menu'}
          </button>
        </div>
      </div>

      {showBulk && (
        <div className="fixed inset-0 bg-[#0E1117]/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-xl font-bold text-[#0E1117] mb-1"
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
              Bulk Price Change
            </h3>
            <p className="text-sm text-[#6B7490] mb-5">Raise or lower all prices at once.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">Change Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['pct', 'flat'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setBulkType(t)}
                      className={`py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                        bulkType === t ? 'border-[#4F8EF7] bg-[rgba(79,142,247,0.1)] text-[#4F8EF7]' : 'border-[#DDE1EC] text-[#6B7490]'
                      }`}>
                      {t === 'pct' ? '% Percentage' : '$ Flat Amount'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">
                  {bulkType === 'pct' ? 'Percentage (e.g. 10 for +10%)' : 'Dollar amount (e.g. 5 for +$5)'}
                </label>
                <input type="number" value={bulkValue} onChange={e => setBulkValue(e.target.value)}
                  placeholder={bulkType === 'pct' ? '10' : '5'}
                  className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm outline-none focus:border-[#4F8EF7] bg-[#F8F9FC]" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">Apply To</label>
                <div className="grid grid-cols-2 gap-2">
                  {([['all', 'Everyone'], ['defaults', 'Defaults only']] as const).map(([val, label]) => (
                    <button key={val} type="button" onClick={() => setBulkScope(val as any)}
                      className={`py-2.5 rounded-lg text-sm font-semibold border transition-all ${
                        bulkScope === val ? 'border-[#4F8EF7] bg-[rgba(79,142,247,0.1)] text-[#4F8EF7]' : 'border-[#DDE1EC] text-[#6B7490]'
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowBulk(false)}
                  className="flex-1 py-3 border border-[#DDE1EC] text-[#6B7490] text-sm rounded-lg hover:bg-[#F8F9FC]">
                  Cancel
                </button>
                <button onClick={handleBulkPrice} disabled={saving || !bulkValue}
                  className="flex-[2] py-3 bg-[#0E1117] text-white font-bold text-sm rounded-lg hover:bg-[#4F8EF7] transition-colors disabled:opacity-50">
                  {saving ? 'Updating...' : 'Apply Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}