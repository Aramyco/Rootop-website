import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle2,
  Calendar,
  CreditCard,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronDown,
  Terminal,
  FileText,
  DollarSign,
  AlertCircle,
  Copy,
  Check,
  Zap,
  Award,
  Layers,
  Search,
  Send,
  X,
  RefreshCw,
  Eye,
  Sliders,
  Smartphone,
  Lock
} from 'lucide-react';
import { WHOP_PLANS, whop, submitWhopLead, createWhopSetupIntent, createWhopInvoice, getStoredLeads, getStoredInvoices, getStoredPixelEvents, subscribeToPixel, subscribeToLeads, subscribeToInvoices, clearPixelLogs } from './lib/whop-sdk';
import { WhopPlan, WhopLead, WhopInvoice, WhopPixelEvent } from './types/whop';

// Image paths
const HERO_IMAGE = '/src/assets/images/hero_roofing_home_1793104457970.jpg';
const DRONE_IMAGE = '/src/assets/images/service_drone_inspection_1793104458595.jpg';
const REPAIR_IMAGE = '/src/assets/images/service_emergency_repair_1793104458366.jpg';

export default function App() {
  // Navigation & UI state
  const [activePlanForCheckout, setActivePlanForCheckout] = useState<WhopPlan | null>(null);
  const [showDeploymentModal, setShowDeploymentModal] = useState(false);
  const [showInvoicesModal, setShowInvoicesModal] = useState(false);
  const [showLeadsDrawer, setShowLeadsDrawer] = useState(false);
  const [pixelDebuggerOpen, setPixelDebuggerOpen] = useState(false);

  // Pixel events & CRM data
  const [pixelEvents, setPixelEvents] = useState<WhopPixelEvent[]>([]);
  const [leads, setLeads] = useState<WhopLead[]>([]);
  const [invoices, setInvoices] = useState<WhopInvoice[]>([]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Interactive Financing Calculator State
  const [roofSqFt, setRoofSqFt] = useState<number>(2400);
  const [shingleGrade, setShingleGrade] = useState<'architectural' | 'class4' | 'luxury'>('architectural');
  const [financingMonths, setFinancingMonths] = useState<12 | 24 | 48>(24);

  // Service Area Zip Checker State
  const [zipInput, setZipInput] = useState('78731');
  const [zipChecked, setZipChecked] = useState(false);
  const [isCovered, setIsCovered] = useState(true);

  // Estimate Form State
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [newLeadId, setNewLeadId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    zipCode: '78731',
    roofAge: '15-20 years',
    serviceType: 'Full Roof Replacement',
    insuranceClaim: false,
    notes: ''
  });

  // Whop Elements Checkout Mock State
  const [checkoutStep, setCheckoutStep] = useState<'elements' | 'processing' | 'success'>('elements');
  const [selectedPaymentTab, setSelectedPaymentTab] = useState<'card' | 'klarna' | 'splitit'>('card');
  const [checkoutCustomer, setCheckoutCustomer] = useState({
    name: 'Sarah Vance',
    email: 'sarah.vance@gmail.com',
    cardNumber: '•••• •••• •••• 4242',
    expDate: '08/29',
    cvv: '•••'
  });

  // Invoice API Simulator State
  const [invoiceCustomerName, setInvoiceCustomerName] = useState('David K. Hensley');
  const [invoiceCustomerEmail, setInvoiceCustomerEmail] = useState('dhensley.builder@outlook.com');
  const [invoiceTotalAmount, setInvoiceTotalAmount] = useState(14850);
  const [invoiceDeposit, setInvoiceDeposit] = useState(500);
  const [invoiceInsurance, setInvoiceInsurance] = useState(1000);
  const [invoiceMethod, setInvoiceMethod] = useState<'charge_automatically' | 'send_invoice'>('charge_automatically');
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [lastCreatedInvoice, setLastCreatedInvoice] = useState<WhopInvoice | null>(null);

  // Initialize data and listeners
  useEffect(() => {
    setPixelEvents(getStoredPixelEvents());
    setLeads(getStoredLeads());
    setInvoices(getStoredInvoices());

    const unsubPixel = subscribeToPixel(() => setPixelEvents(getStoredPixelEvents()));
    const unsubLeads = subscribeToLeads(() => setLeads(getStoredLeads()));
    const unsubInvoices = subscribeToInvoices(() => setInvoices(getStoredInvoices()));

    // Fire initial page view event on whop.app
    whop.track('page_view', {
      page: 'Home - Apex Crest Roofing Template',
      whopAppUrl: 'https://apexcrest.whop.app',
      referrer: 'direct'
    });

    return () => {
      unsubPixel();
      unsubLeads();
      unsubInvoices();
    };
  }, []);

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Financing calculation math
  const getTierRate = () => {
    switch (shingleGrade) {
      case 'architectural': return 5.25; // $5.25 per sq ft ($12,600 for 2,400 sq ft)
      case 'class4': return 6.65; // $6.65 per sq ft ($15,960)
      case 'luxury': return 9.40; // $9.40 per sq ft ($22,560)
    }
  };
  const estimatedJobTotal = Math.round(roofSqFt * getTierRate());
  const apr = financingMonths === 48 ? 0.079 : 0.0;
  const monthlyPayment = Math.round(
    apr === 0
      ? estimatedJobTotal / financingMonths
      : (estimatedJobTotal * (1 + apr * (financingMonths / 12))) / financingMonths
  );

  // Handle plan checkout launch
  const handleOpenCheckout = (plan: WhopPlan) => {
    setActivePlanForCheckout(plan);
    setCheckoutStep('elements');

    if (plan.type === 'deposit') {
      whop.track('deposit_started', {
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        requiresCardOnFile: true
      });
    } else {
      whop.track('plan_selected', {
        planId: plan.id,
        planName: plan.name,
        amount: plan.price,
        type: plan.type
      });
    }
  };

  // Process Whop Payment Elements checkout
  const handleProcessWhopPayment = () => {
    if (!activePlanForCheckout) return;
    setCheckoutStep('processing');

    setTimeout(() => {
      if (activePlanForCheckout.requiresCardOnFile) {
        createWhopSetupIntent(checkoutCustomer.email);
      }
      setCheckoutStep('success');

      whop.track('deposit_started', {
        planId: activePlanForCheckout.id,
        amount: activePlanForCheckout.price,
        status: 'payment_element_succeeded',
        cardSavedOnFile: Boolean(activePlanForCheckout.requiresCardOnFile)
      });
    }, 1200);
  };

  // Handle Estimate Form Submission
  const handleEstimateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.phone) return;

    setFormLoading(true);
    try {
      const newLead = await submitWhopLead({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        zipCode: formData.zipCode,
        roofAge: formData.roofAge,
        serviceType: formData.serviceType,
        insuranceClaim: formData.insuranceClaim,
        notes: formData.notes,
        estimatedSqFt: roofSqFt
      });

      setNewLeadId(newLead.id);
      setFormSubmitted(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        zipCode: '78731',
        roofAge: '15-20 years',
        serviceType: 'Full Roof Replacement',
        insuranceClaim: false,
        notes: ''
      });
    } finally {
      setFormLoading(false);
    }
  };

  // Handle Zip Check
  const handleCheckZip = (e: React.FormEvent) => {
    e.preventDefault();
    setZipChecked(true);
    // Cover typical Texas/central zip prefixes or validate 5-digit
    const zipNum = parseInt(zipInput.replace(/\D/g, ''), 10);
    setIsCovered(zipInput.trim().length === 5 && !isNaN(zipNum));
  };

  // Handle Invoice API execution
  const handleTriggerInvoice = async () => {
    setInvoiceLoading(true);
    try {
      const inv = await createWhopInvoice({
        customerName: invoiceCustomerName,
        customerEmail: invoiceCustomerEmail,
        address: '3804 Wildwood Ridge, Austin, TX',
        totalContractAmount: invoiceTotalAmount,
        depositPaid: invoiceDeposit,
        insuranceCredit: invoiceInsurance,
        collectionMethod: invoiceMethod,
        milestoneDescription: 'Final Milestone (80%) - Complete GAF Timberline HDZ Roof Installation & Clean Sweep'
      });
      setLastCreatedInvoice(inv);
    } finally {
      setInvoiceLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 1. WHOP PITCH & LIVE DEPLOYMENT TOP CONTROL BAR */}
      <aside aria-label="Whop Pitch & Live Deployment Bar" className="bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="font-semibold text-amber-400">Whop Websites Template</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">Live target:</span>
            <a
              href="https://apexcrest.whop.app"
              target="_blank"
              rel="noreferrer"
              className="text-amber-400 font-mono hover:underline flex items-center gap-1"
            >
              apexcrest.whop.app
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="hidden sm:inline text-slate-500">·</span>
            <span className="hidden sm:inline text-slate-400">Merchant: <code className="font-mono text-slate-300">biz_apex_crest</code></span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDeploymentModal(true)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              Whop CLI / Deploy
            </button>
            <button
              onClick={() => setShowLeadsDrawer(true)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              Whop Leads ({leads.length})
            </button>
            <button
              onClick={() => setShowInvoicesModal(true)}
              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <CreditCard className="w-3.5 h-3.5 text-amber-400" />
              Invoice API Demo
            </button>
            <button
              onClick={() => setPixelDebuggerOpen(!pixelDebuggerOpen)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded text-xs font-mono flex items-center gap-1.5 transition-colors"
              title="Toggle Whop Pixel Debugger"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Pixel ({pixelEvents.length})
            </button>
          </div>
        </div>
      </aside>

      {/* 2. TOP BAR CONTRACT: [Wordmark] — [4-5 single-line links] — [1 Primary Action] */}
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark (single line, no subtitle clutter) */}
          <a href="#" className="flex items-center gap-2.5 text-xl font-bold tracking-tight text-white whitespace-nowrap shrink-0 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-slate-950 shadow-md shadow-amber-500/20">
              <Shield className="w-5 h-5 fill-slate-950" />
            </div>
            <span>Apex Crest Roofing</span>
          </a>

          {/* Zone 2: 4-5 single-line text links */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            <a href="#services" className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">Services</a>
            <a href="#plans" className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">Pricing & Escrow</a>
            <a href="#financing" className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">0% Financing</a>
            <a href="#service-area" className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">Service Area</a>
            <a href="#reviews" className="hover:text-amber-400 transition-colors whitespace-nowrap shrink-0">Reviews</a>
          </nav>

          {/* Zone 3: 1 Primary CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <a
              href="#estimate"
              className="px-5 py-2.5 text-sm font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg shadow-sm shadow-amber-500/20 transition-all hover:shadow-amber-500/30 whitespace-nowrap shrink-0"
            >
              Request an Estimate
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* 3. HERO SECTION */}
        <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-slate-800">
          <div className="absolute inset-0 bg-radial-[circle_at_top_right] from-amber-500/10 via-transparent to-transparent pointer-events-none" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Proposition & CTAs */}
              <div className="lg:col-span-7 space-y-6">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  <span>Central Texas Premier Contractor</span>
                  <span aria-hidden="true">·</span>
                  <span>GAF Master Elite Certified</span>
                  <span aria-hidden="true">·</span>
                  <span>Whop Verified</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white text-balance leading-[1.1]">
                  High-ticket roofing, transparent escrows & 0% financing.
                </h1>

                <p className="text-lg text-slate-300 max-w-2xl leading-relaxed text-pretty">
                  We engineer residential and commercial roofs built for 50+ years of severe weather.
                  Book aerial 4K drone diagnostics, lock your crew slot with a secure Whop escrow deposit,
                  or finance your entire project with 0% APR through Klarna and Splitit.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                  <a
                    href="#plans"
                    className="px-6 py-3.5 text-base font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg text-center transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <span>Book Diagnostic or Deposit</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>
                  <a
                    href="#estimate"
                    className="px-6 py-3.5 text-base font-semibold text-slate-200 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-center transition-all flex items-center justify-center gap-2"
                  >
                    <span>Request Free Estimate</span>
                  </a>
                </div>

                {/* Proof adjacency strip */}
                <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-4 text-slate-400">
                  <div>
                    <div className="text-2xl font-bold text-white font-mono tabular-nums">480+</div>
                    <div className="text-xs text-slate-400 mt-0.5">5-Star Verified Reviews</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-white font-mono tabular-nums">50-Yr</div>
                    <div className="text-xs text-slate-400 mt-0.5">Non-Prorated Warranty</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-amber-400 font-mono tabular-nums">$0 Down</div>
                    <div className="text-xs text-slate-400 mt-0.5">0% APR via Whop</div>
                  </div>
                </div>
              </div>

              {/* Right Column: Hero Visual Asset */}
              <div className="lg:col-span-5 relative">
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900 group aspect-[4/3]">
                  <img
                    src={HERO_IMAGE}
                    alt="Pristine architectural asphalt shingle roof on suburban luxury craftsman residence"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      // Fallback container in case of loading error
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  {/* Floating Trust Card */}
                  <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">GAF Master Elite #ME-90412</div>
                        <div className="text-slate-400">Top 2% of US Roofers · 2026 Certified</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-amber-400 font-mono font-bold">$100K</div>
                      <div className="text-slate-400 text-[10px]">Whop Buyer Guarantee</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. CORE SERVICES SECTION */}
        <section id="services" className="py-20 lg:py-28 bg-slate-900/40 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-16">
              <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                Certified Trade Capabilities
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight text-balance">
                Built to resist 130 mph winds, golf-ball hail, and extreme heat.
              </h2>
              <p className="text-slate-400 mt-4 text-base leading-relaxed">
                Every project is managed with digital drone scans, titanium synthetic underlayments,
                and manufacturer-backed warranties. Explore our primary contractor divisions below.
              </p>
            </div>

            {/* Asymmetric Bento Grid for Services */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Card 1: Full Roof Replacement (col-span-2 on large) */}
              <div
                onClick={() => whop.track('service_viewed', { serviceId: 'full_replacement', serviceName: 'Architectural Roof Replacement' })}
                className="lg:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-8 flex flex-col justify-between hover:border-slate-700 transition-all cursor-pointer group relative overflow-hidden"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-amber-400">01. FULL RESTORATION</span>
                    <span>GAF Golden Pledge 50-Year</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
                    Complete Architectural Roof Replacement
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-sm max-w-xl">
                    Full tear-off down to decking, rot inspection, ice & water shield in valleys,
                    starter strip shingles, and GAF Timberline HDZ or Owens Corning Duration shingles.
                    Includes full cleanup with industrial magnetic nail sweeps.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2 text-xs text-slate-400">
                    <span className="px-2.5 py-1 bg-slate-800 rounded">Class 4 Impact Resistant</span>
                    <span className="px-2.5 py-1 bg-slate-800 rounded">130 MPH Wind Warranty</span>
                    <span className="px-2.5 py-1 bg-slate-800 rounded">Lifetime Ridge Venting</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Deposit: <strong className="text-white">$500</strong> to lock crew & material</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCheckout(WHOP_PLANS[1]);
                    }}
                    className="text-amber-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                  >
                    Lock Deposit via Whop <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card 2: Drone & Thermal Diagnostic */}
              <div
                onClick={() => whop.track('service_viewed', { serviceId: 'drone_diagnostic', serviceName: 'Drone & Thermal Diagnostic' })}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 p-8 flex flex-col justify-between hover:border-slate-700 transition-all cursor-pointer group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-amber-400">02. DIAGNOSTICS</span>
                    <span>$149 Flat Fee</span>
                  </div>
                  <div className="h-40 rounded-xl overflow-hidden bg-slate-800 relative">
                    <img
                      src={DRONE_IMAGE}
                      alt="Drone performing thermal roof scan"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                    4K Drone & Thermal Inspection
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Pinpoint hidden water intrusion under shingles before drywall stains occur.
                    Complete insurance-ready documentation report.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-amber-400 font-semibold">100% Credited If Hired</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCheckout(WHOP_PLANS[0]);
                    }}
                    className="text-slate-300 hover:text-white font-medium"
                  >
                    Book Diagnostic ($149) →
                  </button>
                </div>
              </div>

              {/* Card 3: Emergency Leak Tarping */}
              <div
                onClick={() => whop.track('service_viewed', { serviceId: 'emergency_tarping', serviceName: 'Emergency Leak Shield' })}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 p-8 flex flex-col justify-between hover:border-slate-700 transition-all cursor-pointer group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-amber-400">03. EMERGENCY 24/7</span>
                    <span>$899 Fixed Fee</span>
                  </div>
                  <div className="h-40 rounded-xl overflow-hidden bg-slate-800 relative">
                    <img
                      src={REPAIR_IMAGE}
                      alt="Roofer weatherproofing chimney flashing"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                    Emergency Tarping & Leak Shield
                  </h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    4-hour guaranteed dispatch after high winds or fallen branches. Heavy-duty 20mil poly
                    secured with batten strips to prevent interior catastrophe.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Klarna: $224.75 × 4</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCheckout(WHOP_PLANS[2]);
                    }}
                    className="text-amber-400 font-semibold"
                  >
                    Dispatch Crew ($899) →
                  </button>
                </div>
              </div>

              {/* Card 4: Commercial & Standing Seam Metal (col-span-2 on large) */}
              <div
                onClick={() => whop.track('service_viewed', { serviceId: 'commercial_metal', serviceName: 'Commercial & Standing Seam Metal' })}
                className="lg:col-span-2 rounded-2xl bg-slate-900/80 border border-slate-800 p-8 flex flex-col justify-between hover:border-slate-700 transition-all cursor-pointer group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono text-amber-400">04. COMMERCIAL & SPECIALTY</span>
                    <span>TPO, PVC & 24-Ga Standing Seam</span>
                  </div>
                  <h3 className="text-2xl font-bold text-white group-hover:text-amber-400 transition-colors">
                    Commercial Low-Slope & Architectural Metal
                  </h3>
                  <p className="text-slate-300 leading-relaxed text-sm max-w-xl">
                    Engineered roofing systems for retail strips, office parks, and modern luxury residences.
                    Featuring heat-welded 60-mil TPO membranes, Carlisle SynTec certifications,
                    and concealed fastener standing seam metal panels.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2 text-xs text-slate-400">
                    <span className="px-2.5 py-1 bg-slate-800 rounded">Energy Star Cool Roof Certified</span>
                    <span className="px-2.5 py-1 bg-slate-800 rounded">30-Year Commercial NDL Available</span>
                    <span className="px-2.5 py-1 bg-slate-800 rounded">Commercial Whop Invoicing</span>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Contract sizes from $15,000 to $250,000+</span>
                  <a href="#estimate" className="text-amber-400 font-semibold flex items-center gap-1">
                    Request Commercial Proposal <ArrowRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 5. REAL PLANS & DIRECT WHOP CHECKOUT SECTION */}
        <section id="plans" className="py-20 lg:py-28 bg-slate-950 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-16 space-y-3">
              <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Whop Payment Elements Powered
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Transparent Plans & Escrow Deposits
              </h2>
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
                Zero surprise bills. Pay instantly with Apple Pay, Google Pay, or card.
                Project deposits save your card securely on file for the final balance milestone draw.
              </p>
            </div>

            {/* 3 Real Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
              {WHOP_PLANS.map((plan) => {
                const isDeposit = plan.type === 'deposit';
                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-8 flex flex-col justify-between transition-all relative ${
                      isDeposit
                        ? 'bg-slate-900 border-2 border-amber-500/80 shadow-xl shadow-amber-500/10'
                        : 'bg-slate-900/60 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {isDeposit && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Most Popular For Roof Jobs
                      </div>
                    )}

                    <div className="space-y-6">
                      <div>
                        <div className="text-xs font-mono text-amber-400 uppercase tracking-wide">
                          {plan.badge}
                        </div>
                        <h3 className="text-xl font-bold text-white mt-1">
                          {plan.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {plan.tagline}
                        </p>
                      </div>

                      <div className="pt-2">
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-extrabold text-white font-mono tabular-nums">
                            ${plan.price}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">
                            {plan.type === 'deposit' ? 'escrow deposit' : 'one-time'}
                          </span>
                        </div>
                        {plan.financingBadge && (
                          <div className="text-xs text-emerald-400 font-medium mt-1">
                            {plan.financingBadge}
                          </div>
                        )}
                        {plan.requiresCardOnFile && (
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>Card-on-file Setup Intent enabled</span>
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-800 pt-4">
                        {plan.description}
                      </p>

                      <div className="space-y-2.5 pt-2">
                        {plan.features.map((feat, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-300">
                            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-8">
                      <button
                        onClick={() => handleOpenCheckout(plan)}
                        className={`w-full py-3 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                          isDeposit
                            ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-md shadow-amber-500/20'
                            : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                        }`}
                      >
                        <CreditCard className="w-4 h-4" />
                        <span>Pay ${plan.price} via Whop</span>
                      </button>
                      <div className="text-[11px] text-center text-slate-500 mt-2">
                        Apple Pay · Google Pay · Klarna · Card
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 6. FINANCING CALLOUT & INTERACTIVE ROOFING CALCULATOR */}
        <section id="financing" className="py-20 lg:py-28 bg-slate-900/50 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Financing Explanation */}
              <div className="lg:col-span-5 space-y-6">
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  High-Ticket Flexible Payments
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight text-balance">
                  Replace now, pay over time with 0% APR.
                </h2>
                <p className="text-slate-300 text-sm leading-relaxed">
                  A new roof is a major investment ($8,000 to $25,000+). Through Whop Payments,
                  we automatically surface pre-qualified financing options right at checkout:
                </p>

                <div className="space-y-4 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold text-xs shrink-0">
                      K.
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">Klarna Monthly Financing</div>
                      <div className="text-xs text-slate-400">0% APR for 12 or 24 months with no prepayment penalties.</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                      S.
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">Splitit Installments</div>
                      <div className="text-xs text-slate-400">Split into monthly installments on your existing credit card line.</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs shrink-0">
                      A.
                    </div>
                    <div>
                      <div className="font-semibold text-white text-sm">Affirm & Afterpay Options</div>
                      <div className="text-xs text-slate-400">Instant soft-check decision with zero impact to credit score.</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400">
                  <strong className="text-white">Insurance Deductible Note:</strong> Deductibles can also be split
                  into manageable monthly payments via Whop.
                </div>
              </div>

              {/* Right Column: Interactive Financing Calculator */}
              <div className="lg:col-span-7">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-xl">
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-amber-400" />
                      <h3 className="text-lg font-bold text-white">Roof Replacement Estimator</h3>
                    </div>
                    <span className="text-xs font-mono text-slate-400">Whop Engine v5</span>
                  </div>

                  {/* Slider 1: Roof Size */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 font-medium">Estimated Roof Area (sq. ft.)</span>
                      <span className="font-mono text-amber-400 font-bold">{roofSqFt.toLocaleString()} sq. ft. (~{Math.round(roofSqFt / 100)} roofing squares)</span>
                    </div>
                    <input
                      type="range"
                      min={1200}
                      max={4500}
                      step={100}
                      value={roofSqFt}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setRoofSqFt(val);
                        whop.track('financing_calculated', { sqFt: val, shingleGrade, estimatedJobTotal });
                      }}
                      className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                    />
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>1,200 sq.ft (Bungalow)</span>
                      <span>2,800 sq.ft (Suburban 2-Story)</span>
                      <span>4,500 sq.ft (Estate)</span>
                    </div>
                  </div>

                  {/* Shingle Grade Selection */}
                  <div className="space-y-2">
                    <span className="text-xs text-slate-300 font-medium">Material / Shingle Class</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShingleGrade('architectural');
                          whop.track('financing_calculated', { sqFt: roofSqFt, shingleGrade: 'architectural', estimatedJobTotal });
                        }}
                        className={`p-3 rounded-lg border text-left text-xs transition-all ${
                          shingleGrade === 'architectural'
                            ? 'bg-amber-400/10 border-amber-500/50 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold text-white">Architectural</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">$5.25 / sq.ft</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShingleGrade('class4');
                          whop.track('financing_calculated', { sqFt: roofSqFt, shingleGrade: 'class4', estimatedJobTotal });
                        }}
                        className={`p-3 rounded-lg border text-left text-xs transition-all ${
                          shingleGrade === 'class4'
                            ? 'bg-amber-400/10 border-amber-500/50 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold text-white">Class 4 Hail Impact</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">$6.65 / sq.ft</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setShingleGrade('luxury');
                          whop.track('financing_calculated', { sqFt: roofSqFt, shingleGrade: 'luxury', estimatedJobTotal });
                        }}
                        className={`p-3 rounded-lg border text-left text-xs transition-all ${
                          shingleGrade === 'luxury'
                            ? 'bg-amber-400/10 border-amber-500/50 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <div className="font-semibold text-white">Luxury Slate Tile</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">$9.40 / sq.ft</div>
                      </button>
                    </div>
                  </div>

                  {/* Financing Term Selector */}
                  <div className="space-y-2">
                    <span className="text-xs text-slate-300 font-medium">Financing Term</span>
                    <div className="grid grid-cols-3 gap-2">
                      {[12, 24, 48].map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => setFinancingMonths(term as any)}
                          className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                            financingMonths === term
                              ? 'bg-amber-400 text-slate-950 font-semibold border-amber-400'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {term} Months {term <= 24 ? '(0% APR)' : '(7.9% APR)'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Output Display Card */}
                  <div className="bg-slate-950 rounded-xl p-5 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="text-xs text-slate-400">Estimated Total Contract</div>
                      <div className="text-2xl font-bold font-mono text-white tabular-nums">
                        ${estimatedJobTotal.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-500">Includes labor, permits & disposal</div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs text-amber-400 font-semibold">Your Monthly Payment via Whop</div>
                      <div className="text-3xl font-extrabold font-mono text-amber-400 tabular-nums">
                        ${monthlyPayment} <span className="text-xs font-normal text-slate-400">/ mo</span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {financingMonths <= 24 ? '0% APR · $0 Down' : 'Fixed 7.9% APR'}
                      </div>
                    </div>
                  </div>

                  <a
                    href="#estimate"
                    className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-colors"
                  >
                    Lock This Financing Quote In Estimate Form <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 7. INTERACTIVE SERVICE AREA CHECKER */}
        <section id="service-area" className="py-20 lg:py-28 bg-slate-950 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mb-12">
              <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                Regional Coverage & Radius Check
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Serving Greater Austin & Central Texas Counties
              </h2>
              <p className="text-slate-400 mt-3 text-sm leading-relaxed">
                We operate multiple dedicated mobile installation and emergency repair crews throughout
                Travis, Williamson, Hays, Bastrop, and Burnet counties. Enter your zip code to confirm coverage:
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Zip Checker Input Form */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-white text-base">Check Your Roof Address</h3>
                <form onSubmit={handleCheckZip} className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      maxLength={5}
                      value={zipInput}
                      onChange={(e) => setZipInput(e.target.value)}
                      placeholder="e.g. 78731"
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
                  >
                    Check Area
                  </button>
                </form>

                {zipChecked && (
                  <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                    isCovered
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-red-950/40 border-red-500/40 text-red-200'
                  }`}>
                    {isCovered ? (
                      <div className="space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Priority Dispatch Active for Zip {zipInput}</span>
                        </div>
                        <p className="text-slate-300">
                          Your property is within our standard 24-hour crew response zone.
                          No travel surcharge applied to drone inspections or emergency tarping.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="font-bold flex items-center gap-1.5 text-red-400">
                          <AlertCircle className="w-4 h-4" />
                          <span>Outside Standard Zone</span>
                        </div>
                        <p className="text-slate-300">
                          We service commercial and large residential replacements outside standard radius upon request.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-2 text-xs text-slate-400 space-y-1">
                  <div><strong>Main Hub:</strong> 10401 Research Blvd, Austin, TX 78759</div>
                  <div><strong>Emergency Hotline:</strong> (512) 847-ROOF (7663)</div>
                </div>
              </div>

              {/* Service Areas Grid */}
              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                {[
                  { name: 'Central Austin', zips: '78701, 78703, 78705', status: 'Priority' },
                  { name: 'West Lake Hills', zips: '78746, 78733', status: 'Priority' },
                  { name: 'Lakeway & Bee Cave', zips: '78734, 78738', status: 'Priority' },
                  { name: 'Round Rock & Pflugerville', zips: '78664, 78665, 78660', status: 'Priority' },
                  { name: 'Cedar Park & Leander', zips: '78613, 78641', status: 'Priority' },
                  { name: 'Georgetown', zips: '78626, 78628, 78633', status: 'Active' },
                  { name: 'Dripping Springs', zips: '78620', status: 'Active' },
                  { name: 'Buda & Kyle', zips: '78610, 78640', status: 'Active' },
                  { name: 'San Marcos Commercial', zips: '78666', status: 'Commercial' },
                ].map((area, i) => (
                  <div key={i} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-1">
                    <div className="font-semibold text-white">{area.name}</div>
                    <div className="font-mono text-slate-500 text-[11px]">{area.zips}</div>
                    <div className="text-[10px] text-amber-400 font-medium">{area.status} Dispatch</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 8. REVIEWS & TRUST SECTION */}
        <section id="reviews" className="py-20 lg:py-28 bg-slate-900/40 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-16">
              <div>
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2">
                  Verified Homeowner Proof
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Rated 4.9/5 from 480+ local roofs.
                </h2>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span>GAF Master Elite Contractor</span>
                <span aria-hidden="true">·</span>
                <span>Owens Corning Platinum</span>
                <span aria-hidden="true">·</span>
                <span>BBB A+ Accredited</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  quote: "After the May hail storm, two roofers gave me confusing handwritten quotes. Apex Crest flew a 4K drone within 2 hours, sent a thermal leak PDF, and let me pay the $500 deposit right on my phone. The entire GAF roof was done in a day and a half.",
                  author: "Dr. Jonathan Mitchell",
                  location: "West Lake Hills, Austin",
                  roofDetails: "3,400 sq.ft Timberline HDZ Charcoal",
                  rating: 5
                },
                {
                  quote: "Whop financing made a $16,000 unexpected roof replacement painless. We selected the 24-month 0% option with Klarna through their checkout in 30 seconds. Zero paperwork back-and-forth. Clean crew, zero nails in our driveway.",
                  author: "Sarah & Brian Vance",
                  location: "Lakeway, TX",
                  roofDetails: "2,850 sq.ft Class 4 Impact Shingles",
                  rating: 5
                },
                {
                  quote: "A large oak branch pierced our ridge cap at 9 PM on a Sunday. Apex Crest had an emergency tarp crew at our house by midnight. The $899 flat fee covered everything and stopped a catastrophic ceiling collapse.",
                  author: "Robert Chen",
                  location: "Barton Creek, Austin",
                  roofDetails: "Emergency Leak Shield + Tarping",
                  rating: 5
                }
              ].map((rev, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center text-amber-400 text-sm">
                      {'★'.repeat(rev.rating)}
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">
                      "{rev.quote}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800/80">
                    <div className="font-semibold text-white text-sm">{rev.author}</div>
                    <div className="text-xs text-slate-400">{rev.location}</div>
                    <div className="text-[11px] font-mono text-amber-400/80 mt-1">{rev.roofDetails}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 9. "REQUEST AN ESTIMATE" FORM WIRED TO WHOP LEADS API */}
        <section id="estimate" className="py-20 lg:py-28 bg-slate-950">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden">
              <div className="max-w-2xl mx-auto text-center space-y-3 mb-10">
                <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                  Wired to Whop Leads API
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                  Request an On-Site Roofing Estimate
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Every submission instantly enters our certified estimator queue via Whop's Leads API.
                  We provide free satellite aerial measurements and preliminary estimates within 4 business hours.
                </p>
              </div>

              {formSubmitted ? (
                <div className="p-8 bg-emerald-950/40 border border-emerald-500/40 rounded-2xl text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Estimate Request Received!</h3>
                  <p className="text-sm text-slate-300 max-w-lg mx-auto">
                    Your quote request has been transmitted directly to our Whop CRM. An estimator has been dispatched
                    to prepare your preliminary satellite scan report.
                  </p>
                  <div className="inline-block px-3 py-1.5 bg-slate-900 rounded font-mono text-xs text-amber-400 border border-slate-700">
                    Whop Lead ID: {newLeadId}
                  </div>
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormSubmitted(false);
                        setShowLeadsDrawer(true);
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
                    >
                      View in Whop Leads CRM Drawer →
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEstimateSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Homeowner / Property Owner Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="John & Mary Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Email Address *</label>
                      <input
                        type="email"
                        required
                        placeholder="john.doe@example.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Phone Number *</label>
                      <input
                        type="tel"
                        required
                        placeholder="(512) 000-0000"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Service Needed</label>
                      <select
                        value={formData.serviceType}
                        onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="Full Roof Replacement">Full Architectural Roof Replacement</option>
                        <option value="Drone & Thermal Roof Inspection">4K Drone & Thermal Inspection ($149)</option>
                        <option value="Emergency Storm Tarping">Emergency Storm Tarping & Repair ($899)</option>
                        <option value="Commercial TPO / Metal">Commercial Low-Slope / Standing Seam</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Street Address</label>
                      <input
                        type="text"
                        placeholder="1234 Highland Crest Dr"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Zip Code</label>
                      <input
                        type="text"
                        maxLength={5}
                        placeholder="78731"
                        value={formData.zipCode}
                        onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-300">Estimated Roof Age</label>
                      <select
                        value={formData.roofAge}
                        onChange={(e) => setFormData({ ...formData, roofAge: e.target.value })}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-400"
                      >
                        <option value="Under 5 years">Under 5 years</option>
                        <option value="5-10 years">5 to 10 years</option>
                        <option value="11-15 years">11 to 15 years</option>
                        <option value="15-20 years">15 to 20 years</option>
                        <option value="Over 20 years">Over 20 years / Leaking</option>
                        <option value="Unknown">Not sure</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3 pt-6">
                      <input
                        type="checkbox"
                        id="insuranceCheck"
                        checked={formData.insuranceClaim}
                        onChange={(e) => setFormData({ ...formData, insuranceClaim: e.target.checked })}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-0 accent-amber-400"
                      />
                      <label htmlFor="insuranceCheck" className="text-xs text-slate-300 cursor-pointer">
                        This is an active or potential insurance storm damage claim
                      </label>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-300">Project Notes or Visible Damage (Optional)</label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Recent hail storm in Lakeway, missing shingles along south ridge, water stain in guest bedroom ceiling..."
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full py-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
                  >
                    {formLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Sending to Whop Leads API...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit to Whop Leads API & Dispatch Queue</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-3 text-xs text-slate-500 pt-1">
                    <span>No credit card required for estimate</span>
                    <span>·</span>
                    <span>100% Free Satellite Report</span>
                    <span>·</span>
                    <span>Direct Whop API Sync</span>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* 10. QUIET EDITORIAL FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-800 text-slate-400 text-xs py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-white font-bold text-base">
              <div className="w-7 h-7 rounded bg-amber-500 flex items-center justify-center text-slate-950">
                <Shield className="w-4 h-4 fill-slate-950" />
              </div>
              <span>Apex Crest Roofing & Restoration</span>
            </div>

            <div className="flex flex-wrap gap-6 text-xs text-slate-400">
              <span>TX Contractor License #RC-481920</span>
              <span>·</span>
              <span>Fully Insured & Bonded ($2M General Liability)</span>
              <span>·</span>
              <span>GAF Master Elite Contractor #ME-90412</span>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <div>
              © 2026 Apex Crest Roofing LLC. Built on Whop Websites. Deployed at{' '}
              <a href="https://apexcrest.whop.app" target="_blank" rel="noreferrer" className="text-amber-400 hover:underline">
                apexcrest.whop.app
              </a>.
            </div>
            <div className="flex gap-4">
              <a href="#" className="hover:text-slate-300">Privacy Policy</a>
              <a href="#" className="hover:text-slate-300">Whop Payment Terms</a>
              <a href="#" className="hover:text-slate-300">Buyer Protection Policy</a>
            </div>
          </div>
        </div>
      </footer>

      {/* =========================================================================
          MODALS & INTERACTIVE WHOP COMPONENT DRAWERS
      ========================================================================= */}

      {/* A. WHOP PAYMENT ELEMENTS CHECKOUT MODAL */}
      {activePlanForCheckout && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative">
            <button
              onClick={() => setActivePlanForCheckout(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {checkoutStep === 'elements' && (
              <div className="space-y-6">
                <div>
                  <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">
                    Whop Unified Checkout
                  </div>
                  <h3 className="text-xl font-bold text-white mt-1">
                    {activePlanForCheckout.name}
                  </h3>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-3xl font-extrabold text-white font-mono">
                      ${activePlanForCheckout.price}
                    </span>
                    <span className="text-xs text-slate-400">
                      {activePlanForCheckout.type === 'deposit' ? 'escrow deposit' : 'one-time payment'}
                    </span>
                  </div>
                </div>

                {/* ELEMENT 1: Whop ExpressCheckoutElement (Apple Pay / Google Pay) */}
                <div className="space-y-2">
                  <div className="text-[11px] font-medium text-slate-400">
                    ExpressCheckoutElement (Instant One-Tap)
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleProcessWhopPayment}
                      className="py-2.5 px-3 bg-black hover:bg-neutral-900 text-white border border-neutral-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Pay with Pay</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleProcessWhopPayment}
                      className="py-2.5 px-3 bg-white hover:bg-neutral-100 text-neutral-900 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span className="font-bold">G</span>
                      <span>Pay</span>
                    </button>
                  </div>
                </div>

                <div className="relative flex items-center justify-center">
                  <div className="border-t border-slate-800 w-full" />
                  <span className="bg-slate-900 px-3 text-[10px] text-slate-500 uppercase tracking-wider font-mono absolute">
                    Or pay with card & financing
                  </span>
                </div>

                {/* ELEMENT 2: Whop PaymentElement (Card / Klarna / Splitit) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>PaymentElement (Whop Native)</span>
                    <span className="text-amber-400">No custom forms</span>
                  </div>

                  <div className="flex border border-slate-800 rounded-lg p-1 bg-slate-950">
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentTab('card')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                        selectedPaymentTab === 'card' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Credit / Debit
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentTab('klarna')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                        selectedPaymentTab === 'klarna' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Klarna
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPaymentTab('splitit')}
                      className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${
                        selectedPaymentTab === 'splitit' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Splitit (0%)
                    </button>
                  </div>

                  {selectedPaymentTab === 'card' && (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">Cardholder Name</label>
                        <input
                          type="text"
                          value={checkoutCustomer.name}
                          onChange={(e) => setCheckoutCustomer({ ...checkoutCustomer, name: e.target.value })}
                          className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400">Card Number (Whop Secure Token)</label>
                        <div className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 font-mono flex items-center justify-between">
                          <span>{checkoutCustomer.cardNumber}</span>
                          <span className="text-amber-400 font-bold">VISA</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[11px] text-slate-400">Expires</label>
                          <div className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-300 font-mono">
                            {checkoutCustomer.expDate}
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400">CVC</label>
                          <div className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-slate-300 font-mono">
                            {checkoutCustomer.cvv}
                          </div>
                        </div>
                      </div>

                      {activePlanForCheckout.requiresCardOnFile && (
                        <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded text-[11px] text-amber-200 flex items-start gap-2">
                          <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <span>
                            <strong>Setup Intent Active:</strong> This deposit saves this card on file.
                            The final balance will be billed via Whop Invoices upon final inspection.
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {selectedPaymentTab === 'klarna' && (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                      <div className="font-semibold text-white">Klarna Pay in 4 or Monthly Financing</div>
                      <p className="text-slate-400 text-xs">
                        Split this payment into interest-free installments or 0% APR financing up to 24 months.
                      </p>
                      <div className="p-2.5 bg-pink-500/10 border border-pink-500/20 rounded text-pink-300 font-mono text-xs">
                        4 installments of ${(activePlanForCheckout.price / 4).toFixed(2)} USD
                      </div>
                    </div>
                  )}

                  {selectedPaymentTab === 'splitit' && (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                      <div className="font-semibold text-white">Splitit Credit Card Installments</div>
                      <p className="text-slate-400 text-xs">
                        Use your existing Visa or Mastercard credit line without applying for a new credit loan.
                      </p>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleProcessWhopPayment}
                  className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-sm transition-colors"
                >
                  Confirm & Pay ${activePlanForCheckout.price} USD
                </button>

                {/* ELEMENT 3: Whop BrandingElement (Required) */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                    <span>Powered by <strong>Whop Payments</strong></span>
                  </div>
                  <span>PCI-DSS Level 1 · 256-bit SSL</span>
                </div>
              </div>
            )}

            {checkoutStep === 'processing' && (
              <div className="py-12 text-center space-y-4">
                <RefreshCw className="w-8 h-8 text-amber-400 animate-spin mx-auto" />
                <h4 className="text-lg font-bold text-white">Processing with Whop Payments...</h4>
                <p className="text-xs text-slate-400">
                  {activePlanForCheckout.requiresCardOnFile
                    ? 'Creating Whop Setup Intent & tokenizing card on file...'
                    : 'Authenticating charge through Whop unified gateway...'}
                </p>
              </div>
            )}

            {checkoutStep === 'success' && (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h4 className="text-xl font-bold text-white">Payment Confirmed!</h4>
                <p className="text-xs text-slate-300 max-w-sm mx-auto">
                  {activePlanForCheckout.type === 'deposit'
                    ? 'Deposit secured. Your crew slot is locked and card saved on file via Whop Setup Intent (seti_whop_889213).'
                    : `Your ${activePlanForCheckout.name} order has been confirmed. Confirmation dispatched to ${checkoutCustomer.email}.`}
                </p>

                {activePlanForCheckout.requiresCardOnFile && (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-left text-xs space-y-1">
                    <div className="font-semibold text-white">Card-On-File Token Generated</div>
                    <div className="font-mono text-slate-400 text-[11px]">Token: pm_whop_visa_4242</div>
                    <div className="text-[11px] text-amber-400">Ready for automated completion milestone invoice billing!</div>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePlanForCheckout(null);
                      if (activePlanForCheckout.requiresCardOnFile) {
                        setShowInvoicesModal(true);
                      }
                    }}
                    className="flex-1 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg transition-colors"
                  >
                    {activePlanForCheckout.requiresCardOnFile ? 'Inspect Final Invoice Workflow →' : 'Done'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* B. CONTRACTOR JOB → FINAL INVOICE WORKFLOW MODAL */}
      {showInvoicesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowInvoicesModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">
                Whop Invoices API · Deposit → Job → Balance Workflow
              </div>
              <h3 className="text-xl font-bold text-white mt-1">
                Contractor Completion Billing Engine
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Demonstrates how card-on-file from the $500 deposit is billed for the final balance upon job sign-off.
              </p>
            </div>

            {/* Workflow Progress Steps */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2.5 bg-slate-950 border border-emerald-500/30 rounded-lg">
                <div className="text-emerald-400 font-bold">Step 1: Deposit Paid</div>
                <div className="text-[10px] text-slate-400">$500 + Card Tokenized</div>
              </div>
              <div className="p-2.5 bg-slate-950 border border-emerald-500/30 rounded-lg">
                <div className="text-emerald-400 font-bold">Step 2: Roof Installed</div>
                <div className="text-[10px] text-slate-400">City Inspection Signed</div>
              </div>
              <div className="p-2.5 bg-slate-950 border border-amber-500/50 rounded-lg">
                <div className="text-amber-400 font-bold">Step 3: Final Balance</div>
                <div className="text-[10px] text-slate-400">Whop Invoices API</div>
              </div>
            </div>

            {/* Financial Ledger */}
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Contract Total (GAF Timberline 50-Yr)</span>
                <span className="font-mono text-white font-bold">${invoiceTotalAmount.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Initial Whop Escrow Deposit</span>
                <span className="font-mono text-emerald-400">-${invoiceDeposit.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Insurance Supplement Credit</span>
                <span className="font-mono text-emerald-400">-${invoiceInsurance.toLocaleString()} USD</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-sm">
                <span className="font-bold text-white">Final Balance Due</span>
                <span className="font-mono text-amber-400 font-extrabold text-base">
                  ${(invoiceTotalAmount - invoiceDeposit - invoiceInsurance).toLocaleString()} USD
                </span>
              </div>
            </div>

            {/* Invoicing Options */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-300">Choose Whop Invoices API Collection Method:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setInvoiceMethod('charge_automatically')}
                  className={`p-3.5 rounded-xl border text-left text-xs transition-all ${
                    invoiceMethod === 'charge_automatically'
                      ? 'bg-amber-400/10 border-amber-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>Auto-Charge Stored Card</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Calls Whop API with <code className="font-mono text-amber-400">charge_automatically</code> using stored card <code className="font-mono">pm_whop_visa_4242</code>.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInvoiceMethod('send_invoice')}
                  className={`p-3.5 rounded-xl border text-left text-xs transition-all ${
                    invoiceMethod === 'send_invoice'
                      ? 'bg-amber-400/10 border-amber-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <Mail className="w-4 h-4 text-blue-400" />
                    <span>Send Whop Hosted Link</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Calls Whop API with <code className="font-mono text-blue-400">send_invoice</code>. Dispatches link with 24-mo Klarna/Affirm financing option.
                  </div>
                </button>
              </div>
            </div>

            <button
              type="button"
              disabled={invoiceLoading}
              onClick={handleTriggerInvoice}
              className="w-full py-3.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
            >
              {invoiceLoading
                ? 'Calling Whop Invoices API...'
                : invoiceMethod === 'charge_automatically'
                ? `Execute 1-Click Auto-Charge ($${(invoiceTotalAmount - invoiceDeposit - invoiceInsurance).toLocaleString()} USD)`
                : 'Generate & Dispatch Whop Hosted Invoice Link'}
            </button>

            {lastCreatedInvoice && (
              <div className="p-4 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    Whop Invoices API Executed Successfully!
                  </span>
                  <span className="font-mono text-slate-400 text-[11px]">{lastCreatedInvoice.id}</span>
                </div>
                <div className="text-slate-300">
                  {lastCreatedInvoice.collectionMethod === 'charge_automatically'
                    ? `Payment of $${lastCreatedInvoice.finalBalanceDue.toLocaleString()} USD settled automatically via stored Visa •••• 4242.`
                    : `Hosted Whop payment link generated: ${lastCreatedInvoice.hostedInvoiceUrl}`}
                </div>
                {lastCreatedInvoice.transactionHash && (
                  <div className="font-mono text-[11px] text-slate-500">
                    Whop Tx Hash: {lastCreatedInvoice.transactionHash}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* C. WHOP LEADS CRM DRAWER */}
      {showLeadsDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full p-6 space-y-6 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">
                  Whop Account CRM
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Incoming Leads ({leads.length})
                </h3>
              </div>
              <button
                onClick={() => setShowLeadsDrawer(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {leads.map((ld) => (
                <div key={ld.id} className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-white text-sm">{ld.name}</div>
                      <div className="text-slate-400 text-[11px] flex items-center gap-2 mt-0.5">
                        <span>{ld.email}</span>
                        <span>·</span>
                        <span>{ld.phone}</span>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] text-amber-400 px-2 py-0.5 bg-slate-900 rounded border border-slate-800">
                      {ld.id}
                    </span>
                  </div>

                  <div className="text-slate-300">
                    <strong>Service:</strong> {ld.serviceType}
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    <strong>Address:</strong> {ld.address} (Zip: {ld.zipCode}) · <strong>Roof Age:</strong> {ld.roofAge}
                  </div>
                  {ld.insuranceClaim && (
                    <div className="text-[11px] text-amber-400 font-semibold">
                      ⚡ Active Insurance Storm Claim
                    </div>
                  )}
                  {ld.notes && (
                    <div className="p-2 bg-slate-900 rounded text-slate-300 text-[11px] italic">
                      "{ld.notes}"
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-900">
                    <span>Captured: {new Date(ld.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(ld.id, ld.id)}
                      className="text-amber-400 hover:underline flex items-center gap-1"
                    >
                      {copiedText === ld.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Copy Whop Lead ID
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
              <span>Wired to: <code className="font-mono text-amber-400">POST /api/v5/leads</code></span>
              <button
                onClick={() => setShowLeadsDrawer(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* D. WHOP PIXEL DEBUGGER HUD (FLOATING IN CORNER) */}
      <div className="fixed bottom-4 right-4 z-50">
        {pixelDebuggerOpen ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-96 max-h-[500px] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-xs text-white">Whop Pixel & Analytics Inspector</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => clearPixelLogs()}
                  className="p-1 text-slate-400 hover:text-white text-[10px]"
                  title="Clear events"
                >
                  Clear
                </button>
                <button
                  onClick={() => setPixelDebuggerOpen(false)}
                  className="p-1 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-2 bg-slate-950/60 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>SDK: <code className="font-mono text-amber-400">window.whop.track</code></span>
              <span className="font-mono tabular-nums">{pixelEvents.length} events logged</span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
              {pixelEvents.length === 0 ? (
                <div className="text-slate-500 text-center py-6">No pixel events fired yet.</div>
              ) : (
                pixelEvents.map((evt) => (
                  <div key={evt.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-400 font-bold text-[11px]">{evt.eventName}</span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <pre className="text-[10px] text-slate-300 overflow-x-auto p-1 bg-slate-900/60 rounded">
                      {JSON.stringify(evt.payload, null, 2)}
                    </pre>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <button
            onClick={() => setPixelDebuggerOpen(true)}
            className="px-3 py-2 bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-slate-700 rounded-full shadow-lg text-xs font-mono font-medium flex items-center gap-2 backdrop-blur-md transition-all hover:scale-105"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>whop.track ({pixelEvents.length})</span>
          </button>
        )}
      </div>

      {/* E. WHOP CLI & DEPLOYMENT BLUEPRINT MODAL */}
      {showDeploymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowDeploymentModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider">
                Whop Websites Deployment & CLI Guide
              </div>
              <h3 className="text-xl font-bold text-white mt-1">
                Deploying to <code className="text-amber-400 font-mono">apexcrest.whop.app</code>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                How to scaffold and ship this high-ticket roofing template live to Whop Websites via CLI or Whop AI.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-200">1. Install Whop CLI</div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">curl -sL https://whop.sh | bash</span>
                  <button
                    onClick={() => handleCopy('curl -sL https://whop.sh | bash', 'cli_install')}
                    className="text-amber-400 hover:text-amber-300 text-[11px]"
                  >
                    {copiedText === 'cli_install' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-200">2. Scaffold Roofing Template</div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">whop init --template roofing --name "Apex Crest"</span>
                  <button
                    onClick={() => handleCopy('whop init --template roofing --name "Apex Crest"', 'cli_init')}
                    className="text-amber-400 hover:text-amber-300 text-[11px]"
                  >
                    {copiedText === 'cli_init' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-200">3. Deploy Live to whop.app</div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">whop deploy --subdomain apexcrest --production</span>
                  <button
                    onClick={() => handleCopy('whop deploy --subdomain apexcrest --production', 'cli_deploy')}
                    className="text-amber-400 hover:text-amber-300 text-[11px]"
                  >
                    {copiedText === 'cli_deploy' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2 text-xs">
                <div className="font-semibold text-white">Whop Payment Elements Config</div>
                <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto p-2 bg-slate-900 rounded">
{`{
  "merchant": "biz_apex_crest_roofing",
  "currency": "USD",
  "elements": {
    "CheckoutElement": true,
    "ExpressCheckoutElement": { "applePay": true, "googlePay": true },
    "BrandingElement": { "buyerProtection": true, "style": "dark" }
  },
  "financing": ["klarna", "splitit", "affirm"]
}`}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDeploymentModal(false)}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-lg transition-colors"
              >
                Close Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
