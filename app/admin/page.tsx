import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminPanel from './AdminPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'rickcarvalho1@gmail.com') {
    redirect('/login')
  }

  // Get all companies with data
  const { data: companies } = await supabase
    .from('service_companies')
    .select('*')

  const companiesWithData = companies ? await Promise.all(companies.map(async (company) => {
    const { data: owner } = await supabase
      .from('team_members')
      .select('email')
      .eq('business_id', company.id)
      .eq('role', 'owner')
      .single()

    const { count: customerCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', company.id)

    const { count: jobCount } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', company.id)

    return {
      id: company.id,
      name: company.company_name || company.name,
      ownerEmail: owner?.email || 'N/A',
      createdAt: company.created_at,
      customerCount: customerCount || 0,
      jobCount: jobCount || 0,
    }
  })) : []

  return <AdminPanel companies={companiesWithData} />
}