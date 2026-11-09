import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  Layers, 
  TrendingUp, 
  Package, 
  Coins, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles,
  PieChart,
  BarChart3,
  Flame,
  Snowflake,
  Ruler
} from 'lucide-react';
import { ProductItem, OverallKPIs } from '../types/merchandising';
import { formatCurrency } from '../utils/csvParser';

interface MacroDrillDownViewProps {
  products: ProductItem[];
  kpis: OverallKPIs;
  onSelectProduct: (product: ProductItem) => void;
  onNavigateToSizes: (product?: ProductItem) => void;
}

export type GranularityLevel = 
  | 'macro'
  | 'division'
  | 'gender'
  | 'sport'
  | 'category'
  | 'productType'
  | 'salesLine'
  | 'articles';

export const MacroDrillDownView: React.FC<MacroDrillDownViewProps> = ({
  products,
  kpis,
  onSelectProduct,
  onNavigateToSizes,
}) => {
  const [activeLevel, setActiveLevel] = useState<GranularityLevel>('macro');

  // Tops & Flops across current filtered dataset
  const topArticles = useMemo(() => {
    return [...products]
      .filter((p) => p.totalBuyQty > 0)
      .sort((a, b) => b.sellThroughRate - a.sellThroughRate || b.totalSalesValue - a.totalSalesValue)
      .slice(0, 5);
  }, [products]);

  const flopArticles = useMemo(() => {
    return [...products]
      .filter((p) => p.totalBuyQty > 0)
      .sort((a, b) => a.sellThroughRate - b.sellThroughRate || b.stockQty - a.stockQty)
      .slice(0, 5);
  }, [products]);

  // Aggregate breakdown helper
  const computeBreakdown = (groupByFn: (p: ProductItem) => string) => {
    const map: Record<string, {
      key: string;
      itemCount: number;
      buyQty: number;
      buyValue: number;
      salesQty: number;
      salesValue: number;
      stockQty: number;
      stockValue: number;
      marginValue: number;
      products: ProductItem[];
    }> = {};

    products.forEach((p) => {
      const key = groupByFn(p);
      if (!map[key]) {
        map[key] = {
          key,
          itemCount: 0,
          buyQty: 0,
          buyValue: 0,
          salesQty: 0,
          salesValue: 0,
          stockQty: 0,
          stockValue: 0,
          marginValue: 0,
          products: [],
        };
      }
      map[key].itemCount += 1;
      map[key].buyQty += p.totalBuyQty;
      map[key].buyValue += p.totalBuyValue;
      map[key].salesQty += p.totalSalesQty;
      map[key].salesValue += p.totalSalesValue;
      map[key].stockQty += p.stockQty;
      map[key].stockValue += p.stockValue;
      map[key].marginValue += p.grossMarginValue;
      map[key].products.push(p);
    });

    return Object.values(map)
      .map((row) => {
        const sellThrough = row.buyQty > 0 ? Math.round((row.salesQty / row.buyQty) * 1000) / 10 : 0;
        const valueSellThrough = row.buyValue > 0 ? Math.round((row.salesValue / row.buyValue) * 1000) / 10 : 0;
        const marginRate = row.salesValue > 0 ? Math.round((row.marginValue / row.salesValue) * 1000) / 10 : 0;
        const salesShare = kpis.totalSalesValue > 0 ? Math.round((row.salesValue / kpis.totalSalesValue) * 1000) / 10 : 0;

        return {
          ...row,
          sellThrough,
          valueSellThrough,
          marginRate,
          salesShare,
        };
      })
      .sort((a, b) => b.salesValue - a.salesValue);
  };

  const divisionData = useMemo(() => computeBreakdown((p) => p.division), [products, kpis]);
  const genderData = useMemo(() => computeBreakdown((p) => p.gender), [products, kpis]);
  const sportData = useMemo(() => computeBreakdown((p) => p.sport), [products, kpis]);
  const categoryData = useMemo(() => computeBreakdown((p) => p.category), [products, kpis]);
  const productTypeData = useMemo(() => computeBreakdown((p) => p.productType), [products, kpis]);
  const salesLineData = useMemo(() => computeBreakdown((p) => p.salesLine), [products, kpis]);

  const formatEuro = (val: number) => {
    return formatCurrency(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('fr-FR').format(val);
  };

  // Stepper labels for the granularity path
  const granularityLevels = [
    { id: 'macro', label: '1. Macro Global' },
    { id: 'division', label: '2. Division' },
    { id: 'gender', label: '3. Gender' },
    { id: 'sport', label: '4. Sport Category' },
    { id: 'category', label: '5. Catégorie / Famille' },
    { id: 'productType', label: '6. Product Type' },
    { id: 'salesLine', label: '7. Sales Line' },
    { id: 'articles', label: '8. Articles (Tops & Flops)' },
  ];

  // Helper renderer for standard tabular granularity
  const renderGranularTable = (
    title: string,
    data: ReturnType<typeof computeBreakdown>,
    keyLabel: string,
    onDrillNext?: () => void
  ) => {
    return (
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-sm overflow-hidden space-y-3">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold font-display text-white flex items-center gap-2">
              <span>{title}</span>
              <span className="text-xs font-mono text-amber-400 bg-zinc-950 px-2 py-0.5 rounded-xs border border-zinc-800">
                {data.length} segments
              </span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Achats Qté/Valeur vs Ventes Qté/Valeur et Sell-Through
            </p>
          </div>

          {onDrillNext && (
            <button
              onClick={onDrillNext}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 bg-zinc-950 px-3 py-1.5 rounded-xs border border-zinc-800"
            >
              <span>Niveau de granularité suivant</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 font-mono text-[11px] text-zinc-400 uppercase">
                <th className="py-2.5 px-4">{keyLabel}</th>
                <th className="py-2.5 px-3 text-right">Réf.</th>
                <th className="py-2.5 px-3 text-right bg-zinc-950/40 font-semibold text-zinc-300">Achats Qté</th>
                <th className="py-2.5 px-3 text-right bg-zinc-950/40 font-semibold text-zinc-300">Achats Valeur (€)</th>
                <th className="py-2.5 px-3 text-right bg-emerald-950/20 font-semibold text-emerald-400">Ventes Qté</th>
                <th className="py-2.5 px-3 text-right bg-emerald-950/20 font-semibold text-emerald-400">Ventes Valeur (€)</th>
                <th className="py-2.5 px-3 text-center">Sell-Thru (%)</th>
                <th className="py-2.5 px-3 text-right">Stock (U)</th>
                <th className="py-2.5 px-3 text-right">Marge %</th>
                <th className="py-2.5 px-3 text-right">Poids CA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
              {data.map((row) => {
                const isHot = row.sellThrough >= 85;
                const isMedium = row.sellThrough >= 70 && row.sellThrough < 85;

                return (
                  <tr key={row.key} className="hover:bg-zinc-850/60 transition-colors">
                    <td className="py-3 px-4 font-sans font-bold text-white text-sm">
                      {row.key}
                    </td>
                    <td className="py-3 px-3 text-right text-zinc-400">{row.itemCount}</td>
                    
                    {/* Achats */}
                    <td className="py-3 px-3 text-right tabular-nums text-zinc-200 bg-zinc-950/20">
                      {formatNumber(row.buyQty)}
                    </td>
                    <td className="py-3 px-3 text-right text-zinc-400 bg-zinc-950/20">
                      {formatEuro(row.buyValue)}
                    </td>

                    {/* Ventes */}
                    <td className="py-3 px-3 text-right tabular-nums font-semibold text-emerald-400 bg-emerald-950/10">
                      {formatNumber(row.salesQty)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400 bg-emerald-950/10">
                      {formatEuro(row.salesValue)}
                    </td>

                    {/* Sell-Through */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-xs font-bold text-xs ${
                        isHot 
                          ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-700/60'
                          : isMedium
                          ? 'text-amber-300 bg-amber-950/80 border border-amber-700/60'
                          : 'text-rose-300 bg-rose-950/80 border border-rose-700/60'
                      }`}>
                        {row.sellThrough}%
                      </span>
                    </td>

                    {/* Stock */}
                    <td className="py-3 px-3 text-right tabular-nums text-zinc-300">
                      {formatNumber(row.stockQty)}
                    </td>

                    {/* Margin */}
                    <td className="py-3 px-3 text-right text-cyan-300">
                      {row.marginRate}%
                    </td>

                    {/* Sales share */}
                    <td className="py-3 px-3 text-right font-semibold text-amber-400">
                      {row.salesShare}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Granularity Pipeline / Stepper */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-sm">
        <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 uppercase mb-2">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Chemin de descente dans la granularité (Sélectionnez le niveau à inspecter) :</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {granularityLevels.map((lvl, idx) => {
            const isActive = activeLevel === lvl.id;
            return (
              <React.Fragment key={lvl.id}>
                <button
                  onClick={() => setActiveLevel(lvl.id as GranularityLevel)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xs whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-amber-400 text-black border-amber-400 font-bold shadow-sm'
                      : 'bg-zinc-950 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {lvl.label}
                </button>
                {idx < granularityLevels.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Level Content */}
      {activeLevel === 'macro' && (
        <div className="space-y-6">
          
          {/* Top Macro Merch KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            
            <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm font-mono">
              <span className="text-[10px] text-zinc-500 uppercase block">Total Achats</span>
              <div className="text-xl font-bold font-display text-white tabular-nums mt-1">
                {formatNumber(kpis.totalBuyQty)} <span className="text-xs text-zinc-400 font-normal">unités</span>
              </div>
              <div className="text-xs text-amber-400 mt-1 font-semibold">
                {formatEuro(kpis.totalBuyValue)}
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm font-mono">
              <span className="text-[10px] text-zinc-500 uppercase block">Total Ventes</span>
              <div className="text-xl font-bold font-display text-emerald-400 tabular-nums mt-1">
                {formatNumber(kpis.totalSalesQty)} <span className="text-xs text-emerald-300 font-normal">unités</span>
              </div>
              <div className="text-xs text-emerald-400 mt-1 font-bold">
                {formatEuro(kpis.totalSalesValue)}
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm font-mono">
              <span className="text-[10px] text-zinc-500 uppercase block">Sell-Through Global</span>
              <div className="text-xl font-bold font-display text-amber-400 tabular-nums mt-1">
                {kpis.overallSellThrough}%
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                Objectif cible: 80%
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm font-mono">
              <span className="text-[10px] text-zinc-500 uppercase block">Stock Résiduel</span>
              <div className="text-xl font-bold font-display text-zinc-200 tabular-nums mt-1">
                {formatNumber(kpis.totalStockQty)} <span className="text-xs text-zinc-400 font-normal">unités</span>
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                Immobilisé: {formatEuro(kpis.totalStockValue)}
              </div>
            </div>

            <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm font-mono">
              <span className="text-[10px] text-zinc-500 uppercase block">Marge Brute</span>
              <div className="text-xl font-bold font-display text-cyan-400 tabular-nums mt-1">
                {kpis.overallMarginRate}%
              </div>
              <div className="text-xs text-cyan-300 mt-1 font-semibold">
                {formatEuro(kpis.totalGrossMargin)}
              </div>
            </div>

          </div>

          {/* Dual Column: Macro Division Summary & Tops/Flops Preview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Division Snapshot */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-sm p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold font-display text-white">
                  Répartition Macro par Division
                </h3>
                <button
                  onClick={() => setActiveLevel('division')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1"
                >
                  <span>Détail Division &rarr;</span>
                </button>
              </div>

              <div className="space-y-3">
                {divisionData.map((d) => (
                  <div key={d.key} className="p-3 bg-zinc-950 rounded-xs border border-zinc-850 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{d.key}</span>
                      <span className="font-mono font-bold text-amber-400">{d.sellThrough}% STR</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-zinc-400">
                      <div>Achats: <span className="text-white font-semibold">{formatNumber(d.buyQty)} u.</span> ({formatEuro(d.buyValue)})</div>
                      <div className="text-right">Ventes: <span className="text-emerald-400 font-semibold">{formatNumber(d.salesQty)} u.</span> ({formatEuro(d.salesValue)})</div>
                    </div>

                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-amber-400 h-full rounded-full"
                        style={{ width: `${Math.min(100, d.sellThrough)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tops & Flops Spotlight */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-sm p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold font-display text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  <span>Aperçu Tops &amp; Flops Saison</span>
                </h3>
                <button
                  onClick={() => setActiveLevel('articles')}
                  className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1"
                >
                  <span>Voir tous les articles &rarr;</span>
                </button>
              </div>

              {/* Mini Tops list */}
              <div className="space-y-2">
                <div className="text-[11px] font-mono uppercase text-emerald-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Top 3 Sell-Through :</span>
                </div>
                {topArticles.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectProduct(item)}
                    className="flex items-center justify-between p-2 bg-zinc-950 hover:bg-zinc-850 rounded-xs border border-zinc-850 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="font-mono text-xs font-bold text-amber-400">{item.sku}</span>
                      <span className="text-xs text-white group-hover:text-amber-400 truncate">{item.name}</span>
                    </div>
                    <div className="text-right font-mono text-xs shrink-0">
                      <span className="font-bold text-emerald-400">{item.sellThroughRate}% STR</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Mini Flops list */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <div className="text-[11px] font-mono uppercase text-rose-400 flex items-center gap-1">
                  <Snowflake className="w-3.5 h-3.5" />
                  <span>Top 3 Flops / Stocks Résiduels :</span>
                </div>
                {flopArticles.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectProduct(item)}
                    className="flex items-center justify-between p-2 bg-zinc-950 hover:bg-zinc-850 rounded-xs border border-zinc-850 cursor-pointer group transition-colors"
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="font-mono text-xs font-bold text-zinc-400">{item.sku}</span>
                      <span className="text-xs text-zinc-200 group-hover:text-rose-300 truncate">{item.name}</span>
                    </div>
                    <div className="text-right font-mono text-xs shrink-0">
                      <span className="font-bold text-rose-300">{item.sellThroughRate}% STR</span>
                      <span className="text-[10px] text-zinc-500 ml-1.5">({item.stockQty} u.)</span>
                    </div>
                  </div>
                ))}
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Granular Level: Division */}
      {activeLevel === 'division' && renderGranularTable('Niveau 2 : Performance par Division', divisionData, 'Division', () => setActiveLevel('gender'))}

      {/* Granular Level: Gender */}
      {activeLevel === 'gender' && renderGranularTable('Niveau 3 : Performance par Genre', genderData, 'Genre / Gender', () => setActiveLevel('sport'))}

      {/* Granular Level: Sport Category */}
      {activeLevel === 'sport' && renderGranularTable('Niveau 4 : Performance par Sport Category', sportData, 'Sport Category', () => setActiveLevel('category'))}

      {/* Granular Level: Category Detail */}
      {activeLevel === 'category' && renderGranularTable('Niveau 5 : Performance par Catégorie / Famille', categoryData, 'Catégorie / Famille', () => setActiveLevel('productType'))}

      {/* Granular Level: Product Type */}
      {activeLevel === 'productType' && renderGranularTable('Niveau 6 : Performance par Product Type', productTypeData, 'Product Type', () => setActiveLevel('salesLine'))}

      {/* Granular Level: Sales Line */}
      {activeLevel === 'salesLine' && renderGranularTable('Niveau 7 : Performance par Sales Line (Franchise)', salesLineData, 'Sales Line', () => setActiveLevel('articles'))}

      {/* Granular Level: Articles (Tops et Flops) */}
      {activeLevel === 'articles' && (
        <div className="space-y-6">
          
          {/* Tops and Flops Highlights Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Tops Box */}
            <div className="bg-zinc-900/80 border border-emerald-800/60 rounded-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-display text-emerald-400 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-emerald-400" />
                  <span>TOP 5 ARTICLES (Meilleurs Sell-Through FW25)</span>
                </h3>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded-xs border border-emerald-700">
                  Sur-performance
                </span>
              </div>

              <div className="space-y-2.5">
                {topArticles.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectProduct(item)}
                    className="flex items-center justify-between p-2.5 bg-zinc-950/80 hover:bg-zinc-850 rounded-xs border border-zinc-850 cursor-pointer group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-amber-400 text-xs">#{idx + 1}</span>
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-10 h-10 object-cover rounded-xs border border-zinc-800 bg-zinc-900"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800';
                        }}
                      />
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-amber-400 transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                          <span className="text-amber-400">{item.sku}</span> &bull; {item.sport} &bull; {item.salesLine}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <div className="font-bold text-emerald-400">{item.sellThroughRate}% STR</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {formatEuro(item.totalSalesValue)} ({formatNumber(item.totalSalesQty)} u.)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Flops Box */}
            <div className="bg-zinc-900/80 border border-rose-800/60 rounded-sm p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold font-display text-rose-400 flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-rose-400" />
                  <span>FLOPS 5 ARTICLES (Ralentissements &amp; Stocks Résiduels)</span>
                </h3>
                <span className="text-[10px] font-mono text-rose-300 bg-rose-950 px-2 py-0.5 rounded-xs border border-rose-700">
                  Sous-performance
                </span>
              </div>

              <div className="space-y-2.5">
                {flopArticles.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => onSelectProduct(item)}
                    className="flex items-center justify-between p-2.5 bg-zinc-950/80 hover:bg-zinc-850 rounded-xs border border-zinc-850 cursor-pointer group transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-rose-400 text-xs">#{idx + 1}</span>
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-10 h-10 object-cover rounded-xs border border-zinc-800 bg-zinc-900"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800';
                        }}
                      />
                      <div>
                        <div className="text-xs font-semibold text-white group-hover:text-rose-300 transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                          <span className="text-zinc-300">{item.sku}</span> &bull; {item.sport} &bull; {item.salesLine}
                        </div>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs">
                      <div className="font-bold text-rose-400">{item.sellThroughRate}% STR</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        Stock restant: <span className="text-white font-semibold">{formatNumber(item.stockQty)} u.</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Full granular articles table */}
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-sm overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold font-display text-white">
                  Tableau exhaustif de tous les articles ({products.length} références)
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Consultez les totaux achats/ventes et cliquez pour ouvrir la fiche 360° ou la courbe de tailles.
                </p>
              </div>

              <button
                onClick={() => onNavigateToSizes()}
                className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-xs border border-zinc-800"
              >
                <Ruler className="w-3.5 h-3.5" />
                <span>Analyser les poids aux tailles</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950 font-mono text-[11px] text-zinc-400 uppercase">
                    <th className="py-2.5 px-3">SKU</th>
                    <th className="py-2.5 px-3">Nom Article</th>
                    <th className="py-2.5 px-3">Division</th>
                    <th className="py-2.5 px-3">Sport</th>
                    <th className="py-2.5 px-3">Sales Line</th>
                    <th className="py-2.5 px-3 text-right">Achats Qté</th>
                    <th className="py-2.5 px-3 text-right">Achats Valeur</th>
                    <th className="py-2.5 px-3 text-right text-emerald-400">Ventes Qté</th>
                    <th className="py-2.5 px-3 text-right text-emerald-400">Ventes Valeur</th>
                    <th className="py-2.5 px-3 text-center">Sell-Thru %</th>
                    <th className="py-2.5 px-3 text-right">Stock (U)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                  {products.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onSelectProduct(item)}
                      className="hover:bg-zinc-850/60 transition-colors cursor-pointer group"
                    >
                      <td className="py-2 px-3 font-bold text-amber-400">{item.sku}</td>
                      <td className="py-2 px-3 font-sans font-medium text-white truncate max-w-[180px] group-hover:text-amber-400">
                        {item.name}
                      </td>
                      <td className="py-2 px-3 text-zinc-400">{item.division}</td>
                      <td className="py-2 px-3 text-zinc-400">{item.sport}</td>
                      <td className="py-2 px-3 text-zinc-300 font-sans">{item.salesLine}</td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatNumber(item.totalBuyQty)}</td>
                      <td className="py-2 px-3 text-right text-zinc-400">{formatEuro(item.totalBuyValue)}</td>
                      <td className="py-2 px-3 text-right tabular-nums font-semibold text-emerald-400">{formatNumber(item.totalSalesQty)}</td>
                      <td className="py-2 px-3 text-right font-bold text-emerald-400">{formatEuro(item.totalSalesValue)}</td>
                      <td className="py-2 px-3 text-center">
                        <span className={`inline-block px-1.5 py-0.5 rounded-xs font-bold text-xs ${
                          item.sellThroughRate >= 85 ? 'text-emerald-300 bg-emerald-950/80' : 'text-amber-300 bg-amber-950/80'
                        }`}>
                          {item.sellThroughRate}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right tabular-nums">{formatNumber(item.stockQty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
