import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('service_companies')
    .select('*')
    .limit(1)

  return Response.json({ data, error })
}