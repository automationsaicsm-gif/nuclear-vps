import { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface AffiliateStats {
  affiliateCode: string;
  affiliateCoupon: string | null;
  affiliateUrl: string;
  totalCommission: number;
  conversions: number;
}

interface Referral {
  id: string;
  commission: number;
  status: string;
  createdAt: string;
  referred: { email: string; createdAt: string };
}

export default function AffiliateDashboard() {
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [paypalEmail, setPaypalEmail] = useState('');
  const [showWithdraw, setShowWithdraw] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/affiliate/stats'), api.get('/affiliate/referrals')])
      .then(([statsRes, refRes]) => {
        setStats(statsRes.data.data);
        setReferrals(refRes.data.data || []);
      })
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/affiliate/withdraw', { amount: parseFloat(withdrawAmount), paypalEmail });
      toast.success('Withdrawal request submitted!');
      setShowWithdraw(false);
      setWithdrawAmount('');
      setPaypalEmail('');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <Toaster position="top-right" toastOptions={{ style: { background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB' } }} />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Conversions', value: stats?.conversions || 0, coral: false },
          { label: 'Total Commission', value: `$${(stats?.totalCommission || 0).toFixed(2)}`, coral: true },
          { label: 'Commission Rate', value: '15%', coral: true },
          { label: 'Available Payout', value: `$${(stats?.totalCommission || 0).toFixed(2)}`, coral: true },
        ].map(({ label, value, coral }) => (
          <div key={label} className="bg-surface border border-[#E5E7EB] rounded-2xl p-6">
            <p className="text-text-muted text-sm mb-1">{label}</p>
            <p className={`font-heading font-black text-3xl ${coral ? 'text-coral' : 'text-text-h'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Affiliate Links */}
      <div className="bg-surface border border-[#E5E7EB] rounded-2xl p-6 mb-6">
        <h2 className="font-heading font-black text-text-h text-xl mb-4">Your Affiliate Links</h2>

        <div className="space-y-4">
          <div>
            <label className="label">Affiliate URL</label>
            <div className="flex gap-3">
              <input
                readOnly
                value={stats?.affiliateUrl || ''}
                className="input-field flex-1"
              />
              <button
                onClick={() => copyToClipboard(stats?.affiliateUrl || '')}
                className="border border-[#E5E7EB] hover:border-coral text-text-muted hover:text-coral font-heading font-bold px-4 py-2 rounded-xl transition-colors text-sm"
              >
                Copy
              </button>
            </div>
          </div>

          <div>
            <label className="label">Affiliate Code</label>
            <div className="flex gap-3">
              <input
                readOnly
                value={stats?.affiliateCode || ''}
                className="input-field flex-1 font-mono"
              />
              <button
                onClick={() => copyToClipboard(stats?.affiliateCode || '')}
                className="border border-[#E5E7EB] hover:border-coral text-text-muted hover:text-coral font-heading font-bold px-4 py-2 rounded-xl transition-colors text-sm"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal */}
      <div className="bg-surface border border-[#E5E7EB] rounded-2xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
          <div>
            <h2 className="font-heading font-black text-text-h text-xl">Withdraw Earnings</h2>
            <p className="text-text-muted text-sm">Available: <span className="text-coral font-bold">${(stats?.totalCommission || 0).toFixed(2)}</span></p>
          </div>
          <button onClick={() => setShowWithdraw(!showWithdraw)} className="btn-primary">
            Request Withdrawal
          </button>
        </div>

        {showWithdraw && (
          <form onSubmit={handleWithdraw} className="space-y-4 border-t border-[#E5E7EB] pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Amount ($)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  min="10"
                  step="0.01"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">PayPal Email</label>
                <input
                  type="email"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            </div>
            <button type="submit" className="btn-primary">Submit Request</button>
          </form>
        )}
      </div>

      {/* Referrals */}
      <div className="bg-surface border border-[#E5E7EB] rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-[#E5E7EB]">
          <h2 className="font-heading font-black text-text-h text-xl">Referrals ({referrals.length})</h2>
        </div>
        {referrals.length === 0 ? (
          <div className="p-8 text-center text-text-muted">No referrals yet. Share your affiliate link to start earning!</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-deep border-b border-[#E5E7EB]">
                <tr>
                  {['Client', 'Joined', 'Commission', 'Status'].map((h) => (
                    <th key={h} className="text-left px-6 py-3 text-text-muted text-xs font-heading font-bold uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {referrals.map((r) => (
                  <tr key={r.id} className="border-b border-[#E5E7EB] hover:bg-deep/50">
                    <td className="px-6 py-4 text-text-body text-sm">{r.referred.email}</td>
                    <td className="px-6 py-4 text-text-muted text-sm">{new Date(r.referred.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-coral font-bold">${r.commission.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === 'paid' ? 'bg-green-500/10 text-green-400 border border-green-500' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500'}`}>
                        {r.status}
                      </span>
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
