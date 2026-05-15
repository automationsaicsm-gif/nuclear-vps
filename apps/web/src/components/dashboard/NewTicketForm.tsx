import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

const schema = z.object({
  subject: z.string().min(5, 'Subject must be at least 5 characters').max(200),
  department: z.enum(['GENERAL', 'BILLING', 'TECHNICAL', 'SALES']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  message: z.string().min(20, 'Message must be at least 20 characters'),
});

type FormData = z.infer<typeof schema>;

export default function NewTicketForm() {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { department: 'GENERAL', priority: 'MEDIUM' },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';
      const r = await axios.post(`${API_URL}/api/v1/tickets`, data, { withCredentials: true });
      toast.success('Ticket created successfully!');
      setTimeout(() => {
        window.location.href = `/dashboard/tickets/${r.data.data.id}`;
      }, 1000);
    } catch (err: unknown) {
      toast.error(axios.isAxiosError(err) ? err.response?.data?.error || 'Failed to create ticket' : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <Toaster position="top-right" toastOptions={{ style: { background: '#252272', color: '#C7D2FE', border: '1px solid #312E81' } }} />

      <div className="mb-6">
        <a href="/dashboard/tickets" className="text-text-muted hover:text-coral text-sm transition-colors">← Back to Tickets</a>
      </div>

      <div className="bg-surface border border-[#312E81] rounded-2xl p-8">
        <h2 className="font-heading font-black text-text-h text-2xl mb-6">Open New Ticket</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Department</label>
              <select {...register('department')} className="input-field">
                <option value="GENERAL">General</option>
                <option value="BILLING">Billing</option>
                <option value="TECHNICAL">Technical</option>
                <option value="SALES">Sales</option>
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select {...register('priority')} className="input-field">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Subject</label>
            <input {...register('subject')} className="input-field" placeholder="Brief description of your issue" />
            {errors.subject && <p className="text-coral text-xs mt-1">{errors.subject.message}</p>}
          </div>

          <div>
            <label className="label">Message</label>
            <textarea
              {...register('message')}
              rows={6}
              className="input-field resize-none"
              placeholder="Please describe your issue in detail..."
            />
            {errors.message && <p className="text-coral text-xs mt-1">{errors.message.message}</p>}
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Submitting...' : 'Open Ticket'}
          </button>
        </form>
      </div>
    </div>
  );
}
