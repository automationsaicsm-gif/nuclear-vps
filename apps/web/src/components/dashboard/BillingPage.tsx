import { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  dueDate: string;
  createdAt: string;
  paymentMethod: string | null;
}

const statusColors: Record<string, string> = {
  PAID: 'bg-green-500/10 text-green-400 border border-green-500',
  UNPAID: 'bg-coral/10 text-coral border border-coral',
  CANCELLED: 'bg-gray-500/10 text-gray-400 border border-gray-500',
  REFUNDED: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500',
};

export default function BillingPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditBalance, setCreditBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [addCreditAmount, setAddCreditAmount] = useState('');
  const [showAddCredit, setShowAddCredit] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/invoices'), api.get('/auth/me')])
      .then(([invRes, userRes]) => {
        setInvoices(invRes.data.data || []);
        setCreditBalance(userRes.data.data?.creditBalance || 0);
      })
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const handleAddCredit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(addCreditAmount);
    if (isNaN(amount) || amount < 10) return toast.error('Minimum credit amount is $10');
    try {
      const r = await api.post('/payments/add-credit', { amount });
      setCreditBalance(r.data.data.creditBalance);
      setAddCreditAmount('');
      setShowAddCredit(false);
      toast.success(`$${amount} added to your account credit`);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <Toaster position="top-right" toastOptions={{ style: { background: '#252272', color: '#C7D2FE', border: '1px solid #312E81' } }} />

      {/* Credit balance */}
      <div className="bg-surface border border-[#312E81] rounded-2xl p-6 mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <p className="text-text-muted text-sm">Account Credit Balance</p>
          <p className="font-heading font-black text-coral text-4xl mt-1">${creditBalance.toFixed(2)}</p>
        </div>
        <button
          onClick={() => setShowAddCredit(!showAddCredit)}
          className="bg-coral hover:bg-coral-dark text-white font-heading font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Add Funds
        </button>
      </div>

      {showAddCredit && (
        <div className="bg-surface border border-[#312E81] rounded-2xl p-6 mb-6">
          <h3 className="font-heading font-black text-text-h text-lg mb-4">Add Account Credit</h3>
          <form onSubmit={handleAddCredit} className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-48">
              <input
                type="number"
                value={addCreditAmount}
                onChange={(e) => setAddCreditAmount(e.target.value)}
                placeholder="Amount (min $10)"
                min="10"
                step="0.01"
                className="input-field"
              />
            </div>
            <button type="submit" className="btn-primary">Add Credit</button>
            <button type="button" onClick={() => setShowAddCredit(false)} className="btn-ghost">Cancel</button>
          </form>
        </div>
      )}

      {/* Invoices */}
      <div className="bg-surface border border-[#312E81] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#312E81]">
          <h2 className="font-heading font-black text-text-h text-xl">Invoices ({invoices.length})</h2>
        </div>

        {invoices.length === 0 ? (
          <div className="p-8 text-center text-text-muted">No invoices yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-deep border-b border-[#312E81]">
                <tr>
                  {['Invoice #', 'Date', 'Due Date', 'Amount', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-text-muted text-xs font-heading font-bold uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-[#312E81] hover:bg-deep/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-text-body text-sm">{inv.invoiceNumber}</td>
                    <td className="px-6 py-4 text-text-muted text-sm">{new Date(inv.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-text-muted text-sm">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-heading font-bold text-coral">${inv.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[inv.status] || ''}`}>{inv.status}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <a
                          href={`/api/v1/invoices/${inv.id}/pdf`}
                          target="_blank"
                          className="text-text-muted hover:text-coral text-xs font-heading font-bold transition-colors"
                        >
                          PDF
                        </a>
                        {inv.status === 'UNPAID' && (
                          <a
                            href={`/dashboard/order?invoice=${inv.id}`}
                            className="text-coral hover:underline text-xs font-heading font-bold"
                          >
                            Pay Now
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
