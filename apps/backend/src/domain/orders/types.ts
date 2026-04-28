export type PaymentMethod = 'card' | 'sbp' | 'invoice';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface CreateOrderInput {
  userId: number;
  eventId: number;
  items: Array<{ tierId: number; quantity: number }>;
  promoCode?: string | null;
  paymentMethod: PaymentMethod;
  personalDataConsent: boolean;
  attendees: Array<{
    fullName: string;
    email?: string;
    phone?: string;
    extra?: Record<string, unknown>;
  }>;
}

export class OrderValidationError extends Error {
  constructor(public readonly httpStatus: number, message: string) {
    super(message);
    this.name = 'OrderValidationError';
  }
}
