import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthPage } from '@/pages/AuthPage';
import { AppShell, type Route } from '@/components/AppShell';
import { Dashboard } from '@/pages/Dashboard';
import { Products } from '@/pages/Products';
import { Categories } from '@/pages/Categories';
import { BusinessSettings } from '@/pages/BusinessSettings';
import { ProductDetails } from '@/pages/ProductDetails';
import { Customers } from '@/pages/Customers';
import { CustomerDetails } from '@/pages/CustomerDetails';
import { Sales } from '@/pages/Sales';
import { CreateSale } from '@/pages/CreateSale';
import { SaleDetails } from '@/pages/SaleDetails';
import { Suppliers } from '@/pages/Suppliers';
import { SupplierDetails } from '@/pages/SupplierDetails';
import { Purchases } from '@/pages/Purchases';
import { CreatePurchase } from '@/pages/CreatePurchase';
import { PurchaseDetails } from '@/pages/PurchaseDetails';
import { Expenses } from '@/pages/Expenses';
import { Withdrawals } from '@/pages/Withdrawals';
import { Accounts } from '@/pages/Accounts';
import { Deliveries } from '@/pages/Deliveries';
import { Wastage } from '@/pages/Wastage';
import { Reports } from '@/pages/Reports';
import { Spinner } from '@/components/ui/Feedback';

function App() {
  const { session, loading } = useAuth();
  const [route, setRoute] = useState<Route>('dashboard');
  const [productId, setProductId] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [saleId, setSaleId] = useState<string | null>(null);
  const [purchaseId, setPurchaseId] = useState<string | null>(null);
  const [supplierId, setSupplierId] = useState<string | null>(null);

  const navigate = (
    r: Route,
    params?: { productId?: string; customerId?: string; saleId?: string; purchaseId?: string; supplierId?: string }
  ) => {
    if (r === 'productDetails' && params?.productId) {
      setProductId(params.productId);
    } else if (r === 'customerDetails' && params?.customerId) {
      setCustomerId(params.customerId);
    } else if (r === 'saleDetails' && params?.saleId) {
      setSaleId(params.saleId);
    } else if (r === 'purchaseDetails' && params?.purchaseId) {
      setPurchaseId(params.purchaseId);
    } else if (r === 'supplierDetails' && params?.supplierId) {
      setSupplierId(params.supplierId);
    } else {
      setProductId(null);
      setCustomerId(null);
      setSaleId(null);
      setPurchaseId(null);
      setSupplierId(null);
    }
    setRoute(r);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  const renderRoute = () => {
    switch (route) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'products':
        return <Products onNavigate={navigate} />;
      case 'categories':
        return <Categories />;
      case 'settings':
        return <BusinessSettings />;
      case 'productDetails':
        return productId ? (
          <ProductDetails productId={productId} onNavigate={navigate} />
        ) : (
          <Products onNavigate={navigate} />
        );
      case 'customers':
        return <Customers onNavigate={navigate} />;
      case 'customerDetails':
        return customerId ? (
          <CustomerDetails customerId={customerId} onNavigate={navigate} />
        ) : (
          <Customers onNavigate={navigate} />
        );
      case 'sales':
        return <Sales onNavigate={navigate} />;
      case 'createSale':
        return <CreateSale onNavigate={navigate} />;
      case 'saleDetails':
        return saleId ? (
          <SaleDetails saleId={saleId} onNavigate={navigate} />
        ) : (
          <Sales onNavigate={navigate} />
        );
      case 'suppliers':
        return <Suppliers onNavigate={navigate} />;
      case 'supplierDetails':
        return supplierId ? (
          <SupplierDetails supplierId={supplierId} onNavigate={navigate} />
        ) : (
          <Suppliers onNavigate={navigate} />
        );
      case 'purchases':
        return <Purchases onNavigate={navigate} />;
      case 'createPurchase':
        return <CreatePurchase onNavigate={navigate} />;
      case 'purchaseDetails':
        return purchaseId ? (
          <PurchaseDetails purchaseId={purchaseId} onNavigate={navigate} />
        ) : (
          <Purchases onNavigate={navigate} />
        );
      case 'expenses':
        return <Expenses />;
      case 'withdrawals':
        return <Withdrawals />;
      case 'accounts':
        return <Accounts />;
      case 'delivery':
        return <Deliveries onNavigate={navigate} />;
      case 'wastage':
        return <Wastage />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <AppShell currentRoute={route} onNavigate={navigate}>
      {renderRoute()}
    </AppShell>
  );
}

export default App;
