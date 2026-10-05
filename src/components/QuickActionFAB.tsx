import React, { useState } from 'react';
import { Plus, ShoppingBag, TrendingDown, Package, Users, X } from 'lucide-react';
import { type Route } from './AppShell';

interface FABProps {
  onNavigate: (route: Route) => void;
}

export const QuickActionFAB: React.FC<FABProps> = ({ onNavigate }) => {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Sub Menu Buttons */}
      {open && (
        <div className="mb-3 flex flex-col gap-2.5 items-end animate-in fade-in slide-in-from-bottom-5 duration-200">
          <button
            onClick={() => { onNavigate('createSale'); setOpen(false); }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold shadow-xl hover:bg-indigo-500 transition-all"
          >
            <ShoppingBag className="h-4 w-4" /> New Sale
          </button>
          
          <button
            onClick={() => { onNavigate('expenses'); setOpen(false); }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-semibold shadow-xl hover:bg-rose-500 transition-all"
          >
            <TrendingDown className="h-4 w-4" /> Add Expense
          </button>

          <button
            onClick={() => { onNavigate('products'); setOpen(false); }}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold shadow-xl hover:bg-emerald-500 transition-all"
          >
            <Package className="h-4 w-4" /> Products
          </button>
        </div>
      )}

      {/* Main Trigger FAB */}
      <button
        onClick={() => setOpen(!open)}
        className={`h-14 w-14 rounded-full flex items-center justify-center text-white shadow-2xl transition-transform duration-200 active:scale-95 ${
          open ? 'bg-slate-700 rotate-45' : 'bg-gradient-to-r from-indigo-600 to-indigo-500 hover:scale-105'
        }`}
      >
        <Plus className="h-7 w-7" />
      </button>
    </div>
  );
};
