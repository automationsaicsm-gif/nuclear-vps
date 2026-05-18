import { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface ServiceData {
  id: string;
  status: string;
  ipAddress: string | null;
  hostname: string | null;
  username: string | null;
  location: string;
  os: string;
  nextDueDate: string | null;
  createdAt: string;
  billingCycle: string;
  plan: { name: string; category: string };
  backups: Array<{ id: string; filename: string; size: string; createdAt: string }>;
}

export default function ServiceDetail({ serviceId }: { serviceId: string }) {
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState(false);

  useEffect(() => {
    api.get(`/services/${serviceId}`)
      .then((r) => setService(r.data.data))
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [serviceId]);

  const doAction = async (action: string, body?: Record<string, unknown>) => {
    setActionLoading(action);
    try {
      await api.post(`/services/${serviceId}/${action}`, body);
      toast.success(`Action successful`);
      const r = await api.get(`/services/${serviceId}`);
      setService(r.data.data);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setActionLoading(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return toast.error('Passwords do not match');
    await doAction('change-password', { password: newPassword });
    setNewPassword('');
    setConfirmPassword('');
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" /></div>;
  if (!service) return <div className="text-center py-20 text-coral">Service not found</div>;

  return (
    <div className="max-w-3xl space-y-6">
      <Toaster position="top-right" toastOptions={{ style: { background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB' } }} />

      <a href="/dashboard/services" className="text-text-muted hover:text-coral text-sm transition-colors">← Back to Services</a>

      {/* Service Info */}
      <div className="bg-surface border border-[#E5E7EB] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-black text-text-h text-xl">{service.plan.name}</h2>
          <span className={`text-xs px-3 py-1 rounded-full font-bold ${
            service.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400 border border-green-500' : 'bg-coral/10 text-coral border border-coral'
          }`}>{service.status}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
          {[
            ['IP Address', service.ipAddress || '—'],
            ['Username', service.username || 'Administrator'],
            ['Location', service.location === 'LONDON' ? '🇬🇧 London' : '🇺🇸 New York'],
            ['OS', service.os],
            ['Billing', service.billingCycle],
            ['Next Due', service.nextDueDate ? new Date(service.nextDueDate).toLocaleDateString() : '—'],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-text-muted text-xs mb-1">{label}</p>
              <p className="font-mono text-text-body">{val}</p>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 flex-wrap">
          {['start', 'stop', 'restart'].map((action) => (
            <button
              key={action}
              onClick={() => doAction(action)}
              disabled={!!actionLoading}
              className="border border-[#E5E7EB] text-text-body hover:border-coral hover:text-coral font-heading font-bold text-sm px-5 py-2 rounded-xl transition-colors capitalize disabled:opacity-50"
            >
              {actionLoading === action ? 'Loading...' : `${action.charAt(0).toUpperCase() + action.slice(1)} VPS`}
            </button>
          ))}
        </div>
      </div>

      {/* Change Password */}
      <div className="bg-surface border border-[#E5E7EB] rounded-2xl p-6">
        <h3 className="font-heading font-black text-text-h text-lg mb-4">Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="label">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-field"
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="label">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-field"
              required
            />
          </div>
          <button type="submit" disabled={!!actionLoading} className="btn-primary">
            {actionLoading === 'change-password' ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </div>

      {/* Backups */}
      {service.backups && service.backups.length > 0 && (
        <div className="bg-surface border border-[#E5E7EB] rounded-2xl p-6">
          <h3 className="font-heading font-black text-text-h text-lg mb-4">Backups</h3>
          <div className="space-y-3">
            {service.backups.map((backup) => (
              <div key={backup.id} className="flex items-center justify-between py-3 border-b border-[#E5E7EB] last:border-0">
                <div>
                  <p className="text-text-body text-sm">{backup.filename}</p>
                  <p className="text-text-muted text-xs">{backup.size} — {new Date(backup.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => doAction(`backups/${backup.id}/restore`)}
                  className="border border-[#E5E7EB] text-text-muted hover:border-coral hover:text-coral font-heading font-bold text-xs px-3 py-2 rounded-lg transition-colors"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel Service */}
      <div className="bg-surface border border-coral/30 rounded-2xl p-6">
        <h3 className="font-heading font-black text-coral text-lg mb-2">Cancel Service</h3>
        <p className="text-text-muted text-sm mb-4">Cancelling will terminate your VPS. This action cannot be undone.</p>
        {!cancelConfirm ? (
          <button onClick={() => setCancelConfirm(true)} className="border-2 border-coral text-coral hover:bg-coral hover:text-white font-heading font-bold px-5 py-2 rounded-xl transition-colors">
            Request Cancellation
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={() => doAction('cancel')}
              disabled={!!actionLoading}
              className="bg-coral hover:bg-coral-dark text-white font-heading font-bold px-5 py-2 rounded-xl transition-colors"
            >
              Confirm Cancel
            </button>
            <button onClick={() => setCancelConfirm(false)} className="border border-[#E5E7EB] text-text-muted hover:text-coral font-heading font-bold px-5 py-2 rounded-xl transition-colors">
              Abort
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
