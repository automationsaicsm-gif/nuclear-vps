import { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import toast, { Toaster } from 'react-hot-toast';

type Step = 'plan' | 'configure' | 'payment';
type Cycle = 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
type Location = 'LONDON' | 'NEW_YORK';

interface Plan {
  id: string;
  name: string;
  slug: string;
  category: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  annualPrice: number;
  ram: string;
  cpu: string;
  storage: string;
  platforms: number;
  os: string[];
  featured: boolean;
  linuxAvailable: boolean;
}

const cyclePriceKey: Record<Cycle, 'monthlyPrice' | 'quarterlyPrice' | 'annualPrice'> = {
  MONTHLY: 'monthlyPrice',
  QUARTERLY: 'quarterlyPrice',
  ANNUALLY: 'annualPrice',
};

const cycleLabels: Record<Cycle, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUALLY: 'Annual',
};

export default function OrderWizard() {
  const [step, setStep] = useState<Step>('plan');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [cycle, setCycle] = useState<Cycle>('MONTHLY');
  const [location, setLocation] = useState<Location>('LONDON');
  const [os, setOs] = useState('Windows 2022');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState('');
  const [useCredit, setUseCredit] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [tab, setTab] = useState<'vps' | 'servers'>('vps');

  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const planSlugParam = urlParams.get('plan');
  const cycleParam = urlParams.get('cycle') as Cycle | null;

  useEffect(() => {
    Promise.all([api.get('/plans'), api.get('/auth/me')]).then(([plansRes, userRes]) => {
      const allPlans = plansRes.data.data || [];
      setPlans(allPlans);
      setCreditBalance(userRes.data.data?.creditBalance || 0);

      if (planSlugParam) {
        const found = allPlans.find((p: Plan) => p.slug === planSlugParam);
        if (found) {
          setSelectedPlan(found);
          setTab(found.category === 'TRADING_VPS' ? 'vps' : 'servers');
          if (cycleParam) setCycle(cycleParam);
          setStep('configure');
        }
      }
    });
  }, []);

  const getPrice = (plan: Plan) => plan[cyclePriceKey[cycle]];

  const totalPrice = () => {
    if (!selectedPlan) return 0;
    let price = getPrice(selectedPlan);
    if (couponDiscount) price -= price * (couponDiscount / 100);
    if (useCredit) price = Math.max(0, price - creditBalance);
    return price;
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const r = await api.post('/orders/apply-coupon', { code: couponCode });
      setCouponDiscount(r.data.data.discount);
      setCouponApplied(r.data.data.code);
      toast.success(`Coupon applied: ${r.data.data.discount}% off`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const placeOrder = async () => {
    if (!selectedPlan) return;
    setProcessing(true);
    try {
      const orderRes = await api.post('/orders/create', {
        planId: selectedPlan.id,
        billingCycle: cycle,
        location,
        os,
        couponCode: couponApplied || undefined,
        useCredit,
      });

      const { invoiceId, planId, billingCycle } = orderRes.data.data;

      // Simulate payment with credit or create a Stripe intent
      if (totalPrice() <= 0) {
        toast.success('Order placed successfully with account credit!');
        setTimeout(() => window.location.href = '/dashboard/services', 1500);
      } else {
        try {
          await api.post('/payments/stripe/create-intent', { invoiceId, planId, location, os, billingCycle });
          toast.success('Order created! Redirecting to billing...');
          setTimeout(() => window.location.href = '/dashboard/billing', 1500);
        } catch (payErr) {
          toast.error(getErrorMessage(payErr));
          setTimeout(() => window.location.href = '/dashboard/billing', 2000);
        }
      }
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setProcessing(false);
    }
  };

  const filteredPlans = plans.filter((p) =>
    tab === 'vps' ? p.category === 'TRADING_VPS' : p.category === 'TRADING_SERVER'
  );

  return (
    <div className="max-w-4xl">
      <Toaster position="top-right" toastOptions={{ style: { background: '#252272', color: '#C7D2FE', border: '1px solid #312E81' } }} />

      {/* Progress steps */}
      <div className="flex items-center gap-4 mb-8">
        {(['plan', 'configure', 'payment'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-heading font-black text-sm ${
              step === s ? 'bg-coral text-white' :
              ['plan', 'configure', 'payment'].indexOf(step) > i ? 'bg-green-500 text-white' : 'bg-[#312E81] text-text-muted'
            }`}>{i + 1}</div>
            <span className={`text-sm font-heading font-bold capitalize ${step === s ? 'text-coral' : 'text-text-muted'}`}>{s === 'plan' ? 'Select Plan' : s === 'configure' ? 'Configure' : 'Review & Pay'}</span>
            {i < 2 && <div className={`w-8 h-0.5 ${['plan', 'configure', 'payment'].indexOf(step) > i ? 'bg-coral' : 'bg-[#312E81]'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Plan */}
      {step === 'plan' && (
        <div>
          <div className="flex gap-4 mb-6">
            <div className="flex bg-deep border border-[#312E81] rounded-full p-1">
              {(['vps', 'servers'] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)} className={`px-5 py-2 rounded-full font-heading font-bold text-sm transition-all ${tab === t ? 'bg-coral text-white' : 'text-text-muted hover:text-text-body'}`}>
                  {t === 'vps' ? 'Trading VPS' : 'Trading Servers'}
                </button>
              ))}
            </div>

            <div className="flex bg-deep border border-[#312E81] rounded-full p-1 gap-1">
              {(['MONTHLY', 'QUARTERLY', 'ANNUALLY'] as Cycle[]).map((c) => (
                <button key={c} onClick={() => setCycle(c)} className={`px-4 py-2 rounded-full font-heading font-bold text-xs transition-all ${cycle === c ? 'bg-coral text-white' : 'text-text-muted hover:text-text-body'}`}>
                  {cycleLabels[c]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            {filteredPlans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan)}
                className={`cursor-pointer border rounded-2xl p-6 transition-all duration-200 ${
                  selectedPlan?.id === plan.id ? 'border-coral bg-coral/5' : 'border-[#312E81] bg-surface hover:border-coral/50'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPlan?.id === plan.id ? 'border-coral' : 'border-[#312E81]'}`}>
                      {selectedPlan?.id === plan.id && <div className="w-2 h-2 rounded-full bg-coral" />}
                    </div>
                    <div>
                      <h3 className="font-heading font-black text-text-h">{plan.name}</h3>
                      <p className="text-text-muted text-sm">{plan.ram} · {plan.cpu} · {plan.storage}</p>
                    </div>
                    {plan.featured && <span className="bg-coral/10 text-coral border border-coral/30 text-xs px-2 py-0.5 rounded-full font-bold">Most Popular</span>}
                  </div>
                  <div className="text-right">
                    <p className="font-heading font-black text-coral text-2xl">${getPrice(plan)}</p>
                    <p className="text-text-muted text-xs">/month</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={() => selectedPlan && setStep('configure')}
              disabled={!selectedPlan}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 'configure' && selectedPlan && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-surface border border-[#312E81] rounded-2xl p-6">
              <h3 className="font-heading font-black text-text-h mb-4">Data Center Location</h3>

              {/* London */}
              <div
                onClick={() => setLocation('LONDON')}
                className={`cursor-pointer border rounded-xl p-4 mb-3 transition-all ${location === 'LONDON' ? 'border-coral bg-coral/5' : 'border-[#312E81] hover:border-coral/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${location === 'LONDON' ? 'border-coral' : 'border-[#312E81]'}`}>
                    {location === 'LONDON' && <div className="w-2 h-2 rounded-full bg-coral" />}
                  </div>
                  <div>
                    <p className="font-heading font-bold text-text-h text-sm">🇬🇧 London, UK</p>
                    <p className="text-text-muted text-xs mt-0.5">Best for most European &amp; Asian brokers</p>
                  </div>
                </div>
              </div>

              {/* New York */}
              <div
                onClick={() => setLocation('NEW_YORK')}
                className={`cursor-pointer border rounded-xl p-4 transition-all ${location === 'NEW_YORK' ? 'border-coral bg-coral/5' : 'border-[#312E81] hover:border-coral/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${location === 'NEW_YORK' ? 'border-coral' : 'border-[#312E81]'}`}>
                    {location === 'NEW_YORK' && <div className="w-2 h-2 rounded-full bg-coral" />}
                  </div>
                  <div>
                    <p className="font-heading font-bold text-text-h text-sm">🇺🇸 New York, US</p>
                    <p className="text-text-muted text-xs mt-0.5">Best for US &amp; Latin American brokers</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-surface border border-[#312E81] rounded-2xl p-6">
              <h3 className="font-heading font-black text-text-h mb-4">Operating System</h3>
              {selectedPlan.os.map((o) => (
                <div
                  key={o}
                  onClick={() => setOs(o)}
                  className={`cursor-pointer border rounded-xl p-3 mb-2 last:mb-0 transition-all ${os === o ? 'border-coral bg-coral/5' : 'border-[#312E81] hover:border-coral/50'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${os === o ? 'border-coral' : 'border-[#312E81]'}`}>
                      {os === o && <div className="w-1.5 h-1.5 rounded-full bg-coral" />}
                    </div>
                    <span className="text-text-body text-sm">{o}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button onClick={() => setStep('plan')} className="btn-ghost">← Back</button>
            <button onClick={() => setStep('payment')} className="btn-primary">Continue →</button>
          </div>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === 'payment' && selectedPlan && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order summary */}
          <div className="bg-surface border border-[#312E81] rounded-2xl p-6">
            <h3 className="font-heading font-black text-text-h text-lg mb-4">Order Summary</h3>
            <div className="space-y-3 text-sm mb-4">
              {[
                ['Plan', selectedPlan.name],
                ['Billing Cycle', cycleLabels[cycle]],
                ['Location', location === 'LONDON' ? '🇬🇧 London' : '🇺🇸 New York'],
                ['OS', os],
                ['Price', `$${getPrice(selectedPlan)}/mo`],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between">
                  <span className="text-text-muted">{label}</span>
                  <span className="text-text-body font-bold">{val}</span>
                </div>
              ))}
              {couponDiscount > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Coupon ({couponApplied})</span>
                  <span>-{couponDiscount}%</span>
                </div>
              )}
              {useCredit && creditBalance > 0 && (
                <div className="flex justify-between text-green-400">
                  <span>Account Credit</span>
                  <span>-${Math.min(creditBalance, getPrice(selectedPlan)).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-[#312E81] pt-3 flex justify-between font-heading font-black text-lg">
                <span className="text-text-h">Total</span>
                <span className="text-coral">${totalPrice().toFixed(2)}</span>
              </div>
            </div>

            {/* Coupon */}
            <div className="mb-4">
              <label className="label">Coupon Code</label>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="ENTER CODE"
                  className="input-field flex-1 uppercase"
                />
                <button onClick={applyCoupon} className="border border-[#312E81] hover:border-coral text-text-muted hover:text-coral font-heading font-bold text-sm px-4 rounded-xl transition-colors">
                  Apply
                </button>
              </div>
            </div>

            {creditBalance > 0 && (
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="useCredit"
                  checked={useCredit}
                  onChange={(e) => setUseCredit(e.target.checked)}
                  className="accent-coral"
                />
                <label htmlFor="useCredit" className="text-text-body text-sm cursor-pointer">
                  Use account credit (${creditBalance.toFixed(2)} available)
                </label>
              </div>
            )}
          </div>

          {/* Payment method */}
          <div className="bg-surface border border-[#312E81] rounded-2xl p-6">
            <h3 className="font-heading font-black text-text-h text-lg mb-4">Payment Method</h3>
            <div className="space-y-3">
              {['Credit/Debit Card', 'PayPal', 'Cryptocurrency'].map((method) => (
                <div key={method} className="border border-[#312E81] rounded-xl p-4 text-text-muted text-sm">
                  {method}
                  {method === 'Credit/Debit Card' && (
                    <p className="text-xs text-text-dim mt-1">Configure Stripe keys in .env to enable</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep('configure')} className="btn-ghost">← Back</button>
              <button
                onClick={placeOrder}
                disabled={processing}
                className="bg-coral hover:bg-coral-dark text-white font-heading font-black px-8 py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {processing ? 'Processing...' : `Place Order — $${totalPrice().toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
