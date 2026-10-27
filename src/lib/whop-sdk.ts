import { WhopPlan, WhopLead, WhopInvoice, WhopPixelEvent, WhopSetupIntent } from '../types/whop';

// Whop Plans definition matching prompt requirements:
// 1. One-time inspection fee ($149)
// 2. Project deposit ($500 with card-on-file setup intent)
// 3. Flat-rate service ($899)
export const WHOP_PLANS: WhopPlan[] = [
  {
    id: 'plan_diag_149',
    name: 'Drone & Thermal Roof Inspection',
    price: 149,
    type: 'inspection',
    badge: '100% Credited If Hired',
    tagline: 'High-tech diagnostic report before you commit',
    description: '45-minute on-site 4K aerial drone scan, FLIR thermal moisture detection under shingles, digital condition score & insurance-ready PDF packet.',
    features: [
      'FAA-licensed drone pilot on-site',
      'FLIR thermal imaging to locate trapped water',
      'High-res photo proof for insurance claims',
      'Full repair vs. replacement cost matrix',
      '100% credited toward contract if you hire us'
    ],
    financingAvailable: false,
    whopElementId: 'plan_apex_drone_inspection_149'
  },
  {
    id: 'plan_deposit_500',
    name: 'Project Lock & Material Escrow Deposit',
    price: 500,
    type: 'deposit',
    badge: 'Most Popular · Card-On-File',
    tagline: 'Locks crew schedule & secures shingle warehouse batch',
    description: 'Secures your dedicated crew slot, orders high-grade GAF/Owens Corning architectural bundles, and saves payment method on file via Whop Setup Intent for final invoice.',
    features: [
      'Guaranteed 7-day crew installation window',
      'Locks manufacturer material pricing against price hikes',
      'Secure Whop card-on-file escrow setup intent',
      'Final 80% balance billed only upon completed inspection',
      'Fully refundable if permit cannot be obtained'
    ],
    requiresCardOnFile: true,
    financingAvailable: false,
    whopElementId: 'plan_apex_deposit_500'
  },
  {
    id: 'plan_repair_899',
    name: 'Emergency Leak Shield & Storm Tarping',
    price: 899,
    type: 'flat_rate',
    badge: 'Immediate 4-Hr Dispatch',
    tagline: 'Rapid waterproof protection following severe weather',
    description: 'Up to 400 sq.ft of 20-mil commercial-grade poly tarping secured with 2x4 furring strips, chimney and valley leak stoppage, and 60-day dry guarantee.',
    features: [
      'Guaranteed 4-hour emergency response team',
      'Heavy-duty UV-stabilized 20-mil hurricane tarp',
      'Chimney & valley flashing temporary sealant',
      'Comprehensive storm damage photo dossier for adjustor',
      'Financing available: 4 installments of $224.75 via Klarna'
    ],
    financingAvailable: true,
    financingBadge: 'Klarna Pay in 4 available',
    whopElementId: 'plan_apex_emergency_tarp_899'
  }
];

// Seed leads for realistic demo/pitch presentation
const INITIAL_LEADS: WhopLead[] = [
  {
    id: 'lead_whop_89a12c',
    name: 'Marcus & Sarah Vance',
    email: 'marcus.vance@gmail.com',
    phone: '(512) 847-2911',
    address: '4812 Highland View Dr',
    zipCode: '78731',
    roofAge: '18-22 years',
    serviceType: 'Full Roof Replacement',
    insuranceClaim: true,
    notes: 'Wind hail damage from last week. Needs estimate for State Farm adjustor meeting this Thursday.',
    estimatedSqFt: 2850,
    status: 'estimate_sent',
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString()
  },
  {
    id: 'lead_whop_33e76d',
    name: 'Elena Rostova',
    email: 'elena.rostova@icloud.com',
    phone: '(512) 693-0144',
    address: '109 Lakewood Oaks Blvd',
    zipCode: '78734',
    roofAge: '12-15 years',
    serviceType: 'Drone & Thermal Roof Inspection',
    insuranceClaim: false,
    notes: 'Noticed small damp spot on master bedroom ceiling drywall after heavy rain.',
    estimatedSqFt: 3400,
    status: 'new',
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString()
  }
];

// Seed invoices
const INITIAL_INVOICES: WhopInvoice[] = [
  {
    id: 'inv_whop_992144',
    customerName: 'David K. Hensley',
    customerEmail: 'dhensley.builder@outlook.com',
    customerPhone: '(512) 718-4099',
    address: '3804 Wildwood Ridge, Austin, TX 78730',
    totalContractAmount: 14850,
    depositPaid: 500,
    insuranceCredit: 1000,
    finalBalanceDue: 13350,
    status: 'paid',
    collectionMethod: 'charge_automatically',
    storedPaymentMethodId: 'pm_whop_visa_4242',
    milestoneDescription: 'Final Milestone (80%) - GAF Timberline HDZ Charcoal & Lifetime Ridge Cap Complete',
    dueDate: new Date().toISOString(),
    paidAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    transactionHash: 'whop_tx_88a4b9213',
    hostedInvoiceUrl: 'https://whop.com/invoices/inv_whop_992144',
    createdAt: new Date(Date.now() - 1000 * 60 * 360).toISOString()
  }
];

// Persistent state handlers
const LEADS_KEY = 'whop_roofing_leads_v1';
const INVOICES_KEY = 'whop_roofing_invoices_v1';
const PIXEL_KEY = 'whop_pixel_events_v1';
const SETUP_INTENT_KEY = 'whop_setup_intent_v1';

export function getStoredLeads(): WhopLead[] {
  try {
    const raw = localStorage.getItem(LEADS_KEY);
    return raw ? JSON.parse(raw) : INITIAL_LEADS;
  } catch {
    return INITIAL_LEADS;
  }
}

export function saveLeads(leads: WhopLead[]) {
  try {
    localStorage.setItem(LEADS_KEY, JSON.stringify(leads));
    notifyLeadsSubscribers();
  } catch (e) {
    console.error('Failed to save leads to storage:', e);
  }
}

export function getStoredInvoices(): WhopInvoice[] {
  try {
    const raw = localStorage.getItem(INVOICES_KEY);
    return raw ? JSON.parse(raw) : INITIAL_INVOICES;
  } catch {
    return INITIAL_INVOICES;
  }
}

export function saveInvoices(invoices: WhopInvoice[]) {
  try {
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
    notifyInvoicesSubscribers();
  } catch (e) {
    console.error('Failed to save invoices to storage:', e);
  }
}

export function getStoredPixelEvents(): WhopPixelEvent[] {
  try {
    const raw = localStorage.getItem(PIXEL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Reactive subscriber lists
type Listener = () => void;
const pixelSubscribers: Listener[] = [];
const leadsSubscribers: Listener[] = [];
const invoicesSubscribers: Listener[] = [];

export function subscribeToPixel(fn: Listener) {
  pixelSubscribers.push(fn);
  return () => {
    const idx = pixelSubscribers.indexOf(fn);
    if (idx > -1) pixelSubscribers.splice(idx, 1);
  };
}

export function subscribeToLeads(fn: Listener) {
  leadsSubscribers.push(fn);
  return () => {
    const idx = leadsSubscribers.indexOf(fn);
    if (idx > -1) leadsSubscribers.splice(idx, 1);
  };
}

export function subscribeToInvoices(fn: Listener) {
  invoicesSubscribers.push(fn);
  return () => {
    const idx = invoicesSubscribers.indexOf(fn);
    if (idx > -1) invoicesSubscribers.splice(idx, 1);
  };
}

function notifyPixelSubscribers() {
  pixelSubscribers.forEach(cb => cb());
}

function notifyLeadsSubscribers() {
  leadsSubscribers.forEach(cb => cb());
}

function notifyInvoicesSubscribers() {
  invoicesSubscribers.forEach(cb => cb());
}

// WHOP PIXEL ENGINE (window.whop.track)
// Requirements: estimate_requested, service_viewed, deposit_started, page_view
export const whop = {
  track: (eventName: WhopPixelEvent['eventName'], payload: Record<string, any> = {}) => {
    const event: WhopPixelEvent = {
      id: `whop_evt_${Math.random().toString(36).substring(2, 9)}`,
      eventName,
      timestamp: new Date().toISOString(),
      payload: {
        ...payload,
        url: window.location.href,
        host: 'apexcrest.whop.app',
        currency: 'USD'
      }
    };

    const current = getStoredPixelEvents();
    // Keep last 40 events
    const updated = [event, ...current].slice(0, 40);
    try {
      localStorage.setItem(PIXEL_KEY, JSON.stringify(updated));
    } catch {}

    // Dispatch custom browser event as well
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('whop:pixel', { detail: event }));
    }

    notifyPixelSubscribers();
    return event;
  }
};

// Expose globally so external scripts or console callers can test window.whop.track
if (typeof window !== 'undefined') {
  (window as any).whop = whop;
}

// WHOP LEADS API IMPLEMENTATION
export async function submitWhopLead(data: {
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
}): Promise<WhopLead> {
  const leadId = `lead_whop_${Math.random().toString(36).substring(2, 10)}`;
  const newLead: WhopLead = {
    id: leadId,
    name: data.name,
    email: data.email,
    phone: data.phone,
    address: data.address,
    zipCode: data.zipCode,
    roofAge: data.roofAge,
    serviceType: data.serviceType,
    insuranceClaim: data.insuranceClaim,
    notes: data.notes,
    estimatedSqFt: data.estimatedSqFt,
    status: 'new',
    createdAt: new Date().toISOString()
  };

  const leads = [newLead, ...getStoredLeads()];
  saveLeads(leads);

  // Fire mandatory pixel event
  whop.track('estimate_requested', {
    leadId: newLead.id,
    customerName: newLead.name,
    customerEmail: newLead.email,
    serviceType: newLead.serviceType,
    zipCode: newLead.zipCode,
    insuranceClaim: newLead.insuranceClaim,
    estimatedSqFt: newLead.estimatedSqFt
  });

  return newLead;
}

// WHOP SETUP INTENT (Card on file tokenization for Deposit checkout)
export function createWhopSetupIntent(customerEmail: string): WhopSetupIntent {
  const setupIntent: WhopSetupIntent = {
    id: `seti_whop_${Math.random().toString(36).substring(2, 12)}`,
    clientSecret: `seti_secret_${Math.random().toString(36).substring(2, 16)}`,
    status: 'succeeded',
    paymentMethodId: 'pm_whop_visa_4242',
    cardBrand: 'Visa',
    cardLast4: '4242',
    createdAt: new Date().toISOString()
  };

  try {
    localStorage.setItem(SETUP_INTENT_KEY, JSON.stringify(setupIntent));
  } catch {}

  return setupIntent;
}

export function getStoredSetupIntent(): WhopSetupIntent | null {
  try {
    const raw = localStorage.getItem(SETUP_INTENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// WHOP INVOICES API IMPLEMENTATION
// Supports:
// 1. Auto-charge stored card on file ('charge_automatically')
// 2. Send Whop hosted payment link ('send_invoice')
export async function createWhopInvoice(params: {
  leadId?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  address: string;
  totalContractAmount: number;
  depositPaid: number;
  insuranceCredit: number;
  collectionMethod: 'charge_automatically' | 'send_invoice';
  milestoneDescription: string;
}): Promise<WhopInvoice> {
  const finalBalanceDue = Math.max(0, params.totalContractAmount - params.depositPaid - params.insuranceCredit);
  const invoiceId = `inv_whop_${Math.random().toString(36).substring(2, 10)}`;
  const isAutoCharge = params.collectionMethod === 'charge_automatically';

  const invoice: WhopInvoice = {
    id: invoiceId,
    leadId: params.leadId,
    customerName: params.customerName,
    customerEmail: params.customerEmail,
    customerPhone: params.customerPhone,
    address: params.address,
    totalContractAmount: params.totalContractAmount,
    depositPaid: params.depositPaid,
    insuranceCredit: params.insuranceCredit,
    finalBalanceDue,
    status: isAutoCharge ? 'paid' : 'open',
    collectionMethod: params.collectionMethod,
    storedPaymentMethodId: isAutoCharge ? 'pm_whop_visa_4242' : undefined,
    milestoneDescription: params.milestoneDescription,
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    paidAt: isAutoCharge ? new Date().toISOString() : undefined,
    transactionHash: isAutoCharge ? `whop_tx_${Math.random().toString(36).substring(2, 12)}` : undefined,
    hostedInvoiceUrl: `https://whop.com/invoices/${invoiceId}`,
    createdAt: new Date().toISOString()
  };

  const invoices = [invoice, ...getStoredInvoices()];
  saveInvoices(invoices);

  whop.track('invoice_charged', {
    invoiceId: invoice.id,
    customerEmail: invoice.customerEmail,
    finalBalanceDue: invoice.finalBalanceDue,
    collectionMethod: invoice.collectionMethod,
    status: invoice.status
  });

  return invoice;
}

export function clearPixelLogs() {
  try {
    localStorage.setItem(PIXEL_KEY, JSON.stringify([]));
    notifyPixelSubscribers();
  } catch {}
}
