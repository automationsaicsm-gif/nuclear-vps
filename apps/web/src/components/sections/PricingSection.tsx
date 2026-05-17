import { useState, useEffect } from 'react';

interface Plan {
  id: string;
  name: string;
  slug: string;
  category: 'TRADING_VPS' | 'TRADING_SERVER';
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
  available: boolean;
  sortOrder: number;
}

type Tab = 'vps' | 'servers';
type Cycle = '1month' | '2months' | '6months' | '1year' | '2years';

export default function PricingSection() {
  const [tab, setTab] = useState<Tab>('vps');
  const [cycle, setCycle] = useState<Cycle>('1month');
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
      window.location.href = `/dashboard/order?plan=${slug}&cycle=${cycle}`;
    }
  };

  const getPrice = (plan: Plan): number => {
    if (cycle === '1month') return plan.monthlyPrice;
    if (cycle === '2months') return plan.quarterlyPrice;
    if (cycle === '6months') return plan.price6Month;
    if (cycle === '1year') return plan.annualPrice;
    return plan.price2Year;
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
            ['1month', '1 Month'],
            ['2months', '2 Months'],
            ['6months', '6 Months'],
            ['1year', '1 Year'],
            ['2years', '2 Years'],
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
        <div className={`grid gap-4 ${tab === 'vps' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto'}`}>
          {[...Array(tab === 'vps' ? 4 : 2)].map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl p-8 border border-[#312E81] animate-pulse h-96" />
          ))}
        </div>
      ) : (
        <div className={`grid gap-4 ${tab === 'vps' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto'}`}>
          {currentPlans.map((plan) => (
            <div
              key={plan.slug}
              className={`relative bg-surface rounded-2xl p-6 transition-all duration-200 hover:shadow-[0_0_0_1px_#F87171] ${
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
              {cycle !== '1month' && (
                <p className="text-text-muted text-xs mb-4">
                  {{
                    '2months': 'Billed every 2 months',
                    '6months': 'Billed every 6 months',
                    '1year': 'Billed annually',
                    '2years': 'Billed every 2 years',
                  }[cycle]}
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
