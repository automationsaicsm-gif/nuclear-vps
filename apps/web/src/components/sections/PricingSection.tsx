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
    if (cycle === '1month') return plan.monthlyPrice ?? 0;
    if (cycle === '2months') return plan.quarterlyPrice ?? plan.monthlyPrice ?? 0;
    if (cycle === '6months') return plan.price6Month ?? plan.monthlyPrice ?? 0;
    if (cycle === '1year') return plan.annualPrice ?? plan.monthlyPrice ?? 0;
    return plan.price2Year ?? plan.monthlyPrice ?? 0;
  };

  const currentPlans = plans.filter((p) => p.category === 'TRADING_VPS');

  return (
    <div>
      {/* Billing cycle */}
      <div className="flex justify-center mb-12">
        <div className="flex bg-deep border border-[#E5E7EB] rounded-full p-1 gap-1">
          {([
            ['1month', '1 Month'],
            ['2months', '3 Months'],
            ['6months', '6 Months'],
            ['1year', '12 Months'],
            ['2years', '24 Months'],
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
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-surface rounded-2xl p-8 border border-[#E5E7EB] animate-pulse h-96" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {currentPlans.map((plan) => (
            <div
              key={plan.slug}
              className={`relative bg-surface rounded-2xl p-6 transition-all duration-200 hover:shadow-[0_0_0_1px_#2D55C8] ${
                plan.featured ? 'border-2 border-coral' : 'border border-[#E5E7EB]'
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

              <div className="border-t border-[#E5E7EB] my-4" />

              <ul className="space-y-3 mb-8">
                {[
                  `RAM ${plan.ram.replace(/ DDR\d+/, '').replace(' ', '')}`,
                  `Instances 1-${plan.platforms}* MT4/MT5/ cTrade`,
                  `Disk Space ${plan.storage.replace(/ NVMe SSD| SSD/, '').replace(' ', '')}`,
                  `CPU ${plan.cpu}`,
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
