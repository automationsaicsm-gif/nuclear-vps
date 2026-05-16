import { useState, useEffect } from 'react';

interface Plan {
  id: string;
  name: string;
  slug: string;
  category: 'TRADING_VPS' | 'TRADING_SERVER';
  monthlyPrice: number;
  quarterlyPrice: number;
  annualPrice: number;
  ram: string;
  cpu: string;
  storage: string;
  platforms: number;
  os: string[];
  featured: boolean;
  available: boolean;
  sortOrder: number;
}

type Tab = 'vps' | 'servers';
type Cycle = 'monthly' | 'quarterly' | 'annually';

export default function PricingSection() {
  const [tab, setTab] = useState<Tab>('vps');
  const [cycle, setCycle] = useState<Cycle>('monthly');
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/plans')
      .then((r) => r.json())
      .then((data) => setPlans(data.data ?? []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, []);

  const handleOrder = (slug: string) => {
    const stored = localStorage.getItem('nuclear-vps-auth');
    const user = stored ? JSON.parse(stored)?.state?.user : null;
    if (!user) {
      window.location.href = `/register?redirect=/dashboard/order&plan=${slug}`;
    } else {
      window.location.href = `/dashboard/order?plan=${slug}&cycle=${cycle.toUpperCase()}`;
    }
  };

  const getPrice = (plan: Plan): number => {
    if (cycle === 'monthly') return plan.monthlyPrice;
    if (cycle === 'quarterly') return plan.quarterlyPrice;
    return plan.annualPrice;
  };

  const currentPlans = plans.filter((p) =>
    tab === 'vps' ? p.category === 'TRADING_VPS' : p.category === 'TRADING_SERVER'
  );

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex justify-center mb-8">
        <div className="flex bg-deep border border-[#312E81] rounded-full p-1">
          {(['vps', 'servers'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-2 rounded-full font-heading font-bold text-sm transition-all duration-200 ${
                tab === t ? 'bg-coral text-white' : 'text-text-muted hover:text-text-body'
              }`}
            >
              {t === 'vps' ? 'Trading VPS' : 'Trading Servers'}
            </button>
          ))}
        </div>
      </div>

      {/* Billing cycle */}
      <div className="flex justify-center mb-12">
        <div className="flex bg-deep border border-[#312E81] rounded-full p-1 gap-1">
          {([
            ['monthly', 'Monthly'],
            ['quarterly', 'Quarterly (Save 6%)'],
            ['annually', '1-Year (Save 17%)'],
          ] as [Cycle, string][]).map(([c, label]) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`px-5 py-2 rounded-full font-heading font-bold text-sm transition-all duration-200 ${
                cycle === c ? 'bg-coral text-white' : 'text-text-muted hover:text-text-body'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Plan cards */}
      {loading ? (
        <div className={`grid gap-6 ${tab === 'vps' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto'}`}>
          {[...Array(tab === 'vps' ? 3 : 2)].map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl p-8 border border-[#312E81] animate-pulse h-96" />
          ))}
        </div>
      ) : (
        <div className={`grid gap-6 ${tab === 'vps' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto'}`}>
          {currentPlans.map((plan) => (
            <div
              key={plan.slug}
              className={`relative bg-surface rounded-2xl p-8 transition-all duration-200 hover:shadow-[0_0_0_1px_#F87171] ${
                plan.featured ? 'border-2 border-coral' : 'border border-[#312E81]'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-coral text-white font-heading font-bold text-xs px-4 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
              )}

              <h3 className="font-heading font-black text-text-h text-xl mb-2">{plan.name}</h3>

              <div className="mb-1">
                <span className="text-text-muted line-through text-sm">${plan.monthlyPrice.toFixed(2)}/mo</span>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-coral font-heading font-black text-4xl">${getPrice(plan).toFixed(2)}</span>
                <span className="text-text-muted text-sm mb-1">/month</span>
              </div>
              {cycle !== 'monthly' && (
                <p className="text-text-muted text-xs mb-4">
                  Billed {cycle === 'quarterly' ? 'quarterly' : 'annually'}
                </p>
              )}

              <div className="border-t border-[#312E81] my-4" />

              <ul className="space-y-3 mb-8">
                {[
                  plan.ram,
                  plan.cpu,
                  plan.storage,
                  plan.os.join(' / '),
                  'Trading Optimized',
                  `Up to ${plan.platforms} Platforms`,
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-text-body text-sm">
                    <div className="w-4 h-4 rounded-full bg-coral/20 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-coral" />
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleOrder(plan.slug)}
                className="w-full bg-coral hover:bg-coral-dark text-white font-heading font-black py-3 rounded-xl transition-all duration-200"
              >
                Order Now
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
