import { useState } from 'react';

const tabGroups = [
  {
    label: 'General Information',
    faqs: [
      {
        q: 'What is a Trading VPS?',
        a: 'A Trading VPS (Virtual Private Server) is a constantly powered-on virtual Windows desktop connected to the internet 24/7. You install your trading platforms and Expert Advisors there and they run uninterrupted — even when your personal computer is off.',
      },
      {
        q: 'Which trading platforms are supported?',
        a: 'All major platforms are supported: MetaTrader 4, MetaTrader 5, cTrader, NinjaTrader, TradeStation, and any other Windows-compatible trading application. The VPS runs standard Windows Server so compatibility is essentially universal.',
      },
      {
        q: 'Where are your data centers located?',
        a: 'We operate from two global locations: London (Equinix LD4) and New York (Equinix NY4). Both are premium financial data centers co-located with the major Forex brokers to ensure ultra-low latency.',
      },
      {
        q: 'Is Nuclear VPS suitable for beginners?',
        a: 'Absolutely. No technical skills are required to get started. You connect to your VPS using the Remote Desktop app pre-installed on Windows, Mac, iOS, and Android. Our support team will guide you through setup if needed.',
      },
    ],
  },
  {
    label: 'Account and Billing',
    faqs: [
      {
        q: 'What payment methods do you accept?',
        a: 'We accept all major credit and debit cards (Visa, Mastercard, Amex), PayPal, and cryptocurrency (Bitcoin, Ethereum, USDT). Card and PayPal payments support automatic subscription renewal.',
      },
      {
        q: 'Can I get a refund?',
        a: 'All payments are non-refundable. Once a service has been activated, we do not offer refunds or credits for unused time. Please review your plan carefully before purchasing.',
      },
      {
        q: 'How does billing work?',
        a: 'You choose monthly, quarterly, or annual billing at checkout. Annual plans offer the greatest savings. Your subscription renews automatically at the end of each billing period unless you cancel.',
      },
      {
        q: 'Can I upgrade or downgrade my plan?',
        a: 'Yes. You can upgrade or downgrade at any time from your dashboard. Upgrades are applied instantly. Billing is pro-rated so you only pay for what you use.',
      },
      {
        q: 'Do you offer discounts for annual plans?',
        a: 'Yes. Quarterly billing saves you 6% and annual billing saves you 17% compared to the monthly rate. Discounts are applied automatically at checkout.',
      },
    ],
  },
  {
    label: 'VPS Setup and Access',
    faqs: [
      {
        q: 'How do I access my VPS?',
        a: 'Your VPS is accessed via Remote Desktop Protocol (RDP). On Windows, use the built-in Remote Desktop Connection app. On Mac, download Microsoft Remote Desktop from the App Store. Credentials are sent to your email immediately after provisioning.',
      },
      {
        q: 'How long does provisioning take?',
        a: 'VPS provisioning is automated and typically completes within 2–5 minutes. Windows installation may take up to 10 minutes. You will receive an email with your login credentials as soon as the VPS is ready.',
      },
      {
        q: 'Can I install my own software?',
        a: 'Yes. You have full Administrator access to your Windows VPS. You can install any compatible software including trading platforms, custom indicators, VPN clients, and more.',
      },
      {
        q: 'What Windows versions are available?',
        a: 'All plans include Windows Server 2022, 2019, or 2016. You can specify your preferred version at checkout or contact support to switch after provisioning.',
      },
    ],
  },
  {
    label: 'Troubleshooting',
    faqs: [
      {
        q: 'I cannot connect to my VPS. What should I do?',
        a: 'First, verify your internet connection. Then check the login credentials sent to your email — ensure you are using the correct IP, username, and password. If the issue persists, open a support ticket or contact us via live chat and our team will investigate within minutes.',
      },
      {
        q: 'My EA stopped running. What happened?',
        a: 'EAs can stop due to terminal disconnections, low memory, or platform restarts. Check that your trading platform is still running on the VPS. If you see "Expert Advisors Disabled" in MetaTrader, re-enable them via Tools > Options. Our team can help diagnose recurring issues.',
      },
      {
        q: 'My VPS is running slowly. How can I fix it?',
        a: 'Slow performance is usually caused by too many applications running simultaneously or insufficient RAM for your use case. Check Task Manager to identify resource-heavy processes. If you regularly exceed your plan limits, consider upgrading to a higher plan.',
      },
      {
        q: 'I forgot my VPS password. Can I reset it?',
        a: 'Yes. Open a support ticket or contact our live chat team. We can reset your Windows Administrator password within minutes after verifying your account identity.',
      },
    ],
  },
  {
    label: 'Optimization',
    faqs: [
      {
        q: 'How do I optimize my VPS for low latency?',
        a: 'Choose the data center closest to your broker\'s servers. Check our Broker Latency page to find the optimal location. On the VPS itself, disable unnecessary Windows visual effects (System > Advanced System Settings > Performance) and close unused applications.',
      },
      {
        q: 'How many EAs can I run on one VPS?',
        a: 'This depends on your plan and the complexity of your EAs. Bronze VPS (2 GB RAM) supports up to 3 MT4/MT5 platforms. Silver (4 GB) supports up to 6. Gold (6 GB) supports up to 10. For heavy multi-currency strategies, we recommend at least the Silver plan.',
      },
      {
        q: 'Should I use MT4 or MT5?',
        a: 'This depends on your broker\'s offerings and your EA compatibility. MT5 is more modern and resource-efficient, while MT4 has a larger library of compatible EAs. Both run excellently on Nuclear VPS.',
      },
      {
        q: 'How do I keep my VPS running if I do not log in?',
        a: 'Your VPS runs 24/7 regardless of whether you are connected to it. You do not need to stay logged in. Your platforms and EAs continue running in the background. Simply log in to check status or make changes whenever needed.',
      },
    ],
  },
];

export default function ContactFAQTabs() {
  const [activeTab, setActiveTab] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const handleTabChange = (i: number) => {
    setActiveTab(i);
    setOpenIndex(null);
  };

  return (
    <div>
      {/* Tab buttons - horizontal scroll on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
        {tabGroups.map((group, i) => (
          <button
            key={i}
            onClick={() => handleTabChange(i)}
            className={`whitespace-nowrap px-5 py-2.5 rounded-full font-heading font-bold text-sm transition-all duration-200 shrink-0 ${
              activeTab === i
                ? 'bg-coral text-white'
                : 'bg-deep border border-[#E5E7EB] text-text-muted hover:text-text-body hover:border-coral/50'
            }`}
          >
            {group.label}
          </button>
        ))}
      </div>

      {/* FAQ items */}
      <div className="space-y-3">
        {tabGroups[activeTab].faqs.map((faq, i) => (
          <div
            key={i}
            className={`border rounded-xl overflow-hidden transition-all duration-200 ${
              openIndex === i ? 'border-coral' : 'border-[#E5E7EB]'
            }`}
          >
            <button
              className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors ${
                openIndex === i ? 'bg-deep' : 'bg-base hover:bg-deep/50'
              }`}
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
            >
              <span className={`font-heading font-bold pr-4 ${openIndex === i ? 'text-coral' : 'text-text-h'}`}>
                {faq.q}
              </span>
              <svg
                className={`w-5 h-5 text-coral shrink-0 transition-transform duration-200 ${openIndex === i ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {openIndex === i && (
              <div className="bg-deep px-6 py-4">
                <p className="text-text-body leading-relaxed">{faq.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
