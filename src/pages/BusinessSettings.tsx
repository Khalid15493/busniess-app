import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { PageHeader, Card, Button, Input, Select } from '@/components/ui';
import { Spinner } from '@/components/ui/Feedback';
import {
  createBusinessProfile,
  updateBusinessProfile,
} from '@/services/business';
import { CURRENCY_SYMBOLS, PAYMENT_METHOD_LABELS } from '@/types';
import { Save, Briefcase, Sliders } from 'lucide-react';

const CURRENCIES = ['BDT', 'USD', 'EUR', 'GBP', 'INR'];

export function BusinessSettings() {
  const { businessProfile, refreshBusinessProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(!businessProfile);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    business_name: '',
    owner_name: '',
    phone: '',
    address: '',
    email: '',
    logo_url: '',
    currency: 'BDT',
    invoice_prefix: 'INV',
    default_payment_method: 'cash',
    default_low_stock: '5',
    default_delivery_provider: '',
    tax_enabled: false,
    tax_rate: '0',
  });

  useEffect(() => {
    if (businessProfile) {
      setForm({
        business_name: businessProfile.business_name ?? '',
        owner_name: businessProfile.owner_name ?? '',
        phone: businessProfile.phone ?? '',
        address: businessProfile.address ?? '',
        email: businessProfile.email ?? '',
        logo_url: businessProfile.logo_url ?? '',
        currency: businessProfile.currency ?? 'BDT',
        invoice_prefix: businessProfile.invoice_prefix ?? 'INV',
        default_payment_method: businessProfile.default_payment_method ?? 'cash',
        default_low_stock: String(businessProfile.default_low_stock ?? 5),
        default_delivery_provider: businessProfile.default_delivery_provider ?? '',
        tax_enabled: businessProfile.tax_enabled ?? false,
        tax_rate: String(businessProfile.tax_rate ?? 0),
      });
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, [businessProfile]);

  const handleChange = (field: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!form.business_name.trim()) {
      toast('Business name is required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        business_name: form.business_name.trim(),
        owner_name: form.owner_name.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        email: form.email.trim() || null,
        logo_url: form.logo_url.trim() || null,
        currency: form.currency,
        invoice_prefix: form.invoice_prefix.trim() || 'INV',
        default_payment_method: form.default_payment_method,
        default_low_stock: parseInt(form.default_low_stock, 10) || 0,
        default_delivery_provider: form.default_delivery_provider.trim() || null,
        tax_enabled: form.tax_enabled,
        tax_rate: parseFloat(form.tax_rate) || 0,
      };
      if (businessProfile) {
        await updateBusinessProfile(businessProfile.id, payload);
      } else {
        await createBusinessProfile({
          business_name: form.business_name.trim(),
          owner_name: form.owner_name.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          email: form.email.trim() || undefined,
          logo_url: form.logo_url.trim() || undefined,
          currency: form.currency,
          invoice_prefix: form.invoice_prefix.trim() || 'INV',
        });
      }
      await refreshBusinessProfile();
      toast('Business settings saved successfully', 'success');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Business Settings"
        subtitle="Configure your business profile and preferences"
      />

      <div className="space-y-4 max-w-2xl">
        {/* Business Identity */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-5 h-5 text-slate-400" />
            <h2 className="text-base font-semibold text-slate-200">Business Identity</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Business Name *"
              value={form.business_name}
              onChange={(e) => handleChange('business_name', e.target.value)}
              placeholder="My Mushroom Farm"
            />
            <Input
              label="Owner Name"
              value={form.owner_name}
              onChange={(e) => handleChange('owner_name', e.target.value)}
              placeholder="John Doe"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              placeholder="+880 1XXX XXXXXX"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => handleChange('email', e.target.value)}
              placeholder="business@example.com"
            />
            <div className="sm:col-span-2">
              <Input
                label="Address"
                value={form.address}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="123 Farm Road, Dhaka, Bangladesh"
              />
            </div>
            <div className="sm:col-span-2">
              <Input
                label="Logo URL"
                value={form.logo_url}
                onChange={(e) => handleChange('logo_url', e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        </Card>

        {/* Financial Settings */}
        <Card className="p-5">
          <h2 className="text-base font-semibold text-slate-200 mb-4">Financial Settings</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Currency"
              value={form.currency}
              onChange={(e) => handleChange('currency', e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c} ({CURRENCY_SYMBOLS[c]})
                </option>
              ))}
            </Select>
            <Input
              label="Invoice Prefix"
              value={form.invoice_prefix}
              onChange={(e) => handleChange('invoice_prefix', e.target.value)}
              placeholder="INV"
            />
          </div>
        </Card>

        {/* Defaults & Preferences */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sliders className="w-5 h-5 text-slate-400" />
            <h2 className="text-base font-semibold text-slate-200">Defaults & Preferences</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Default Payment Method"
              value={form.default_payment_method}
              onChange={(e) => handleChange('default_payment_method', e.target.value)}
            >
              {Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </Select>
            <Input
              label="Default Low-Stock Threshold"
              type="number"
              min="0"
              value={form.default_low_stock}
              onChange={(e) => handleChange('default_low_stock', e.target.value)}
              placeholder="5"
            />
            <Input
              label="Default Delivery Provider"
              value={form.default_delivery_provider}
              onChange={(e) => handleChange('default_delivery_provider', e.target.value)}
              placeholder="e.g. Pathao, Steadfast"
            />
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.tax_enabled}
                  onChange={(e) => handleChange('tax_enabled', e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700/50 text-blue-600 focus:ring-blue-500"
                />
                Enable Tax
              </label>
            </div>
            {form.tax_enabled && (
              <Input
                label="Tax Rate (%)"
                type="number"
                step="any"
                min="0"
                max="100"
                value={form.tax_rate}
                onChange={(e) => handleChange('tax_rate', e.target.value)}
                placeholder="0"
              />
            )}
          </div>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <Spinner className="w-5 h-5 border-white" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
