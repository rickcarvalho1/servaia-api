import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const formData   = await req.formData()
    const file       = formData.get('file') as File
    const jobId      = formData.get('jobId') as string
    const businessId = formData.get('businessId') as string
    const crewMember = formData.get('crewMember') as string
    const lat        = formData.get('lat') as string
    const lng        = formData.get('lng') as string

    if (!file || !jobId) {
      return NextResponse.json({ error: 'file and jobId are required' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `${businessId}/${jobId}/${Date.now()}.${ext}`
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('job-photos')
      .upload(path, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
    }

    const { data: photo, error: dbError } = await supabase
      .from('photos')
      .insert({
        job_id:           jobId,
        business_id:      businessId,
        storage_path:     path,
        taken_at:         new Date().toISOString(),
        crew_member:      crewMember || null,
        gps_lat:          lat ? parseFloat(lat) : null,
        gps_lng:          lng ? parseFloat(lng) : null,
        sent_to_customer: false,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Photo DB insert error:', dbError)
      return NextResponse.json({ error: 'Failed to save photo record' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabase.storage
      .from('job-photos')
      .getPublicUrl(path)

    return NextResponse.json({ success: true, photoId: photo.id, url: publicUrl })

  } catch (err: any) {
    console.error('Photo upload error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}