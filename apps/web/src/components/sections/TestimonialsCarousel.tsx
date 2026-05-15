import { useState, useEffect } from 'react';

const testimonials = [
  { name: 'Heinz', handle: '@sicforex', company: 'Founder @sicforex', title: 'Reliable Trading Partner', content: 'Stable performance, low latency, responsive support. Reliable choice for serious traders.' },
  { name: 'Botond Ratonyi', handle: '@TheNomadTrader', company: 'Founder @TheNomadTrader', title: 'Game Changer', content: 'Game changer for my trading. Reliability gives peace of mind while traveling the world.' },
  { name: 'Joseph J. Purser', handle: null, company: 'Geranio forex srl', title: 'Swift Success Switch', content: 'Win percentage doubled since upgrade. Easy setup, no waiting on hold.' },
  { name: 'Cayden Porter', handle: null, company: 'Algorithmup Ltd', title: 'High Quality Servers', content: 'Great investment. State of the art servers and dedicated customer service.' },
  { name: 'Robert Johanson', handle: null, company: 'Sunflower Fund LLC', title: 'Reliable Forex Hosting', content: 'Used for over a year. Best uptime, lightning fast. Highly recommend.' },
  { name: 'Maria Garcia', handle: null, company: 'Expert in Latency Arbitrage', title: 'Simply Amazing', content: 'Execution speed is impressively fast. Perfect for latency arbitrage trading.' },
];

export default function TestimonialsCarousel() {
  const [current, setCurrent] = useState(0);
  const [perPage, setPerPage] = useState(3);

  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 768) setPerPage(1);
      else if (window.innerWidth < 1024) setPerPage(2);
      else setPerPage(3);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % (testimonials.length - perPage + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [perPage]);

  const visible = testimonials.slice(current, current + perPage);

  return (
    <div>
      <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(${perPage}, 1fr)` }}>
        {visible.map((t) => (
          <div key={t.name} className="bg-surface border border-[#312E81] rounded-2xl p-6">
            <svg className="w-6 h-6 text-coral mb-3" fill="currentColor" viewBox="0 0 24 24">
              <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
            </svg>
            <h4 className="font-heading font-black text-text-h text-sm mb-2">"{t.title}"</h4>
            <p className="text-text-body text-sm leading-relaxed italic mb-4">{t.content}</p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-mid flex items-center justify-center">
                <span className="font-heading font-black text-coral text-sm">{t.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</span>
              </div>
              <div>
                <p className="font-heading font-black text-coral text-sm">{t.name}</p>
                <p className="text-text-muted text-xs">{t.handle || t.company}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-center items-center gap-4 mt-8">
        <button
          onClick={() => setCurrent((c) => Math.max(0, c - 1))}
          className="w-9 h-9 rounded-full bg-coral flex items-center justify-center hover:bg-coral-dark transition-colors"
          disabled={current === 0}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>

        <div className="flex gap-2">
          {Array.from({ length: testimonials.length - perPage + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === current ? 'bg-coral' : 'bg-[#312E81]'}`}
            />
          ))}
        </div>

        <button
          onClick={() => setCurrent((c) => Math.min(testimonials.length - perPage, c + 1))}
          className="w-9 h-9 rounded-full bg-coral flex items-center justify-center hover:bg-coral-dark transition-colors"
          disabled={current >= testimonials.length - perPage}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
