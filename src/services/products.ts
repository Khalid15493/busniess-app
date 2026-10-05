import { supabase } from '@/lib/supabase';
import type {
  Product,
  ProductCategory,
  StockMovement,
  StockMovementType,
  ProductWithStock,
} from '@/types';
import { getStockStatus } from '@/types';

// ============ Categories ============

export async function fetchCategories(): Promise<ProductCategory[]> {
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as ProductCategory[];
}

export async function createCategory(input: {
  name: string;
  description?: string;
}): Promise<ProductCategory> {
  const { data, error } = await supabase
    .from('product_categories')
    .insert({ name: input.name, description: input.description ?? null })
    .select()
    .single();
  if (error) throw error;
  return data as ProductCategory;
}

export async function updateCategory(
  id: string,
  input: Partial<Pick<ProductCategory, 'name' | 'description' | 'is_active'>>
): Promise<ProductCategory> {
  const { data, error } = await supabase
    .from('product_categories')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as ProductCategory;
}

// ============ Products ============

export async function fetchProducts(filters?: {
  search?: string;
  categoryId?: string | null;
  stockFilter?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  activeOnly?: boolean;
}): Promise<ProductWithStock[]> {
  let query = supabase
    .from('products')
    .select('*, category:product_categories(*)')
    .order('created_at', { ascending: false });

  if (filters?.activeOnly !== false) {
    query = query.eq('is_active', true);
  }
  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }
  if (filters?.search) {
    query = query.ilike('name', `%${filters.search}%`);
  }

  const { data: products, error } = await query;
  if (error) throw error;

  if (!products || products.length === 0) return [];

  const productIds = products.map((p) => p.id);

  const { data: movements, error: mvError } = await supabase
    .from('stock_movements')
    .select('product_id, quantity')
    .in('product_id', productIds);

  if (mvError) throw mvError;

  const stockMap = new Map<string, number>();
  for (const mv of movements ?? []) {
    stockMap.set(
      mv.product_id,
      (stockMap.get(mv.product_id) ?? 0) + Number(mv.quantity)
    );
  }

  return (products as unknown as Product[]).map((p) => {
    const currentStock = stockMap.get(p.id) ?? 0;
    return {
      ...p,
      current_stock: currentStock,
      stock_value: currentStock * p.cost_price,
      stock_status: getStockStatus(currentStock, p.minimum_stock),
    } as ProductWithStock;
  });
}

export async function fetchProductById(id: string): Promise<ProductWithStock | null> {
  const { data, error } = await supabase
    .from('products')
    .select('*, category:product_categories(*)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { data: movements } = await supabase
    .from('stock_movements')
    .select('quantity')
    .eq('product_id', id);

  const currentStock = (movements ?? []).reduce(
    (sum, m) => sum + Number(m.quantity),
    0
  );

  const product = data as unknown as Product;
  return {
    ...product,
    current_stock: currentStock,
    stock_value: currentStock * product.cost_price,
    stock_status: getStockStatus(currentStock, product.minimum_stock),
  };
}

export async function createProduct(input: {
  name: string;
  category_id: string | null;
  sku?: string;
  unit: string;
  cost_price: number;
  selling_price: number;
  minimum_stock: number;
  image_url?: string | null;
  opening_stock: number;
}): Promise<{ product: Product; movement: StockMovement }> {
  const { data: product, error: prodError } = await supabase
    .from('products')
    .insert({
      name: input.name,
      category_id: input.category_id,
      sku: input.sku ?? null,
      unit: input.unit,
      cost_price: input.cost_price,
      selling_price: input.selling_price,
      minimum_stock: input.minimum_stock,
      image_url: input.image_url ?? null,
    })
    .select()
    .single();
  if (prodError) throw prodError;

  const { data: movement, error: mvError } = await supabase
    .from('stock_movements')
    .insert({
      product_id: (product as Product).id,
      movement_type: 'OPENING_STOCK' as StockMovementType,
      quantity: input.opening_stock,
      unit_cost: input.cost_price,
      reason: 'Opening Stock',
      note: `Opening stock for ${input.name}`,
    })
    .select()
    .single();
  if (mvError) throw mvError;

  return {
    product: product as Product,
    movement: movement as StockMovement,
  };
}

export async function updateProduct(
  id: string,
  input: Partial<Pick<Product, 'name' | 'category_id' | 'sku' | 'unit' | 'cost_price' | 'selling_price' | 'minimum_stock' | 'image_url' | 'is_active'>>
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Product;
}

// ============ Stock Movements ============

export async function fetchStockMovements(productId: string): Promise<StockMovement[]> {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as StockMovement[];
}

export async function createStockAdjustment(input: {
  product_id: string;
  quantity: number;
  reason: string;
  note?: string;
}): Promise<StockMovement> {
  const { data: product, error: prodError } = await supabase
    .from('products')
    .select('cost_price')
    .eq('id', input.product_id)
    .maybeSingle();
  if (prodError) throw prodError;
  if (!product) throw new Error('Product not found');

  const { data, error } = await supabase
    .from('stock_movements')
    .insert({
      product_id: input.product_id,
      movement_type: 'ADJUSTMENT' as StockMovementType,
      quantity: input.quantity,
      unit_cost: product.cost_price,
      reason: input.reason,
      note: input.note ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as StockMovement;
}

export interface ProductSalesProgress {
  openingStock: number;
  totalSold: number;
  currentStock: number;
  salesPercentage: number;
}

export async function fetchProductSalesProgress(productId: string): Promise<ProductSalesProgress> {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('quantity, movement_type')
    .eq('product_id', productId);
  if (error) throw error;

  let openingStock = 0;
  let totalSold = 0;
  let currentStock = 0;

  for (const m of data ?? []) {
    const qty = Number(m.quantity);
    currentStock += qty;
    if (m.movement_type === 'OPENING_STOCK') {
      openingStock += Math.abs(qty);
    }
    if (m.movement_type === 'SALE') {
      totalSold += Math.abs(qty);
    }
  }

  const salesPercentage = openingStock > 0 ? (totalSold / openingStock) * 100 : 0;

  return {
    openingStock,
    totalSold,
    currentStock,
    salesPercentage: Math.min(salesPercentage, 100),
  };
}

export async function fetchLowStockProducts(): Promise<ProductWithStock[]> {
  const products = await fetchProducts({ activeOnly: true });
  return products.filter(
    (p) => p.stock_status === 'LOW_STOCK' || p.stock_status === 'OUT_OF_STOCK'
  );
}

export async function fetchTotalStockValue(): Promise<number> {
  const products = await fetchProducts({ activeOnly: true });
  return products.reduce((sum, p) => sum + p.stock_value, 0);
}
