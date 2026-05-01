import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })

  const formData = await req.formData()
  const from = formData.get('From') as string
  const body = formData.get('Body') as string

  if (!from || !body) {
    return new NextResponse('', { status: 200 })
  }

  const { data: prospect } = await supabase
    .from('prospects')
    .select('id, status')
    .eq('phone', from)
    .single()

  await supabase.from('prospect_replies').insert({
    prospect_id: prospect?.id || null,
    from_phone: from,
    message: body,
    read: false,
  })

  if (prospect) {
    await supabase.from('prospects').update({
      sequence_active: false,
      sequence_stopped_reason: 'replied',
      status: prospect.status === 'Contacted' ? 'Replied' : prospect.status,
    }).eq('id', prospect.id)
  }

  return new NextResponse(
    '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    { headers: { 'Content-Type': 'text/xml' } }
  )
}