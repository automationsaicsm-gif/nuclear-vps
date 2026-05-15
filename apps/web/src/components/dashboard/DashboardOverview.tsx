import { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface Stats {
  services: number;
  openTickets: number;
  unpaidInvoices: number;
  creditBalance: number;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentActivity, setRecentActivity] = useState<Array<{ type: string; description: string; date: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [servicesRes, ticketsRes, invoicesRes, userRes] = await Promise.all([
          api.get('/services'),
          api.get('/tickets'),
          api.get('/invoices'),
          api.get('/auth/me'),
        ]);

        const services = servicesRes.data.data || [];
        const tickets = ticketsRes.data.data || [];
        const invoices = invoicesRes.data.data || [];
        const user = userRes.data.data;

        setStats({
          services: services.filter((s: { status: string }) => s.status === 'ACTIVE').length,
          openTickets: tickets.filter((t: { status: string }) => ['OPEN', 'IN_PROGRESS'].includes(t.status)).length,
          unpaidInvoices: invoices.filter((i: { status: string }) => i.status === 'UNPAID').length,
          creditBalance: user?.creditBalance || 0,
        });

        const activity = [
          ...services.slice(0, 3).map((s: { plan?: { name: string }; createdAt: string }) => ({
            type: 'service',
            description: `Service created: ${s.plan?.name || 'VPS'}`,
            date: s.createdAt,
          })),
          ...invoices.slice(0, 3).map((i: { invoiceNumber: string; status: string; createdAt: string }) => ({
            type: 'invoice',
            description: `Invoice ${i.invoiceNumber} — ${i.status}`,
            date: i.createdAt,
          })),
          ...tickets.slice(0, 3).map((t: { ticketNumber: string; subject: string; createdAt: string }) => ({
            type: 'ticket',
            description: `Ticket opened: ${t.subject}`,
            date: t.createdAt,
          })),
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

        setRecentActivity(activity);
      } catch (err) {
        toast.error(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <Toaster position="top-right" toastOptions={{ style: { background: '#252272', color: '#C7D2FE', border: '1px solid #312E81' } }} />

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Services', value: stats?.services || 0, coral: true, href: '/dashboard/services' },
          { label: 'Open Tickets', value: stats?.openTickets || 0, coral: false, href: '/dashboard/tickets' },
          { label: 'Unpaid Invoices', value: stats?.unpaidInvoices || 0, coral: (stats?.unpaidInvoices || 0) > 0, href: '/dashboard/billing' },
          { label: 'Account Credit', value: `$${(stats?.creditBalance || 0).toFixed(2)}`, coral: false, href: '/dashboard/billing' },
        ].map(({ label, value, coral, href }) => (
          <a key={label} href={href} className="bg-surface border border-[#312E81] rounded-2xl p-6 hover:border-coral transition-all duration-200 block">
            <p className="text-text-muted text-sm mb-1">{label}</p>
            <p className={`font-heading font-black text-3xl ${coral ? 'text-coral' : 'text-text-h'}`}>{value}</p>
          </a>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3 mb-8">
        <a href="/dashboard/order" className="bg-coral hover:bg-coral-dark text-white font-heading font-bold px-6 py-3 rounded-xl transition-colors">
          + Order New VPS
        </a>
        <a href="/dashboard/tickets/new" className="border-2 border-coral text-coral hover:bg-coral/10 font-heading font-bold px-6 py-3 rounded-xl transition-colors">
          Open Support Ticket
        </a>
        <a href="/dashboard/billing" className="border border-[#312E81] text-text-body hover:border-coral hover:text-coral font-heading font-bold px-6 py-3 rounded-xl transition-colors">
          View Invoices
        </a>
      </div>

      {/* Recent Activity */}
      <div className="bg-surface border border-[#312E81] rounded-2xl p-6">
        <h2 className="font-heading font-black text-text-h text-lg mb-4">Recent Activity</h2>
        {recentActivity.length === 0 ? (
          <p className="text-text-muted text-sm">No recent activity. <a href="/dashboard/order" className="text-coral hover:underline">Order your first VPS!</a></p>
        ) : (
          <ul className="space-y-3">
            {recentActivity.map((item, i) => (
              <li key={i} className="flex items-center gap-3 py-2 border-b border-[#312E81] last:border-0">
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  item.type === 'service' ? 'bg-green-400' :
                  item.type === 'invoice' ? 'bg-coral' : 'bg-indigo-mid'
                }`} />
                <span className="text-text-body text-sm flex-1">{item.description}</span>
                <span className="text-text-muted text-xs">{new Date(item.date).toLocaleDateString()}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
