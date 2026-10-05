export type Currency = 'BDT' | 'USD' | 'EUR' | 'GBP' | 'INR';

export type Unit = 'kg' | 'gram' | 'piece' | 'packet' | 'bag' | 'litre' | 'custom';

export type StockMovementType =
  | 'OPENING_STOCK'
  | 'PURCHASE'
  | 'SALE'
  | 'PURCHASE_RETURN'
  | 'SALES_RETURN'
  | 'WASTAGE'
  | 'DAMAGE'
  | 'ADJUSTMENT';

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';

export interface Profile {
  id: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  address: string | null;
  email: string | null;
  logo_url: string | null;
  currency: string;
  invoice_prefix: string | null;
  default_payment_method: string | null;
  default_low_stock: number | null;
  default_delivery_provider: string | null;
  tax_enabled: boolean | null;
  tax_rate: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProductCategory {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  sku: string | null;
  unit: string;
  cost_price: number;
  selling_price: number;
  minimum_stock: number;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: ProductCategory | null;
}

export interface StockMovement {
  id: string;
  user_id: string;
  product_id: string;
  movement_type: StockMovementType;
  quantity: number;
  unit_cost: number;
  reason: string | null;
  note: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface ProductWithStock extends Product {
  current_stock: number;
  stock_value: number;
  stock_status: StockStatus;
}

export const UNIT_OPTIONS: { label: string; value: Unit }[] = [
  { label: 'kg', value: 'kg' },
  { label: 'gram', value: 'gram' },
  { label: 'piece', value: 'piece' },
  { label: 'packet', value: 'packet' },
  { label: 'bag', value: 'bag' },
  { label: 'litre', value: 'litre' },
  { label: 'custom', value: 'custom' },
];

export const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: '৳',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
};

export const MOVEMENT_TYPE_LABELS: Record<StockMovementType, string> = {
  OPENING_STOCK: 'Opening Stock',
  PURCHASE: 'Purchase',
  SALE: 'Sale',
  PURCHASE_RETURN: 'Purchase Return',
  SALES_RETURN: 'Sales Return',
  WASTAGE: 'Wastage',
  DAMAGE: 'Damage',
  ADJUSTMENT: 'Adjustment',
};

export const ADJUSTMENT_REASONS = [
  'Damage',
  'Wastage',
  'Loss',
  'Correction',
  'Found',
  'Recount',
  'Other',
] as const;

export function getStockStatus(currentStock: number, minimumStock: number): StockStatus {
  if (currentStock <= 0) return 'OUT_OF_STOCK';
  if (currentStock <= minimumStock) return 'LOW_STOCK';
  return 'IN_STOCK';
}

export function formatCurrency(amount: number, currency: string = 'BDT'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '';
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
  return `${symbol}${formatted}`;
}

export type PaymentMethod = 'cash' | 'bank' | 'bkash' | 'nagad' | 'other';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bank: 'Bank',
  bkash: 'bKash',
  nagad: 'Nagad',
  other: 'Other',
};

export type SaleStatus = 'completed' | 'cancelled';

export type CustomerTransactionType = 'OPENING_DUE' | 'SALE' | 'PAYMENT' | 'SALE_RETURN';

export const TRANSACTION_TYPE_LABELS: Record<CustomerTransactionType, string> = {
  OPENING_DUE: 'Opening Due',
  SALE: 'Sale',
  PAYMENT: 'Payment',
  SALE_RETURN: 'Sales Return',
};

export interface Customer {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  opening_due: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerWithDue extends Customer {
  current_due: number;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  selling_price: number;
  discount: number;
  line_total: number;
  created_at: string;
  product?: Product | null;
}

export interface Sale {
  id: string;
  user_id: string;
  customer_id: string | null;
  invoice_number: string;
  sale_date: string;
  subtotal: number;
  discount: number;
  delivery_charge: number;
  total: number;
  paid_amount: number;
  due_amount: number;
  payment_method: string;
  notes: string | null;
  status: SaleStatus;
  created_at: string;
  updated_at: string;
  customer?: Customer | null;
  sale_items?: SaleItem[];
}

export interface CustomerTransaction {
  id: string;
  user_id: string;
  customer_id: string;
  sale_id: string | null;
  transaction_type: CustomerTransactionType;
  amount: number;
  payment_method: string | null;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  user_id: string;
  customer_id: string;
  sale_id: string | null;
  amount: number;
  payment_method: string;
  note: string | null;
  created_at: string;
}

// ============ PHASE 3 TYPES ============

export type AccountType = 'cash' | 'bank' | 'bkash' | 'nagad' | 'other';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  cash: 'Cash',
  bank: 'Bank',
  bkash: 'bKash',
  nagad: 'Nagad',
  other: 'Other',
};

export type AccountTransactionType =
  | 'SALE_PAYMENT'
  | 'PURCHASE_PAYMENT'
  | 'EXPENSE'
  | 'OWNER_WITHDRAWAL'
  | 'CAPITAL'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'SUPPLIER_PAYMENT'
  | 'CUSTOMER_PAYMENT';

export const ACCOUNT_TXN_TYPE_LABELS: Record<AccountTransactionType, string> = {
  SALE_PAYMENT: 'Sale Payment',
  PURCHASE_PAYMENT: 'Purchase Payment',
  EXPENSE: 'Expense',
  OWNER_WITHDRAWAL: 'Owner Withdrawal',
  CAPITAL: 'Capital',
  TRANSFER_IN: 'Transfer In',
  TRANSFER_OUT: 'Transfer Out',
  SUPPLIER_PAYMENT: 'Supplier Payment',
  CUSTOMER_PAYMENT: 'Customer Payment',
};

export interface Account {
  id: string;
  user_id: string;
  name: string;
  account_type: AccountType;
  current_balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountTransaction {
  id: string;
  user_id: string;
  account_id: string;
  transaction_type: AccountTransactionType;
  amount: number;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  opening_payable: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SupplierWithPayable extends Supplier {
  current_payable: number;
}

export type SupplierTransactionType = 'OPENING_PAYABLE' | 'PURCHASE' | 'PAYMENT' | 'PURCHASE_RETURN';

export const SUPPLIER_TXN_TYPE_LABELS: Record<SupplierTransactionType, string> = {
  OPENING_PAYABLE: 'Opening Payable',
  PURCHASE: 'Purchase',
  PAYMENT: 'Payment',
  PURCHASE_RETURN: 'Purchase Return',
};

export interface SupplierTransaction {
  id: string;
  user_id: string;
  supplier_id: string;
  purchase_id: string | null;
  transaction_type: SupplierTransactionType;
  amount: number;
  payment_method: string | null;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_at: string;
}

export interface SupplierPayment {
  id: string;
  user_id: string;
  supplier_id: string;
  purchase_id: string | null;
  amount: number;
  payment_method: string;
  note: string | null;
  created_at: string;
}

export type PurchaseStatus = 'completed' | 'cancelled';

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  purchase_price: number;
  discount: number;
  line_total: number;
  created_at: string;
  product?: Product | null;
}

export interface Purchase {
  id: string;
  user_id: string;
  supplier_id: string | null;
  purchase_number: string;
  purchase_date: string;
  subtotal: number;
  discount: number;
  total: number;
  paid_amount: number;
  payable_amount: number;
  payment_method: string;
  notes: string | null;
  status: PurchaseStatus;
  created_at: string;
  updated_at: string;
  supplier?: Supplier | null;
  purchase_items?: PurchaseItem[];
}

export type ExpenseCategory =
  | 'rent' | 'electricity' | 'water' | 'internet' | 'transport'
  | 'packaging' | 'labour' | 'marketing' | 'equipment' | 'repair'
  | 'delivery' | 'other';

export const EXPENSE_CATEGORIES: { label: string; value: ExpenseCategory }[] = [
  { label: 'Rent', value: 'rent' },
  { label: 'Electricity', value: 'electricity' },
  { label: 'Water', value: 'water' },
  { label: 'Internet', value: 'internet' },
  { label: 'Transport', value: 'transport' },
  { label: 'Packaging', value: 'packaging' },
  { label: 'Labour', value: 'labour' },
  { label: 'Marketing', value: 'marketing' },
  { label: 'Equipment', value: 'equipment' },
  { label: 'Repair', value: 'repair' },
  { label: 'Delivery', value: 'delivery' },
  { label: 'Other', value: 'other' },
];

export interface Expense {
  id: string;
  user_id: string;
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  payment_method: string;
  account_id: string | null;
  description: string | null;
  receipt_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OwnerWithdrawal {
  id: string;
  user_id: string;
  amount: number;
  withdrawal_date: string;
  account_id: string | null;
  reason: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CapitalType = 'initial' | 'additional';

export interface CapitalRecord {
  id: string;
  user_id: string;
  amount: number;
  capital_type: CapitalType;
  record_date: string;
  account_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DeliveryStatus =
  | 'pending' | 'confirmed' | 'preparing'
  | 'out_for_delivery' | 'delivered' | 'cancelled' | 'returned';

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for Delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  returned: 'Returned',
};

export interface Delivery {
  id: string;
  user_id: string;
  sale_id: string;
  delivery_address: string | null;
  customer_delivery_charge: number;
  actual_delivery_cost: number;
  delivery_provider: string | null;
  delivery_status: DeliveryStatus;
  delivery_note: string | null;
  created_at: string;
  updated_at: string;
  sale?: Sale | null;
}

export interface Wastage {
  id: string;
  user_id: string;
  product_id: string;
  quantity: number;
  unit: string;
  reason: string;
  waste_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  product?: Product | null;
}

export function formatQuantity(qty: number, unit: string): string {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 4,
  }).format(qty);
  return `${formatted} ${unit}`;
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
