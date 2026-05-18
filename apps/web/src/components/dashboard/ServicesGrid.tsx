import { useState, useEffect } from 'react';
import { api, getErrorMessage } from '../../lib/api';
import toast, { Toaster } from 'react-hot-toast';

interface Service {
  id: string;
  status: string;
  ipAddress: string | null;
  location: string;
  os: string;
  nextDueDate: string | null;
  createdAt: string;
  plan: { name: string; category: string };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: 'Active', className: 'bg-green-500/10 text-green-400 border border-green-500' },
  PENDING: { label: 'Pending', className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500' },
  SUSPENDED: { label: 'Suspended', className: 'bg-coral/10 text-coral border border-coral' },
  TERMINATED: { label: 'Terminated', className: 'bg-gray-500/10 text-gray-400 border border-gray-500' },
  CANCELLED: { label: 'Cancelled', className: 'bg-gray-500/10 text-gray-400 border border-gray-500' },
};

export default function ServicesGrid() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    api.get('/services')
      .then((r) => setServices(r.data.data || []))
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const doAction = async (id: string, action: string) => {
    setActionLoading(id + action);
    try {
      await api.post(`/services/${id}/${action}`);
      toast.success(`Service ${action} successful`);
      const r = await api.get('/services');
      setServices(r.data.data || []);
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (services.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-text-muted text-lg mb-6">You have no services yet.</p>
        <a href="/dashboard/order" className="bg-coral hover:bg-coral-dark text-white font-heading font-black px-8 py-3 rounded-xl transition-colors">Order Your First VPS</a>
      </div>
    );
  }

  return (
    <div>
      <Toaster position="top-right" toastOptions={{ style: { background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB' } }} />
      <div className="flex justify-between items-center mb-6">
        <h2 className="font-heading font-black text-text-h text-2xl">My Services ({services.length})</h2>
        <a href="/dashboard/order" className="bg-coral hover:bg-coral-dark text-white font-heading font-bold px-5 py-2 rounded-xl text-sm transition-colors">+ Order New</a>
      </div>

      <div className="grid gap-4">
        {services.map((svc) => {
          const status = statusConfig[svc.status] || statusConfig['ACTIVE'];
          const isOverdue = svc.nextDueDate && new Date(svc.nextDueDate) < new Date();

          return (
            <div key={svc.id} className="bg-surface border border-[#E5E7EB] rounded-2xl p-6 hover:shadow-[0_0_0_1px_#2D55C8] transition-all duration-200">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <h3 className="font-heading font-black text-text-h">{svc.plan.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${status.className}`}>{status.label}</span>
                    <span className="text-xs text-text-muted bg-deep px-2 py-0.5 rounded-full">{svc.plan.category === 'TRADING_VPS' ? 'VPS' : 'Server'}</span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-text-muted text-xs">IP Address</p>
                      <p className="font-mono text-text-body">{svc.ipAddress || '—'}</p>
                    </div>
                    <div>
                      <p className="text-text-muted text-xs">Location</p>
                      <p className="text-text-body">{svc.location === 'LONDON' ? '🇬🇧 London' : '🇺🇸 New York'}</p>
                    </div>
                    <div>
                      <p className="text-text-muted text-xs">OS</p>
                      <p className="text-text-body">{svc.os}</p>
                    </div>
                    <div>
                      <p className="text-text-muted text-xs">Next Due</p>
                      <p className={isOverdue ? 'text-coral' : 'text-text-body'}>
                        {svc.nextDueDate ? new Date(svc.nextDueDate).toLocaleDateString() : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <a
                    href={`/dashboard/services/${svc.id}`}
                    className="border border-[#E5E7EB] text-text-body hover:border-coral hover:text-coral font-heading font-bold text-sm px-4 py-2 rounded-xl transition-colors"
                  >
                    Manage
                  </a>
                  {svc.status !== 'ACTIVE' && (
                    <button
                      onClick={() => doAction(svc.id, 'start')}
                      disabled={!!actionLoading}
                      className="border border-green-500 text-green-400 hover:bg-green-500/10 font-heading font-bold text-sm px-4 py-2 rounded-xl transition-colors"
                    >
                      Start
                    </button>
                  )}
                  {svc.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => doAction(svc.id, 'restart')}
                        disabled={!!actionLoading}
                        className="border border-[#E5E7EB] text-text-muted hover:border-coral hover:text-coral font-heading font-bold text-sm px-4 py-2 rounded-xl transition-colors"
                      >
                        Restart
                      </button>
                      <button
                        onClick={() => doAction(svc.id, 'stop')}
                        disabled={!!actionLoading}
                        className="border border-coral/30 text-coral/70 hover:border-coral hover:text-coral font-heading font-bold text-sm px-4 py-2 rounded-xl transition-colors"
                      >
                        Stop
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
