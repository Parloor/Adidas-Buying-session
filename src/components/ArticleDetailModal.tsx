import React, { useEffect } from 'react';
import { 
  X, 
  Ruler, 
  TrendingUp, 
  Package, 
  Coins, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { ProductItem } from '../types/merchandising';
import { formatCurrency } from '../utils/csvParser';

interface ArticleDetailModalProps {
  product: ProductItem | null;
  onClose: () => void;
  onOpenSizeCurveView: (product: ProductItem) => void;
}

export const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({
  product,
  onClose,
  onOpenSizeCurveView,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!product) return null;

  const formatEuro = (val: number) => {
    return formatCurrency(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('fr-FR').format(val);
  };

  const isHot = product.sellThroughRate >= 85;
  const isMedium = product.sellThroughRate >= 70 && product.sellThroughRate < 85;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-zinc-900 border border-zinc-700/80 rounded-sm w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="bg-amber-400 text-black font-mono font-bold text-xs px-2.5 py-1 rounded-xs">
              SKU: {product.sku}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display text-white">
                {product.name}
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
                <span>{product.division}</span>
                <span>/</span>
                <span>{product.sport}</span>
                <span>/</span>
                <span>{product.gender}</span>
                <span>/</span>
                <span>{product.category}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto">
          
          {/* Top section: Photo + High-Level Merch KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* High-res Image */}
            <div className="relative aspect-square w-full rounded-sm overflow-hidden border border-zinc-800 bg-zinc-950">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800';
                }}
              />
              <div className="absolute top-2 right-2 font-mono text-xs font-bold px-2 py-0.5 rounded-xs bg-zinc-950/90 text-amber-400 border border-zinc-700">
                Prix: {formatCurrency(product.retailPrice)}
              </div>
              {product.color && (
                <div className="absolute bottom-2 left-2 font-mono text-[11px] px-2 py-0.5 rounded-xs bg-zinc-950/90 text-white border border-zinc-700">
                  Couleur: {product.color}
                </div>
              )}
            </div>

            {/* Financial and Sell-Through Scorecard */}
            <div className="md:col-span-2 space-y-4 flex flex-col justify-between">
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-950 p-3 rounded-xs border border-zinc-800 font-mono">
                  <div className="text-[10px] text-zinc-500 uppercase">Volume Acheté</div>
                  <div className="text-lg font-bold text-white tabular-nums">{formatNumber(product.totalBuyQty)} u.</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{formatEuro(product.totalBuyValue)}</div>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xs border border-zinc-800 font-mono">
                  <div className="text-[10px] text-zinc-500 uppercase">Volume Vendu</div>
                  <div className="text-lg font-bold text-emerald-400 tabular-nums">{formatNumber(product.totalSalesQty)} u.</div>
                  <div className="text-[10px] text-emerald-400/80 mt-0.5">{formatEuro(product.totalSalesValue)}</div>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xs border border-zinc-800 font-mono">
                  <div className="text-[10px] text-zinc-500 uppercase">Sell-Through Rate</div>
                  <div className="text-lg font-bold text-amber-400">{product.sellThroughRate}%</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{product.valueSellThroughRate}% en valeur</div>
                </div>

                <div className="bg-zinc-950 p-3 rounded-xs border border-zinc-800 font-mono">
                  <div className="text-[10px] text-zinc-500 uppercase">Stock Résiduel</div>
                  <div className="text-lg font-bold text-cyan-400 tabular-nums">{formatNumber(product.stockQty)} u.</div>
                  <div className="text-[10px] text-cyan-300 mt-0.5">{formatEuro(product.stockValue)}</div>
                </div>
              </div>

              {/* Stock and Price details */}
              <div className="bg-zinc-950/60 p-4 rounded-xs border border-zinc-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Stock résiduel disponible :</span>
                  <span className="text-white font-bold text-sm">{formatNumber(product.stockQty)} unités ({formatEuro(product.stockValue)})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Prix d'Achat Net (Wholesale) :</span>
                  <span className="text-zinc-200">{formatCurrency(product.wholesalePrice)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-400">Prix de Vente Public (PPC) :</span>
                  <span className="text-amber-400 font-semibold">
                    {formatCurrency(product.retailPrice)}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="pt-2">
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${isHot ? 'bg-emerald-400' : isMedium ? 'bg-amber-400' : 'bg-rose-400'}`}
                      style={{ width: `${Math.min(100, product.sellThroughRate)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Buying Verdict Note */}
              <div className="p-3 bg-amber-400/10 border border-amber-400/30 rounded-xs text-xs text-amber-200 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-300 block mb-0.5">Enseignement Buying FW25 :</strong>
                  {isHot ? (
                    <span>Article best-seller surperformant. Risque élevé de rupture sur les tailles médianes. Prioriser un réassort immédiat ou augmenter de +15% à +25% les allocations pour la session FW26.</span>
                  ) : isMedium ? (
                    <span>Performance saine et alignée avec les prévisions. Maintenir les volumes d'achat tout en ajustant la courbe de pointures.</span>
                  ) : (
                    <span>Performance ralentie. Prévoir une opération promotionnelle ciblée sur les magasins à fort stock résiduel et réduire l'engagement d'achat.</span>
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Granular Section 1: Courbe de Tailles de l'Article */}
          <div className="bg-zinc-950 p-4 rounded-sm border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold font-display text-white flex items-center gap-2">
                <Ruler className="w-4 h-4 text-amber-400" />
                <span>Courbe de Tailles Détaillée (Achats vs Ventes)</span>
              </h3>
              <button
                onClick={() => {
                  onClose();
                  onOpenSizeCurveView(product);
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium inline-flex items-center gap-1"
              >
                <span>Ouvrir dans l'analyseur de tailles</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400 text-[11px] uppercase">
                    <th className="py-2 px-3">Taille</th>
                    <th className="py-2 px-3 text-right">Achats (U)</th>
                    <th className="py-2 px-3 text-right">Ventes (U)</th>
                    <th className="py-2 px-3 text-right">Stock (U)</th>
                    <th className="py-2 px-3 text-center">Taux Écoulement</th>
                    <th className="py-2 px-3 text-right">Part Ventes</th>
                    <th className="py-2 px-3">Recommandation Achat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {product.sizes.map((s) => {
                    const str = s.sellThroughRate;
                    const isUnderbought = str >= 92;
                    const isOverbought = str < 65;

                    return (
                      <tr key={s.size} className="hover:bg-zinc-900/60 transition-colors">
                        <td className="py-2 px-3 font-bold text-white text-sm">{s.size}</td>
                        <td className="py-2 px-3 text-right text-zinc-300 tabular-nums">{formatNumber(s.buyQty)}</td>
                        <td className="py-2 px-3 text-right font-semibold text-emerald-400 tabular-nums">{formatNumber(s.salesQty)}</td>
                        <td className="py-2 px-3 text-right text-zinc-400 tabular-nums">{formatNumber(s.stockQty)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded-xs font-bold text-[11px] ${
                            isUnderbought
                              ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-700/60'
                              : isOverbought
                              ? 'text-rose-300 bg-rose-950/80 border border-rose-700/60'
                              : 'text-amber-300 bg-amber-950/80 border border-amber-700/60'
                          }`}>
                            {s.sellThroughRate}%
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right text-zinc-400">{s.salesShare}%</td>
                        <td className="py-2 px-3 font-sans text-xs">
                          {isUnderbought ? (
                            <span className="text-emerald-300 font-semibold">+15% à +25% volume</span>
                          ) : isOverbought ? (
                            <span className="text-rose-300 font-semibold">-20% réduction</span>
                          ) : (
                            <span className="text-zinc-400">Maintenir</span>
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

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs">
          <div className="text-zinc-500 font-mono">
            Article ID : {product.id}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-sm transition-colors"
          >
            Fermer la fiche
          </button>
        </div>
      </div>
    </div>
  );
};
