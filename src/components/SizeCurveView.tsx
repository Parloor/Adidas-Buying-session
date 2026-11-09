import React, { useState, useMemo } from 'react';
import { 
  Ruler, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  HelpCircle, 
  Layers, 
  Sparkles,
  Download,
  Search
} from 'lucide-react';
import { ProductItem, SizeBreakdown } from '../types/merchandising';

interface SizeCurveViewProps {
  products: ProductItem[];
  selectedProduct?: ProductItem | null;
  onSelectProduct: (product: ProductItem) => void;
}

export const SizeCurveView: React.FC<SizeCurveViewProps> = ({
  products,
  selectedProduct: initialSelected,
  onSelectProduct,
}) => {
  const [selectedSku, setSelectedSku] = useState<string>(
    initialSelected ? initialSelected.sku : products[0]?.sku || ''
  );
  const [mode, setMode] = useState<'single' | 'consolidatedFootwear' | 'consolidatedApparel'>('single');

  // Currently selected product
  const activeProduct = useMemo(() => {
    return products.find((p) => p.sku === selectedSku) || products[0];
  }, [products, selectedSku]);

  // Compute consolidated footwear size curve across all footwear
  const consolidatedFootwear = useMemo(() => {
    const footwearProds = products.filter((p) => p.division === 'Footwear');
    const sizeMap: Record<string, { buyQty: number; salesQty: number }> = {};

    footwearProds.forEach((p) => {
      p.sizes.forEach((s) => {
        if (!sizeMap[s.size]) {
          sizeMap[s.size] = { buyQty: 0, salesQty: 0 };
        }
        sizeMap[s.size].buyQty += s.buyQty;
        sizeMap[s.size].salesQty += s.salesQty;
      });
    });

    const totalSales = Object.values(sizeMap).reduce((acc, v) => acc + v.salesQty, 0);

    return Object.entries(sizeMap)
      .map(([size, data]) => {
        const str = data.buyQty > 0 ? Math.round((data.salesQty / data.buyQty) * 1000) / 10 : 0;
        const share = totalSales > 0 ? Math.round((data.salesQty / totalSales) * 1000) / 10 : 0;
        return {
          size,
          buyQty: data.buyQty,
          salesQty: data.salesQty,
          sellThroughRate: str,
          stockQty: Math.max(0, data.buyQty - data.salesQty),
          salesShare: share,
          recommendation: str > 90 ? 'Sous-acheté (+20% rec.)' : str < 65 ? 'Sur-acheté (-20% rec.)' : 'Grille équilibrée',
        };
      })
      .sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true, sensitivity: 'base' }));
  }, [products]);

  // Compute consolidated apparel size curve across all apparel
  const consolidatedApparel = useMemo(() => {
    const apparelProds = products.filter((p) => p.division === 'Apparel');
    const sizeMap: Record<string, { buyQty: number; salesQty: number }> = {};

    const apparelOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

    apparelProds.forEach((p) => {
      p.sizes.forEach((s) => {
        if (!sizeMap[s.size]) {
          sizeMap[s.size] = { buyQty: 0, salesQty: 0 };
        }
        sizeMap[s.size].buyQty += s.buyQty;
        sizeMap[s.size].salesQty += s.salesQty;
      });
    });

    const totalSales = Object.values(sizeMap).reduce((acc, v) => acc + v.salesQty, 0);

    return Object.entries(sizeMap)
      .map(([size, data]) => {
        const str = data.buyQty > 0 ? Math.round((data.salesQty / data.buyQty) * 1000) / 10 : 0;
        const share = totalSales > 0 ? Math.round((data.salesQty / totalSales) * 1000) / 10 : 0;
        return {
          size,
          buyQty: data.buyQty,
          salesQty: data.salesQty,
          sellThroughRate: str,
          stockQty: Math.max(0, data.buyQty - data.salesQty),
          salesShare: share,
          recommendation: str > 90 ? 'Sous-acheté (+20% rec.)' : str < 65 ? 'Sur-acheté (-20% rec.)' : 'Grille équilibrée',
        };
      })
      .sort((a, b) => {
        const idxA = apparelOrder.indexOf(a.size);
        const idxB = apparelOrder.indexOf(b.size);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        return a.size.localeCompare(b.size);
      });
  }, [products]);

  // Current display data based on mode
  const currentSizes: SizeBreakdown[] = useMemo(() => {
    if (mode === 'consolidatedFootwear') return consolidatedFootwear;
    if (mode === 'consolidatedApparel') return consolidatedApparel;
    return activeProduct?.sizes || [];
  }, [mode, consolidatedFootwear, consolidatedApparel, activeProduct]);

  // Max quantity for scaling charts
  const maxQty = useMemo(() => {
    return Math.max(...currentSizes.map((s) => Math.max(s.buyQty, s.salesQty)), 10);
  }, [currentSizes]);

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('fr-FR').format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Selector Bar */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Mode switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase text-zinc-400">Niveau d'Analyse :</span>
          <div className="flex bg-zinc-950 p-1 rounded-sm border border-zinc-800">
            <button
              onClick={() => setMode('single')}
              className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-colors ${
                mode === 'single'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Par Article Spécifique
            </button>
            <button
              onClick={() => setMode('consolidatedFootwear')}
              className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-colors ${
                mode === 'consolidatedFootwear'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Grille Consolidée Chaussures (EU)
            </button>
            <button
              onClick={() => setMode('consolidatedApparel')}
              className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-colors ${
                mode === 'consolidatedApparel'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Grille Consolidée Textile (XS-XXL)
            </button>
          </div>
        </div>

        {/* Product selector (if mode is single) */}
        {mode === 'single' && (
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <span className="text-xs font-mono uppercase text-zinc-400 whitespace-nowrap">Article :</span>
            <select
              value={selectedSku}
              onChange={(e) => setSelectedSku(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs py-1.5 px-3 rounded-sm outline-none focus:border-amber-400"
            >
              {products.map((p) => (
                <option key={p.sku} value={p.sku}>
                  [{p.sku}] {p.name} - {p.division} ({p.sellThroughRate}% STR)
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Product Summary Header if in single mode */}
      {mode === 'single' && activeProduct && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={activeProduct.imageUrl}
              alt={activeProduct.name}
              className="w-16 h-16 object-cover rounded-xs border border-zinc-800 bg-zinc-950"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800';
              }}
            />
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span className="text-amber-400 font-bold">{activeProduct.sku}</span>
                <span>·</span>
                <span>{activeProduct.division}</span>
                <span>·</span>
                <span>{activeProduct.category}</span>
                <span>·</span>
                <span>{activeProduct.gender}</span>
              </div>
              <h3 className="text-base font-bold text-white font-display mt-0.5">
                {activeProduct.name}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono text-xs">
            <div>
              <div className="text-zinc-500 uppercase text-[10px]">Achats Totaux</div>
              <div className="text-zinc-200 font-bold text-sm">{formatNumber(activeProduct.totalBuyQty)} u.</div>
            </div>
            <div>
              <div className="text-zinc-500 uppercase text-[10px]">Ventes Réalisées</div>
              <div className="text-emerald-400 font-bold text-sm">{formatNumber(activeProduct.totalSalesQty)} u.</div>
            </div>
            <div>
              <div className="text-zinc-500 uppercase text-[10px]">STR Global</div>
              <div className="text-amber-400 font-bold text-sm">{activeProduct.sellThroughRate}%</div>
            </div>
            <div>
              <div className="text-zinc-500 uppercase text-[10px]">Stock Restant</div>
              <div className="text-white font-bold text-sm">{formatNumber(activeProduct.stockQty)} u.</div>
            </div>
          </div>
        </div>
      )}

      {/* Visual Bar Chart: Achats vs Ventes par Taille */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold font-display text-white flex items-center gap-2">
              <Ruler className="w-4 h-4 text-amber-400" />
              <span>Courbe Comparative des Tailles : Achats (Bleu/Gris) vs Ventes (Vert)</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Visualisez instantanément les déséquilibres de commande : barres vertes proches des barres grises = taille en rupture imminente.
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-zinc-600 rounded-xs"></span>
              <span className="text-zinc-300">Qté Achetée</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-emerald-500 rounded-xs"></span>
              <span className="text-emerald-300">Qté Vendue</span>
            </div>
          </div>
        </div>

        {/* Visual Chart Bars Container */}
        <div className="pt-6 pb-2 px-2 overflow-x-auto">
          <div className="flex items-end gap-3 sm:gap-6 min-w-[600px] h-64 border-b border-zinc-800 pb-2">
            {currentSizes.map((item) => {
              const buyHeightPercent = Math.max(12, Math.round((item.buyQty / maxQty) * 100));
              const salesHeightPercent = Math.max(8, Math.round((item.salesQty / maxQty) * 100));
              const str = item.sellThroughRate;

              const isDepleted = str >= 92;
              const isOverstocked = str < 60;

              return (
                <div key={item.size} className="flex-1 flex flex-col items-center h-full justify-end group">
                  
                  {/* STR tag on top */}
                  <span className={`text-[10px] font-mono font-bold mb-1 px-1 rounded-xs ${
                    isDepleted 
                      ? 'text-rose-300 bg-rose-950/80 border border-rose-800' 
                      : isOverstocked
                      ? 'text-amber-300 bg-amber-950/80 border border-amber-800'
                      : 'text-emerald-300 bg-emerald-950/80'
                  }`}>
                    {str}%
                  </span>

                  {/* Dual Bar Column */}
                  <div className="w-full flex items-end justify-center gap-1 h-44">
                    {/* Buy Bar */}
                    <div 
                      className="w-1/2 max-w-[28px] bg-zinc-700/80 group-hover:bg-zinc-600 rounded-t-xs transition-all relative flex justify-center"
                      style={{ height: `${buyHeightPercent}%` }}
                      title={`Acheté : ${formatNumber(item.buyQty)} unités`}
                    >
                      <span className="opacity-0 group-hover:opacity-100 text-[9px] font-mono text-zinc-300 absolute -top-4 transition-opacity">
                        {formatNumber(item.buyQty)}
                      </span>
                    </div>

                    {/* Sales Bar */}
                    <div 
                      className={`w-1/2 max-w-[28px] rounded-t-xs transition-all relative flex justify-center ${
                        isDepleted ? 'bg-emerald-400 group-hover:bg-emerald-300' : 'bg-emerald-500/90 group-hover:bg-emerald-400'
                      }`}
                      style={{ height: `${salesHeightPercent}%` }}
                      title={`Vendu : ${formatNumber(item.salesQty)} unités`}
                    >
                      <span className="opacity-0 group-hover:opacity-100 text-[9px] font-mono text-emerald-200 font-bold absolute -top-4 transition-opacity">
                        {formatNumber(item.salesQty)}
                      </span>
                    </div>
                  </div>

                  {/* Size Label */}
                  <div className="mt-3 font-mono font-bold text-xs text-white group-hover:text-amber-400 transition-colors">
                    {item.size}
                  </div>

                  {/* Stock tag */}
                  <div className="text-[10px] text-zinc-500 font-mono">
                    {formatNumber(item.stockQty)} rst.
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Merchandising Diagnostic & Sizing Recommendations Table */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-semibold font-display text-white">
              Grille &amp; Recommandations d'Achat par Taille (FW26 Buying Session)
            </h3>
          </div>
          <span className="text-xs text-zinc-400 font-mono">
            Optimisation du ratio des pointures
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/70 font-mono text-[11px] text-zinc-400 uppercase">
                <th className="py-2.5 px-4">Taille / Pointure</th>
                <th className="py-2.5 px-4 text-right">Qté Achetée</th>
                <th className="py-2.5 px-4 text-right">Qté Vendue</th>
                <th className="py-2.5 px-4 text-right">Stock Résiduel</th>
                <th className="py-2.5 px-4 text-center">Taux d'Écoulement (STR %)</th>
                <th className="py-2.5 px-4 text-right">Part des Ventes (%)</th>
                <th className="py-2.5 px-4">Diagnostic Merchandising</th>
                <th className="py-2.5 px-4">Recommandation Session Achat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {currentSizes.map((item) => {
                const str = item.sellThroughRate;
                const isUnderbought = str >= 92;
                const isOverbought = str < 65;
                const isOptimal = !isUnderbought && !isOverbought;

                return (
                  <tr key={item.size} className="hover:bg-zinc-850/60 transition-colors">
                    <td className="py-2.5 px-4 font-bold text-white text-sm">
                      {item.size}
                    </td>

                    <td className="py-2.5 px-4 text-right text-zinc-300 tabular-nums">
                      {formatNumber(item.buyQty)}
                    </td>

                    <td className="py-2.5 px-4 text-right font-semibold text-emerald-400 tabular-nums">
                      {formatNumber(item.salesQty)}
                    </td>

                    <td className="py-2.5 px-4 text-right text-zinc-300 tabular-nums">
                      {formatNumber(item.stockQty)}
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-xs font-bold ${
                        isUnderbought
                          ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-700/60'
                          : isOverbought
                          ? 'text-rose-300 bg-rose-950/80 border border-rose-700/60'
                          : 'text-amber-300 bg-amber-950/80 border border-amber-700/60'
                      }`}>
                        {item.sellThroughRate}%
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-right text-zinc-400">
                      {item.salesShare}%
                    </td>

                    <td className="py-2.5 px-4 font-sans text-xs">
                      {isUnderbought ? (
                        <span className="text-amber-300 flex items-center gap-1.5 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>Forte tension / Risque de rupture</span>
                        </span>
                      ) : isOverbought ? (
                        <span className="text-rose-400 flex items-center gap-1.5 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                          <span>Sur-stocké / Ralentissement</span>
                        </span>
                      ) : (
                        <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Ratio équilibré</span>
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 font-sans text-xs">
                      {isUnderbought ? (
                        <span className="text-emerald-300 font-semibold bg-emerald-950/60 px-2 py-1 rounded-xs border border-emerald-800/80">
                          +15% à +25% de volume
                        </span>
                      ) : isOverbought ? (
                        <span className="text-rose-300 font-semibold bg-rose-950/60 px-2 py-1 rounded-xs border border-rose-800/80">
                          -20% à -30% ou rationalisation
                        </span>
                      ) : (
                        <span className="text-zinc-300 bg-zinc-800 px-2 py-1 rounded-xs">
                          Reconduire à l'identique
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
