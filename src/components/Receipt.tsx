import { type ReactNode } from 'react';
import type { Sale, BusinessProfile } from '@/types';
import { formatCurrency, formatDateTime, PAYMENT_METHOD_LABELS } from '@/types';

interface Props {
  sale: Sale;
  business: BusinessProfile | null;
  format: 'a4' | 'thermal';
}

export function Receipt({ sale, business, format: fmt }: Props) {
  const currency = business?.currency ?? 'BDT';
  const isThermal = fmt === 'thermal';
  const items = sale.sale_items ?? [];

  const containerClass = isThermal
    ? 'w-80 mx-auto bg-white p-4 text-xs'
    : 'w-full max-w-2xl mx-auto bg-white p-8 text-sm';

  return (
    <div className={containerClass} id="receipt-content">
      {/* Header */}
      <div className="text-center mb-4">
        {business?.logo_url && (
          <img src={business.logo_url} alt="Logo" className="w-16 h-16 mx-auto rounded-lg object-cover mb-2" />
        )}
        <h1 className="font-bold text-slate-900 text-lg">{business?.business_name ?? 'My Business'}</h1>
        {business?.phone && <p className="text-slate-600 mt-0.5">{business.phone}</p>}
        {business?.address && <p className="text-slate-600">{business.address}</p>}
        {business?.email && <p className="text-slate-600">{business.email}</p>}
      </div>

      <div className={`border-t border-b border-dashed border-slate-300 py-2 mb-3 ${isThermal ? 'text-[10px]' : 'text-xs'}`}>
        <div className="flex justify-between">
          <span className="font-semibold">Invoice: {sale.invoice_number}</span>
          <span>{formatDateTime(sale.sale_date)}</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>Customer: {sale.customer?.name ?? 'Walk-in'}</span>
          <span className="capitalize">Method: {PAYMENT_METHOD_LABELS[sale.payment_method as keyof typeof PAYMENT_METHOD_LABELS] ?? sale.payment_method}</span>
        </div>
        {sale.customer?.phone && (
          <p className="mt-0.5">Phone: {sale.customer.phone}</p>
        )}
      </div>

      {/* Items Table */}
      {!isThermal ? (
        <table className="w-full mb-3">
          <thead>
            <tr className="border-b border-slate-300 text-left">
              <th className="py-1.5 pr-2 text-xs font-semibold text-slate-700">Product</th>
              <th className="py-1.5 px-2 text-right text-xs font-semibold text-slate-700">Qty</th>
              <th className="py-1.5 px-2 text-right text-xs font-semibold text-slate-700">Price</th>
              <th className="py-1.5 px-2 text-right text-xs font-semibold text-slate-700">Disc</th>
              <th className="py-1.5 pl-2 text-right text-xs font-semibold text-slate-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-1.5 pr-2 text-slate-800">{item.product?.name ?? 'Unknown'}</td>
                <td className="py-1.5 px-2 text-right text-slate-600">{item.quantity} {item.unit}</td>
                <td className="py-1.5 px-2 text-right text-slate-600">{formatCurrency(item.selling_price, currency)}</td>
                <td className="py-1.5 px-2 text-right text-slate-600">{item.discount > 0 ? formatCurrency(item.discount, currency) : '-'}</td>
                <td className="py-1.5 pl-2 text-right font-medium text-slate-800">{formatCurrency(item.line_total, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mb-3">
          {items.map((item) => (
            <div key={item.id} className="py-1 border-b border-dotted border-slate-200">
              <p className="font-medium text-slate-800">{item.product?.name ?? 'Unknown'}</p>
              <div className="flex justify-between">
                <span className="text-slate-600">{item.quantity} {item.unit} x {formatCurrency(item.selling_price, currency)}</span>
                <span className="font-medium text-slate-800">{formatCurrency(item.line_total, currency)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Totals */}
      <div className={`space-y-1 ${isThermal ? 'text-[11px]' : 'text-sm'} mb-3`}>
        <div className="flex justify-between">
          <span className="text-slate-600">Subtotal</span>
          <span className="text-slate-800">{formatCurrency(sale.subtotal, currency)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">Discount</span>
            <span className="text-red-600">-{formatCurrency(sale.discount, currency)}</span>
          </div>
        )}
        {sale.delivery_charge > 0 && (
          <div className="flex justify-between">
            <span className="text-slate-600">Delivery Charge</span>
            <span className="text-slate-800">+{formatCurrency(sale.delivery_charge, currency)}</span>
          </div>
        )}
        <div className={`flex justify-between font-bold border-t border-slate-300 pt-1 ${isThermal ? 'text-sm' : 'text-base'}`}>
          <span className="text-slate-900">Grand Total</span>
          <span className="text-slate-900">{formatCurrency(sale.total, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Paid</span>
          <span className="text-emerald-600">{formatCurrency(sale.paid_amount, currency)}</span>
        </div>
        {sale.due_amount > 0 && (
          <div className="flex justify-between font-semibold">
            <span className="text-red-600">Due</span>
            <span className="text-red-600">{formatCurrency(sale.due_amount, currency)}</span>
          </div>
        )}
      </div>

      {sale.notes && (
        <div className="border-t border-dashed border-slate-300 pt-2 mb-2">
          <p className="text-xs text-slate-600"><span className="font-semibold">Notes:</span> {sale.notes}</p>
        </div>
      )}

      <div className="text-center mt-4 pt-2 border-t border-dashed border-slate-300">
        <p className="text-slate-700 font-medium">Thank you for your business!</p>
        <p className="text-slate-400 text-[10px] mt-0.5">Powered by Business Manager</p>
      </div>
    </div>
  );
}
