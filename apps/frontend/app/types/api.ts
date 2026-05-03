// DTO для Strapi 5 REST. Бэк отдаёт плоские объекты внутри { data, meta }
// (без legacy attributes-обёртки). Все цены — целые копейки, валюта RUB.

export interface StrapiSingle<T> { data: T | null }
export interface StrapiCollection<T> {
  data: T[];
  meta?: { pagination?: { page: number; pageSize: number; pageCount: number; total: number } };
}

export interface StrapiErrorEnvelope {
  error: {
    status: number;
    name: string;
    message: string;
    details?: { errors?: Array<{ path: string[]; message: string; name?: string }> };
  };
}

export interface MediaFormat { url: string; width?: number; height?: number }
export interface MediaFile {
  id: number;
  url: string;
  width?: number;
  height?: number;
  mime?: string;
  formats?: { thumbnail?: MediaFormat; small?: MediaFormat; medium?: MediaFormat; large?: MediaFormat };
}

export interface Venue {
  id: number;
  name: string;
  address?: string;
  lat?: number;
  lng?: number;
  mapEmbed?: string;
}

export interface Organizer {
  id: number;
  name: string;
  logo?: MediaFile;
  description?: string;
}

export interface Speaker {
  id: number;
  documentId: string;
  slug: string;
  fullName: string;
  photo?: MediaFile;
  bio?: string;
  social?: Record<string, string>;
}

export interface AgendaItem {
  id: number;
  startsAt: string;
  endsAt?: string;
  title: string;
  description?: string;
  speakers?: Speaker[];
}

export interface TicketTier {
  id: number;
  documentId: string;
  name: string;
  description?: string;
  includes?: string;
  price: number;
  currency: 'RUB';
  sortOrder: number;
  event?: Pick<Event, 'id' | 'slug' | 'title'>;
}

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'archived';

export interface Category {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  colorToken?: 'primary' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet';
}

export interface Event {
  id: number;
  documentId: string;
  slug: string;
  title: string;
  shortDescription?: string;
  description?: string;
  coverImage?: MediaFile;
  gallery?: MediaFile[];
  pastGallery?: MediaFile[];
  startsAt: string;
  endsAt?: string;
  timezone: string;
  capacity?: number;
  status: EventStatus;
  venue?: Venue;
  organizer?: Organizer;
  speakers?: Speaker[];
  agenda?: AgendaItem[];
  tiers?: TicketTier[];
  category?: Category | null;
}

export interface Banner {
  id: number;
  title: string;
  image: MediaFile;
  url?: string;
  priority: number;
  activeFrom?: string;
  activeUntil?: string;
}

export interface Attendee {
  fullName: string;
  email?: string;
  phone?: string;
  extra?: Record<string, unknown>;
}

export interface OrderItem {
  id: number;
  quantity: number;
  unitPrice: number;
  tier?: TicketTier;
}

export type PaymentMethod = 'card' | 'sbp' | 'invoice';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Order {
  id: number;
  documentId: string;
  number: string;
  subtotal: number;
  discount: number;
  total: number;
  currency: 'RUB';
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  personalDataConsentAt?: string;
  items?: OrderItem[];
  tickets?: Ticket[];
  promoCode?: { id: number; code: string };
  createdAt?: string;
}

export type TicketStatus = 'valid' | 'used' | 'refunded' | 'cancelled';

export interface Ticket {
  id: number;
  documentId: string;
  number: string;
  qrPayload?: string;
  status: TicketStatus;
  attendee: Attendee;
  usedAt?: string;
  order?: Pick<Order, 'id' | 'number'>;
  tier?: Pick<TicketTier, 'id' | 'name' | 'price' | 'currency' | 'description'>;
  event?: Pick<Event, 'id' | 'slug' | 'title' | 'startsAt' | 'endsAt' | 'timezone' | 'venue' | 'organizer'>;
}

export interface Favorite {
  id: number;
  event: Pick<Event, 'id' | 'slug' | 'title' | 'startsAt' | 'coverImage'>;
}

export type PromoFailReason = 'expired' | 'limit' | 'not-eligible' | 'invalid' | null;

export interface PreviewPromoResponse {
  subtotal: number;
  discount: number;
  total: number;
  applied: boolean;
  reason: PromoFailReason;
}

export interface CreateOrderPayload {
  eventId: number;
  items: { tierId: number; quantity: number }[];
  promoCode?: string;
  paymentMethod: PaymentMethod;
  personalDataConsent: true;
  attendees: Attendee[];
}

export interface SpeakerApplicationPayload {
  fullName: string;
  email: string;
  topic?: string;
  description?: string;
}

export interface ManagerContactPayload {
  subject: string;
  message: string;
  contactBack?: string;
}
