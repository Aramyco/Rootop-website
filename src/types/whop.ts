export interface WhopPlan {
  id: string;
  name: string;
  price: number;
  type: 'inspection' | 'deposit' | 'flat_rate';
  badge: string;
  tagline: string;
  description: string;
  features: string[];
  requiresCardOnFile?: boolean;
  financingAvailable?: boolean;
  financingBadge?: string;
  whopElementId: string;
}

export interface WhopLead {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  zipCode: string;
  roofAge: string;
  serviceType: string;
  insuranceClaim: boolean;
  notes?: string;
  estimatedSqFt?: number;
  status: 'new' | 'contacted' | 'estimate_sent' | 'contract_signed';
  createdAt: string;
}

export interface WhopSetupIntent {
  id: string;
  clientSecret: string;
  status: 'requires_payment_method' | 'succeeded';
  paymentMethodId?: string;
  cardBrand?: string;
  cardLast4?: string;
  createdAt: string;
}

export interface WhopInvoice {
  id: string;
  leadId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  address: string;
  totalContractAmount: number;
  depositPaid: number;
  insuranceCredit: number;
  finalBalanceDue: number;
  status: 'draft' | 'open' | 'paid' | 'processing';
  collectionMethod: 'charge_automatically' | 'send_invoice';
  storedPaymentMethodId?: string;
  milestoneDescription: string;
  dueDate: string;
  paidAt?: string;
  transactionHash?: string;
  hostedInvoiceUrl: string;
  createdAt: string;
}

export interface WhopPixelEvent {
  id: string;
  eventName: 'estimate_requested' | 'service_viewed' | 'deposit_started' | 'plan_selected' | 'financing_calculated' | 'invoice_charged' | 'page_view';
  timestamp: string;
  payload: Record<string, any>;
}

export interface WhopPaymentConfig {
  planId: string;
  planName: string;
  amount: number;
  currency: 'USD';
  isDeposit: boolean;
  customerEmail?: string;
  customerName?: string;
}
