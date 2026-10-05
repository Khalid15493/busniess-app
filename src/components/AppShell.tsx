import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Tags, 
  Users, 
  ShoppingCart, 
  Truck, 
  TrendingDown, 
  Wallet, 
  Building2, 
  Trash2, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Logo } from './Logo';

export type Route = 
  | 'dashboard' 
  | 'products' 
  | 'categories' 
  | 'customers' 
  | 'sales' 
  | 'createSale' 
  | 'saleDetails' 
  | 'suppliers' 
  | 'supplierDetails' 
  | 'purchases' 
  | 'createPurchase' 
  | 'purchaseDetails' 
  | 'expenses' 
  | 'withdrawals' 
  | 'accounts' 
  | 'deliveries' 
  | 'wastage' 
  | 'reports' 
  | 'settings'
  | 'productDetails'
  | 'customerDetails'
  | 'personal';

interface AppShellProps {
  children: React.ReactNode;
  currentRoute: Route;
  onNavigate: (route: Route) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ children, currentRoute, onNavigate }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useAuth();

  const navItems = [
    { id: 'dashboard' as Route, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'personal' as Route, label: 'Personal Finance', icon: UserCheck },
    { id: 'products' as Route, label: 'Products', icon: Package },
    { id: 'categories' as Route, label: 'Categories', icon: Tags },
    { id: 'customers' as Route, label: 'Customers', icon: Users },
    { id: 'sales' as Route, label: 'Sales', icon: ShoppingCart },
    { id: 'purchases' as Route, label: 'Purchases', icon: Truck },
    { id: 'expenses' as Route, label: 'Expenses', icon: TrendingDown },
    { id: 'withdrawals' as Route, label: 'Withdrawals', icon: Wallet },
    { id: 'accounts' as Route, label: 'Accounts', icon: Building2 },
    { id: 'deliveries' as Route, label: 'Deliveries', icon: Truck },
    { id: 'wastage' as Route, label: 'Wastage', icon: Trash2 },
    { id: 'reports' as Route, label: 'Reports', icon: BarChart3 },
    { id: 'settings' as Route, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-slate-900 border-r border-slate-800
        transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col
      `}>
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <Logo />
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-slate-400 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all
                  ${isActive 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' 
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'}
                `}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer / User Profile */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between">
          <div className="truncate">
            <p className="text-xs text-slate-500 uppercase font-semibold">Logged in as</p>
            <p className="text-sm font-medium text-slate-300 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => signOut()}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden border-b border-slate-800 bg-slate-900 p-4 flex items-center justify-between">
          <Logo />
          <button 
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white"
          >
            <Menu className="h-6 w-6" />
          </button>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
};
