import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BanIcon, CheckCircle2Icon, Loader2Icon, SaveIcon, Trash2Icon } from 'lucide-react';
import { apiDelete, apiGetList, apiGetOne, apiPatch, ApiRequestError } from '../../../lib/api';
import { formatDate } from '../../../lib/date';
import { useToast } from '../../components/ToastProvider';
import { useConfirm } from '../../components/ConfirmDialog';
import { PageHeader } from '../../components/PageHeader';
import { StatusBadge } from '../../components/StatusBadge';
import { TextAreaField, TextField, PhoneField } from '../../components/fields/Fields';

interface CustomerDetail {
  _id: string;
  user?: { fullName?: string; email?: string; phone?: string; active?: boolean };
  country?: string;
  address?: string;
  dateOfBirth?: string;
  passportNumber?: string;
  preferredLanguage?: string;
  totalBookings: number;
  totalSpend: number;
  notes: string;
}

interface CustomerBooking {
  _id: string;
  bookingReference: string;
  tourPackage?: { name: string };
  travelDate: string;
  pricing: { totalAmount: number };
  status: string;
}

export function AdminCustomerDetail() {
  const { id } = useParams<{id: string;}>();
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [notes, setNotes] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [togglingActive, setTogglingActive] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
    apiGetOne<CustomerDetail>(`/customers/${id}`),
    apiGetList<CustomerBooking>('/bookings', { customer: id, limit: 20 })]
    ).
    then(([c, b]) => {
      setCustomer(c);
      setNotes(c.notes || '');
      setFullName(c.user?.fullName || '');
      setEmail(c.user?.email || '');
      setPhone(c.user?.phone || '');
      setCountry(c.country || '');
      setAddress(c.address || '');
      setDateOfBirth(c.dateOfBirth ? c.dateOfBirth.slice(0, 10) : '');
      setPassportNumber(c.passportNumber || '');
      setBookings(b.data);
    }).
    finally(() => setLoading(false));
  }, [id]);

  const saveNotes = async () => {
    setSaving(true);
    try {
      await apiPatch(`/customers/${id}/notes`, { notes });
      toast('Notes saved.');
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : 'Failed to save notes.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!fullName.trim()) {
      toast('Full name is required.', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      const updated = await apiPatch<CustomerDetail>(`/customers/${id}/profile`, {
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth || null,
        passportNumber,
        country,
        address,
      });
      setCustomer(updated);
      toast('Customer details saved.');
    } catch (err) {
      toast(err instanceof ApiRequestError ? err.message : 'Failed to save customer details.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const toggleActive = () => {
    if (!customer) return;
    const nextActive = !(customer.user?.active ?? true);
    confirm({
      title: nextActive ? 'Unblock customer?' : 'Block customer?',
      message: `${customer.user?.fullName} will be ${nextActive ? 're-enabled' : 'blocked from signing in'}.`,
      confirmLabel: nextActive ? 'Unblock' : 'Block',
      tone: nextActive ? 'default' : 'danger',
      onConfirm: async () => {
        setTogglingActive(true);
        try {
          await apiPatch(`/customers/${id}/active`, { active: nextActive });
          setCustomer({ ...customer, user: { ...customer.user, active: nextActive } });
          toast(`Customer ${nextActive ? 'unblocked' : 'blocked'}.`);
        } catch (err) {
          toast(err instanceof ApiRequestError ? err.message : 'Failed to update customer.', 'error');
        } finally {
          setTogglingActive(false);
        }
      }
    });
  };

  const deleteCustomer = () => {
    if (!customer) return;
    confirm({
      title: 'Delete customer?',
      message: `This permanently removes ${customer.user?.fullName || 'this customer'}. Customers with bookings, payments or requests on file can't be deleted — block them instead.`,
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        setDeleting(true);
        try {
          await apiDelete(`/customers/${id}`);
          toast('Customer deleted.');
          navigate('/admin/customers');
        } catch (err) {
          toast(err instanceof ApiRequestError ? err.message : 'Failed to delete customer.', 'error');
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  if (loading || !customer) return <div className="grid h-64 place-items-center"><Loader2Icon className="h-6 w-6 animate-spin text-forest/40" /></div>;

  return (
    <div>
      <PageHeader
        title={customer.user?.fullName || 'Customer'}
        subtitle={customer.user?.email}
        action={
        <div className="flex items-center gap-2">
            <button
            onClick={toggleActive}
            disabled={togglingActive}
            className="flex items-center gap-2 rounded-full border border-forest/15 px-5 py-2.5 text-sm font-semibold text-forest hover:bg-cream disabled:opacity-60">

              {customer.user?.active === false ? <CheckCircle2Icon className="h-4 w-4" /> : <BanIcon className="h-4 w-4" />}
              {customer.user?.active === false ? 'Unblock' : 'Block'}
            </button>
            <button
            onClick={deleteCustomer}
            disabled={deleting}
            className="flex items-center gap-2 rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60">

              <Trash2Icon className="h-4 w-4" /> Delete
            </button>
            <button onClick={() => navigate('/admin/customers')} className="rounded-full border border-forest/15 px-5 py-2.5 text-sm font-semibold text-forest hover:bg-cream">Back to list</button>
          </div>
        } />


      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="font-display text-sm font-semibold text-forest">Booking History</p>
            <div className="mt-3 divide-y divide-forest/5">
              {bookings.length === 0 && <p className="py-6 text-center text-sm text-forest/40">No bookings yet.</p>}
              {bookings.map((b) =>
              <div key={b._id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-forest">{b.tourPackage?.name || 'Customized Tour'}</p>
                    <p className="text-xs text-forest/50">{b.bookingReference} · {formatDate(b.travelDate)} · ${b.pricing.totalAmount.toLocaleString()}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="mb-3 font-display text-sm font-semibold text-forest">Internal Notes</p>
            <TextAreaField label="Notes (visible to admins only)" value={notes} onChange={setNotes} rows={4} />
            <button onClick={saveNotes} disabled={saving} className="mt-3 flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream hover:bg-emerald disabled:opacity-70">
              {saving ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
              Save Notes
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="font-display text-sm font-semibold text-forest">Contact &amp; Profile Details</p>
            <div className="mt-3 space-y-3">
              <TextField label="Full Name" value={fullName} onChange={setFullName} required />
              <TextField label="Email" type="email" value={email} onChange={setEmail} />
              <PhoneField label="Phone" value={phone} onChange={setPhone} />
              <TextField label="Country" value={country} onChange={setCountry} />
              <TextField label="Address" value={address} onChange={setAddress} />
              <TextField label="Date of Birth" type="date" value={dateOfBirth} onChange={setDateOfBirth} />
              <TextField label="Passport Number" value={passportNumber} onChange={setPassportNumber} />
            </div>
            <p className="mt-2 text-xs text-forest/40">Date of birth and passport number power the Birthday Wishes system.</p>
            <button onClick={saveProfile} disabled={savingProfile} className="mt-3 flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-cream hover:bg-emerald disabled:opacity-70">
              {savingProfile ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <SaveIcon className="h-4 w-4" />}
              Save Details
            </button>
          </div>
          <div className="rounded-2xl bg-white p-6 shadow-soft">
            <p className="font-display text-sm font-semibold text-forest">Stats</p>
            <div className="mt-3 space-y-2 text-sm">
              <p><span className="text-forest/50">Total Bookings:</span> {customer.totalBookings}</p>
              <p><span className="text-forest/50">Total Spend:</span> ${(customer.totalSpend || 0).toLocaleString()}</p>
              <p><span className="text-forest/50">Account:</span> {customer.user?.active === false ? 'Blocked' : 'Active'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>);

}
