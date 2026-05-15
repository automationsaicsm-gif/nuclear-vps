import { useState } from 'react';

const plans = {
  vps: [
    {
      name: 'Bronze VPS',
      slug: 'bronze-vps',
      prices: { monthly: 24.9, quarterly: 23.45, annually: 20.75 },
      ram: '2 GB DDR5',
      cpu: '2 GHz',
      storage: '30 GB NVMe SSD',
      platforms: 'Up to 3 Platforms',
      os: 'Windows 2022 / 2019 / 2016',
      featured: false,
    },
    {
      name: 'Silver VPS',
      slug: 'silver-vps',
      prices: { monthly: 48.9, quarterly: 45.97, annually: 40.75 },
      ram: '4 GB DDR5',
      cpu: '3 GHz',
      storage: '50 GB NVMe SSD',
      platforms: 'Up to 6 Platforms',
      os: 'Windows 2022 / 2019 / 2016',
      featured: true,
    },
    {
      name: 'Gold VPS',
      slug: 'gold-vps',
      prices: { monthly: 74.9, quarterly: 70.41, annually: 62.5 },
      ram: '6 GB DDR5',
      cpu: '4 GHz',
      storage: '75 GB NVMe SSD',
      platforms: 'Up to 10 Platforms',
      os: 'Windows 2022 / 2019 / 2016',
      featured: false,
    },
  ],
  servers: [
    {
      name: 'Server 7700',
      slug: 'server-7700',
      prices: { monthly: 250, quarterly: 235, annually: 208.33 },
      ram: '64 GB DDR5',
      cpu: 'Ryzen 7700 8/16 Core 5.4GHz',
      storage: '2TB NVMe SSD',
      platforms: 'Any Platform',
      os: 'Windows or Linux',
      featured: false,
    },
    {
      name: 'Server 7950X3D',
      slug: 'server-7950x3d',
      prices: { monthly: 450, quarterly: 423, annually: 375 },
      ram: '128 GB DDR5',
      cpu: 'Ryzen 7950X3D 16/32 Core 5.7GHz',
      storage: '4TB NVMe SSD',
      platforms: 'Any Platform',
      os: 'Windows or Linux',
      featured: true,
    },
  ],
};

type Tab = 'vps' | 'servers';
type Cycle = 'monthly' | 'quarterly' | 'annually';

export default function PricingSection() {
  const [tab, setTab] = useState<Tab>('vps');
  const [cycle, setCycle] = useState<Cycle>('monthly');

  const handleOrder = (slug: string) => {
    const stored = localStorage.getItem('nuclear-vps-auth');
    const user = stored ? JSON.parse(stored)?.state?.user : null;
    if (!user) {
      window.location.href = `/register?redirect=/dashboard/order&plan=${slug}`;
    } else {
      window.location.href = `/dashboard/order?plan=${slug}&cycle=${cycle.toUpperCase()}`;
    }
  };

  const currentPlans = tab === 'vps' ? plans.vps : plans.servers;

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
              <span className="text-text-muted line-through text-sm">${plan.prices.monthly}/mo</span>
            </div>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-coral font-heading font-black text-4xl">${plan.prices[cycle]}</span>
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
                plan.os,
                'Trading Optimized',
                plan.platforms,
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
    </div>
  );
}
