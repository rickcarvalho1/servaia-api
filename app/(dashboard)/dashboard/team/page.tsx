'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Mail, Phone, Shield, Wrench, User, CheckCircle2, Send } from 'lucide-react'

const ROLE_CONFIG = {
  owner:   { label: 'Owner',      color: 'text-[#E8B84B] bg-[rgba(232,184,75,0.1)]   border-[rgba(232,184,75,0.2)]',   icon: Shield },
  manager: { label: 'Manager',    color: 'text-[#4F8EF7] bg-[rgba(79,142,247,0.1)]   border-[rgba(79,142,247,0.2)]',   icon: User   },
  tech:    { label: 'Field Tech', color: 'text-[#3DBF7F] bg-[rgba(61,191,127,0.1)]   border-[rgba(61,191,127,0.2)]',   icon: Wrench },
}

export default function TeamPage() {
  const supabase = createClient()
  const [members, setMembers]     = useState<any[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [saving, setSaving]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)
  const [businessId, setBusinessId] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [currentRole, setCurrentRole] = useState('owner')
  const [form, setForm] = useState({ email: '', role: 'tech' })
  const [resendingEmail, setResendingEmail] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: member } = await supabase
        .from('team_members')
        .select('role, service_companies(id, name, company_name)')
        .eq('user_id', user.id)
        .single()
      if (!member) return
      const bizId = (member.service_companies as any).id
      const bizName = (member.service_companies as any).company_name || (member.service_companies as any).name
      setBusinessId(bizId)
      setBusinessName(bizName)
      setCurrentRole(member.role)
      const { data } = await supabase
        .from('team_members')
        .select('*')
        .eq('business_id', bizId)
        .order('created_at')
      setMembers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          role: form.role,
          businessId,
          businessName,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send invite')

      // Create a pending team_member record
      const { data: newMember, error: insertErr } = await supabase
        .from('team_members')
        .insert({
          business_id: businessId,
          user_id: '00000000-0000-0000-0000-000000000000', // placeholder
          full_name: form.email.split('@')[0],
          email: form.email,
          phone: null,
          role: form.role,
          active: false,
        })
        .select()
        .single()

      if (insertErr) throw new Error(insertErr.message)

      setMembers(prev => [...prev, newMember])
      setForm({ email: '', role: 'tech' })
      setShowForm(false)
      setSuccess(`Invite sent to ${form.email}`)
      setTimeout(() => setSuccess(null), 4000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleResendInvite(memberEmail: string) {
    setResendingEmail(memberEmail)
    setError(null)
    try {
      // Find the role for this email
      const member = members.find(m => m.email === memberEmail)
      if (!member) throw new Error('Member not found')

      const res = await fetch('/api/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: memberEmail,
          role: member.role,
          businessId,
          businessName,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to resend invite')

      setSuccess(`Invite resent to ${memberEmail}`)
      setTimeout(() => setSuccess(null), 4000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setResendingEmail(null)
    }
  }

  async function toggleActive(memberId: string, currentActive: boolean) {
    await supabase.from('team_members').update({ active: !currentActive }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, active: !currentActive } : m))
  }

  if (loading) return <div className="p-8 text-[#6B7490] text-sm">Loading team...</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-[#0E1117]"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>Team</h1>
          <p className="text-sm mt-1 text-[#6B7490]">{members.length} member{members.length !== 1 ? 's' : ''}</p>
        </div>
        {(currentRole === 'owner' || currentRole === 'manager') && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg bg-[#0E1117] hover:bg-[#4F8EF7] transition-colors">
            <Plus size={16} /> Invite Team Member
          </button>
        )}
      </div>

      {success && (
        <div className="mb-6 flex items-center gap-2 px-4 py-3 rounded-xl text-sm text-[#3DBF7F] bg-[rgba(61,191,127,0.1)] border border-[rgba(61,191,127,0.2)]">
          <CheckCircle2 size={16} /> {success}
        </div>
      )}

      <div className="grid grid-cols-3 gap-3 mb-8">
        {Object.entries(ROLE_CONFIG).map(([role, cfg]) => (
          <div key={role} className={`border rounded-xl p-4 ${cfg.color}`}>
            <div className="flex items-center gap-2 mb-2">
              <cfg.icon size={14} />
              <span className="text-xs font-bold uppercase tracking-wider">{cfg.label}</span>
            </div>
            <p className="text-xs text-[#0E1117]/60 leading-relaxed">
              {role === 'owner' ? 'Full access — billing, team, settings' :
               role === 'manager' ? 'Add customers, mark jobs, view all' :
               'Mark jobs done on assigned customers'}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-[#DDE1EC] shadow-sm">
        {members.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={36} className="mx-auto mb-3 text-[#DDE1EC]" />
            <p className="text-sm text-[#6B7490]">No team members yet.</p>
          </div>
        ) : members.map(member => {
          const cfg = ROLE_CONFIG[member.role as keyof typeof ROLE_CONFIG]
          return (
            <div key={member.id} className="flex items-center gap-4 px-6 py-4 border-b border-[#DDE1EC] last:border-0">
              <div className="w-10 h-10 rounded-full bg-[#EDF0F7] flex items-center justify-center text-[#6B7490] font-bold text-sm flex-shrink-0">
                {member.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-sm font-semibold text-[#0E1117]">{member.full_name}</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded-full text-xs font-semibold ${cfg.color}`}>
                    <cfg.icon size={9} /> {cfg.label}
                  </span>
                  {!member.active && (
                    <span className="px-2 py-0.5 bg-[rgba(232,160,32,0.1)] text-[#E8A020] text-xs font-semibold rounded-full border border-[rgba(232,160,32,0.2)]">
                      Invite Pending
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-[#6B7490]">
                  {member.email && <span className="flex items-center gap-1"><Mail size={10} />{member.email}</span>}
                  {member.phone && <span className="flex items-center gap-1"><Phone size={10} />{member.phone}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!member.active && (currentRole === 'owner' || currentRole === 'manager') && (
                  <button
                    onClick={() => handleResendInvite(member.email)}
                    disabled={resendingEmail === member.email}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[rgba(79,142,247,0.2)] text-[#4F8EF7] hover:bg-[rgba(79,142,247,0.1)] transition-colors disabled:opacity-50"
                  >
                    {resendingEmail === member.email ? 'Sending...' : 'Resend'}
                  </button>
                )}
                {currentRole === 'owner' && member.role !== 'owner' && member.active && (
                  <button onClick={() => toggleActive(member.id, member.active)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors ${
                      member.active
                        ? 'border-[rgba(224,82,82,0.2)] text-[#E05252] hover:bg-[rgba(224,82,82,0.1)]'
                        : 'border-[rgba(61,191,127,0.2)] text-[#3DBF7F] hover:bg-[rgba(61,191,127,0.1)]'
                    }`}>
                    {member.active ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-[#0E1117]/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-[#0E1117] mb-1"
                style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
              Invite Team Member
            </h3>
            <p className="text-sm text-[#6B7490] mb-5">They'll receive an email with a signup link.</p>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">Email Address</label>
                <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required
                  placeholder="team@example.com"
                  className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm outline-none focus:border-[#4F8EF7] bg-[#F8F9FC]" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest uppercase text-[#6B7490] mb-2">Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['manager', 'tech'] as const).map(role => (
                    <button key={role} type="button" onClick={() => setForm(p => ({ ...p, role }))}
                      className={`px-4 py-3 border rounded-lg text-sm font-semibold text-left transition-all ${
                        form.role === role
                          ? 'border-[#4F8EF7] bg-[rgba(79,142,247,0.1)] text-[#4F8EF7]'
                          : 'border-[#DDE1EC] text-[#6B7490]'
                      }`}>
                      <div className="font-bold mb-0.5">{ROLE_CONFIG[role].label}</div>
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="px-4 py-3 bg-[rgba(224,82,82,0.1)] border border-[rgba(224,82,82,0.2)] rounded-lg text-sm text-[#E05252]">{error}</div>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setError(null) }}
                  className="flex-1 py-3 border border-[#DDE1EC] text-[#6B7490] text-sm rounded-lg hover:bg-[#F8F9FC]">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="flex-[2] py-3 bg-[#0E1117] text-white font-bold text-sm rounded-lg hover:bg-[#4F8EF7] transition-colors disabled:opacity-50">
                  {saving ? 'Sending...' : 'Send Invite →'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}