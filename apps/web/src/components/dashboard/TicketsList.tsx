import { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  department: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, string> = {
  OPEN: 'bg-coral/10 text-coral border border-coral',
  IN_PROGRESS: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500',
  WAITING_CLIENT: 'bg-blue-500/10 text-blue-400 border border-blue-500',
  RESOLVED: 'bg-green-500/10 text-green-400 border border-green-500',
  CLOSED: 'bg-gray-500/10 text-gray-400 border border-gray-500',
};

const priorityColors: Record<string, string> = {
  LOW: 'text-green-400',
  MEDIUM: 'text-yellow-400',
  HIGH: 'text-orange-400',
  URGENT: 'text-coral',
};

export default function TicketsList() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/tickets')
      .then((r) => setTickets(r.data.data || []))
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <Toaster position="top-right" toastOptions={{ style: { background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB' } }} />

      <div className="flex justify-between items-center mb-6">
        <h2 className="font-heading font-black text-text-h text-2xl">Support Tickets ({tickets.length})</h2>
        <a href="/dashboard/tickets/new" className="bg-coral hover:bg-coral-dark text-white font-heading font-bold px-5 py-2 rounded-xl text-sm transition-colors">
          + Open Ticket
        </a>
      </div>

      {tickets.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-text-muted text-lg mb-4">No tickets yet.</p>
          <a href="/dashboard/tickets/new" className="btn-primary">Open a Ticket</a>
        </div>
      ) : (
        <div className="bg-surface border border-[#E5E7EB] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-deep border-b border-[#E5E7EB]">
                <tr>
                  {['#', 'Subject', 'Department', 'Status', 'Priority', 'Last Update'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-text-muted text-xs font-heading font-bold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => window.location.href = `/dashboard/tickets/${t.id}`}
                    className="border-b border-[#E5E7EB] hover:bg-deep/50 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4 font-mono text-text-muted text-xs">{t.ticketNumber}</td>
                    <td className="px-6 py-4 text-text-h font-heading font-bold text-sm max-w-xs truncate">{t.subject}</td>
                    <td className="px-6 py-4 text-text-muted text-sm">{t.department}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[t.status] || ''}`}>{t.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-bold ${priorityColors[t.priority] || ''}`}>{t.priority}</span>
                    </td>
                    <td className="px-6 py-4 text-text-muted text-xs">{new Date(t.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
