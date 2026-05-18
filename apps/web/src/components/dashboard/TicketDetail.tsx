import { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface Message {
  id: string;
  authorId: string;
  authorRole: string;
  message: string;
  createdAt: string;
}

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  department: string;
  priority: string;
  status: string;
  createdAt: string;
  userId: string;
  messages: Message[];
}

export default function TicketDetail({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);

  const stored = typeof window !== 'undefined' ? localStorage.getItem('nuclear-vps-auth') : null;
  const currentUserId = stored ? JSON.parse(stored)?.state?.user?.id : null;

  const load = async () => {
    try {
      const r = await api.get(`/tickets/${ticketId}`);
      setTicket(r.data.data);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [ticketId]);

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/tickets/${ticketId}/reply`, { message: reply });
      setReply('');
      await load();
      toast.success('Reply sent');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const closeTicket = async () => {
    try {
      await api.put(`/tickets/${ticketId}/close`);
      await load();
      toast.success('Ticket closed');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" /></div>;
  if (!ticket) return <div className="text-center py-20 text-coral">Ticket not found</div>;

  const isClosed = ['RESOLVED', 'CLOSED'].includes(ticket.status);

  return (
    <div className="max-w-3xl">
      <Toaster position="top-right" toastOptions={{ style: { background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB' } }} />

      <a href="/dashboard/tickets" className="text-text-muted hover:text-coral text-sm transition-colors">← Back to Tickets</a>

      <div className="bg-surface border border-[#E5E7EB] rounded-2xl p-6 mt-4 mb-6">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <p className="text-text-muted text-xs mb-1">{ticket.ticketNumber}</p>
            <h2 className="font-heading font-black text-text-h text-xl">{ticket.subject}</h2>
            <div className="flex gap-3 mt-2 text-xs text-text-muted">
              <span>{ticket.department}</span>
              <span>·</span>
              <span className="text-coral">{ticket.priority}</span>
              <span>·</span>
              <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          {!isClosed && (
            <button onClick={closeTicket} className="border border-[#E5E7EB] text-text-muted hover:border-coral hover:text-coral font-heading font-bold text-sm px-4 py-2 rounded-xl transition-colors">
              Close Ticket
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-4 mb-6">
        {ticket.messages.map((msg) => {
          const isOwn = msg.authorId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl p-4 ${
                  isOwn ? 'bg-indigo-mid' : 'bg-surface border border-[#E5E7EB]'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-bold ${msg.authorRole !== 'CLIENT' ? 'text-coral' : 'text-text-muted'}`}>
                    {msg.authorRole !== 'CLIENT' ? '🛡 Support' : 'You'}
                  </span>
                  <span className="text-text-muted text-xs">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                </div>
                <p className="text-text-body text-sm whitespace-pre-wrap">{msg.message}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply form */}
      {!isClosed ? (
        <div className="bg-surface border border-[#E5E7EB] rounded-2xl p-6">
          <h3 className="font-heading font-bold text-text-h mb-3">Reply</h3>
          <form onSubmit={sendReply} className="space-y-4">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={4}
              className="input-field resize-none"
              placeholder="Type your reply..."
            />
            <button type="submit" disabled={sending || !reply.trim()} className="btn-primary">
              {sending ? 'Sending...' : 'Send Reply'}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-deep border border-[#E5E7EB] rounded-2xl p-4 text-center text-text-muted text-sm">
          This ticket is closed. <a href="/dashboard/tickets/new" className="text-coral hover:underline">Open a new ticket</a> if you need further help.
        </div>
      )}
    </div>
  );
}
