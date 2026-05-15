import { useState } from 'react';

export default function AffiliateCalculator() {
  const [clients, setClients] = useState(100);

  const monthlyEarnings = clients * 50 * 0.15;
  const annualEarnings = monthlyEarnings * 12;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="bg-deep border border-[#312E81] rounded-2xl p-8">
      <div className="text-center mb-8">
        <p className="section-tag mb-2">EARNINGS CALCULATOR</p>
        <h3 className="font-heading font-black text-2xl text-text-h mb-2">How Much Can You Earn?</h3>
        <p className="text-text-muted text-sm">Drag the slider to estimate your monthly affiliate income</p>
      </div>

      {/* Slider */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <label className="text-text-body text-sm font-medium">Number of Referred Clients</label>
          <span className="font-heading font-black text-coral text-xl">{clients.toLocaleString()}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10000}
          step={1}
          value={clients}
          onChange={(e) => setClients(Number(e.target.value))}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #F87171 0%, #F87171 ${(clients / 10000) * 100}%, #312E81 ${(clients / 10000) * 100}%, #312E81 100%)`,
          }}
        />
        <div className="flex justify-between text-text-muted text-xs mt-1">
          <span>1 client</span>
          <span>10,000 clients</span>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-surface border border-[#312E81] rounded-xl p-6 text-center">
          <div className="text-text-muted text-sm mb-2">Monthly Earnings</div>
          <div className="font-heading font-black text-coral text-4xl">{formatCurrency(monthlyEarnings)}</div>
          <div className="text-text-muted text-xs mt-1">per month</div>
        </div>
        <div className="bg-surface border border-[#312E81] rounded-xl p-6 text-center">
          <div className="text-text-muted text-sm mb-2">Annual Earnings</div>
          <div className="font-heading font-black text-coral text-4xl">{formatCurrency(annualEarnings)}</div>
          <div className="text-text-muted text-xs mt-1">per year</div>
        </div>
      </div>

      {/* Formula breakdown */}
      <div className="bg-base border border-[#312E81] rounded-xl p-4 mb-6">
        <p className="text-text-muted text-xs text-center">
          Formula: <span className="text-text-body">{clients.toLocaleString()} clients</span>
          {' × '}
          <span className="text-text-body">$50 avg plan</span>
          {' × '}
          <span className="text-coral font-bold">15% commission</span>
          {' = '}
          <span className="text-coral font-bold">{formatCurrency(monthlyEarnings)}/mo</span>
        </p>
      </div>

      <a
        href="/register?ref=affiliate"
        className="block w-full bg-coral hover:bg-coral-dark text-white font-heading font-black py-4 rounded-xl transition-all duration-200 text-center text-lg"
      >
        Start Earning Today
      </a>
    </div>
  );
}
