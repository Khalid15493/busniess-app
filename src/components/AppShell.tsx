import { type ReactNode, useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { GlobalSearch } from '@/components/GlobalSearch';
import { useToast } from '@/context/ToastContext';
import { Search } from 'lucide-react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Truck,
  Receipt,
  Wallet,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Briefcase,
  Boxes,
  Banknote,
  AlertTriangle,
} from 'lucide-react';

export type Route =
  | 'dashboard'
  | 'sales'
  | 'createSale'
  | 'saleDetails'
  | 'purchases'
  | 'createPurchase'
  | 'purchaseDetails'
  | 'products'
  | 'productDetails'
  | 'categories'
  | 'customers'
  | 'customerDetails'
  | 'suppliers'
  | 'supplierDetails'
  | 'expenses'
  | 'withdrawals'
  | 'delivery'
  | 'accounts'
  | 'wastage'
  | 'reports'
  | 'settings';

interface NavItem {
  label: string;
  route: Route;
  icon: ReactNode;
  enabled: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', route: 'dashboard', icon: <LayoutDashboard className="w-5 h-5" />, enabled: true },
  { label: 'Sales', route: 'sales', icon: <ShoppingCart className="w-5 h-5" />, enabled: true },
  { label: 'Purchases', route: 'purchases', icon: <Receipt className="w-5 h-5" />, enabled: true },
  { label: 'Products', route: 'products', icon: <Package className="w-5 h-5" />, enabled: true },
  { label: 'Categories', route: 'categories', icon: <Boxes className="w-5 h-5" />, enabled: true },
  { label: 'Customers', route: 'customers', icon: <Users className="w-5 h-5" />, enabled: true },
  { label: 'Suppliers', route: 'suppliers', icon: <Truck className="w-5 h-5" />, enabled: true },
  { label: 'Expenses', route: 'expenses', icon: <Wallet className="w-5 h-5" />, enabled: true },
  { label: 'Owner Withdrawals', route: 'withdrawals', icon: <Banknote className="w-5 h-5" />, enabled: true },
  { label: 'Wastage/Damage', route: 'wastage', icon: <AlertTriangle className="w-5 h-5" />, enabled: true },
  { label: 'Delivery', route: 'delivery', icon: <Truck className="w-5 h-5" />, enabled: true },
  { label: 'Accounts', route: 'accounts', icon: <Wallet className="w-5 h-5" />, enabled: true },
  { label: 'Reports', route: 'reports', icon: <BarChart3 className="w-5 h-5" />, enabled: true },
  { label: 'Settings', route: 'settings', icon: <Settings className="w-5 h-5" />, enabled: true },
];

const BOTTOM_NAV: Route[] = ['dashboard', 'products', 'sales', 'customers'];

interface AppShellProps {
  currentRoute: Route;
  onNavigate: (route: Route, params?: { productId?: string; customerId?: string; saleId?: string; supplierId?: string; purchaseId?: string }) => void;
  children: ReactNode;
}

export function AppShell({ currentRoute, onNavigate, children }: AppShellProps) {
  const { profile, businessProfile, signOut } = useAuth();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Keyboard shortcuts (desktop only, not when typing in inputs)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      switch (e.key.toLowerCase()) {
        case 'n': onNavigate('createSale'); break;
        case 'p': onNavigate('createPurchase'); break;
        case 's': setSearchOpen(true); break;
        case 'd': onNavigate('dashboard'); break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onNavigate]);

  const handleSignOut = async () => {
    await signOut();
    toast('Signed out successfully', 'info');
  };

  const handleNavClick = (item: NavItem) => {
    if (!item.enabled) {
      toast(`${item.label} is coming soon in a future phase`, 'info');
      return;
    }
    onNavigate(item.route);
    setSidebarOpen(false);
  };

  const bottomItems = NAV_ITEMS.filter((n) => BOTTOM_NAV.includes(n.route));
  const currentLabel = NAV_ITEMS.find((n) => n.route === currentRoute)?.label ?? '';

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-950 border-r border-slate-800 flex-col fixed h-screen">
        <SidebarContent
          businessName={businessProfile?.business_name ?? 'My Business'}
          ownerName={profile?.full_name ?? ''}
          logoUrl={businessProfile?.logo_url}
          navItems={NAV_ITEMS}
          currentRoute={currentRoute}
          onNavClick={handleNavClick}
          onLogout={() => setShowLogout(true)}
        />
      </aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 bg-slate-950 flex flex-col animate-slide-in-left border-r border-slate-800">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent
              businessName={businessProfile?.business_name ?? 'My Business'}
              ownerName={profile?.full_name ?? ''}
              logoUrl={businessProfile?.logo_url}
              navItems={NAV_ITEMS}
              currentRoute={currentRoute}
              onNavClick={handleNavClick}
              onLogout={() => setShowLogout(true)}
            />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Mobile Top Bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-slate-950 border-b border-slate-800 px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 text-slate-400 hover:bg-slate-800 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-slate-200">{currentLabel}</span>
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 text-slate-400 hover:bg-slate-800 rounded-lg"
          >
            <Search className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-6 max-w-6xl mx-auto w-full">
          {children}
        </main>

        {/* Bottom Navigation (Mobile) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 z-30">
          <div className="flex">
            {bottomItems.map((item) => (
              <button
                key={item.route}
                onClick={() => handleNavClick(item)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
                  currentRoute === item.route
                    ? 'text-blue-400'
                    : 'text-slate-500'
                }`}
              >
                <div className={currentRoute === item.route ? 'scale-110 transition-transform' : ''}>
                  {item.icon}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} onNavigate={onNavigate} />

      <ConfirmDialog
        open={showLogout}
        onClose={() => setShowLogout(false)}
        onConfirm={handleSignOut}
        title="Sign Out"
        message="Are you sure you want to sign out of your account?"
        confirmLabel="Sign Out"
        danger
      />
    </div>
  );
}

function SidebarContent({
  businessName,
  ownerName,
  logoUrl,
  navItems,
  currentRoute,
  onNavClick,
  onLogout,
}: {
  businessName: string;
  ownerName: string;
  logoUrl: string | null | undefined;
  navItems: NavItem[];
  currentRoute: Route;
  onNavClick: (item: NavItem) => void;
  onLogout: () => void;
}) {
  return (
    <>
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-10 h-10 rounded-lg object-cover" />
          ) : (
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate">{businessName}</p>
            <p className="text-xs text-slate-500 truncate">{ownerName || 'Business Owner'}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        {navItems.map((item) => (
          <button
            key={item.route}
            onClick={() => onNavClick(item)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
              currentRoute === item.route
                ? 'bg-blue-600/20 text-blue-400'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            } ${!item.enabled ? 'opacity-50' : ''}`}
          >
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {!item.enabled && (
              <span className="text-[10px] text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                Soon
              </span>
            )}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </>
  );
}
