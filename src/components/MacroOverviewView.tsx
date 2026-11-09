import React, { useState, useMemo } from 'react';
import { 
  BarChart3, 
  Layers, 
  TrendingUp, 
  Package, 
  Scale, 
  ArrowRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { ProductItem, OverallKPIs } from '../types/merchandising';
import { formatCurrency } from '../utils/csvParser';

interface MacroOverviewViewProps {
  products: ProductItem[];
  allProducts?: ProductItem[];
  kpis: OverallKPIs;
  onNavigateToSportCategory: (sport?: string) => void;
  onNavigateToSizes: () => void;
}

export const MacroOverviewView: React.FC<MacroOverviewViewProps> = ({
  products,
  kpis,
  onNavigateToSportCategory,
  onNavigateToSizes,
}) => {
  const formatNumber = (val: number) => new Intl.NumberFormat('fr-FR').format(val);

  type DivSortField = 'division' | 'buyValue' | 'buyValueShare' | 'salesValue' | 'salesValueShare' | 'deltaValueShare' | 'sellThroughRate' | 'buyQty' | 'salesQty' | 'stockQty';
  const [divSortField, setDivSortField] = useState<DivSortField>('salesValue');
  const [divSortOrder, setDivSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleDivHeaderSort = (field: DivSortField) => {
    if (divSortField === field) {
      setDivSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setDivSortField(field);
      setDivSortOrder('desc');
    }
  };

  // Compute breakdown by Division with Value Weights (%)
  // Colored bars are relative to: Poids d'achats en valeur vs Poids de ventes en valeur
  const divisionBreakdown = useMemo(() => {
    const map: Record<string, { buyQty: number; buyValue: number; salesQty: number; salesValue: number; stockQty: number }> = {};

    products.forEach((p) => {
      const div = p.division || 'Footwear';
      if (!map[div]) {
        map[div] = { buyQty: 0, buyValue: 0, salesQty: 0, salesValue: 0, stockQty: 0 };
      }
      map[div].buyQty += p.totalBuyQty;
      map[div].buyValue += p.totalBuyValue;
      map[div].salesQty += p.totalSalesQty;
      map[div].salesValue += p.totalSalesValue;
      map[div].stockQty += p.stockQty;
    });

    const list = Object.entries(map)
      .map(([division, data]) => {
        // Value weights (Poids en valeur)
        const buyValueShare = kpis.totalBuyValue > 0 ? (data.buyValue / kpis.totalBuyValue) * 100 : 0;
        const salesValueShare = kpis.totalSalesValue > 0 ? (data.salesValue / kpis.totalSalesValue) * 100 : 0;
        const deltaValueShare = Math.round((salesValueShare - buyValueShare) * 10) / 10;

        // Volume weights (Poids en volume)
        const buyQtyShare = kpis.totalBuyQty > 0 ? (data.buyQty / kpis.totalBuyQty) * 100 : 0;
        const salesQtyShare = kpis.totalSalesQty > 0 ? (data.salesQty / kpis.totalSalesQty) * 100 : 0;

        const str = data.buyQty > 0 ? Math.round((data.salesQty / data.buyQty) * 1000) / 10 : 0;

        return {
          division,
          ...data,
          buyValueShare: Math.round(buyValueShare * 10) / 10,
          salesValueShare: Math.round(salesValueShare * 10) / 10,
          deltaValueShare,
          buyQtyShare: Math.round(buyQtyShare * 10) / 10,
          salesQtyShare: Math.round(salesQtyShare * 10) / 10,
          sellThroughRate: str,
        };
      })
      // Only keep divisions with actual data (enlever tout ce qui n'a pas de données)
      .filter((d) => d.buyQty > 0 || d.salesQty > 0 || d.buyValue > 0 || d.salesValue > 0);

    return list.sort((a, b) => {
      let valA: string | number = 0;
      let valB: string | number = 0;

      switch (divSortField) {
        case 'division':
          return divSortOrder === 'asc' ? a.division.localeCompare(b.division) : b.division.localeCompare(a.division);
        case 'buyValue':
          valA = a.buyValue; valB = b.buyValue; break;
        case 'buyValueShare':
          valA = a.buyValueShare; valB = b.buyValueShare; break;
        case 'salesValue':
          valA = a.salesValue; valB = b.salesValue; break;
        case 'salesValueShare':
          valA = a.salesValueShare; valB = b.salesValueShare; break;
        case 'deltaValueShare':
          valA = a.deltaValueShare; valB = b.deltaValueShare; break;
        case 'sellThroughRate':
          valA = a.sellThroughRate; valB = b.sellThroughRate; break;
        case 'buyQty':
          valA = a.buyQty; valB = b.buyQty; break;
        case 'salesQty':
          valA = a.salesQty; valB = b.salesQty; break;
        case 'stockQty':
          valA = a.stockQty; valB = b.stockQty; break;
        default:
          valA = a.salesValue; valB = b.salesValue;
      }

      return divSortOrder === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  }, [products, kpis, divSortField, divSortOrder]);

  // Compute breakdown by Sports Category with Value Weights (%)
  const sportBreakdown = useMemo(() => {
    const map: Record<string, { buyQty: number; buyValue: number; salesQty: number; salesValue: number; stockQty: number }> = {};

    products.forEach((p) => {
      const sp = p.sport || 'Originals';
      if (!map[sp]) {
        map[sp] = { buyQty: 0, buyValue: 0, salesQty: 0, salesValue: 0, stockQty: 0 };
      }
      map[sp].buyQty += p.totalBuyQty;
      map[sp].buyValue += p.totalBuyValue;
      map[sp].salesQty += p.totalSalesQty;
      map[sp].salesValue += p.totalSalesValue;
      map[sp].stockQty += p.stockQty;
    });

    return Object.entries(map)
      .map(([sport, data]) => {
        // Value weights
        const buyValueShare = kpis.totalBuyValue > 0 ? (data.buyValue / kpis.totalBuyValue) * 100 : 0;
        const salesValueShare = kpis.totalSalesValue > 0 ? (data.salesValue / kpis.totalSalesValue) * 100 : 0;
        const deltaValueShare = Math.round((salesValueShare - buyValueShare) * 10) / 10;

        // Volume weights
        const buyQtyShare = kpis.totalBuyQty > 0 ? (data.buyQty / kpis.totalBuyQty) * 100 : 0;
        const salesQtyShare = kpis.totalSalesQty > 0 ? (data.salesQty / kpis.totalSalesQty) * 100 : 0;

        const str = data.buyQty > 0 ? Math.round((data.salesQty / data.buyQty) * 1000) / 10 : 0;

        return {
          sport,
          ...data,
          buyValueShare: Math.round(buyValueShare * 10) / 10,
          salesValueShare: Math.round(salesValueShare * 10) / 10,
          deltaValueShare,
          buyQtyShare: Math.round(buyQtyShare * 10) / 10,
          salesQtyShare: Math.round(salesQtyShare * 10) / 10,
          sellThroughRate: str,
        };
      })
      // Only keep sports with actual data
      .filter((s) => s.buyQty > 0 || s.salesQty > 0 || s.buyValue > 0 || s.salesValue > 0)
      // Rank by sales value
      .sort((a, b) => b.salesValue - a.salesValue);
  }, [products, kpis]);

  // Max value shares for scaling the colored comparison bars
  const maxDivShare = useMemo(() => {
    return Math.max(...divisionBreakdown.map((d) => Math.max(d.buyValueShare, d.salesValueShare)), 10) * 1.05;
  }, [divisionBreakdown]);

  const maxSportShare = useMemo(() => {
    return Math.max(...sportBreakdown.map((s) => Math.max(s.buyValueShare, s.salesValueShare)), 10) * 1.05;
  }, [sportBreakdown]);

  return (
    <div className="space-y-6">
      
      {/* Executive Page Header */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-400 text-black">
              <BarChart3 className="w-3 h-3" />
              Vue Macro
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-xs font-mono text-zinc-400">
              Session Achats ADIDAS FW25
            </span>
          </div>
          <h2 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
            Vue Macro Saison : Poids d'Achats en Valeur vs Poids de Ventes en Valeur
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Vision globale consolidée. Barres en couleurs calculées directement sur le <strong className="text-white">poids d'achat en valeur (%)</strong> comparé au <strong className="text-white">poids de vente en valeur (%)</strong> avec sell-through et quantités.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onNavigateToSportCategory()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-black transition-colors rounded-xs shadow-sm"
          >
            <span>Explorer par Sport Category</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top Macro Metric Cards (Achats, Ventes, Sell-Through, Stock - NO MARGIN) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Achats Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-mono uppercase text-[11px] tracking-wide">Achats Totaux</span>
            <Package className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {formatNumber(kpis.totalBuyQty)} <span className="text-xs font-normal text-zinc-400">unités</span>
          </div>
          <div className="text-xs font-mono text-amber-400 mt-1">
            Valeur Achat : <span className="font-bold">{formatCurrency(kpis.totalBuyValue)}</span>
          </div>
        </div>

        {/* Ventes Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-mono uppercase text-[11px] tracking-wide">Ventes Réalisées</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {formatNumber(kpis.totalSalesQty)} <span className="text-xs font-normal text-zinc-400">unités</span>
          </div>
          <div className="text-xs font-mono text-emerald-400 mt-1">
            Valeur Vente (CA) : <span className="font-bold">{formatCurrency(kpis.totalSalesValue)}</span>
          </div>
        </div>

        {/* Sell-Through Card */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span className="font-mono uppercase text-[11px] tracking-wide">Sell-Through Global</span>
            <Scale className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white flex items-baseline gap-2">
            <span className={kpis.overallSellThrough >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
              {kpis.overallSellThrough}%
            </span>
            <span className="text-xs font-normal text-zinc-400 font-sans">en volume</span>
          </div>
          <div className="text-xs font-mono text-zinc-400 mt-1">
            STR Valeur : <span className="text-zinc-200 font-semibold">{kpis.overallValueSellThrough}%</span>
          </div>
        </div>

        {/* Stock Résiduel Card (Affichage Valeur Achat / Coût Net et Valeur Vente PPC) */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
              <span className="font-mono uppercase text-[11px] tracking-wide">Stock Résiduel</span>
              <Package className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums flex items-baseline gap-1.5">
              {formatNumber(kpis.totalStockQty)} <span className="text-xs font-normal text-zinc-400">unités</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-zinc-800/80 space-y-1 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-[11px]">Valeur Stock (Achat net) :</span>
              <span className="font-bold text-cyan-300">{formatCurrency(kpis.totalStockValue)}</span>
            </div>
            {typeof kpis.totalStockRetailValue === 'number' && kpis.totalStockRetailValue > 0 && (
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="text-zinc-500">Valorisation Vente (PPC) :</span>
                <span className="text-zinc-300 font-semibold">{formatCurrency(kpis.totalStockRetailValue)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 1: Répartition par Division avec barres relatives aux poids en valeur */}
      {divisionBreakdown.length > 0 && (
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                Répartition par Division (Poids en Valeur vs Sell-Through)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Barres en couleur relatives aux poids d'achats en valeur (%) vs poids de ventes en valeur (%) &bull; Classement par CA
              </p>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-amber-400 rounded-xs"></span>
                <span className="text-amber-400 font-semibold">Poids Achat en Valeur (%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-emerald-500 rounded-xs"></span>
                <span className="text-emerald-400 font-semibold">Poids Vente en Valeur (%)</span>
              </div>
            </div>
          </div>

          {/* Visual Dual-Bar Chart for Divisions */}
          <div className="space-y-4 pt-2">
            {divisionBreakdown.map((item) => {
              const buyWidth = maxDivShare > 0 ? (item.buyValueShare / maxDivShare) * 100 : 0;
              const salesWidth = maxDivShare > 0 ? (item.salesValueShare / maxDivShare) * 100 : 0;

              return (
                <div key={item.division} className="bg-zinc-950/70 p-3.5 rounded-xs border border-zinc-850 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm font-display">{item.division}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-xs bg-zinc-900 text-zinc-400 border border-zinc-800">
                        STR: <strong className={item.sellThroughRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{item.sellThroughRate}%</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-amber-400">
                        Poids Achat Valeur : <strong>{item.buyValueShare}%</strong> ({formatCurrency(item.buyValue)})
                      </span>
                      <span className="text-zinc-600">&bull;</span>
                      <span className="text-emerald-400">
                        Poids Vente Valeur : <strong>{item.salesValueShare}%</strong> ({formatCurrency(item.salesValue)})
                      </span>
                      <span className="text-zinc-600">&bull;</span>
                      <span className={item.deltaValueShare > 0 ? 'text-emerald-400 font-bold' : item.deltaValueShare < 0 ? 'text-rose-400 font-bold' : 'text-zinc-500'}>
                        &Delta; {item.deltaValueShare > 0 ? `+${item.deltaValueShare}` : item.deltaValueShare}%
                      </span>
                    </div>
                  </div>

                  {/* Paired Visual Dual Bars Relative to Value Shares */}
                  <div className="space-y-1.5 pt-1">
                    {/* Buy Value Bar */}
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[10px] font-mono text-amber-400 shrink-0">Achat Val :</span>
                      <div className="flex-1 bg-zinc-900 h-4 rounded-xs overflow-hidden flex items-center">
                        <div
                          style={{ width: `${Math.max(buyWidth, 2)}%` }}
                          className="bg-amber-400 h-full rounded-xs transition-all flex items-center justify-end pr-1.5"
                        >
                          {buyWidth > 15 && (
                            <span className="text-[9px] font-mono text-black font-bold">
                              {item.buyValueShare}%
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="w-28 text-right font-mono text-[11px] text-zinc-300">
                        {formatCurrency(item.buyValue)} <span className="text-[9px] text-zinc-500">({formatNumber(item.buyQty)} u.)</span>
                      </span>
                    </div>

                    {/* Sales Value Bar */}
                    <div className="flex items-center gap-2">
                      <span className="w-20 text-[10px] font-mono text-emerald-400 shrink-0">Vente Val :</span>
                      <div className="flex-1 bg-zinc-900 h-4 rounded-xs overflow-hidden flex items-center">
                        <div
                          style={{ width: `${Math.max(salesWidth, 2)}%` }}
                          className="bg-emerald-500 h-full rounded-xs transition-all flex items-center justify-end pr-1.5"
                        >
                          {salesWidth > 15 && (
                            <span className="text-[9px] font-mono text-black font-bold">
                              {item.salesValueShare}%
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="w-28 text-right font-mono text-[11px] text-emerald-400 font-semibold">
                        {formatCurrency(item.salesValue)} <span className="text-[9px] text-zinc-500">({formatNumber(item.salesQty)} u.)</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dense Merchandising Table for Divisions */}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950 font-mono text-[11px] text-zinc-400 uppercase">
                  <th 
                    onClick={() => handleDivHeaderSort('division')}
                    className="py-2.5 px-3 select-none cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    <div className="inline-flex items-center gap-1">
                      <span>Division</span>
                      {divSortField === 'division' ? (
                        divSortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-400" /> : <ArrowUp className="w-3 h-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDivHeaderSort('buyValue')}
                    className="py-2.5 px-3 text-right select-none cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    <div className="inline-flex items-center justify-end gap-1 w-full">
                      <span>Achats Valeur</span>
                      {divSortField === 'buyValue' ? (
                        divSortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-400" /> : <ArrowUp className="w-3 h-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDivHeaderSort('buyValueShare')}
                    className="py-2.5 px-3 text-right text-amber-400 font-semibold select-none cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    <div className="inline-flex items-center justify-end gap-1 w-full">
                      <span>Poids Achat Val %</span>
                      {divSortField === 'buyValueShare' ? (
                        divSortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-400" /> : <ArrowUp className="w-3 h-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDivHeaderSort('salesValue')}
                    className="py-2.5 px-3 text-right text-emerald-400 select-none cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    <div className="inline-flex items-center justify-end gap-1 w-full">
                      <span>Ventes CA</span>
                      {divSortField === 'salesValue' ? (
                        divSortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-emerald-400" /> : <ArrowUp className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDivHeaderSort('salesValueShare')}
                    className="py-2.5 px-3 text-right text-emerald-400 font-semibold select-none cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    <div className="inline-flex items-center justify-end gap-1 w-full">
                      <span>Poids Vente Val %</span>
                      {divSortField === 'salesValueShare' ? (
                        divSortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-emerald-400" /> : <ArrowUp className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDivHeaderSort('deltaValueShare')}
                    className="py-2.5 px-3 text-right select-none cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    <div className="inline-flex items-center justify-end gap-1 w-full">
                      <span>Écart Poids (Δ%)</span>
                      {divSortField === 'deltaValueShare' ? (
                        divSortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-400" /> : <ArrowUp className="w-3 h-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDivHeaderSort('sellThroughRate')}
                    className="py-2.5 px-3 text-center select-none cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    <div className="inline-flex items-center justify-center gap-1">
                      <span>Sell-Thru %</span>
                      {divSortField === 'sellThroughRate' ? (
                        divSortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-400" /> : <ArrowUp className="w-3 h-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDivHeaderSort('buyQty')}
                    className="py-2.5 px-3 text-right select-none cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    <div className="inline-flex items-center justify-end gap-1 w-full">
                      <span>Achats Qté</span>
                      {divSortField === 'buyQty' ? (
                        divSortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-400" /> : <ArrowUp className="w-3 h-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDivHeaderSort('salesQty')}
                    className="py-2.5 px-3 text-right select-none cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    <div className="inline-flex items-center justify-end gap-1 w-full">
                      <span>Ventes Qté</span>
                      {divSortField === 'salesQty' ? (
                        divSortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-emerald-400" /> : <ArrowUp className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleDivHeaderSort('stockQty')}
                    className="py-2.5 px-3 text-right select-none cursor-pointer hover:bg-zinc-800 transition-colors"
                  >
                    <div className="inline-flex items-center justify-end gap-1 w-full">
                      <span>Stock (U)</span>
                      {divSortField === 'stockQty' ? (
                        divSortOrder === 'desc' ? <ArrowDown className="w-3 h-3 text-amber-400" /> : <ArrowUp className="w-3 h-3 text-amber-400" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                {divisionBreakdown.map((row) => (
                  <tr key={row.division} className="hover:bg-zinc-850/60 transition-colors">
                    <td className="py-2.5 px-3 font-bold text-white font-sans text-sm">{row.division}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-zinc-300">{formatCurrency(row.buyValue)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-semibold text-amber-400">{row.buyValueShare}%</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold text-emerald-400">{formatCurrency(row.salesValue)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold text-emerald-400">{row.salesValueShare}%</td>
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      {row.deltaValueShare > 0 ? (
                        <span className="text-emerald-400 font-bold">+{row.deltaValueShare}%</span>
                      ) : row.deltaValueShare < 0 ? (
                        <span className="text-rose-400 font-bold">{row.deltaValueShare}%</span>
                      ) : (
                        <span className="text-zinc-500">0.0%</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-xs font-bold text-xs ${
                        row.sellThroughRate >= 80 ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-500/30' : 'text-amber-300 bg-amber-950/80 border border-amber-500/30'
                      }`}>
                        {row.sellThroughRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-zinc-400">{formatNumber(row.buyQty)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-emerald-400 font-medium">{formatNumber(row.salesQty)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-zinc-400">{formatNumber(row.stockQty)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-zinc-700 bg-zinc-950 font-mono text-xs font-bold text-white">
                  <td className="py-2.5 px-3">TOTAL CONSOLIDÉ</td>
                  <td className="py-2.5 px-3 text-right">{formatCurrency(kpis.totalBuyValue)}</td>
                  <td className="py-2.5 px-3 text-right text-amber-400">100.0%</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">{formatCurrency(kpis.totalSalesValue)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">100.0%</td>
                  <td className="py-2.5 px-3 text-right text-zinc-500">-</td>
                  <td className="py-2.5 px-3 text-center text-amber-300">{kpis.overallSellThrough}%</td>
                  <td className="py-2.5 px-3 text-right">{formatNumber(kpis.totalBuyQty)}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">{formatNumber(kpis.totalSalesQty)}</td>
                  <td className="py-2.5 px-3 text-right">{formatNumber(kpis.totalStockQty)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* SECTION 2: Répartition par Sports Category avec Doubles Barres en Valeur */}
      {sportBreakdown.length > 0 && (
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-400" />
                Répartition par Sports Category (Poids Achats Valeur vs Ventes Valeur)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Barres en couleur relatives aux poids d'achats en valeur vs ventes en valeur &bull; Cliquez sur un sport pour afficher sa ventilation détaillée
              </p>
            </div>

            <button
              onClick={() => onNavigateToSportCategory()}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 inline-flex items-center gap-1"
            >
              <span>Détail complet par univers</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dual Bar Graphic for Sports Categories */}
          <div className="space-y-3.5 pt-2">
            {sportBreakdown.map((item) => {
              const buyWidth = maxSportShare > 0 ? (item.buyValueShare / maxSportShare) * 100 : 0;
              const salesWidth = maxSportShare > 0 ? (item.salesValueShare / maxSportShare) * 100 : 0;

              return (
                <div 
                  key={item.sport} 
                  onClick={() => onNavigateToSportCategory(item.sport)}
                  className="bg-zinc-950/70 hover:bg-zinc-850/80 p-3 rounded-xs border border-zinc-850 cursor-pointer transition-colors group"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-sans group-hover:text-amber-400 transition-colors">
                        {item.sport}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-zinc-900 text-zinc-400 border border-zinc-800">
                        STR: <strong className={item.sellThroughRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{item.sellThroughRate}%</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px]">
                      <span className="text-amber-400">Poids Achat Val : <strong>{item.buyValueShare}%</strong> ({formatCurrency(item.buyValue)})</span>
                      <span className="text-zinc-600">&bull;</span>
                      <span className="text-emerald-400">Poids Vente Val : <strong>{item.salesValueShare}%</strong> ({formatCurrency(item.salesValue)})</span>
                      <span className="text-zinc-600">&bull;</span>
                      <span className={item.deltaValueShare > 0 ? 'text-emerald-400 font-bold' : item.deltaValueShare < 0 ? 'text-rose-400 font-bold' : 'text-zinc-500'}>
                        &Delta; {item.deltaValueShare > 0 ? `+${item.deltaValueShare}` : item.deltaValueShare}%
                      </span>
                    </div>
                  </div>

                  {/* Bars in color relative to value share */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-16 text-[9px] font-mono text-amber-400">Achat Val</span>
                      <div className="flex-1 bg-zinc-900 h-3 rounded-xs overflow-hidden">
                        <div style={{ width: `${Math.max(buyWidth, 2)}%` }} className="bg-amber-400 h-full rounded-xs"></div>
                      </div>
                      <span className="w-24 text-right font-mono text-[10px] text-zinc-400">{formatCurrency(item.buyValue)}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-16 text-[9px] font-mono text-emerald-400">Vente Val</span>
                      <div className="flex-1 bg-zinc-900 h-3 rounded-xs overflow-hidden">
                        <div style={{ width: `${Math.max(salesWidth, 2)}%` }} className="bg-emerald-500 h-full rounded-xs"></div>
                      </div>
                      <span className="w-24 text-right font-mono text-[10px] text-emerald-400 font-semibold">{formatCurrency(item.salesValue)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
};
