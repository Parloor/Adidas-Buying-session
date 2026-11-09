import { ProductItem } from '../types/merchandising';

export interface PivotMetricRow {
  name: string;
  count: number;
  buyQty: number;
  buyValue: number;
  salesQty: number;
  salesValue: number;
  stockQty: number;
  stockValue: number;
  // Intra-category shares (%)
  buyValueShare: number;
  salesValueShare: number;
  deltaValueShare: number;
  buyQtyShare: number;
  salesQtyShare: number;
  // Global catalogue shares (%)
  globalBuyValueShare: number;
  globalSalesValueShare: number;
  globalDeltaValueShare: number;
  globalBuyQtyShare: number;
  globalSalesQtyShare: number;
  sellThroughRate: number;
  valueSellThroughRate: number;
  products: ProductItem[];
}

export interface PivotTotals {
  buyQty: number;
  buyValue: number;
  salesQty: number;
  salesValue: number;
  stockQty: number;
  stockValue: number;
  str: number;
  valueStr: number;
}

/**
 * Sanitizes ageGroup property to ensure no URLs, image paths or invalid strings ever pollute filters or pivot aggregations.
 */
export function getSanitizedAgeGroup(p: ProductItem): string {
  const ag = p.ageGroup;
  if (!ag || ag.startsWith('http') || ag.includes('/') || ag.includes('.jpg') || ag.includes('.png') || ag.length > 25) {
    const lowerName = (p.name || '').toLowerCase();
    if (lowerName.includes('infan') || lowerName.includes('baby') || lowerName.includes('bebe')) {
      return 'INFANT';
    }
    if (lowerName.includes('junior') || lowerName.includes('jnr') || lowerName.includes(' jr ') || lowerName.endsWith(' jr')) {
      return 'JUNIOR';
    }
    if (lowerName.includes('kids') || lowerName.includes('enfant')) {
      return 'KIDS';
    }
    if (p.gender === 'Kids') return 'KIDS';
    if (p.gender === 'Infant') return 'INFANT';
    return 'ADULT';
  }
  return ag.toUpperCase().trim();
}

/**
 * Computes totals for any collection of products.
 */
export function computeDatasetTotals(products: ProductItem[]): PivotTotals {
  let buyQty = 0;
  let buyValue = 0;
  let salesQty = 0;
  let salesValue = 0;
  let stockQty = 0;
  let stockValue = 0;

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    buyQty += p.totalBuyQty || 0;
    buyValue += p.totalBuyValue || 0;
    salesQty += p.totalSalesQty || 0;
    salesValue += p.totalSalesValue || 0;
    stockQty += p.stockQty || 0;
    stockValue += p.stockValue || 0;
  }

  const str = buyQty > 0 ? Math.round((salesQty / buyQty) * 1000) / 10 : 0;
  const valueStr = buyValue > 0 ? Math.round((salesValue / buyValue) * 1000) / 10 : 0;

  return { buyQty, buyValue, salesQty, salesValue, stockQty, stockValue, str, valueStr };
}

/**
 * Computes a multidimensional pivot table for a specific dimension.
 * Aggregates values, calculates both intra-category and global weights, and orders by sales value descending by default.
 */
export function buildPivotTable(
  products: ProductItem[],
  keyExtractor: (p: ProductItem) => string,
  localTotals: PivotTotals,
  globalTotals: PivotTotals
): PivotMetricRow[] {
  const map = new Map<string, {
    count: number;
    buyQty: number;
    buyValue: number;
    salesQty: number;
    salesValue: number;
    stockQty: number;
    stockValue: number;
    items: ProductItem[];
  }>();

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    let key = keyExtractor(p);
    if (!key || key.trim() === '') key = 'Non Défini';
    key = key.trim();

    let entry = map.get(key);
    if (!entry) {
      entry = {
        count: 0,
        buyQty: 0,
        buyValue: 0,
        salesQty: 0,
        salesValue: 0,
        stockQty: 0,
        stockValue: 0,
        items: []
      };
      map.set(key, entry);
    }

    entry.count += 1;
    entry.buyQty += p.totalBuyQty || 0;
    entry.buyValue += p.totalBuyValue || 0;
    entry.salesQty += p.totalSalesQty || 0;
    entry.salesValue += p.totalSalesValue || 0;
    entry.stockQty += p.stockQty || 0;
    entry.stockValue += p.stockValue || 0;
    entry.items.push(p);
  }

  const rows: PivotMetricRow[] = [];

  map.forEach((data, name) => {
    // Exclude empty categories (enlever tout ce qui n'a pas de données)
    if (data.buyQty === 0 && data.salesQty === 0 && data.buyValue === 0 && data.salesValue === 0 && data.stockQty === 0) {
      return;
    }

    // Intra-category shares (dans la catégorie / univers sélectionné)
    const buyValueShare = localTotals.buyValue > 0 ? Math.round((data.buyValue / localTotals.buyValue) * 1000) / 10 : 0;
    const salesValueShare = localTotals.salesValue > 0 ? Math.round((data.salesValue / localTotals.salesValue) * 1000) / 10 : 0;
    const deltaValueShare = Math.round((salesValueShare - buyValueShare) * 10) / 10;
    const buyQtyShare = localTotals.buyQty > 0 ? Math.round((data.buyQty / localTotals.buyQty) * 1000) / 10 : 0;
    const salesQtyShare = localTotals.salesQty > 0 ? Math.round((data.salesQty / localTotals.salesQty) * 1000) / 10 : 0;

    // Global shares across entire catalogue
    const globalBuyValueShare = globalTotals.buyValue > 0 ? Math.round((data.buyValue / globalTotals.buyValue) * 1000) / 10 : 0;
    const globalSalesValueShare = globalTotals.salesValue > 0 ? Math.round((data.salesValue / globalTotals.salesValue) * 1000) / 10 : 0;
    const globalDeltaValueShare = Math.round((globalSalesValueShare - globalBuyValueShare) * 10) / 10;
    const globalBuyQtyShare = globalTotals.buyQty > 0 ? Math.round((data.buyQty / globalTotals.buyQty) * 1000) / 10 : 0;
    const globalSalesQtyShare = globalTotals.salesQty > 0 ? Math.round((data.salesQty / globalTotals.salesQty) * 1000) / 10 : 0;

    // Sell-through rates
    const sellThroughRate = data.buyQty > 0 ? Math.round((data.salesQty / data.buyQty) * 1000) / 10 : 0;
    const valueSellThroughRate = data.buyValue > 0 ? Math.round((data.salesValue / data.buyValue) * 1000) / 10 : 0;

    rows.push({
      name,
      count: data.count,
      buyQty: data.buyQty,
      buyValue: data.buyValue,
      salesQty: data.salesQty,
      salesValue: data.salesValue,
      stockQty: data.stockQty,
      stockValue: data.stockValue,
      buyValueShare,
      salesValueShare,
      deltaValueShare,
      buyQtyShare,
      salesQtyShare,
      globalBuyValueShare,
      globalSalesValueShare,
      globalDeltaValueShare,
      globalBuyQtyShare,
      globalSalesQtyShare,
      sellThroughRate,
      valueSellThroughRate,
      products: data.items,
    });
  });

  // Default sorting: Sales Value (Turnover CA) descending
  rows.sort((a, b) => b.salesValue - a.salesValue);

  return rows;
}

/**
 * Calculates Flop Risk Score:
 * High stock value combined with low sell-through rate.
 * Formula: stockValue * (1 - STR / 100)
 */
export function calculateFlopScore(p: ProductItem): number {
  const stockQty = typeof p.stockQty === 'number' && !isNaN(p.stockQty) ? p.stockQty : 0;
  const wholesalePrice = typeof p.wholesalePrice === 'number' && !isNaN(p.wholesalePrice) ? p.wholesalePrice : 0;
  const stockVal = typeof p.stockValue === 'number' && !isNaN(p.stockValue) && p.stockValue > 0 
    ? p.stockValue 
    : Math.max(0, stockQty * wholesalePrice);
  const str = typeof p.sellThroughRate === 'number' && !isNaN(p.sellThroughRate) ? p.sellThroughRate : 0;
  const clampedStr = Math.max(0, Math.min(100, str));
  // The lower the STR and the higher the stock value, the higher the flop risk score
  const unsoldRatio = (100 - clampedStr) / 100;
  return Math.round(stockVal * unsoldRatio);
}

/**
 * Returns Top N articles ranked strictly by Sales Value (Turnover CA).
 * Default limit = 30.
 */
export function getTopArticles(products: ProductItem[], limit: number = 30): ProductItem[] {
  return [...products]
    .filter((p) => (p.totalSalesValue || 0) > 0 || (p.totalBuyQty || 0) > 0)
    .sort((a, b) => (b.totalSalesValue || 0) - (a.totalSalesValue || 0))
    .slice(0, limit);
}

/**
 * Returns Flop N articles ranked according to:
 * "selon la valeur des stocks et le sell thru (plus faibles sell thru et plus grande image des stocks)"
 * Default limit = 30.
 */
export function getFlopArticles(products: ProductItem[], limit: number = 30): (ProductItem & { flopScore: number })[] {
  const mapped = products.map((p) => {
    const stockQty = typeof p.stockQty === 'number' && !isNaN(p.stockQty) ? p.stockQty : 0;
    const wholesalePrice = typeof p.wholesalePrice === 'number' && !isNaN(p.wholesalePrice) ? p.wholesalePrice : 0;
    const stockVal = typeof p.stockValue === 'number' && !isNaN(p.stockValue) && p.stockValue > 0 
      ? p.stockValue 
      : Math.max(0, stockQty * wholesalePrice);
    const flopScore = calculateFlopScore(p);
    return {
      ...p,
      stockValue: stockVal,
      flopScore,
    };
  });

  return mapped
    .sort((a, b) => {
      // 1. Prioritize items that still have units in stock (real flop overstock risk)
      const hasStockA = (a.stockQty || 0) > 0 ? 1 : 0;
      const hasStockB = (b.stockQty || 0) > 0 ? 1 : 0;
      if (hasStockB !== hasStockA) {
        return hasStockB - hasStockA;
      }
      // 2. Primary: Flop Score descending (capital tied up * unsold ratio)
      if (b.flopScore !== a.flopScore) {
        return b.flopScore - a.flopScore;
      }
      // 3. Secondary: Lower Sell-Through Rate first (plus faibles sell-thru)
      const strA = typeof a.sellThroughRate === 'number' && !isNaN(a.sellThroughRate) ? a.sellThroughRate : 0;
      const strB = typeof b.sellThroughRate === 'number' && !isNaN(b.sellThroughRate) ? b.sellThroughRate : 0;
      if (strA !== strB) {
        return strA - strB;
      }
      // 4. Tertiary: Higher stock value (plus grande image des stocks)
      if (b.stockValue !== a.stockValue) {
        return b.stockValue - a.stockValue;
      }
      // 5. Higher stock quantity
      return (b.stockQty || 0) - (a.stockQty || 0);
    })
    .slice(0, limit);
}
