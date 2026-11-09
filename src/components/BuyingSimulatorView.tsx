import React, { useState, useMemo } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  TrendingDown,
  Download, 
  Sparkles, 
  Sliders, 
  Check, 
  ArrowRight,
  Layers,
  Percent,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  PieChart
} from 'lucide-react';
import Papa from 'papaparse';
import { ProductItem } from '../types/merchandising';

interface BuyingSimulatorViewProps {
  products: ProductItem[];
  onSelectProduct: (product: ProductItem) => void;
}

type GroupByOption = 'category' | 'sport' | 'division' | 'gender';

export const BuyingSimulatorView: React.FC<BuyingSimulatorViewProps> = ({
  products,
  onSelectProduct,
}) => {
  const [salesGrowthPercent, setSalesGrowthPercent] = useState<number>(10); // +10% target growth
  const [targetSellThrough, setTargetSellThrough] = useState<number>(85); // 85% optimal STR
  const [safetyBufferPercent, setSafetyBufferPercent] = useState<number>(5); // 5% safety buffer
  const [groupBy, setGroupBy] = useState<GroupByOption>('category');
  const [strategyFilter, setStrategyFilter] = useState<'all' | 'boost' | 'reduce' | 'stable'>('all');

  // 1. Group / Family Analysis based on Real Sell-Through
  const familyAggregates = useMemo(() => {
    const map: Record<string, {
      name: string;
      itemCount: number;
      buyQty: number;
      buyValue: number;
      salesQty: number;
      salesValue: number;
      stockQty: number;
      products: ProductItem[];
    }> = {};

    products.forEach((p) => {
      let key = p.category;
      if (groupBy === 'sport') key = p.sport;
      if (groupBy === 'division') key = p.division;
      if (groupBy === 'gender') key = p.gender;

      if (!map[key]) {
        map[key] = {
          name: key,
          itemCount: 0,
          buyQty: 0,
          buyValue: 0,
          salesQty: 0,
          salesValue: 0,
          stockQty: 0,
          products: [],
        };
      }

      map[key].itemCount += 1;
      map[key].buyQty += p.totalBuyQty;
      map[key].buyValue += p.totalBuyValue;
      map[key].salesQty += p.totalSalesQty;
      map[key].salesValue += p.totalSalesValue;
      map[key].stockQty += p.stockQty;
      map[key].products.push(p);
    });

    return Object.values(map).map((f) => {
      const sellThrough = f.buyQty > 0 ? Math.round((f.salesQty / f.buyQty) * 1000) / 10 : 0;
      
      // Determine strategic action based on Sell-Through vs Target
      // If STR >= 88% -> Sous-acheté (Sur-performance) -> AUGMENTER ACHATS (+15% à +30%)
      // If STR between 75% and 87% -> Bon équilibre -> RECONDUCTION MODÉRÉE (+/- 5%)
      // If STR < 75% -> Sur-stocké / Ralentissement -> RÉDUIRE ACHATS (-15% à -35%)
      let recommendationAction: 'AUGMENTER' | 'RECONDUCTION' | 'RÉDUIRE' = 'RECONDUCTION';
      let suggestedBudgetEvolution = 0; // %
      let diagnostic = '';

      if (sellThrough >= 88) {
        recommendationAction = 'AUGMENTER';
        suggestedBudgetEvolution = Math.round(15 + (sellThrough - 88) * 1.5);
        diagnostic = 'Forte demande, risque de manque à gagner par rupture. Augmenter les engagements.';
      } else if (sellThrough < 75) {
        recommendationAction = 'RÉDUIRE';
        suggestedBudgetEvolution = Math.max(-40, Math.round(-15 - (75 - sellThrough) * 1.2));
        diagnostic = 'Stock résiduel lourd et rotation insuffisante. Freiner les commandes et rationaliser.';
      } else {
        recommendationAction = 'RECONDUCTION';
        suggestedBudgetEvolution = salesGrowthPercent;
        diagnostic = 'Écoulement équilibré conforme aux prévisions Adidas.';
      }

      // Projected Buy Budget based on sell-through velocity
      const projectedBuyQty = Math.max(0, Math.round(f.buyQty * (1 + suggestedBudgetEvolution / 100)));
      const avgWholesale = f.buyQty > 0 ? f.buyValue / f.buyQty : 50;
      const projectedBuyValue = Math.round(projectedBuyQty * avgWholesale);

      return {
        ...f,
        sellThrough,
        recommendationAction,
        suggestedBudgetEvolution,
        diagnostic,
        projectedBuyQty,
        projectedBuyValue,
      };
    }).sort((a, b) => b.sellThrough - a.sellThrough);
  }, [products, groupBy, salesGrowthPercent]);

  // 2. Individual SKU Detailed Forecast & Simulation
  const skuSimulations = useMemo(() => {
    return products.map((item) => {
      const baseSales = item.totalSalesQty;
      const str = item.sellThroughRate;

      // Elasticity factor according to item sell-through:
      // High STR means product can absorb higher growth without excess stock
      let skuGrowth = salesGrowthPercent;
      if (str >= 90) skuGrowth += 10;
      else if (str >= 85) skuGrowth += 5;
      else if (str < 70) skuGrowth -= 15;
      else if (str < 60) skuGrowth -= 25;

      const projectedSalesQty = Math.max(0, Math.round(baseSales * (1 + skuGrowth / 100)));
      
      // Target buy formula: needs to cover projected sales at target STR, minus remaining stock
      const theoreticalBuyNeeded = Math.round(projectedSalesQty / (targetSellThrough / 100));
      const bufferQty = Math.round(theoreticalBuyNeeded * (safetyBufferPercent / 100));
      const stockDeduction = Math.round(item.stockQty * 0.45); // Deduct usable remaining inventory
      const recommendedBuyQty = Math.max(0, theoreticalBuyNeeded + bufferQty - stockDeduction);
      
      const recommendedBuyValue = recommendedBuyQty * item.wholesalePrice;
      const projectedSalesValue = projectedSalesQty * item.retailPrice;
      const projectedMarginValue = projectedSalesValue - (projectedSalesQty * item.wholesalePrice);
      
      const deltaQty = recommendedBuyQty - item.totalBuyQty;
      const deltaPercent = item.totalBuyQty > 0 ? Math.round((deltaQty / item.totalBuyQty) * 100) : 0;

      let actionTag: 'boost' | 'reduce' | 'stable' = 'stable';
      if (deltaPercent >= 10) actionTag = 'boost';
      else if (deltaPercent <= -10) actionTag = 'reduce';

      return {
        product: item,
        str,
        projectedSalesQty,
        projectedSalesValue,
        recommendedBuyQty,
        recommendedBuyValue,
        projectedMarginValue,
        deltaQty,
        deltaPercent,
        actionTag,
      };
    }).sort((a, b) => b.str - a.str);
  }, [products, salesGrowthPercent, targetSellThrough, safetyBufferPercent]);

  // Filtered SKUs according to strategy
  const filteredSkuSimulations = useMemo(() => {
    if (strategyFilter === 'all') return skuSimulations;
    return skuSimulations.filter((s) => s.actionTag === strategyFilter);
  }, [skuSimulations, strategyFilter]);

  // Totals for the simulated season
  const totals = useMemo(() => {
    return skuSimulations.reduce(
      (acc, curr) => {
        acc.totalBuyQty += curr.recommendedBuyQty;
        acc.totalBuyValue += curr.recommendedBuyValue;
        acc.totalSalesQty += curr.projectedSalesQty;
        acc.totalSalesValue += curr.projectedSalesValue;
        acc.totalMargin += curr.projectedMarginValue;
        if (curr.actionTag === 'boost') acc.boostCount += 1;
        if (curr.actionTag === 'reduce') acc.reduceCount += 1;
        if (curr.actionTag === 'stable') acc.stableCount += 1;
        return acc;
      },
      { 
        totalBuyQty: 0, 
        totalBuyValue: 0, 
        totalSalesQty: 0, 
        totalSalesValue: 0, 
        totalMargin: 0,
        boostCount: 0,
        reduceCount: 0,
        stableCount: 0,
      }
    );
  }, [skuSimulations]);

  const exportSimulationCSV = () => {
    const rows = skuSimulations.map((r) => ({
      'SKU Référence': r.product.sku,
      'Nom Article': r.product.name,
      'Division': r.product.division,
      'Famille / Catégorie': r.product.category,
      'Sport / Concept': r.product.sport,
      'Sell-Through FW25 (%)': `${r.str}%`,
      'Décision Stratégique': r.actionTag === 'boost' ? 'AUGMENTER ACHATS' : r.actionTag === 'reduce' ? 'RÉDUIRE ACHATS' : 'RECONDUIRE',
      'Prix Achat (€)': r.product.wholesalePrice,
      'Prix Vente (€)': r.product.retailPrice,
      'Achats Historiques FW25 (U)': r.product.totalBuyQty,
      'Ventes Historiques FW25 (U)': r.product.totalSalesQty,
      'Stock Restant FW25 (U)': r.product.stockQty,
      'Ventes Prévisionnelles Cibles (U)': r.projectedSalesQty,
      'CA Prévisionnel Cible (€)': r.projectedSalesValue,
      'Quantité d Achat Recommandée (U)': r.recommendedBuyQty,
      'Budget Achat Recommandé (€)': r.recommendedBuyValue,
      'Évolution Volume vs FW25 (%)': `${r.deltaPercent > 0 ? '+' : ''}${r.deltaPercent}%`,
    }));

    const csv = Papa.unparse(rows, { delimiter: ';' });
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Previsionnel_Achats_Adidas_FW26_Base_SellThru.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatEuro = (val: number) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('fr-FR').format(val);
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header & Dynamic Parameters Bar */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                MOTEUR DE RECOMMANDATION D'ACHATS
              </span>
              <span className="text-zinc-600">/</span>
              <span className="text-xs font-mono text-zinc-400">
                ALIGNEMENT SUR SELL-THRU FW25
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold font-display text-white mt-1 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-amber-400" />
              <span>Prévisionnel &amp; Arbitrage des Achats (Où Réduire vs Où Augmenter)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-1">
              Arbitre vos futurs budgets d'achats en réallouant automatiquement le capital des familles lentes vers les best sell-through.
            </p>
          </div>

          <button
            onClick={exportSimulationCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-amber-400 hover:bg-amber-300 text-black transition-colors rounded-sm shadow-sm shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Télécharger Bon de Commande Cible (CSV)</span>
          </button>
        </div>

        {/* Global Strategy Sliders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-3 border-t border-zinc-800">
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium">Croissance Chiffre d'Affaires :</span>
              <span className="font-mono font-bold text-amber-400">+{salesGrowthPercent}%</span>
            </div>
            <input
              type="range"
              min="-20"
              max="40"
              step="5"
              value={salesGrowthPercent}
              onChange={(e) => setSalesGrowthPercent(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer h-1.5 bg-zinc-950 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>-20% (Défensif)</span>
              <span>0% (Reconduction)</span>
              <span>+40% (Expansion)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium">Taux d'Écoulement Cible (STR) :</span>
              <span className="font-mono font-bold text-emerald-400">{targetSellThrough}%</span>
            </div>
            <input
              type="range"
              min="70"
              max="95"
              step="1"
              value={targetSellThrough}
              onChange={(e) => setTargetSellThrough(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-zinc-950 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>70% (Large)</span>
              <span>85% (Norme Adidas)</span>
              <span>95% (Flux tendu)</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-300 font-medium">Tampon Sécurité Anti-Rupture :</span>
              <span className="font-mono font-bold text-cyan-400">+{safetyBufferPercent}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="1"
              value={safetyBufferPercent}
              onChange={(e) => setSafetyBufferPercent(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-950 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>0% (Zéro stock résiduel)</span>
              <span>+5% (Conseillé)</span>
              <span>+15% (Protection best-sellers)</span>
            </div>
          </div>

        </div>
      </div>

      {/* 2. Strategic Scorecard: OÙ AUGMENTER vs OÙ RÉDUIRE */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Boost Box */}
        <div className="bg-emerald-950/30 border border-emerald-800/60 p-4 rounded-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
              <ArrowUpRight className="w-4 h-4" />
              <span>À Augmenter (Best Sell-Thru)</span>
            </span>
            <span className="text-xs font-bold text-emerald-300 font-mono bg-emerald-900/60 px-2 py-0.5 rounded-xs">
              {totals.boostCount} articles
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 mt-2">
            Articles et familles avec <strong>STR &ge; 88%</strong> : risque majeur de rupture de stock. Hausse d'achats préconisée pour capter le plein potentiel.
          </p>
        </div>

        {/* Stable Box */}
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-amber-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>À Reconduire (Écoulement Sain)</span>
            </span>
            <span className="text-xs font-bold text-amber-300 font-mono bg-amber-950/60 px-2 py-0.5 rounded-xs">
              {totals.stableCount} articles
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 mt-2">
            Articles avec <strong>75% &le; STR &lt; 88%</strong> : dynamique saine et volumes maîtrisés. Reconduction des quantités avec ajustement fin par pointure.
          </p>
        </div>

        {/* Reduce Box */}
        <div className="bg-rose-950/30 border border-rose-800/60 p-4 rounded-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase text-rose-400 flex items-center gap-1.5">
              <ArrowDownRight className="w-4 h-4" />
              <span>À Réduire (Sous-Performance)</span>
            </span>
            <span className="text-xs font-bold text-rose-300 font-mono bg-rose-900/60 px-2 py-0.5 rounded-xs">
              {totals.reduceCount} articles
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 mt-2">
            Articles avec <strong>STR &lt; 75%</strong> : stock résiduel trop important. Réduction d'engagement ou rationalisation de l'offre demandée.
          </p>
        </div>

      </div>

      {/* 3. Section: Arbitrage Stratégique par FAMILLE / GROUPE */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-sm p-5 space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold font-display text-white flex items-center gap-2">
              <PieChart className="w-4 h-4 text-amber-400" />
              <span>Arbitrage &amp; Recommandation par Groupe / Famille</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Classé du meilleur au moins bon sell-through pour identifier les poches de sur-performance et de sur-stock.
            </p>
          </div>

          {/* Group By selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase text-zinc-400">Regrouper par :</span>
            <div className="flex bg-zinc-950 p-0.5 rounded-sm border border-zinc-800 text-xs">
              <button
                onClick={() => setGroupBy('category')}
                className={`px-2.5 py-1 rounded-xs transition-colors ${
                  groupBy === 'category' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Catégorie
              </button>
              <button
                onClick={() => setGroupBy('sport')}
                className={`px-2.5 py-1 rounded-xs transition-colors ${
                  groupBy === 'sport' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Sport / Univers
              </button>
              <button
                onClick={() => setGroupBy('division')}
                className={`px-2.5 py-1 rounded-xs transition-colors ${
                  groupBy === 'division' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Division
              </button>
              <button
                onClick={() => setGroupBy('gender')}
                className={`px-2.5 py-1 rounded-xs transition-colors ${
                  groupBy === 'gender' ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                Genre
              </button>
            </div>
          </div>
        </div>

        {/* Group Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {familyAggregates.map((fam) => {
            const isBoost = fam.recommendationAction === 'AUGMENTER';
            const isReduce = fam.recommendationAction === 'RÉDUIRE';

            return (
              <div 
                key={fam.name}
                className={`p-4 rounded-sm border flex flex-col justify-between transition-all ${
                  isBoost 
                    ? 'bg-zinc-950/80 border-emerald-700/60 shadow-xs' 
                    : isReduce
                    ? 'bg-zinc-950/80 border-rose-800/60'
                    : 'bg-zinc-950/80 border-zinc-800'
                }`}
              >
                <div>
                  {/* Top Bar of Card */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-white font-display">
                        {fam.name}
                      </h4>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {fam.itemCount} référence(s)
                      </span>
                    </div>

                    {/* Action Badge */}
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-xs border ${
                      isBoost
                        ? 'text-emerald-300 bg-emerald-950 border-emerald-600'
                        : isReduce
                        ? 'text-rose-300 bg-rose-950 border-rose-600'
                        : 'text-amber-300 bg-amber-950 border-amber-600'
                    }`}>
                      {isBoost ? `AUGMENTER (${fam.suggestedBudgetEvolution > 0 ? '+' : ''}${fam.suggestedBudgetEvolution}%)` : isReduce ? `RÉDUIRE (${fam.suggestedBudgetEvolution}%)` : 'MAINTENIR'}
                    </span>
                  </div>

                  {/* Sell-Through & Volume stats */}
                  <div className="grid grid-cols-2 gap-2 bg-zinc-900/60 p-2.5 rounded-xs border border-zinc-850 text-xs font-mono my-2.5">
                    <div>
                      <span className="text-[10px] text-zinc-500 uppercase block">Sell-Through FW25</span>
                      <span className={`font-bold text-sm ${isBoost ? 'text-emerald-400' : isReduce ? 'text-rose-400' : 'text-amber-400'}`}>
                        {fam.sellThrough}% STR
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-zinc-500 uppercase block">Stock Restant</span>
                      <span className="text-zinc-200 font-medium">{formatNumber(fam.stockQty)} u.</span>
                    </div>

                    <div className="pt-1.5 border-t border-zinc-800">
                      <span className="text-[10px] text-zinc-500 uppercase block">Achats FW25</span>
                      <span className="text-zinc-300">{formatNumber(fam.buyQty)} u.</span>
                    </div>

                    <div className="text-right pt-1.5 border-t border-zinc-800">
                      <span className="text-[10px] text-zinc-500 uppercase block">Achat Recommandé</span>
                      <span className="font-bold text-white">{formatNumber(fam.projectedBuyQty)} u.</span>
                    </div>
                  </div>

                  {/* Progress STR Bar */}
                  <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mb-2">
                    <div 
                      className={`h-full ${isBoost ? 'bg-emerald-400' : isReduce ? 'bg-rose-400' : 'bg-amber-400'}`}
                      style={{ width: `${Math.min(100, fam.sellThrough)}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-zinc-400 italic">
                    {fam.diagnostic}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-zinc-900 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span>Budget estimé :</span>
                  <span className="font-bold text-amber-400">{formatEuro(fam.projectedBuyValue)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Section: Granular SKU Level Ordering Plan */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-sm overflow-hidden">
        
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold font-display text-white">
              Plan d'Achats Détaillé par Référence (SKU)
            </h3>
            <span className="text-xs text-zinc-400 font-mono">
              Basé sur la vélocité individuelle et le stock résiduel
            </span>
          </div>

          {/* Filter by decision */}
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <button
              onClick={() => setStrategyFilter('all')}
              className={`px-2.5 py-1 rounded-xs transition-colors ${
                strategyFilter === 'all' ? 'bg-zinc-700 text-white font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Tous ({skuSimulations.length})
            </button>
            <button
              onClick={() => setStrategyFilter('boost')}
              className={`px-2.5 py-1 rounded-xs transition-colors ${
                strategyFilter === 'boost' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 font-semibold' : 'text-zinc-400 hover:text-emerald-300'
              }`}
            >
              À Augmenter ({totals.boostCount})
            </button>
            <button
              onClick={() => setStrategyFilter('stable')}
              className={`px-2.5 py-1 rounded-xs transition-colors ${
                strategyFilter === 'stable' ? 'bg-amber-950 text-amber-300 border border-amber-700 font-semibold' : 'text-zinc-400 hover:text-amber-300'
              }`}
            >
              À Reconduire ({totals.stableCount})
            </button>
            <button
              onClick={() => setStrategyFilter('reduce')}
              className={`px-2.5 py-1 rounded-xs transition-colors ${
                strategyFilter === 'reduce' ? 'bg-rose-950 text-rose-300 border border-rose-700 font-semibold' : 'text-zinc-400 hover:text-rose-300'
              }`}
            >
              À Réduire ({totals.reduceCount})
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 font-mono text-[11px] text-zinc-400 uppercase">
                <th className="py-2.5 px-3">Réf SKU</th>
                <th className="py-2.5 px-3">Nom Article</th>
                <th className="py-2.5 px-3">Famille</th>
                <th className="py-2.5 px-3 text-center">STR FW25 (%)</th>
                <th className="py-2.5 px-3 text-center">Recommandation Achat</th>
                <th className="py-2.5 px-3 text-right">Achats FW25 (U)</th>
                <th className="py-2.5 px-3 text-right">Ventes FW25 (U)</th>
                <th className="py-2.5 px-3 text-right">Stock (U)</th>
                <th className="py-2.5 px-3 text-right font-bold text-amber-400 bg-amber-950/20">Achat Cible (U)</th>
                <th className="py-2.5 px-3 text-right font-bold text-amber-400 bg-amber-950/20">Budget Achat (€)</th>
                <th className="py-2.5 px-3 text-right">Évolution Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
              {filteredSkuSimulations.map((row) => {
                const isBoost = row.actionTag === 'boost';
                const isReduce = row.actionTag === 'reduce';

                return (
                  <tr 
                    key={row.product.sku}
                    onClick={() => onSelectProduct(row.product)}
                    className="hover:bg-zinc-850/60 transition-colors cursor-pointer group"
                  >
                    <td className="py-2.5 px-3 font-bold text-amber-400">{row.product.sku}</td>
                    <td className="py-2.5 px-3 font-sans font-medium text-white truncate max-w-[190px] group-hover:text-amber-400 transition-colors">
                      {row.product.name}
                    </td>
                    <td className="py-2.5 px-3 text-zinc-400">{row.product.category}</td>
                    
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-xs font-bold ${
                        row.str >= 88 
                          ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-700/60'
                          : row.str < 75
                          ? 'text-rose-300 bg-rose-950/80 border border-rose-700/60'
                          : 'text-amber-300 bg-amber-950/80 border border-amber-700/60'
                      }`}>
                        {row.str}%
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xs text-[10px] font-bold ${
                        isBoost
                          ? 'text-emerald-300 bg-emerald-950 border border-emerald-700'
                          : isReduce
                          ? 'text-rose-300 bg-rose-950 border border-rose-700'
                          : 'text-zinc-300 bg-zinc-800'
                      }`}>
                        {isBoost ? <ArrowUpRight className="w-3 h-3" /> : isReduce ? <ArrowDownRight className="w-3 h-3" /> : null}
                        {isBoost ? 'AUGMENTER' : isReduce ? 'RÉDUIRE' : 'RECONDUIRE'}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-right tabular-nums text-zinc-400">{formatNumber(row.product.totalBuyQty)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-emerald-400 font-semibold">{formatNumber(row.product.totalSalesQty)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-zinc-400">{formatNumber(row.product.stockQty)}</td>
                    
                    <td className="py-2.5 px-3 text-right font-bold text-amber-400 bg-amber-950/10 tabular-nums">
                      {formatNumber(row.recommendedBuyQty)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-400 bg-amber-950/10">
                      {formatEuro(row.recommendedBuyValue)}
                    </td>
                    
                    <td className="py-2.5 px-3 text-right">
                      <span className={`inline-block px-1.5 py-0.5 rounded-xs text-[11px] font-bold ${
                        row.deltaPercent > 0 ? 'text-emerald-300 bg-emerald-950/60' : row.deltaPercent < 0 ? 'text-rose-300 bg-rose-950/60' : 'text-zinc-400'
                      }`}>
                        {row.deltaPercent > 0 ? '+' : ''}{row.deltaPercent}%
                      </span>
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
