import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { api, getErrorMessage } from '../../lib/api';
import toast, { Toaster } from 'react-hot-toast';

const COUNTRIES = ['United States', 'United Kingdom', 'Germany', 'France', 'Spain', 'Italy', 'Canada', 'Australia', 'Brazil', 'Japan', 'China', 'India', 'Russia', 'Netherlands', 'Singapore', 'UAE', 'Switzerland', 'Sweden', 'Norway', 'Denmark'];

export default function AccountSettings() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<'profile' | 'security' | 'danger'>('profile');
  const [deleteConfirmPassword, setDeleteConfirmPassword] = useState('');

  const profileForm = useForm<{ firstName: string; lastName: string; phone: string; company: string; country: string; address: string }>();
  const passwordForm = useForm<{ currentPassword: string; newPassword: string; confirmPassword: string }>();

  useEffect(() => {
    api.get('/user/profile')
      .then((r) => {
        setUser(r.data.data);
        profileForm.reset(r.data.data);
      })
      .catch((e) => toast.error(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async (data: Record<string, unknown>) => {
    try {
      await api.put('/user/profile', data);
      const stored = localStorage.getItem('nuclear-vps-auth');
      if (stored) {
        const state = JSON.parse(stored);
        state.state.user = { ...state.state.user, ...data };
        localStorage.setItem('nuclear-vps-auth', JSON.stringify(state));
      }
      toast.success('Profile updated!');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const changePassword = async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    if (data.newPassword !== data.confirmPassword) return toast.error('Passwords do not match');
    try {
      await api.put('/user/change-password', { currentPassword: data.currentPassword, newPassword: data.newPassword });
      toast.success('Password changed!');
      passwordForm.reset();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const deleteAccount = async () => {
    if (!deleteConfirmPassword) return toast.error('Please enter your password');
    try {
      await api.delete('/user/account', { data: { password: deleteConfirmPassword } });
      localStorage.removeItem('nuclear-vps-auth');
      window.location.href = '/';
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-coral border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-2xl">
      <Toaster position="top-right" toastOptions={{ style: { background: '#F9FAFB', color: '#374151', border: '1px solid #E5E7EB' } }} />

      {/* Section tabs */}
      <div className="flex gap-2 mb-6 border-b border-[#E5E7EB] pb-0">
        {(['profile', 'security', 'danger'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`pb-3 px-1 font-heading font-bold text-sm capitalize border-b-2 transition-colors ${
              section === s ? 'border-coral text-coral' : 'border-transparent text-text-muted hover:text-text-body'
            }`}
          >
            {s === 'danger' ? 'Danger Zone' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Profile */}
      {section === 'profile' && (
        <div className="bg-surface border border-[#E5E7EB] rounded-2xl p-6">
          <h2 className="font-heading font-black text-text-h text-xl mb-6">Profile Information</h2>
          <form onSubmit={profileForm.handleSubmit(saveProfile)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input {...profileForm.register('firstName')} className="input-field" />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input {...profileForm.register('lastName')} className="input-field" />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input value={String(user?.email || '')} readOnly className="input-field opacity-60 cursor-not-allowed" />
            </div>
            <div>
              <label className="label">Phone (optional)</label>
              <input {...profileForm.register('phone')} className="input-field" />
            </div>
            <div>
              <label className="label">Company (optional)</label>
              <input {...profileForm.register('company')} className="input-field" />
            </div>
            <div>
              <label className="label">Country</label>
              <select {...profileForm.register('country')} className="input-field">
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Address (optional)</label>
              <input {...profileForm.register('address')} className="input-field" />
            </div>
            <button type="submit" className="btn-primary">Save Changes</button>
          </form>
        </div>
      )}

      {/* Security */}
      {section === 'security' && (
        <div className="bg-surface border border-[#E5E7EB] rounded-2xl p-6">
          <h2 className="font-heading font-black text-text-h text-xl mb-6">Change Password</h2>
          <form onSubmit={passwordForm.handleSubmit(changePassword)} className="space-y-4">
            <div>
              <label className="label">Current Password</label>
              <input type="password" {...passwordForm.register('currentPassword')} className="input-field" required />
            </div>
            <div>
              <label className="label">New Password</label>
              <input type="password" {...passwordForm.register('newPassword')} className="input-field" minLength={8} required />
            </div>
            <div>
              <label className="label">Confirm New Password</label>
              <input type="password" {...passwordForm.register('confirmPassword')} className="input-field" required />
            </div>
            <button type="submit" className="btn-primary">Change Password</button>
          </form>
        </div>
      )}

      {/* Danger Zone */}
      {section === 'danger' && (
        <div className="bg-surface border border-coral/30 rounded-2xl p-6">
          <h2 className="font-heading font-black text-coral text-xl mb-4">Delete Account</h2>
          <p className="text-text-muted text-sm mb-6">This will permanently delete your account and all associated data. This action cannot be undone.</p>
          <div className="space-y-4">
            <div>
              <label className="label">Enter your password to confirm</label>
              <input
                type="password"
                value={deleteConfirmPassword}
                onChange={(e) => setDeleteConfirmPassword(e.target.value)}
                className="input-field border-coral/30"
              />
            </div>
            <button
              onClick={deleteAccount}
              className="border-2 border-coral text-coral hover:bg-coral hover:text-white font-heading font-bold px-6 py-3 rounded-xl transition-colors"
            >
              Delete My Account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
