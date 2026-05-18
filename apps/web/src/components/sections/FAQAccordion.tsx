import { useState } from 'react';

const faqs = [
  {
    q: 'What is a Nuclear VPS?',
    a: "A Nuclear VPS is a constantly powered-on virtual Windows desktop, connected to the internet 24/7. Install trading platforms and run EAs, Robots, and automated systems without interruption.",
  },
  {
    q: 'Is Nuclear VPS difficult to use?',
    a: "No special skills needed. Connect via the pre-installed RDP app from any device. Our support team is always ready to help.",
  },
  {
    q: 'What payment methods can I use?',
    a: "Credit/Debit Cards, PayPal, and Cryptocurrency. Cards and PayPal support auto-renewal subscriptions. You can also add credit to your account for future payments.",
  },
  {
    q: 'What location should I select?',
    a: "Choose the location closest to your broker's servers. Check our Broker Latency page or ask your broker directly. Most brokers are based in London.",
  },
  {
    q: 'When will I receive my VPS?',
    a: "Immediately. VPS is delivered automatically within minutes. Windows installation may take up to 10 minutes. Credentials are sent to your email — check spam if not received.",
  },
  {
    q: 'Can I connect from a smartphone or computer?',
    a: "Yes. Connect from Windows, Mac, iOS, Android, and Chrome OS using the RDP app. Guides available in our Knowledgebase.",
  },
];

export default function FAQAccordion() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => (
        <div
          key={i}
          className={`border rounded-xl overflow-hidden transition-all duration-200 ${open === i ? 'border-coral' : 'border-[#E5E7EB]'}`}
        >
          <button
            className={`w-full flex items-center justify-between px-6 py-4 text-left transition-colors ${
              open === i ? 'bg-deep' : 'bg-base hover:bg-deep/50'
            }`}
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span className={`font-heading font-bold ${open === i ? 'text-coral' : 'text-text-h'}`}>{faq.q}</span>
            <svg
              className={`w-5 h-5 text-coral shrink-0 ml-4 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
            </svg>
          </button>
          {open === i && (
            <div className="bg-deep px-6 py-4">
              <p className="text-text-body leading-relaxed">{faq.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
