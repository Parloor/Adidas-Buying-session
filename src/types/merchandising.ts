export type Division = 'Footwear' | 'Apparel' | 'Accessories' | string;

export type SportUniverse = 
  | 'Originals'
  | 'Football'
  | 'Running'
  | 'Training'
  | 'Outdoor'
  | 'Basketball'
  | 'Tennis'
  | 'Golf'
  | 'Motorsport'
  | string;

export type Gender = 'Men' | 'Women' | 'Unisex' | 'Kids' | string;

export interface SizeBreakdown {
  size: string;
  buyQty: number;
  salesQty: number;
  sellThroughRate: number; // percentage 0-100
  stockQty: number;
  salesShare: number; // % of total sales for this product
  buyShare?: number; // % of total buys for this product
  recommendation?: string;
}

export interface StoreBreakdown {
  storeId?: string;
  storeName: string;
  buyQty: number;
  salesQty: number;
  salesValue: number;
  buyValue: number;
  sellThroughRate: number;
  stockQty: number;
}

export interface ProductItem {
  id: string;
  sku: string; // e.g. "B75806"
  name: string; // e.g. "SAMBA OG"
  division: Division; // 1. Division (Footwear, Apparel, Accessories)
  sport: SportUniverse; // 2. Sport Category (Primary Driver)
  gender: Gender; // 3. Gender
  category: string; // Product Group / Category (e.g. "SHOES", "APPAREL", "ACCESSORIES")
  productType: string; // 4. Product Type (e.g. "SHOES - LOW (NON FOOTBALL)", "Match Jersey")
  salesLine: string; // 5. Sales Line (e.g. "SAMBA", "Predator", "Tiro", "Gazelle")
  color?: string; // Base Color (e.g. "Blanc", "Noir")
  ageGroup?: string; // Age Group (e.g. "ADULT", "KIDS")
  productGroup?: string; // Product Group (e.g. "SHOES")
  currency?: string; // Currency symbol (e.g. "DT", "€", "TND")
  imageUrl: string;
  retailPrice: number; // Prix de vente unitaire (e.g. 449 DT)
  wholesalePrice: number; // Prix d'achat net unitaire (e.g. 40.6 DT)
  
  // Totals
  totalBuyQty: number;
  totalBuyValue: number;
  totalSalesQty: number;
  totalSalesValue: number;
  
  // Calculated KPIs
  sellThroughRate: number; // (totalSalesQty / totalBuyQty) * 100
  valueSellThroughRate: number; // (totalSalesValue / totalBuyValue) * 100
  stockQty: number;
  stockValue: number;
  grossMarginValue: number; // totalSalesValue - (totalSalesQty * wholesalePrice)
  grossMarginRate: number; // (grossMarginValue / totalSalesValue) * 100
  
  // Breakdowns
  sizes: SizeBreakdown[];
  stores?: StoreBreakdown[];
}

export interface FilterState {
  search: string;
  sport: string; // Master filter
  division: string;
  ageGroup: string; // Age Group (e.g. ADULT, JUNIOR, KIDS)
  gender: string;
  category: string;
  productType: string;
  salesLine: string;
  color?: string;
  performanceTier: 'all' | 'high' | 'medium' | 'low';
  sortBy: 'salesValue' | 'salesQty' | 'sellThroughRate' | 'buyQty' | 'stockQty' | 'stockValue' | 'flopScore' | 'name' | 'rank';
  sortOrder: 'asc' | 'desc';
}

export interface OverallKPIs {
  totalBuyQty: number;
  totalBuyValue: number;
  totalSalesQty: number;
  totalSalesValue: number;
  overallSellThrough: number;
  overallValueSellThrough: number;
  totalStockQty: number;
  totalStockValue: number; // Valeur stock au prix d'achat net (coût)
  totalStockRetailValue?: number; // Valeur stock au prix de vente (PPC / retail)
  totalGrossMargin: number;
  overallMarginRate: number;
  averageRetailPrice: number;
  averageCostPrice: number;
  productCount: number;
}

export interface PublishedSessionMeta {
  id: string;
  title: string;
  description?: string;
  author?: string;
  createdAt: string;
  currency: string;
  productCount: number;
  totalSalesValue: number;
  totalBuyQty: number;
}

export interface PublishedSessionData extends PublishedSessionMeta {
  products: ProductItem[];
}

