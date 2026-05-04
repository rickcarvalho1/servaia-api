'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, CheckCircle2, Clock, XCircle, ArrowUpRight, Phone, Mail, Upload, X, Download, AlertCircle, Search } from 'lucide-react'

export default function CustomersPage() {
  const supabase = createClient()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [businessId, setBusinessId] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'failed' | 'not_required'>('all')
  const [showImport, setShowImport] = useState(false)
  const [csvRows, setCsvRows] = useState<any[]>([])
  const [csvError, setCsvError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; skipped: number } | null>(null)

  useEffect(() => { loadCustomers() }, [])

  async function loadCustomers() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: member } = await supabase
      .from('team_members')
      .select('service_companies(id)')
      .eq('user_id', user.id)
      .single()

    if (!member) { router.push('/login'); return }
    const bizId = (member.service_companies as any).id
    setBusinessId(bizId)

    const { data } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', bizId)
      .order('created_at', { ascending: false })

    setCustomers(data || [])
    setLoading(false)
  }

  const active  = customers.filter(c => c.card_status === 'active').length
  const pending = customers.filter(c => c.card_status === 'pending').length
  const failed  = customers.filter(c => c.card_status === 'failed').length

  const filtered = customers.filter(c => {
    const name = (c.full_name || c.name || '').toLowerCase()
    const phone = (c.phone || '').toLowerCase()
    const email = (c.email || '').toLowerCase()
    const address = (c.address || '').toLowerCase()
    const q = search.toLowerCase()
    const matchesSearch = !q || name.includes(q) || phone.includes(q) || email.includes(q) || address.includes(q)
    const matchesStatus = statusFilter === 'all' || c.card_status === statusFilter
    return matchesSearch && matchesStatus
  })

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCsvError(null)
    setCsvRows([])
    setImportResult(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      const lines = text.trim().split('\n').filter(l => l.trim())
      if (lines.length < 2) { setCsvError('CSV must have a header row and at least one data row.'); return }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ''))
      const nameIdx    = headers.findIndex(h => h.includes('name'))
      const phoneIdx   = headers.findIndex(h => h.includes('phone'))
      const emailIdx   = headers.findIndex(h => h.includes('email'))
      const addressIdx = headers.findIndex(h => h.includes('address'))

      if (nameIdx === -1) { setCsvError('CSV must have a "name" column.'); return }

      const rows = lines.slice(1).map((line, i) => {
        const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''))
        return {
          full_name: cols[nameIdx] || '',
          phone:     phoneIdx >= 0 ? cols[phoneIdx] || '' : '',
          email:     emailIdx >= 0 ? cols[emailIdx] || '' : '',
          address:   addressIdx >= 0 ? cols[addressIdx] || '' : '',
          _row: i + 2,
        }
      }).filter(r => r.full_name)

      if (rows.length === 0) { setCsvError('No valid rows found. Make sure the name column has data.'); return }
      setCsvRows(rows)
    }
    reader.readAsText(file)
  }

  async function handleImport() {
    if (!csvRows.length || !businessId) return
    setImporting(true)
    setCsvError(null)
    let success = 0
    let skipped = 0
    for (const row of csvRows) {
      const { error } = await supabase.from('customers').insert({
        business_id: businessId,
        full_name: row.full_name,
        phone: row.phone || null,
        email: row.email || null,
        address: row.address || null,
        card_status: 'not_required',
        payment_method: 'cash_check',
      })
      if (error) { skipped++ } else { success++ }
    }
    setImportResult({ success, skipped })
    setImporting(false)
    await loadCustomers()
  }

  function resetImport() {
    setShowImport(false)
    setCsvRows([])
    setCsvError(null)
    setImportResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  function downloadTemplate() {
    const csv = 'name,phone,email,address\nJohn Smith,(555) 000-0001,john@email.com,"123 Main St, Orlando FL 32801"\nJane Doe,(555) 000-0002,jane@email.com,"456 Oak Ave, Tampa FL 33601"'
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'servaia-customer-import-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-[#6B7490] text-sm">Loading customers...</div>
    </div>
  )

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-[#0E1117]"
              style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
            Customers
          </h1>
          <p className="text-sm mt-1 text-[#6B7490]">
            {customers.length} total · {active} with card on file
          </p>
        </div>
        <div className="flex items-center gap-2 w-full lg:w-auto">
          <button onClick={() => { setShowImport(true); setImportResult(null); setCsvRows([]); setCsvError(null) }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-[#0E1117] text-sm font-semibold rounded-lg border border-[#DDE1EC] bg-white hover:bg-gray-50 transition-colors flex-1 lg:flex-none">
            <Upload size={15} /> Import CSV
          </button>
          <Link href="/dashboard/customers/new"
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg bg-[#0E1117] hover:bg-[#4F8EF7] transition-colors flex-1 lg:flex-none">
            <Plus size={16} /> Add Customer
          </Link>
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BA3B8]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, email, or address..."
            className="w-full pl-9 pr-4 py-2.5 border border-[#DDE1EC] rounded-lg text-sm text-[#0E1117] placeholder-[#9BA3B8] outline-none focus:border-[#4F8EF7] bg-white"
          />
        </div>
        <div className="flex gap-1 bg-white rounded-lg p-1 border border-[#DDE1EC] overflow-x-auto">
          {[
            { label: 'All', value: 'all' },
            { label: 'Card on file', value: 'active' },
            { label: 'Pending', value: 'pending' },
            { label: 'Failed', value: 'failed' },
            { label: 'No card', value: 'not_required' },
          ].map(f => (
            <button key={f.value} onClick={() => setStatusFilter(f.value as any)}
              className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === f.value ? 'bg-[#0E1117] text-white' : 'text-[#6B7490] hover:text-[#0E1117]'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status badges */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[rgba(61,191,127,0.1)] text-[#3DBF7F] border border-[rgba(61,191,127,0.2)]">
          {active} Card on file
        </div>
        <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[rgba(232,160,32,0.1)] text-[#E8A020] border border-[rgba(232,160,32,0.2)]">
          {pending} Pending auth
        </div>
        <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[rgba(224,82,82,0.1)] text-[#E05252] border border-[rgba(224,82,82,0.2)]">
          {failed} Card failed
        </div>
        {search || statusFilter !== 'all' ? (
          <div className="px-3 py-1.5 rounded-full text-xs font-semibold bg-[rgba(79,142,247,0.1)] text-[#4F8EF7] border border-[rgba(79,142,247,0.2)]">
            {filtered.length} shown
          </div>
        ) : null}
      </div>

      {/* Customer list */}
      <div className="bg-white rounded-xl shadow-sm border border-[#DDE1EC]">
        {customers.length === 0 ? (
          <div className="py-20 text-center">
            <Users size={40} className="mx-auto mb-4 text-[#DDE1EC]" />
            <p className="font-semibold mb-1 text-[#0E1117]">No customers yet</p>
            <p className="text-sm mb-4 text-[#6B7490]">Add your first customer or import a list via CSV.</p>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <button onClick={() => setShowImport(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-[#0E1117] text-sm font-semibold rounded-lg border border-[#DDE1EC] hover:bg-gray-50">
                <Upload size={15} /> Import CSV
              </button>
              <Link href="/dashboard/customers/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-lg bg-[#4F8EF7]">
                <Plus size={16} /> Add First Customer
              </Link>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Search size={32} className="mx-auto mb-3 text-[#DDE1EC]" />
            <p className="font-semibold text-[#0E1117] mb-1">No customers match</p>
            <p className="text-sm text-[#6B7490]">Try a different search or filter.</p>
            <button onClick={() => { setSearch(''); setStatusFilter('all') }}
              className="mt-3 text-sm text-[#4F8EF7] hover:underline">
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden lg:block">
              {filtered.map((customer: any) => (
                <Link key={customer.id} href={`/dashboard/customers/${customer.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors border-b border-[#DDE1EC] last:border-0">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-[rgba(79,142,247,0.1)] text-[#4F8EF7]">
                    {(customer.full_name || customer.name)?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-[#0E1117]">{customer.full_name || customer.name}</span>
                      {customer.card_status === 'active' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(61,191,127,0.1)] text-[#3DBF7F]">
                          <CheckCircle2 size={10} /> Card on file
                        </span>
                      )}
                      {customer.card_status === 'pending' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(232,160,32,0.1)] text-[#E8A020]">
                          <Clock size={10} /> Pending
                        </span>
                      )}
                      {customer.card_status === 'failed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(224,82,82,0.1)] text-[#E05252]">
                          <XCircle size={10} /> Failed
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#6B7490]">
                      {customer.phone && <span className="flex items-center gap-1"><Phone size={10} />{customer.phone}</span>}
                      {customer.email && <span className="flex items-center gap-1 truncate"><Mail size={10} />{customer.email}</span>}
                      {customer.address && <span className="truncate hidden sm:block">📍 {customer.address}</span>}
                    </div>
                  </div>
                  {customer.card_last4 && (
                    <div className="text-xs text-[#6B7490] flex-shrink-0">{customer.card_brand} ···{customer.card_last4}</div>
                  )}
                  <ArrowUpRight size={14} className="text-[#DDE1EC]" />
                </Link>
              ))}
            </div>

            {/* Mobile */}
            <div className="lg:hidden p-4 space-y-3">
              {filtered.map((customer: any) => (
                <Link key={customer.id} href={`/dashboard/customers/${customer.id}`}
                  className="block bg-white border border-[#DDE1EC] rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 bg-[rgba(79,142,247,0.1)] text-[#4F8EF7]">
                      {(customer.full_name || customer.name)?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#0E1117] truncate">{customer.full_name || customer.name}</span>
                        {customer.card_status === 'active' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(61,191,127,0.1)] text-[#3DBF7F]">
                            <CheckCircle2 size={10} /> Card on file
                          </span>
                        )}
                        {customer.card_status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(232,160,32,0.1)] text-[#E8A020]">
                            <Clock size={10} /> Pending
                          </span>
                        )}
                        {customer.card_status === 'failed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-[rgba(224,82,82,0.1)] text-[#E05252]">
                            <XCircle size={10} /> Failed
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {customer.phone && <div className="flex items-center gap-1 text-xs text-[#6B7490]"><Phone size={10} />{customer.phone}</div>}
                        {customer.email && <div className="flex items-center gap-1 text-xs text-[#6B7490] truncate"><Mail size={10} />{customer.email}</div>}
                        {customer.address && <div className="text-xs text-[#6B7490] truncate">📍 {customer.address}</div>}
                        {customer.card_last4 && <div className="text-xs text-[#6B7490]">{customer.card_brand} ···{customer.card_last4}</div>}
                      </div>
                    </div>
                    <ArrowUpRight size={14} className="text-[#DDE1EC] flex-shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {/* CSV Import Modal */}
      {showImport && (
        <div className="fixed inset-0 bg-[#0E1117]/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-bold text-[#0E1117]" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif' }}>
                  Import Customers
                </h3>
                <p className="text-xs text-[#6B7490] mt-0.5">Upload a CSV file with your customer list</p>
              </div>
              <button onClick={resetImport} className="text-[#6B7490] hover:text-[#0E1117]">
                <X size={20} />
              </button>
            </div>

            {!importResult ? (
              <>
                <button onClick={downloadTemplate}
                  className="flex items-center gap-2 text-sm text-[#4F8EF7] hover:underline mb-4">
                  <Download size={14} /> Download CSV template
                </button>
                <div className="bg-[#F8F9FC] border border-[#DDE1EC] rounded-lg px-4 py-3 mb-4">
                  <p className="text-xs font-bold text-[#0E1117] mb-1">Required columns:</p>
                  <p className="text-xs text-[#6B7490]"><strong>name</strong> — customer full name</p>
                  <p className="text-xs text-[#6B7490] mt-0.5">Optional: <strong>phone</strong>, <strong>email</strong>, <strong>address</strong></p>
                  <p className="text-xs text-[#6B7490] mt-1">Imported customers default to Cash/Check. Update individually after import.</p>
                </div>
                <div className="mb-4">
                  <input ref={fileRef} type="file" accept=".csv" onChange={handleFileChange}
                    className="w-full px-4 py-3 border border-[#DDE1EC] rounded-lg text-sm text-[#0E1117] outline-none focus:border-[#4F8EF7] bg-white file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#0E1117] file:text-white" />
                </div>
                {csvError && (
                  <div className="flex items-start gap-2 px-4 py-3 bg-[rgba(224,82,82,0.1)] border border-[rgba(224,82,82,0.2)] rounded-lg text-sm text-[#E05252] mb-4">
                    <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                    {csvError}
                  </div>
                )}
                {csvRows.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold text-[#0E1117] mb-2">{csvRows.length} customers ready to import:</p>
                    <div className="border border-[#DDE1EC] rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      {csvRows.slice(0, 20).map((row, i) => (
                        <div key={i} className="flex items-center gap-3 px-4 py-2.5 border-b border-[#DDE1EC] last:border-0">
                          <div className="w-7 h-7 rounded-full bg-[rgba(79,142,247,0.1)] text-[#4F8EF7] flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {row.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-[#0E1117] truncate">{row.full_name}</div>
                            <div className="text-xs text-[#6B7490] truncate">{[row.phone, row.email].filter(Boolean).join(' · ') || 'No contact info'}</div>
                          </div>
                        </div>
                      ))}
                      {csvRows.length > 20 && (
                        <div className="px-4 py-2 text-xs text-[#6B7490] text-center">+ {csvRows.length - 20} more</div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button onClick={resetImport} className="flex-1 py-3 border border-[#DDE1EC] text-[#6B7490] text-sm rounded-lg hover:bg-[#F8F9FC]">Cancel</button>
                  <button onClick={handleImport} disabled={importing || csvRows.length === 0}
                    className="flex-[2] py-3 bg-[#0E1117] text-white font-bold text-sm rounded-lg hover:bg-[#4F8EF7] transition-colors disabled:opacity-50">
                    {importing ? `Importing ${csvRows.length} customers...` : `Import ${csvRows.length} Customers`}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-[rgba(61,191,127,0.1)] border-2 border-[#3DBF7F] flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 size={32} className="text-[#3DBF7F]" />
                </div>
                <h4 className="text-xl font-bold text-[#0E1117] mb-2">Import Complete</h4>
                <p className="text-[#6B7490] text-sm mb-1">
                  <strong className="text-[#3DBF7F]">{importResult.success}</strong> customers imported successfully
                </p>
                {importResult.skipped > 0 && (
                  <p className="text-[#6B7490] text-sm mb-4"><strong className="text-[#E05252]">{importResult.skipped}</strong> skipped</p>
                )}
                <p className="text-xs text-[#6B7490] mb-6">All imported customers set to Cash/Check. Visit each customer to send a card authorization link if needed.</p>
                <button onClick={resetImport} className="w-full py-3 bg-[#0E1117] text-white font-bold text-sm rounded-lg hover:bg-[#4F8EF7] transition-colors">Done</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}