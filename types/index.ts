export type UserRole = 'owner' | 'manager' | 'tech'
export type CardStatus = 'pending' | 'authorized' | 'failed' | 'expired'
export type PaymentStatus = 'pending' | 'charged' | 'failed' | 'refunded'
export type BusinessStatus = 'lead' | 'onboarding' | 'active' | 'paused'

export interface Business {
  id: string
  name: string
  owner_name: string
  owner_email: string
  owner_phone: string
  trade: string | null
  resend_from_domain: string | null
  stripe_account_id: string | null
  status: BusinessStatus
  customer_count: string | null
  pain_notes: string | null
  created_at: string
}

export interface TeamMember {
  id: string
  business_id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  role: UserRole
  active: boolean
  created_at: string
}

export interface Customer {
  id: string
  business_id: string
  full_name: string
  phone: string
  email: string | null
  address: string | null
  notes: string | null
  stripe_customer_id: string | null
  stripe_payment_method: string | null
  card_last4: string | null
  card_brand: string | null
  card_status: CardStatus
  card_authorized_at: string | null
  created_at: string
}

export interface Service {
  id: string
  business_id: string
  name: string
  emoji: string
  unit: string
  default_price: number
  active: boolean
  sort_order: number
  created_at: string
}

export interface CustomerService {
  id: string
  customer_id: string
  service_id: string
  price: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Job {
  id: string
  business_id: string
  customer_id: string
  stripe_charge_id: string | null
  amount: number
  payment_status: PaymentStatus
  crew_member: string | null
  notes: string | null
  completed_at: string
  sms_sent: boolean
  email_sent: boolean
  created_at: string
  customers?: Customer
  job_services?: JobService[]
  photos?: Photo[]
}

export interface JobService {
  id: string
  job_id: string
  service_id: string | null
  name: string
  price_charged: number
  is_custom: boolean
  created_at: string
}

export interface Photo {
  id: string
  job_id: string
  business_id: string
  storage_path: string
  taken_at: string
  crew_member: string | null
  gps_lat: number | null
  gps_lng: number | null
  sent_to_customer: boolean
  created_at: string
  signedUrl?: string
}

export interface AppUser {
  id: string
  email: string
  businessId: string
  businessName: string
  fullName: string
  role: UserRole
}