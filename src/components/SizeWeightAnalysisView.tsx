import React, { useState, useMemo } from 'react';
import { 
  Ruler, 
  TrendingUp, 
  Scale, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  ArrowDownRight, 
  Sparkles, 
  Download, 
  Layers, 
  PieChart, 
  BarChart3, 
  Filter,
  Search,
  PackageCheck
} from 'lucide-react';
import { ProductItem, SportUniverse, Division, Gender } from '../types/merchandising';

interface SizeWeightAnalysisViewProps {
  products: ProductItem[];
  selectedProduct?: ProductItem | null;
  onSelectProduct: (product: ProductItem) => void;
}

type GranularityType = 'global' | 'division' | 'gender' | 'sport' | 'productType' | 'salesLine' | 'article';

interface AggregatedSizeRow {
  size: string;
  buyQty: number;
  buyShare: number; // in %
  salesQty: number;
  salesShare: number; // in %
  deltaShare: number; // salesShare - buyShare
  sellThroughRate: number; // %
  stockQty: number;
  recommendedShare: number; // in %
  diagnostic: 'underbought' | 'overbought' | 'balanced';
  diagnosticLabel: string;
}

export const SizeWeightAnalysisView: React.FC<SizeWeightAnalysisViewProps> = ({
  products,
  selectedProduct: initialSelected,
  onSelectProduct,
}) => {
  // Granularity selection
  const [granularity, setGranularity] = useState<GranularityType>('division');
  
  // Specific sub-filter for the active granularity
  const [selectedDivision, setSelectedDivision] = useState<string>('Footwear');
  const [selectedGender, setSelectedGender] = useState<string>('Men');
  const [selectedSport, setSelectedSport] = useState<string>('Originals');
  const [selectedProductType, setSelectedProductType] = useState<string>('all');
  const [selectedSalesLine, setSelectedSalesLine] = useState<string>('all');
  const [selectedSku, setSelectedSku] = useState<string>(initialSelected ? initialSelected.sku : products[0]?.sku || '');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Extract unique values for dynamic sub-selectors
  const uniqueDivisions = useMemo(() => Array.from(new Set(products.map((p) => p.division))).sort(), [products]);
  const uniqueGenders = useMemo(() => Array.from(new Set(products.map((p) => p.gender))).sort(), [products]);
  const uniqueSports = useMemo(() => Array.from(new Set(products.map((p) => p.sport))).sort(), [products]);
  const uniqueProductTypes = useMemo(() => Array.from(new Set(products.map((p) => p.productType).filter(Boolean))).sort(), [products]);
  const uniqueSalesLines = useMemo(() => Array.from(new Set(products.map((p) => p.salesLine).filter(Boolean))).sort(), [products]);

  // Filter products according to chosen granularity and sub-selection
  const targetProducts = useMemo(() => {
    switch (granularity) {
      case 'global':
        return products;
      case 'division':
        return products.filter((p) => p.division === selectedDivision);
      case 'gender':
        return products.filter((p) => p.gender === selectedGender);
      case 'sport':
        return products.filter((p) => p.sport === selectedSport);
      case 'productType':
        return selectedProductType === 'all' 
          ? products 
          : products.filter((p) => p.productType === selectedProductType);
      case 'salesLine':
        return selectedSalesLine === 'all' 
          ? products 
          : products.filter((p) => p.salesLine === selectedSalesLine);
      case 'article':
        return products.filter((p) => p.sku === selectedSku);
      default:
        return products;
    }
  }, [
    products, 
    granularity, 
    selectedDivision, 
    selectedGender, 
    selectedSport, 
    selectedProductType, 
    selectedSalesLine, 
    selectedSku
  ]);

  // Aggregate sizes and compute size weights (Poids Achats % vs Poids Ventes %)
  const sizeAnalysisData = useMemo(() => {
    const sizeMap: Record<string, { buyQty: number; salesQty: number }> = {};
    let totalBuys = 0;
    let totalSales = 0;

    targetProducts.forEach((p) => {
      p.sizes.forEach((s) => {
        if (!sizeMap[s.size]) {
          sizeMap[s.size] = { buyQty: 0, salesQty: 0 };
        }
        sizeMap[s.size].buyQty += s.buyQty;
        sizeMap[s.size].salesQty += s.salesQty;
        totalBuys += s.buyQty;
        totalSales += s.salesQty;
      });
    });

    const apparelOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];

    const rows: AggregatedSizeRow[] = Object.entries(sizeMap)
      .filter(([_, data]) => data.buyQty > 0 || data.salesQty > 0)
      .map(([size, data]) => {
      const buyShare = totalBuys > 0 ? (data.buyQty / totalBuys) * 100 : 0;
      const salesShare = totalSales > 0 ? (data.salesQty / totalSales) * 100 : 0;
      const deltaShare = Math.round((salesShare - buyShare) * 10) / 10;
      const sellThrough = data.buyQty > 0 ? Math.round((data.salesQty / data.buyQty) * 1000) / 10 : 0;
      const stock = Math.max(0, data.buyQty - data.salesQty);

      // Diagnostic rule:
      // If salesShare > buyShare + 1.5% and STR >= 85%: Underbought size
      // If salesShare < buyShare - 1.5% or STR <= 65%: Overbought size
      let diagnostic: 'underbought' | 'overbought' | 'balanced' = 'balanced';
      let diagnosticLabel = 'Poids Équilibré';

      if (deltaShare >= 1.5 && sellThrough >= 80) {
        diagnostic = 'underbought';
        diagnosticLabel = `Sous-pondéré (+${deltaShare}% d'écoulement)`;
      } else if (deltaShare <= -1.5 || sellThrough < 65) {
        diagnostic = 'overbought';
        diagnosticLabel = `Sur-pondéré (${deltaShare}% résiduel)`;
      }

      // Recommended share adjusts towards true customer demand (salesShare)
      const recommendedShare = Math.round((salesShare * 0.75 + buyShare * 0.25) * 10) / 10;

      return {
        size,
        buyQty: data.buyQty,
        buyShare: Math.round(buyShare * 10) / 10,
        salesQty: data.salesQty,
        salesShare: Math.round(salesShare * 10) / 10,
        deltaShare,
        sellThroughRate: sellThrough,
        stockQty: stock,
        recommendedShare,
        diagnostic,
        diagnosticLabel,
      };
    });

    // Helper to sort Adidas fractional sizes like 41 1/3, 44 2/3, 37 1/3
    const parseSizeToNum = (sizeStr: string): number => {
      const parts = sizeStr.trim().split(/\s+/);
      const base = parseFloat(parts[0]);
      if (isNaN(base)) return 9999;
      if (parts.length > 1) {
        if (parts[1] === '1/3') return base + 0.333;
        if (parts[1] === '1/2') return base + 0.5;
        if (parts[1] === '2/3') return base + 0.667;
        if (parts[1] === '3/4') return base + 0.75;
      }
      return base;
    };

    // Intelligent sorting: Apparel order or Adidas numerical fractions
    rows.sort((a, b) => {
      const idxA = apparelOrder.indexOf(a.size.toUpperCase());
      const idxB = apparelOrder.indexOf(b.size.toUpperCase());
      if (idxA !== -1 && idxB !== -1) {
        return idxA - idxB;
      }
      const numA = parseSizeToNum(a.size);
      const numB = parseSizeToNum(b.size);
      if (numA !== 9999 && numB !== 9999) {
        return numA - numB;
      }
      return a.size.localeCompare(b.size, undefined, { numeric: true, sensitivity: 'base' });
    });

    return {
      rows,
      totalBuys,
      totalSales,
      globalSTR: totalBuys > 0 ? Math.round((totalSales / totalBuys) * 1000) / 10 : 0,
    };
  }, [targetProducts]);

  // Max share for chart scaling
  const maxShare = useMemo(() => {
    if (sizeAnalysisData.rows.length === 0) return 25;
    return Math.max(...sizeAnalysisData.rows.map((r) => Math.max(r.buyShare, r.salesShare)), 15) * 1.15;
  }, [sizeAnalysisData]);

  // Max quantities for volume chart
  const maxQty = useMemo(() => {
    if (sizeAnalysisData.rows.length === 0) return 100;
    return Math.max(...sizeAnalysisData.rows.map((r) => Math.max(r.buyQty, r.salesQty)), 50) * 1.1;
  }, [sizeAnalysisData]);

  // Key highlights
  const bestSellingSize = useMemo(() => {
    if (sizeAnalysisData.rows.length === 0) return null;
    return [...sizeAnalysisData.rows].sort((a, b) => b.salesQty - a.salesQty)[0];
  }, [sizeAnalysisData]);

  const highestSTRSize = useMemo(() => {
    if (sizeAnalysisData.rows.length === 0) return null;
    return [...sizeAnalysisData.rows].sort((a, b) => b.sellThroughRate - a.sellThroughRate)[0];
  }, [sizeAnalysisData]);

  const underboughtSizes = useMemo(() => {
    return sizeAnalysisData.rows.filter((r) => r.diagnostic === 'underbought');
  }, [sizeAnalysisData]);

  const overboughtSizes = useMemo(() => {
    return sizeAnalysisData.rows.filter((r) => r.diagnostic === 'overbought');
  }, [sizeAnalysisData]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Taille',
      'Achats Quantité',
      'Poids Achats %',
      'Ventes Quantité',
      'Poids Ventes %',
      'Écart Poids (Delta %)',
      'Sell-Through %',
      'Stock Résiduel (U)',
      'Poids Recommandé FW26 %',
      'Diagnostic',
    ];

    const csvRows = [headers.join(';')];
    sizeAnalysisData.rows.forEach((r) => {
      csvRows.push([
        r.size,
        r.buyQty,
        `${r.buyShare}%`,
        r.salesQty,
        `${r.salesShare}%`,
        `${r.deltaShare > 0 ? '+' : ''}${r.deltaShare}%`,
        `${r.sellThroughRate}%`,
        r.stockQty,
        `${r.recommendedShare}%`,
        `"${r.diagnosticLabel}"`,
      ].join(';'));
    });

    const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Adidas_FW25_Poids_Tailles_${granularity}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatNumber = (val: number) => new Intl.NumberFormat('fr-FR').format(val);

  return (
    <div className="space-y-6">
      
      {/* Page Header and Context */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-400 text-black">
              <Scale className="w-3 h-3" />
              Courbe de Tailles &amp; Ratios
            </span>
            <span className="text-zinc-600">/</span>
            <span className="text-xs font-mono text-zinc-400">
              Analyses des Poids de Ventes et Achats à la Taille
            </span>
          </div>
          <h2 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
            Poids Achats vs Poids Ventes à la Taille
            <span className="text-xs font-normal text-zinc-400 bg-zinc-950 px-2.5 py-0.5 border border-zinc-800 rounded-xs">
              {targetProducts.length} article(s) analysé(s) &bull; {formatNumber(sizeAnalysisData.totalSales)} ventes totales
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Comparez le ratio d'engagement à l'achat (%) avec la demande réelle constatée en caisse (%). Identifiez les ruptures de tailles centrales et le surstockage des tailles extrêmes pour calibrer la grille FW26.
          </p>
        </div>

        {/* Export Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-zinc-950 hover:bg-zinc-850 text-zinc-200 border border-zinc-700/80 transition-colors rounded-xs shadow-sm"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Exporter Grille de Tailles CSV</span>
          </button>
        </div>
      </div>

      {/* Granularity Selector Bar */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-sm space-y-4">
        
        {/* Step 1: Granularity Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3.5">
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Granularité Partagée :</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'division', label: 'Division' },
              { id: 'sport', label: 'Sport Category' },
              { id: 'gender', label: 'Gender' },
              { id: 'productType', label: 'Product Type' },
              { id: 'salesLine', label: 'Sales Line' },
              { id: 'article', label: 'Article Unique (SKU)' },
              { id: 'global', label: 'Consolidé Global' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setGranularity(btn.id as GranularityType)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-all ${
                  granularity === btn.id
                    ? 'bg-amber-400 text-black font-semibold shadow-sm'
                    : 'bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-850 border border-zinc-800'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Dynamic Sub-Filters based on chosen granularity */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <span className="text-xs text-zinc-400 font-mono">Sélection :</span>

          {granularity === 'division' && (
            <div className="flex flex-wrap items-center gap-2">
              {uniqueDivisions.map((div) => (
                <button
                  key={div}
                  onClick={() => setSelectedDivision(div)}
                  className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                    selectedDivision === div
                      ? 'bg-zinc-100 text-black font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>
          )}

          {granularity === 'gender' && (
            <div className="flex flex-wrap items-center gap-2">
              {uniqueGenders.map((gen) => (
                <button
                  key={gen}
                  onClick={() => setSelectedGender(gen)}
                  className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                    selectedGender === gen
                      ? 'bg-zinc-100 text-black font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {gen}
                </button>
              ))}
            </div>
          )}

          {granularity === 'sport' && (
            <div className="flex flex-wrap items-center gap-2">
              {uniqueSports.map((sp) => (
                <button
                  key={sp}
                  onClick={() => setSelectedSport(sp)}
                  className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                    selectedSport === sp
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-500/50 font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {sp}
                </button>
              ))}
            </div>
          )}

          {granularity === 'productType' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedProductType('all')}
                className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                  selectedProductType === 'all'
                    ? 'bg-zinc-100 text-black font-bold'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                Tous types
              </button>
              {uniqueProductTypes.map((pt) => (
                <button
                  key={pt}
                  onClick={() => setSelectedProductType(pt)}
                  className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                    selectedProductType === pt
                      ? 'bg-zinc-100 text-black font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {pt}
                </button>
              ))}
            </div>
          )}

          {granularity === 'salesLine' && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setSelectedSalesLine('all')}
                className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                  selectedSalesLine === 'all'
                    ? 'bg-zinc-100 text-black font-bold'
                    : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                }`}
              >
                Toutes Sales Lines
              </button>
              {uniqueSalesLines.map((sl) => (
                <button
                  key={sl}
                  onClick={() => setSelectedSalesLine(sl)}
                  className={`px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                    selectedSalesLine === sl
                      ? 'bg-zinc-100 text-black font-bold'
                      : 'bg-zinc-950 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  {sl}
                </button>
              ))}
            </div>
          )}

          {granularity === 'article' && (
            <div className="flex-1 flex items-center gap-3 max-w-xl">
              <select
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs px-3 py-1.5 rounded-xs w-full focus:outline-none focus:border-amber-400 font-mono"
              >
                {products.map((p) => (
                  <option key={p.sku} value={p.sku}>
                    {p.sku} - {p.name} ({p.division} &bull; {p.sport} &bull; {p.productType})
                  </option>
                ))}
              </select>
            </div>
          )}

          {granularity === 'global' && (
            <span className="text-xs text-amber-400 font-medium bg-amber-400/10 px-2.5 py-1 rounded-xs border border-amber-400/20">
              Consolidation globale de toutes les grilles de tailles
            </span>
          )}
        </div>
      </div>

      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Volume Analysé</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {formatNumber(sizeAnalysisData.totalBuys)} <span className="text-xs font-normal text-zinc-400">Achats</span>
          </div>
          <div className="text-xs font-mono text-emerald-400 mt-1">
            {formatNumber(sizeAnalysisData.totalSales)} ventes ({sizeAnalysisData.globalSTR}% STR)
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Taille Reine (Best Volume)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {bestSellingSize ? (
              <>
                Taille <span className="text-amber-400">{bestSellingSize.size}</span>
              </>
            ) : (
              '-'
            )}
          </div>
          <div className="text-xs font-mono text-zinc-400 mt-1">
            {bestSellingSize ? `${bestSellingSize.salesShare}% du volume des ventes (${formatNumber(bestSellingSize.salesQty)} U)` : ''}
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Tension Maximale (Best STR)</span>
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-amber-300">
            {highestSTRSize ? `Taille ${highestSTRSize.size} (${highestSTRSize.sellThroughRate}%)` : '-'}
          </div>
          <div className="text-xs font-mono text-zinc-400 mt-1">
            {highestSTRSize && highestSTRSize.deltaShare > 0
              ? `Poids Ventes supérieur de +${highestSTRSize.deltaShare}% au poids achat`
              : 'Écoulement fluide'}
          </div>
        </div>

        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-sm">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
            <span>Alertes Distorsion Grille</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold font-mono text-white flex items-center gap-2">
            <span className="text-emerald-400">{underboughtSizes.length} sous-achetées</span>
            <span className="text-zinc-600">/</span>
            <span className="text-rose-400">{overboughtSizes.length} sur-achetées</span>
          </div>
          <div className="text-xs font-mono text-zinc-400 mt-1">
            Ajustements recommandés pour FW26
          </div>
        </div>
      </div>

      {/* Visual Chart 1: Poids Achats % vs Poids Ventes % per size */}
      <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <Scale className="w-4 h-4 text-amber-400" />
              Courbe Comparée des Poids de Tailles : Achats (%) vs Ventes (%)
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Si la barre verte (ventes) dépasse la barre dorée (achats), la taille a été sous-engagée et a généré des ruptures prématurées.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-amber-400 rounded-xs"></span>
              <span className="text-zinc-300">Poids Achats %</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-emerald-500 rounded-xs"></span>
              <span className="text-zinc-300">Poids Ventes %</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-1 bg-sky-400 rounded-full"></span>
              <span className="text-zinc-400">Poids Reco FW26</span>
            </div>
          </div>
        </div>

        {/* Visual Dual-Bar Graphic */}
        <div className="overflow-x-auto pb-4 pt-2">
          <div className="min-w-[650px] flex items-end gap-3 sm:gap-4 h-64 border-b border-zinc-800 px-2">
            {sizeAnalysisData.rows.map((row) => {
              const buyHeight = (row.buyShare / maxShare) * 100;
              const salesHeight = (row.salesShare / maxShare) * 100;
              const isUnderbought = row.diagnostic === 'underbought';
              const isOverbought = row.diagnostic === 'overbought';

              return (
                <div key={row.size} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  
                  {/* Tooltip Hover */}
                  <div className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-950 border border-zinc-700 p-2 rounded-xs text-[11px] font-mono whitespace-nowrap z-20 shadow-xl pointer-events-none">
                    <div className="font-bold text-white mb-0.5">Taille {row.size}</div>
                    <div className="text-amber-400">Poids Achat : {row.buyShare}% ({formatNumber(row.buyQty)} U)</div>
                    <div className="text-emerald-400">Poids Vente : {row.salesShare}% ({formatNumber(row.salesQty)} U)</div>
                    <div className="text-zinc-300">Sell-Through : {row.sellThroughRate}%</div>
                    <div className="text-sky-300 font-semibold">Cible FW26 : {row.recommendedShare}%</div>
                  </div>

                  {/* Top delta indicator */}
                  <div className="text-[10px] font-mono font-bold mb-1">
                    {row.deltaShare > 0 ? (
                      <span className="text-emerald-400">+{row.deltaShare}%</span>
                    ) : row.deltaShare < 0 ? (
                      <span className="text-rose-400">{row.deltaShare}%</span>
                    ) : (
                      <span className="text-zinc-500">0%</span>
                    )}
                  </div>

                  {/* Dual Bar Container */}
                  <div className="w-full flex items-end justify-center gap-1.5 h-44 relative">
                    {/* Buy Share Bar */}
                    <div
                      style={{ height: `${Math.max(buyHeight, 4)}%` }}
                      className="w-1/2 bg-amber-400/80 group-hover:bg-amber-400 transition-all rounded-t-xs relative"
                    >
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-zinc-400 group-hover:text-white">
                        {row.buyShare}%
                      </span>
                    </div>

                    {/* Sales Share Bar */}
                    <div
                      style={{ height: `${Math.max(salesHeight, 4)}%` }}
                      className={`w-1/2 transition-all rounded-t-xs relative ${
                        isUnderbought 
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]' 
                          : isOverbought 
                          ? 'bg-rose-400/80' 
                          : 'bg-emerald-500/80 group-hover:bg-emerald-400'
                      }`}
                    >
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] font-mono text-emerald-300 font-bold">
                        {row.salesShare}%
                      </span>
                    </div>
                  </div>

                  {/* Size Label */}
                  <div className="mt-2.5 pt-1.5 border-t border-zinc-800 w-full text-center">
                    <span className="text-xs font-mono font-bold text-zinc-200 group-hover:text-amber-400">
                      {row.size}
                    </span>
                    <div className="text-[10px] font-mono text-zinc-500">
                      {row.sellThroughRate}% STR
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Comprehensive Size Weight Table with FW26 Rebalancing Matrix */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-950/60">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-emerald-400" />
              Matrice Complète des Ratios &amp; Recommandation Grille de Taille
            </h3>
            <span className="text-xs text-zinc-400">
              Détail unité par unité &bull; Poids Achats vs Ventes &bull; Diagnostic d'arbitrage
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className="inline-flex items-center gap-1 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Sous-acheté
            </span>
            <span className="inline-flex items-center gap-1 text-amber-300">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Équilibré
            </span>
            <span className="inline-flex items-center gap-1 text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span> Sur-acheté
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950 font-mono text-[11px] text-zinc-400 uppercase">
                <th className="py-3 px-4">Taille / Pointure</th>
                <th className="py-3 px-3 text-right">Achats (Qté)</th>
                <th className="py-3 px-3 text-right text-amber-400 font-semibold">Poids Achats %</th>
                <th className="py-3 px-3 text-right text-emerald-400">Ventes (Qté)</th>
                <th className="py-3 px-3 text-right text-emerald-400 font-semibold">Poids Ventes %</th>
                <th className="py-3 px-3 text-right">Écart (Δ %)</th>
                <th className="py-3 px-3 text-center">Sell-Through %</th>
                <th className="py-3 px-3 text-right">Stock Résiduel</th>
                <th className="py-3 px-3 text-right text-sky-400 font-bold">Cible Grille FW26 %</th>
                <th className="py-3 px-4 text-left">Diagnostic Marché</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
              {sizeAnalysisData.rows.map((row) => (
                <tr key={row.size} className="hover:bg-zinc-850/60 transition-colors">
                  
                  {/* Size */}
                  <td className="py-3 px-4 font-bold text-white text-sm">
                    {row.size}
                  </td>

                  {/* Buy Qty */}
                  <td className="py-3 px-3 text-right tabular-nums text-zinc-400">
                    {formatNumber(row.buyQty)}
                  </td>

                  {/* Buy Share */}
                  <td className="py-3 px-3 text-right tabular-nums font-semibold text-amber-400">
                    {row.buyShare}%
                  </td>

                  {/* Sales Qty */}
                  <td className="py-3 px-3 text-right tabular-nums font-semibold text-emerald-400">
                    {formatNumber(row.salesQty)}
                  </td>

                  {/* Sales Share */}
                  <td className="py-3 px-3 text-right tabular-nums font-bold text-emerald-400">
                    {row.salesShare}%
                  </td>

                  {/* Delta Share */}
                  <td className="py-3 px-3 text-right tabular-nums">
                    {row.deltaShare > 0 ? (
                      <span className="text-emerald-400 font-bold flex items-center justify-end gap-0.5">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        +{row.deltaShare}%
                      </span>
                    ) : row.deltaShare < 0 ? (
                      <span className="text-rose-400 font-bold flex items-center justify-end gap-0.5">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        {row.deltaShare}%
                      </span>
                    ) : (
                      <span className="text-zinc-500">0.0%</span>
                    )}
                  </td>

                  {/* Sell-Through */}
                  <td className="py-3 px-3 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-xs font-bold text-xs ${
                      row.sellThroughRate >= 85
                        ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                        : row.sellThroughRate <= 65
                        ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                        : 'bg-zinc-950 text-zinc-300 border border-zinc-800'
                    }`}>
                      {row.sellThroughRate}%
                    </span>
                  </td>

                  {/* Stock */}
                  <td className="py-3 px-3 text-right tabular-nums text-zinc-400">
                    {formatNumber(row.stockQty)}
                  </td>

                  {/* Recommended Target Share FW26 */}
                  <td className="py-3 px-3 text-right tabular-nums font-bold text-sky-400 bg-sky-950/20">
                    {row.recommendedShare}%
                  </td>

                  {/* Diagnostic */}
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-[11px] font-medium font-sans ${
                      row.diagnostic === 'underbought'
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                        : row.diagnostic === 'overbought'
                        ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                        : 'bg-zinc-950 text-zinc-400 border border-zinc-800'
                    }`}>
                      {row.diagnostic === 'underbought' && <ArrowUpRight className="w-3 h-3 text-emerald-400" />}
                      {row.diagnostic === 'overbought' && <ArrowDownRight className="w-3 h-3 text-rose-400" />}
                      {row.diagnostic === 'balanced' && <CheckCircle2 className="w-3 h-3 text-zinc-400" />}
                      <span>{row.diagnosticLabel}</span>
                    </span>
                  </td>

                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-700 bg-zinc-950 font-mono text-xs font-bold text-white">
                <td className="py-3 px-4">TOTAL / MOYENNE</td>
                <td className="py-3 px-3 text-right">{formatNumber(sizeAnalysisData.totalBuys)}</td>
                <td className="py-3 px-3 text-right text-amber-400">100.0%</td>
                <td className="py-3 px-3 text-right text-emerald-400">{formatNumber(sizeAnalysisData.totalSales)}</td>
                <td className="py-3 px-3 text-right text-emerald-400">100.0%</td>
                <td className="py-3 px-3 text-right text-zinc-400">-</td>
                <td className="py-3 px-3 text-center text-amber-300">{sizeAnalysisData.globalSTR}% STR</td>
                <td className="py-3 px-3 text-right">
                  {formatNumber(Math.max(0, sizeAnalysisData.totalBuys - sizeAnalysisData.totalSales))}
                </td>
                <td className="py-3 px-3 text-right text-sky-400 bg-sky-950/20">100.0%</td>
                <td className="py-3 px-4 text-xs font-normal text-zinc-400 font-sans">
                  Grille normalisée FW26
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Buying Session Recommendation Box */}
      <div className="bg-gradient-to-r from-amber-950/30 via-zinc-900 to-zinc-900 border border-amber-500/30 p-5 rounded-sm">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-400/10 border border-amber-400/30 rounded-xs text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
              Conseils d'arbitrage pour vos sessions d'achats FW25 / FW26
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-xs text-zinc-300">
              <div className="bg-zinc-950/80 p-3 rounded-xs border border-zinc-800">
                <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1">
                  <ArrowUpRight className="w-4 h-4" />
                  Renforcer le cœur de gamme
                </div>
                <p className="text-zinc-400">
                  Les pointures centrales avec un écart positif (&Delta; &gt; +1.5%) ont souffert de ruptures. Augmentez leur quota d'achat selon la colonne « Cible Grille FW26 ».
                </p>
              </div>

              <div className="bg-zinc-950/80 p-3 rounded-xs border border-zinc-800">
                <div className="text-rose-400 font-bold mb-1 flex items-center gap-1">
                  <ArrowDownRight className="w-4 h-4" />
                  Sécuriser les extrêmes
                </div>
                <p className="text-zinc-400">
                  Les tailles avec un &Delta; négatif (&Delta; &lt; -1.5%) concentrent l'essentiel du stock résiduel. Réduisez leur poids pour préserver votre marge brute et éviter les soldes forcées.
                </p>
              </div>

              <div className="bg-zinc-950/80 p-3 rounded-xs border border-zinc-800">
                <div className="text-amber-400 font-bold mb-1 flex items-center gap-1">
                  <Scale className="w-4 h-4" />
                  Consistance inter-divisions
                </div>
                <p className="text-zinc-400">
                  Veillez à respecter les profils morphologiques spécifiques par Sport Category (le ratio Running diffère sensiblement du Lifestyle Originals).
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
