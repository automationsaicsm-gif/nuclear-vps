import { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import toast, { Toaster } from 'react-hot-toast';

type Step = 'plan' | 'payment';
type Cycle = 'MONTHLY' | 'QUARTERLY' | '6MONTHS' | 'ANNUALLY' | '2YEARS';

interface Plan {
  id: string;
  name: string;
  slug: string;
  category: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  price6Month: number;
  annualPrice: number;
  price2Year: number;
  ram: string;
  cpu: string;
  storage: string;
  platforms: number;
  os: string[];
  featured: boolean;
  linuxAvailable: boolean;
}

const cyclePriceKey: Record<Cycle, keyof Pick<Plan, 'monthlyPrice' | 'quarterlyPrice' | 'price6Month' | 'annualPrice' | 'price2Year'>> = {
  MONTHLY: 'monthlyPrice',
  QUARTERLY: 'quarterlyPrice',
  '6MONTHS': 'price6Month',
  ANNUALLY: 'annualPrice',
  '2YEARS': 'price2Year',
};

const cycleLabels: Record<Cycle, string> = {
  MONTHLY: '1 Month',
  QUARTERLY: '3 Months',
  '6MONTHS': '6 Months',
  ANNUALLY: '12 Months',
  '2YEARS': '24 Months',
};

const mapCycleParam = (param: string): Cycle => {
  const map: Record<string, Cycle> = {
    '1month': 'MONTHLY', '2months': 'QUARTERLY', '6months': '6MONTHS',
    '1year': 'ANNUALLY', '2years': '2YEARS',
    'MONTHLY': 'MONTHLY', 'QUARTERLY': 'QUARTERLY', '6MONTHS': '6MONTHS',
    'ANNUALLY': 'ANNUALLY', '2YEARS': '2YEARS',
  };
  return map[param] || 'MONTHLY';
};

export default function OrderWizard() {
  const [step, setStep] = useState<Step>('plan');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [cycle, setCycle] = useState<Cycle>('MONTHLY');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState('');
  const [useCredit, setUseCredit] = useState(false);
  const [creditBalance, setCreditBalance] = useState(0);
  const [processing, setProcessing] = useState(false);

  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const planSlugParam = urlParams.get('plan');
  const cycleParam = urlParams.get('cycle');

  useEffect(() => {
    api.get('/plans')
      .then((plansRes) => {
        const allPlans = plansRes.data.data || [];
        setPlans(allPlans);
        if (planSlugParam) {
          const found = allPlans.find((p: Plan) => p.slug === planSlugParam);
          if (found) {
            setSelectedPlan(found);
            if (cycleParam) setCycle(mapCycleParam(cycleParam));
            setStep('payment');
          }
        }
      })
      .catch(() => {});

    api.get('/auth/me')
      .then((res) => setCreditBalance(res.data.data?.creditBalance || 0))
      .catch(() => {});
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
        location: 'NEW_YORK',
        os: 'Windows 2022',
        couponCode: couponApplied || undefined,
        useCredit,
      });

      const { invoiceId, planId, billingCycle } = orderRes.data.data;

      if (totalPrice() <= 0) {
        toast.success('Order placed successfully with account credit!');
        setTimeout(() => window.location.href = '/dashboard/services', 1500);
      } else {
        try {
          await api.post('/payments/stripe/create-intent', { invoiceId, planId, location: 'NEW_YORK', os: 'Windows 2022', billingCycle });
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

  const filteredPlans = plans.filter((p) => p.category === 'TRADING_VPS');

  return (
    <div className="max-w-4xl">
      <Toaster position="top-right" toastOptions={{ style: { background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB' } }} />

      {/* Progress steps */}
      <div className="flex items-center gap-4 mb-8">
        {(['plan', 'payment'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-heading font-black text-sm ${
              step === s ? 'bg-coral text-white' :
              step === 'payment' && s === 'plan' ? 'bg-green-500 text-white' : 'bg-[#E5E7EB] text-text-muted'
            }`}>{i + 1}</div>
            <span className={`text-sm font-heading font-bold ${step === s ? 'text-coral' : 'text-text-muted'}`}>
              {s === 'plan' ? 'Select Plan' : 'Review & Pay'}
            </span>
            {i < 1 && <div className={`w-8 h-0.5 ${step === 'payment' ? 'bg-coral' : 'bg-[#E5E7EB]'}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Plan */}
      {step === 'plan' && (
        <div>
          <div className="flex gap-4 mb-6">
            <div className="flex bg-deep border border-[#E5E7EB] rounded-full p-1">
              <span className="px-5 py-2 rounded-full font-heading font-bold text-sm bg-coral text-white">Trading VPS</span>
            </div>
            <div className="flex bg-deep border border-[#E5E7EB] rounded-full p-1 gap-1">
              {(['MONTHLY', 'QUARTERLY', '6MONTHS', 'ANNUALLY', '2YEARS'] as Cycle[]).map((c) => (
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
                  selectedPlan?.id === plan.id ? 'border-coral bg-coral/5' : 'border-[#E5E7EB] bg-surface hover:border-coral/50'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPlan?.id === plan.id ? 'border-coral' : 'border-[#E5E7EB]'}`}>
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
              onClick={() => selectedPlan && setStep('payment')}
              disabled={!selectedPlan}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review & Pay */}
      {step === 'payment' && selectedPlan && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order summary */}
          <div className="bg-surface border border-[#E5E7EB] rounded-2xl p-6">
            <h3 className="font-heading font-black text-text-h text-lg mb-4">Order Summary</h3>
            <div className="space-y-3 text-sm mb-4">
              {[
                ['Plan', selectedPlan.name],
                ['Billing Cycle', cycleLabels[cycle]],
                ['Location', '🇺🇸 New York, US'],
                ['OS', 'Windows 2022'],
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
              <div className="border-t border-[#E5E7EB] pt-3 flex justify-between font-heading font-black text-lg">
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
                <button onClick={applyCoupon} className="border border-[#E5E7EB] hover:border-coral text-text-muted hover:text-coral font-heading font-bold text-sm px-4 rounded-xl transition-colors">
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
          <div className="bg-surface border border-[#E5E7EB] rounded-2xl p-6">
            <h3 className="font-heading font-black text-text-h text-lg mb-4">Payment Method</h3>
            <div className="space-y-3">
              {['Credit/Debit Card', 'PayPal', 'Cryptocurrency'].map((method) => (
                <div key={method} className="border border-[#E5E7EB] rounded-xl p-4 text-text-muted text-sm">
                  {method}
                  {method === 'Credit/Debit Card' && (
                    <p className="text-xs text-text-dim mt-1">Configure Stripe keys in .env to enable</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-between mt-6">
              <button onClick={() => setStep('plan')} className="btn-ghost">← Back</button>
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
