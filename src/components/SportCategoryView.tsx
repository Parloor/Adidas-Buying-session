import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  TrendingUp, 
  Package, 
  Users,
  Flame, 
  Snowflake, 
  Scale, 
  Sparkles,
  ArrowRight,
  Filter,
  Globe,
  PieChart,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Search,
  AlertTriangle,
  Eye,
  Ruler
} from 'lucide-react';
import { ProductItem } from '../types/merchandising';
import { formatCurrency } from '../utils/csvParser';
import { 
  buildPivotTable, 
  computeDatasetTotals, 
  getSanitizedAgeGroup, 
  getTopArticles, 
  getFlopArticles,
  calculateFlopScore,
  PivotMetricRow,
  PivotTotals
} from '../utils/pivotEngine';

interface SportCategoryViewProps {
  products: ProductItem[];
  allProducts?: ProductItem[]; // Entire catalogue to compute global weights
  initialSport?: string;
  onSportChange?: (sport: string) => void;
  onSelectProduct: (product: ProductItem) => void;
  onNavigateToSizes: (product?: ProductItem) => void;
}

type SortField = 
  | 'name' 
  | 'buyValue' 
  | 'salesValue' 
  | 'buyValueShare' 
  | 'salesValueShare' 
  | 'globalBuyValueShare' 
  | 'globalSalesValueShare' 
  | 'globalDeltaValueShare' 
  | 'sellThroughRate' 
  | 'stockQty'
  | 'stockValue';

interface SectionSortState {
  field: SortField;
  order: 'asc' | 'desc';
}

export const SportCategoryView: React.FC<SportCategoryViewProps> = ({
  products,
  allProducts = [],
  initialSport,
  onSportChange,
  onSelectProduct,
  onNavigateToSizes,
}) => {
  // Global Catalogue Totals across entire dataset
  const globalTotals: PivotTotals = useMemo(() => {
    const dataset = allProducts && allProducts.length > 0 ? allProducts : products;
    return computeDatasetTotals(dataset);
  }, [allProducts, products]);

  // Available Sports across catalogue
  const availableSports = useMemo(() => {
    const dataset = allProducts && allProducts.length > 0 ? allProducts : products;
    return Array.from(new Set(dataset.map((p) => p.sport))).filter(Boolean).sort();
  }, [allProducts, products]);

  const [activeSport, setActiveSport] = useState<string>(() => {
    if (initialSport) {
      if (initialSport === 'all') return 'all';
      if (products.some((p) => p.sport === initialSport) || availableSports.includes(initialSport)) {
        return initialSport;
      }
    }
    return 'all';
  });

  // Keep activeSport in sync when initialSport changes from outside
  React.useEffect(() => {
    if (initialSport) {
      setActiveSport(initialSport);
    }
  }, [initialSport]);

  const handleSelectSport = (sp: string) => {
    setActiveSport(sp);
    if (onSportChange) {
      onSportChange(sp);
    }
    // Reset secondary filters when switching sport
    setSelectedDivisionFilter('all');
    setSelectedAgeGroupFilter('all');
    setSelectedGenderFilter('all');
    setSelectedProductTypeFilter('all');
    setSelectedSalesLineFilter('all');
  };

  // If activeSport is not 'all' and not in availableSports, resolve it safely
  const resolvedSport = useMemo(() => {
    if (activeSport === 'all') return 'all';
    if (availableSports.includes(activeSport)) return activeSport;
    return 'all';
  }, [availableSports, activeSport]);

  // In-page interactive cascading sub-filters:
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState<string>('all');
  const [selectedAgeGroupFilter, setSelectedAgeGroupFilter] = useState<string>('all');
  const [selectedGenderFilter, setSelectedGenderFilter] = useState<string>('all');
  const [selectedProductTypeFilter, setSelectedProductTypeFilter] = useState<string>('all');
  const [selectedSalesLineFilter, setSelectedSalesLineFilter] = useState<string>('all');

  // Top & Flop 30 articles display mode
  const [rankingTab, setRankingTab] = useState<'top30' | 'flop30' | 'both'>('top30');
  const [articleSearchQuery, setArticleSearchQuery] = useState<string>('');

  // Sort state per breakdown section:
  const [sortStates, setSortStates] = useState<Record<string, SectionSortState>>({
    division: { field: 'salesValue', order: 'desc' },
    ageGroup: { field: 'salesValue', order: 'desc' },
    gender: { field: 'salesValue', order: 'desc' },
    productType: { field: 'salesValue', order: 'desc' },
    salesLine: { field: 'salesValue', order: 'desc' },
  });

  const handleHeaderSort = (sectionKey: string, field: SortField) => {
    setSortStates((prev) => {
      const current = prev[sectionKey] || { field: 'salesValue', order: 'desc' };
      if (current.field === field) {
        return {
          ...prev,
          [sectionKey]: {
            field,
            order: current.order === 'desc' ? 'asc' : 'desc',
          },
        };
      }
      return {
        ...prev,
        [sectionKey]: {
          field,
          order: 'desc',
        },
      };
    });
  };

  // Base products for the sport with active sub-filters
  const sportProducts = useMemo(() => {
    return products.filter((p) => {
      if (resolvedSport !== 'all' && p.sport !== resolvedSport) return false;
      if (selectedDivisionFilter !== 'all' && p.division !== selectedDivisionFilter) return false;
      if (selectedAgeGroupFilter !== 'all' && getSanitizedAgeGroup(p) !== selectedAgeGroupFilter) return false;
      if (selectedGenderFilter !== 'all' && p.gender !== selectedGenderFilter) return false;
      if (selectedProductTypeFilter !== 'all' && p.productType !== selectedProductTypeFilter) return false;
      if (selectedSalesLineFilter !== 'all' && p.salesLine !== selectedSalesLineFilter) return false;
      return true;
    });
  }, [
    products, 
    resolvedSport, 
    selectedDivisionFilter, 
    selectedAgeGroupFilter, 
    selectedGenderFilter,
    selectedProductTypeFilter,
    selectedSalesLineFilter
  ]);

  // Overall totals for the active sport selection
  const sportTotals: PivotTotals & { globalSportBuyShare: number; globalSportSalesShare: number } = useMemo(() => {
    const totals = computeDatasetTotals(sportProducts);

    // Weight of this entire sport relative to the global catalogue
    const globalSportBuyShare = globalTotals.buyValue > 0 ? Math.round((totals.buyValue / globalTotals.buyValue) * 1000) / 10 : 0;
    const globalSportSalesShare = globalTotals.salesValue > 0 ? Math.round((totals.salesValue / globalTotals.salesValue) * 1000) / 10 : 0;

    return { 
      ...totals,
      globalSportBuyShare,
      globalSportSalesShare
    };
  }, [sportProducts, globalTotals]);

  // Available cascading filter options with strictly non-empty data
  const sportAvailableDivisions = useMemo(() => {
    const list = products.filter((p) => resolvedSport === 'all' || p.sport === resolvedSport);
    return Array.from(new Set(list.map((p) => p.division))).filter(Boolean).sort();
  }, [products, resolvedSport]);

  const sportAvailableAgeGroups = useMemo(() => {
    const list = products.filter((p) => {
      if (resolvedSport !== 'all' && p.sport !== resolvedSport) return false;
      if (selectedDivisionFilter !== 'all' && p.division !== selectedDivisionFilter) return false;
      return true;
    });
    return Array.from(new Set(list.map(getSanitizedAgeGroup))).filter(Boolean).sort();
  }, [products, resolvedSport, selectedDivisionFilter]);

  const sportAvailableGenders = useMemo(() => {
    const list = products.filter((p) => {
      if (resolvedSport !== 'all' && p.sport !== resolvedSport) return false;
      if (selectedDivisionFilter !== 'all' && p.division !== selectedDivisionFilter) return false;
      if (selectedAgeGroupFilter !== 'all' && getSanitizedAgeGroup(p) !== selectedAgeGroupFilter) return false;
      return true;
    });
    return Array.from(new Set(list.map((p) => p.gender))).filter(Boolean).sort();
  }, [products, resolvedSport, selectedDivisionFilter, selectedAgeGroupFilter]);

  // 1. > DIVISIONS PIVOT TABLE
  const rawDivisionData = useMemo(() => {
    return buildPivotTable(sportProducts, (p) => p.division || 'Footwear', sportTotals, globalTotals);
  }, [sportProducts, sportTotals, globalTotals]);

  // 2. > AGE GROUP PIVOT TABLE (ADULT, JUNIOR, KIDS)
  const rawAgeGroupData = useMemo(() => {
    return buildPivotTable(sportProducts, getSanitizedAgeGroup, sportTotals, globalTotals);
  }, [sportProducts, sportTotals, globalTotals]);

  // 3. > GENDER PIVOT TABLE (Men, Women, Unisex, Kids)
  const rawGenderData = useMemo(() => {
    return buildPivotTable(sportProducts, (p) => p.gender || 'Unisex', sportTotals, globalTotals);
  }, [sportProducts, sportTotals, globalTotals]);

  // 4. > PRODUCT TYPE PIVOT TABLE
  const rawProductTypeData = useMemo(() => {
    return buildPivotTable(sportProducts, (p) => p.productType || 'Autre', sportTotals, globalTotals);
  }, [sportProducts, sportTotals, globalTotals]);

  // 5. > SALES LINE PIVOT TABLE
  const rawSalesLineData = useMemo(() => {
    return buildPivotTable(sportProducts, (p) => p.salesLine || 'Gamme Générale', sportTotals, globalTotals);
  }, [sportProducts, sportTotals, globalTotals]);

  // Helper to sort pivot rows according to section's sortState
  const sortPivotRows = (rows: PivotMetricRow[], sectionKey: string): PivotMetricRow[] => {
    const sort = sortStates[sectionKey] || { field: 'salesValue', order: 'desc' };
    return [...rows].sort((a, b) => {
      let valA: string | number = 0;
      let valB: string | number = 0;

      switch (sort.field) {
        case 'name':
          return sort.order === 'asc' 
            ? a.name.localeCompare(b.name, 'fr', { numeric: true }) 
            : b.name.localeCompare(a.name, 'fr', { numeric: true });
        case 'buyValue':
          valA = a.buyValue; valB = b.buyValue; break;
        case 'salesValue':
          valA = a.salesValue; valB = b.salesValue; break;
        case 'buyValueShare':
          valA = a.buyValueShare; valB = b.buyValueShare; break;
        case 'salesValueShare':
          valA = a.salesValueShare; valB = b.salesValueShare; break;
        case 'globalBuyValueShare':
          valA = a.globalBuyValueShare; valB = b.globalBuyValueShare; break;
        case 'globalSalesValueShare':
          valA = a.globalSalesValueShare; valB = b.globalSalesValueShare; break;
        case 'globalDeltaValueShare':
          valA = a.globalDeltaValueShare; valB = b.globalDeltaValueShare; break;
        case 'sellThroughRate':
          valA = a.sellThroughRate; valB = b.sellThroughRate; break;
        case 'stockQty':
          valA = a.stockQty; valB = b.stockQty; break;
        case 'stockValue':
          valA = a.stockValue; valB = b.stockValue; break;
        default:
          valA = a.salesValue; valB = b.salesValue;
      }

      return sort.order === 'asc' ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });
  };

  const divisionData = useMemo(() => sortPivotRows(rawDivisionData, 'division'), [rawDivisionData, sortStates.division]);
  const ageGroupData = useMemo(() => sortPivotRows(rawAgeGroupData, 'ageGroup'), [rawAgeGroupData, sortStates.ageGroup]);
  const genderData = useMemo(() => sortPivotRows(rawGenderData, 'gender'), [rawGenderData, sortStates.gender]);
  const productTypeData = useMemo(() => sortPivotRows(rawProductTypeData, 'productType'), [rawProductTypeData, sortStates.productType]);
  const salesLineData = useMemo(() => sortPivotRows(rawSalesLineData, 'salesLine'), [rawSalesLineData, sortStates.salesLine]);

  // 6. > TOP 30 ET FLOP 30 ARTICLES (Classés selon les règles exactes)
  // Top 30: Sales Value (Turnover CA)
  const top30Articles = useMemo(() => {
    return getTopArticles(sportProducts, 30);
  }, [sportProducts]);

  // Flop 30: "selon la valeur des stocks et le sell thru (plus faibles sell thru et plus grande image des stocks)"
  const flop30Articles = useMemo(() => {
    return getFlopArticles(sportProducts, 30);
  }, [sportProducts]);

  // Filtered Top/Flop articles with quick search
  const filteredTop30 = useMemo(() => {
    if (!articleSearchQuery.trim()) return top30Articles;
    const q = articleSearchQuery.toLowerCase().trim();
    return top30Articles.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [top30Articles, articleSearchQuery]);

  const filteredFlop30 = useMemo(() => {
    if (!articleSearchQuery.trim()) return flop30Articles;
    const q = articleSearchQuery.toLowerCase().trim();
    return flop30Articles.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  }, [flop30Articles, articleSearchQuery]);

  const formatNumber = (val: number) => new Intl.NumberFormat('fr-FR').format(val);

  // Helper to handle clicking on segment name for instant filtering
  const handleSegmentClick = (sectionKey: string, segmentName: string) => {
    if (sectionKey === 'division') {
      setSelectedDivisionFilter((prev) => prev === segmentName ? 'all' : segmentName);
    } else if (sectionKey === 'ageGroup') {
      setSelectedAgeGroupFilter((prev) => prev === segmentName ? 'all' : segmentName);
    } else if (sectionKey === 'gender') {
      setSelectedGenderFilter((prev) => prev === segmentName ? 'all' : segmentName);
    } else if (sectionKey === 'productType') {
      setSelectedProductTypeFilter((prev) => prev === segmentName ? 'all' : segmentName);
    } else if (sectionKey === 'salesLine') {
      setSelectedSalesLineFilter((prev) => prev === segmentName ? 'all' : segmentName);
    }
  };

  const isSegmentActive = (sectionKey: string, segmentName: string): boolean => {
    if (sectionKey === 'division') return selectedDivisionFilter === segmentName;
    if (sectionKey === 'ageGroup') return selectedAgeGroupFilter === segmentName;
    if (sectionKey === 'gender') return selectedGenderFilter === segmentName;
    if (sectionKey === 'productType') return selectedProductTypeFilter === segmentName;
    if (sectionKey === 'salesLine') return selectedSalesLineFilter === segmentName;
    return false;
  };

  // Reusable Dual-Bar and Table renderer with interactive clickable headers for sorting & filtering
  const renderSection = (
    sectionKey: string,
    title: string,
    subtitle: string,
    rows: PivotMetricRow[],
    icon: React.ReactNode,
    activeFilterValue?: string,
    onResetFilter?: () => void
  ) => {
    if (rows.length === 0) {
      return null;
    }

    const sort = sortStates[sectionKey] || { field: 'salesValue', order: 'desc' };
    const maxIntraShare = Math.max(...rows.map((r) => Math.max(r.buyValueShare, r.salesValueShare)), 10) * 1.05;

    const renderSortHeader = (label: string, field: SortField, align: 'left' | 'right' | 'center' = 'right', extraClass: string = '') => {
      const isSorted = sort.field === field;
      return (
        <th 
          onClick={() => handleHeaderSort(sectionKey, field)}
          className={`py-2.5 px-3 select-none cursor-pointer hover:bg-zinc-800 transition-colors ${
            align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right'
          } ${extraClass}`}
          title={`Cliquer pour trier par ${label}`}
        >
          <div className={`inline-flex items-center gap-1 font-mono uppercase text-[11px] ${
            isSorted ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
          }`}>
            <span>{label}</span>
            {isSorted ? (
              sort.order === 'desc' ? (
                <ArrowDown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <ArrowUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              )
            ) : (
              <ArrowUpDown className="w-3 h-3 text-zinc-600 opacity-60 hover:opacity-100 shrink-0" />
            )}
          </div>
        </th>
      );
    };

    return (
      <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-sm space-y-4">
        
        {/* Header with Title and Legend */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
                {icon}
                <span>{title}</span>
                <span className="text-xs font-normal text-zinc-400 font-sans">
                  ({rows.length} {rows.length === 1 ? 'segment' : 'segments'})
                </span>
              </h3>

              {activeFilterValue && activeFilterValue !== 'all' && (
                <span className="inline-flex items-center gap-1 bg-amber-400/20 text-amber-400 text-[10px] font-mono px-2 py-0.5 rounded-xs border border-amber-400/40">
                  <Filter className="w-2.5 h-2.5" />
                  Filtre actif : {activeFilterValue}
                  {onResetFilter && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); onResetFilter(); }}
                      className="hover:text-white ml-0.5"
                      title="Enlever ce filtre"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {subtitle} • <span className="text-amber-400/90">Cliquez sur un en-tête pour trier, ou sur un segment pour filtrer</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <span className="w-2.5 h-2.5 bg-amber-400 rounded-xs"></span> Poids Achat Val (%)
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs"></span> Poids Vente Val (%)
            </span>
            <span className="flex items-center gap-1.5 text-cyan-400 text-[11px]">
              <Globe className="w-3 h-3 text-cyan-400" /> Poids Global (%)
            </span>
          </div>
        </div>

        {/* Dual Bars List with Intra & Global Percentages */}
        <div className="space-y-3 pt-1">
          {rows.map((r) => {
            const buyWidth = maxIntraShare > 0 ? (r.buyValueShare / maxIntraShare) * 100 : 0;
            const salesWidth = maxIntraShare > 0 ? (r.salesValueShare / maxIntraShare) * 100 : 0;
            const isSelected = isSegmentActive(sectionKey, r.name);

            return (
              <div 
                key={r.name} 
                className={`p-3.5 rounded-xs border transition-colors space-y-2.5 ${
                  isSelected 
                    ? 'bg-amber-950/20 border-amber-500/60 shadow-xs' 
                    : 'bg-zinc-950/70 border-zinc-850 hover:border-zinc-700'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSegmentClick(sectionKey, r.name)}
                      className="font-bold text-white font-sans text-sm tracking-wide hover:text-amber-400 flex items-center gap-1.5 transition-colors group"
                      title={`Cliquer pour filtrer uniquement sur ${r.name}`}
                    >
                      <span>{r.name}</span>
                      <Filter className={`w-3 h-3 transition-opacity ${isSelected ? 'text-amber-400 opacity-100' : 'text-zinc-500 opacity-0 group-hover:opacity-100'}`} />
                    </button>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-xs bg-zinc-900 text-zinc-400 border border-zinc-800">
                      STR: <strong className={r.sellThroughRate >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{r.sellThroughRate}%</strong>
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      ({r.count} réf.)
                    </span>
                  </div>

                  {/* Dual Weights Comparison Strip */}
                  <div className="flex flex-wrap items-center gap-2.5 font-mono text-[11px]">
                    <div className="bg-zinc-900/90 px-2 py-0.5 rounded-xs border border-zinc-800 flex items-center gap-2">
                      <span className="text-zinc-400 font-sans text-[10px]">Dans {resolvedSport} :</span>
                      <span className="text-amber-400 font-bold">{r.buyValueShare}% Ach.</span>
                      <span className="text-zinc-600">vs</span>
                      <span className="text-emerald-400 font-bold">{r.salesValueShare}% Vte</span>
                    </div>

                    <div className="bg-cyan-950/40 px-2 py-0.5 rounded-xs border border-cyan-800/40 flex items-center gap-2 text-cyan-300">
                      <Globe className="w-3 h-3 text-cyan-400" />
                      <span className="text-[10px] text-cyan-400 font-sans">Au Global :</span>
                      <span className="font-bold text-amber-300">{r.globalBuyValueShare}% Ach.</span>
                      <span className="text-cyan-600">vs</span>
                      <span className="font-bold text-emerald-300">{r.globalSalesValueShare}% Vte</span>
                      <span className={r.globalDeltaValueShare >= 0 ? 'text-emerald-400 font-semibold text-[10px]' : 'text-rose-400 font-semibold text-[10px]'}>
                        ({r.globalDeltaValueShare >= 0 ? `+${r.globalDeltaValueShare}` : r.globalDeltaValueShare}%)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Paired Dual Visual Bars Relative to Value Shares */}
                <div className="space-y-1.5">
                  {/* Achats Bar */}
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[10px] font-mono text-amber-400 font-semibold">Achat Val</span>
                    <div className="flex-1 bg-zinc-900 h-4 rounded-xs overflow-hidden flex items-center relative">
                      <div 
                        style={{ width: `${Math.max(buyWidth, 2)}%` }} 
                        className="bg-amber-400 h-full rounded-xs transition-all flex items-center justify-between px-1.5"
                      >
                        {buyWidth > 20 && (
                          <span className="text-[9px] font-mono text-black font-extrabold truncate">
                            {r.buyValueShare}% ({r.globalBuyValueShare}% glob.)
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="w-36 text-right font-mono text-[10px] text-zinc-300">
                      {formatCurrency(r.buyValue)} <span className="text-[9px] text-zinc-500">({formatNumber(r.buyQty)} u.)</span>
                    </span>
                  </div>

                  {/* Ventes Bar */}
                  <div className="flex items-center gap-2">
                    <span className="w-16 text-[10px] font-mono text-emerald-400 font-semibold">Vente Val</span>
                    <div className="flex-1 bg-zinc-900 h-4 rounded-xs overflow-hidden flex items-center relative">
                      <div 
                        style={{ width: `${Math.max(salesWidth, 2)}%` }} 
                        className="bg-emerald-500 h-full rounded-xs transition-all flex items-center justify-between px-1.5"
                      >
                        {salesWidth > 20 && (
                          <span className="text-[9px] font-mono text-black font-extrabold truncate">
                            {r.salesValueShare}% ({r.globalSalesValueShare}% glob.)
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="w-36 text-right font-mono text-[10px] text-emerald-400 font-semibold">
                      {formatCurrency(r.salesValue)} <span className="text-[9px] text-zinc-500">({formatNumber(r.salesQty)} u.)</span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Interactive Comparative Table with Clickable Sort Headers & Filter Activation */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 font-mono text-[11px] uppercase">
                {renderSortHeader('Segment / Filtre', 'name', 'left', 'w-48')}
                {renderSortHeader('Achats Val', 'buyValue', 'right', 'text-amber-400')}
                {renderSortHeader('Ventes CA', 'salesValue', 'right', 'text-emerald-400')}
                {renderSortHeader('Poids Achats Intra %', 'buyValueShare', 'right', 'text-amber-400')}
                {renderSortHeader('Poids Ventes Intra %', 'salesValueShare', 'right', 'text-emerald-400')}
                {renderSortHeader('Achats Global %', 'globalBuyValueShare', 'right', 'text-cyan-400')}
                {renderSortHeader('Ventes Global %', 'globalSalesValueShare', 'right', 'text-cyan-400')}
                {renderSortHeader('Écart Global Δ', 'globalDeltaValueShare', 'center', 'text-cyan-300')}
                {renderSortHeader('STR %', 'sellThroughRate', 'center')}
                {renderSortHeader('Stock (U)', 'stockQty', 'right')}
                {renderSortHeader('Stock Val', 'stockValue', 'right')}
                <th className="py-2.5 px-3 text-center text-zinc-500">Filtrer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850 font-mono text-zinc-300">
              {rows.map((row) => {
                const isSelected = isSegmentActive(sectionKey, row.name);

                return (
                  <tr 
                    key={row.name} 
                    onClick={() => handleSegmentClick(sectionKey, row.name)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-amber-950/30 text-white font-medium hover:bg-amber-950/40' 
                        : 'hover:bg-zinc-800/50'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-bold font-sans text-white flex items-center gap-2">
                      <span className={isSelected ? 'text-amber-400 font-extrabold' : ''}>{row.name}</span>
                      {isSelected && (
                        <span className="text-[9px] font-mono bg-amber-400 text-black px-1.5 py-0.2 rounded-xs font-bold uppercase">
                          Actif
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-amber-400 font-semibold">{formatCurrency(row.buyValue)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-emerald-400 font-semibold">{formatCurrency(row.salesValue)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold text-amber-400">{row.buyValueShare}%</td>
                    <td className="py-2.5 px-3 text-right tabular-nums font-bold text-emerald-400">{row.salesValueShare}%</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-cyan-300">{row.globalBuyValueShare}%</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-cyan-300">{row.globalSalesValueShare}%</td>
                    <td className="py-2.5 px-3 text-center tabular-nums">
                      <span className={row.globalDeltaValueShare > 0 ? 'text-emerald-400 font-bold' : row.globalDeltaValueShare < 0 ? 'text-rose-400 font-bold' : 'text-zinc-500'}>
                        {row.globalDeltaValueShare > 0 ? `+${row.globalDeltaValueShare}` : row.globalDeltaValueShare}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded-xs font-semibold ${
                        row.sellThroughRate >= 80 ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-900' : 'text-amber-400 bg-amber-950/40 border border-amber-900'
                      }`}>
                        {row.sellThroughRate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-zinc-300">{formatNumber(row.stockQty)}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-zinc-400">{formatCurrency(row.stockValue)}</td>
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleSegmentClick(sectionKey, row.name)}
                        className={`p-1 rounded-xs border text-xs transition-colors ${
                          isSelected 
                            ? 'bg-amber-400 text-black border-amber-400 font-bold' 
                            : 'bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800 hover:border-zinc-700'
                        }`}
                        title={isSelected ? 'Désactiver le filtre' : `Filtrer sur ${row.name}`}
                      >
                        <Filter className="w-3 h-3" />
                      </button>
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
      
      {/* Top Banner: Sport Category Selector + Quick Cascading Sub-Filters */}
      <div className="bg-zinc-900/90 border border-zinc-800 p-5 rounded-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-xs text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-400 text-black">
                <TrendingUp className="w-3 h-3" />
                Page Dédiée
              </span>
              <span className="text-zinc-600">/</span>
              <span className="text-xs font-mono text-zinc-400">
                Vue Complète par Sports Category • Tables Pivots Intégrées
              </span>
            </div>
            <h2 className="text-xl font-bold font-display text-white tracking-tight flex items-center gap-2">
              Sports Category : <span className="text-amber-400">{resolvedSport === 'all' ? 'Toutes les catégories' : resolvedSport}</span>
              <span className="text-xs font-normal text-zinc-400 bg-zinc-950 px-2 py-0.5 border border-zinc-800 rounded-xs">
                {sportProducts.length} articles actifs
              </span>
            </h2>
          </div>

          {/* Quick Financial Summary for the selected sport vs Global Catalogue */}
          <div className="flex flex-wrap items-center gap-4 bg-zinc-950 px-4 py-2 rounded-xs border border-zinc-800 font-mono text-xs">
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Achats Valeur</div>
              <div className="font-bold text-amber-400">{formatCurrency(sportTotals.buyValue)}</div>
              <div className="text-[9px] text-cyan-400">({sportTotals.globalSportBuyShare}% du global)</div>
            </div>
            <div className="h-6 w-px bg-zinc-800"></div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Ventes Valeur (CA)</div>
              <div className="font-bold text-emerald-400">{formatCurrency(sportTotals.salesValue)}</div>
              <div className="text-[9px] text-cyan-400">({sportTotals.globalSportSalesShare}% du global)</div>
            </div>
            <div className="h-6 w-px bg-zinc-800"></div>
            <div>
              <div className="text-[10px] text-zinc-500 uppercase">Sell-Through</div>
              <div className="font-bold text-white">{sportTotals.str}% <span className="text-[9px] text-zinc-400">({sportTotals.valueStr}% val)</span></div>
              <div className="text-[9px] text-zinc-500">Stock: {formatNumber(sportTotals.stockQty)} u. ({formatCurrency(sportTotals.stockValue)})</div>
            </div>
          </div>
        </div>

        {/* Master Sport Category Switcher with "Toutes les catégories" & Reset */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-mono text-zinc-400 mr-1.5 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-amber-400" />
              <span>Filtre Sport Category :</span>
            </span>

            {/* Option TOUTES LES CATÉGORIES (ALL) */}
            <button
              onClick={() => handleSelectSport('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xs transition-all flex items-center gap-1.5 ${
                resolvedSport === 'all'
                  ? 'bg-amber-400 text-black font-bold shadow-sm'
                  : 'bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-850 border border-zinc-800'
              }`}
            >
              <span>Toutes les catégories</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-xs ${
                resolvedSport === 'all' ? 'bg-black/20 text-black' : 'bg-zinc-900 text-zinc-400'
              }`}>
                {products.length}
              </span>
            </button>

            {/* Specific sports */}
            {availableSports.map((sp) => {
              const countInSport = products.filter((p) => p.sport === sp).length;
              return (
                <button
                  key={sp}
                  onClick={() => handleSelectSport(sp)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xs transition-all flex items-center gap-1.5 ${
                    resolvedSport === sp
                      ? 'bg-amber-400 text-black font-bold shadow-sm'
                      : 'bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-850 border border-zinc-800'
                  }`}
                >
                  <span>{sp}</span>
                  <span className={`text-[10px] font-mono px-1 py-0.2 rounded-xs ${
                    resolvedSport === sp ? 'bg-black/20 text-black' : 'bg-zinc-900 text-zinc-500'
                  }`}>
                    {countInSport}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Dedicated Reset Button for Sport Category */}
          {resolvedSport !== 'all' && (
            <button
              onClick={() => handleSelectSport('all')}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-amber-400 hover:text-amber-300 bg-amber-400/10 hover:bg-amber-400/20 border border-amber-400/30 rounded-xs font-mono transition-colors"
              title="Réinitialiser pour afficher toutes les catégories de sport"
            >
              <X className="w-3.5 h-3.5" />
              <span>Réinitialiser (Toutes les catégories)</span>
            </button>
          )}
        </div>

        {/* Dynamic Secondary Cascading Filters inside the Sport Category */}
        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          <span className="text-zinc-500 font-mono text-[11px] flex items-center gap-1">
            <Filter className="w-3 h-3 text-amber-400" />
            Affiner dans {resolvedSport} :
          </span>

          {/* Division Sub-filter */}
          {sportAvailableDivisions.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 font-mono text-[11px]">Division:</span>
              <select
                value={selectedDivisionFilter}
                onChange={(e) => setSelectedDivisionFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs py-1 px-2 rounded-xs outline-none focus:border-amber-400"
              >
                <option value="all">Toutes ({sportAvailableDivisions.length})</option>
                {sportAvailableDivisions.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Age Group Sub-filter */}
          {sportAvailableAgeGroups.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 font-mono text-[11px]">Age Group:</span>
              <select
                value={selectedAgeGroupFilter}
                onChange={(e) => setSelectedAgeGroupFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs py-1 px-2 rounded-xs outline-none focus:border-amber-400"
              >
                <option value="all">Tous ({sportAvailableAgeGroups.length})</option>
                {sportAvailableAgeGroups.map((ag) => (
                  <option key={ag} value={ag}>{ag}</option>
                ))}
              </select>
            </div>
          )}

          {/* Gender Sub-filter */}
          {sportAvailableGenders.length > 1 && (
            <div className="flex items-center gap-1">
              <span className="text-zinc-400 font-mono text-[11px]">Genre:</span>
              <select
                value={selectedGenderFilter}
                onChange={(e) => setSelectedGenderFilter(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs py-1 px-2 rounded-xs outline-none focus:border-amber-400"
              >
                <option value="all">Tous ({sportAvailableGenders.length})</option>
                {sportAvailableGenders.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
          )}

          {(selectedDivisionFilter !== 'all' || 
            selectedAgeGroupFilter !== 'all' || 
            selectedGenderFilter !== 'all' ||
            selectedProductTypeFilter !== 'all' ||
            selectedSalesLineFilter !== 'all') && (
            <button
              onClick={() => {
                setSelectedDivisionFilter('all');
                setSelectedAgeGroupFilter('all');
                setSelectedGenderFilter('all');
                setSelectedProductTypeFilter('all');
                setSelectedSalesLineFilter('all');
              }}
              className="text-amber-400 hover:text-amber-300 font-mono text-[11px] underline flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Réinitialiser tous les filtres
            </button>
          )}
        </div>
      </div>

      {/* 1. > DIVISIONS (TOUT) */}
      {divisionData.length > 0 && renderSection(
        'division',
        `1. Divisions ${resolvedSport === 'all' ? '(Toutes Catégories)' : `dans ${resolvedSport}`} (Poids en Valeur vs Sell-Through)`,
        `Ventilation des divisions actives ${resolvedSport === 'all' ? 'sur l\'ensemble du catalogue' : `dans l'univers ${resolvedSport}`} • Poids intra-catégorie vs Poids au Global • En-têtes cliquables`,
        divisionData,
        <Layers className="w-4 h-4 text-amber-400" />,
        selectedDivisionFilter,
        () => setSelectedDivisionFilter('all')
      )}

      {/* 2. > AGE GROUP (Groupes d'Âge) : Present right after 1. Divisions */}
      {ageGroupData.length > 0 && renderSection(
        'ageGroup',
        `2. Groupes d'Âge (Age Group) ${resolvedSport === 'all' ? '(Toutes Catégories)' : `dans ${resolvedSport}`} (Poids en Valeur vs Sell-Through)`,
        `Ventilation par groupe d'âge (ADULT, JUNIOR, KIDS) ${resolvedSport === 'all' ? 'sur l\'ensemble du catalogue' : `dans ${resolvedSport}`} • Poids intra-catégorie vs Poids au Global • En-têtes cliquables`,
        ageGroupData,
        <Users className="w-4 h-4 text-cyan-400" />,
        selectedAgeGroupFilter,
        () => setSelectedAgeGroupFilter('all')
      )}

      {/* 3. > GENDER (Genre) */}
      {genderData.length > 0 && renderSection(
        'gender',
        `3. Gender (Genre) ${resolvedSport === 'all' ? '(Toutes Catégories)' : `dans ${resolvedSport}`} (Poids en Valeur vs Sell-Through)`,
        `Ventilation par genre (Men, Women, Kids, Unisex) ${resolvedSport === 'all' ? 'sur l\'ensemble du catalogue' : `dans ${resolvedSport}`} • Poids intra-catégorie vs Poids au Global • En-têtes cliquables`,
        genderData,
        <TrendingUp className="w-4 h-4 text-emerald-400" />,
        selectedGenderFilter,
        () => setSelectedGenderFilter('all')
      )}

      {/* 4. > PRODUCT TYPE (Ventes par Types) */}
      {productTypeData.length > 0 && renderSection(
        'productType',
        `4. Ventes par Types (Product Type) ${resolvedSport === 'all' ? '(Toutes Catégories)' : `dans ${resolvedSport}`}`,
        `Ventilation détaillée par type de produit / silhouette • Poids intra vs Global • En-têtes cliquables pour trier & filtrer`,
        productTypeData,
        <Package className="w-4 h-4 text-cyan-400" />,
        selectedProductTypeFilter,
        () => setSelectedProductTypeFilter('all')
      )}

      {/* 5. > SALES LINE (Lignes de Vente / Franchises) */}
      {salesLineData.length > 0 && renderSection(
        'salesLine',
        `5. Sales Line (Lignes de Vente / Franchises) ${resolvedSport === 'all' ? '(Toutes Catégories)' : `dans ${resolvedSport}`}`,
        `Ventilation par ligne de vente / franchise commerciale • Poids intra vs Global • En-têtes cliquables pour trier & filtrer`,
        salesLineData,
        <Scale className="w-4 h-4 text-amber-400" />,
        selectedSalesLineFilter,
        () => setSelectedSalesLineFilter('all')
      )}

      {/* 6. > TOP 30 ET FLOP 30 ARTICLES DE CE SPORT */}
      {(top30Articles.length > 0 || flop30Articles.length > 0) && (
        <div className="bg-zinc-900/80 border border-zinc-800 p-5 rounded-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                6. Top 30 &amp; Flop 30 Articles {resolvedSport === 'all' ? '(Toutes Catégories)' : `dans ${resolvedSport}`}
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Top 30 classé à la valeur à la vente (CA) • Flop 30 classé selon la valeur des stocks et le sell-through (plus faibles STR &amp; plus grande valeur de stock)
              </p>
            </div>

            {/* Quick search & view selector */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Filtrer dans le Top/Flop..."
                  value={articleSearchQuery}
                  onChange={(e) => setArticleSearchQuery(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs pl-8 pr-3 py-1.5 rounded-xs outline-none focus:border-amber-400 w-48"
                />
                {articleSearchQuery && (
                  <button 
                    onClick={() => setArticleSearchQuery('')}
                    className="absolute right-2 top-2 text-zinc-500 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xs border border-zinc-800">
                <button
                  onClick={() => setRankingTab('top30')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-mono font-medium rounded-xs transition-colors ${
                    rankingTab === 'top30'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-emerald-400" />
                  Top 30 CA
                </button>
                <button
                  onClick={() => setRankingTab('flop30')}
                  className={`flex items-center gap-1 px-3 py-1 text-xs font-mono font-medium rounded-xs transition-colors ${
                    rankingTab === 'flop30'
                      ? 'bg-rose-950 text-rose-300 border border-rose-700/60 font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Snowflake className="w-3.5 h-3.5 text-rose-400" />
                  Flop 30 Stocks &amp; STR
                </button>
                <button
                  onClick={() => setRankingTab('both')}
                  className={`px-3 py-1 text-xs font-mono font-medium rounded-xs transition-colors ${
                    rankingTab === 'both'
                      ? 'bg-zinc-800 text-white font-bold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Vue Double (Côte-à-Côte)
                </button>
              </div>
            </div>
          </div>

          {/* Cards & Lists */}
          <div className={`grid gap-5 ${rankingTab === 'both' ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
            
            {/* TOP 30 PANEL */}
            {(rankingTab === 'top30' || rankingTab === 'both') && (
              <div className="bg-zinc-950/80 border border-emerald-900/40 p-4 rounded-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold font-mono uppercase text-emerald-400">
                      Top 30 Articles • Meilleures Ventes (Turnover CA)
                    </span>
                    <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-xs font-mono">
                      {filteredTop30.length} articles
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">Classement par CA décroissant</span>
                </div>

                <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
                  {filteredTop30.map((item, idx) => (
                    <div
                      key={item.id}
                      onClick={() => onSelectProduct(item)}
                      className="flex items-center justify-between p-2.5 rounded-xs bg-zinc-900/60 hover:bg-zinc-900 cursor-pointer border border-zinc-850 hover:border-emerald-700/50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono font-bold text-emerald-400 w-6 shrink-0">#{idx + 1}</span>
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-10 h-10 object-cover rounded-xs border border-zinc-800 shrink-0 bg-zinc-950"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                            {item.name}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono mt-0.5">
                            <span className="text-amber-400">{item.sku}</span>
                            <span>•</span>
                            <span>{item.division}</span>
                            <span>•</span>
                            <span>{item.gender}</span>
                            {item.color && (
                              <>
                                <span>•</span>
                                <span className="text-zinc-300">{item.color}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono shrink-0 pl-3">
                        <div className="text-xs font-bold text-emerald-400">{formatCurrency(item.totalSalesValue)}</div>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          STR : <strong className="text-zinc-200">{item.sellThroughRate}%</strong> &bull; Ventes : {formatNumber(item.totalSalesQty)} u.
                        </div>
                        <div className="text-[9px] text-zinc-500">
                          Stock restant : {formatNumber(item.stockQty)} u. ({formatCurrency(item.stockValue)})
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FLOP 30 PANEL */}
            {(rankingTab === 'flop30' || rankingTab === 'both') && (
              <div className="bg-zinc-950/80 border border-rose-900/40 p-4 rounded-xs space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-850">
                  <div className="flex items-center gap-2">
                    <Snowflake className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold font-mono uppercase text-rose-400">
                      Flop 30 Articles • Sur-Stock &amp; Faible Écoulement
                    </span>
                    <span className="text-[10px] bg-rose-950 text-rose-400 border border-rose-800 px-2 py-0.5 rounded-xs font-mono">
                      {filteredFlop30.length} articles
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 font-mono">Plus forts stocks + plus faibles STR</span>
                </div>

                <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
                  {filteredFlop30.map((item, idx) => {
                    const flopRisk = calculateFlopScore(item);

                    return (
                      <div
                        key={item.id}
                        onClick={() => onSelectProduct(item)}
                        className="flex items-center justify-between p-2.5 rounded-xs bg-zinc-900/60 hover:bg-zinc-900 cursor-pointer border border-zinc-850 hover:border-rose-700/50 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-mono font-bold text-rose-400 w-6 shrink-0">#{idx + 1}</span>
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 object-cover rounded-xs border border-zinc-800 shrink-0 bg-zinc-950"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800';
                            }}
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white group-hover:text-rose-300 transition-colors truncate">
                              {item.name}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono mt-0.5">
                              <span className="text-amber-400">{item.sku}</span>
                              <span>•</span>
                              <span>{item.division}</span>
                              <span>•</span>
                              <span className="text-zinc-300 font-semibold">{getSanitizedAgeGroup(item)}</span>
                              <span>•</span>
                              <span>{item.gender}</span>
                              {item.color && (
                                <>
                                  <span>•</span>
                                  <span className="text-zinc-300">{item.color}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right font-mono shrink-0 pl-3">
                          <div className="text-xs font-bold text-rose-400 flex items-center justify-end gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-500" />
                            <span>Stock Val : {formatCurrency(item.stockValue)}</span>
                          </div>
                          <div className="text-[10px] text-zinc-400 mt-0.5">
                            STR : <strong className="text-rose-300 font-bold">{item.sellThroughRate}%</strong> &bull; Stock : <strong className="text-zinc-200">{formatNumber(item.stockQty)} u.</strong>
                          </div>
                          <div className="text-[9px] text-zinc-500">
                            CA réalisé : {formatCurrency(item.totalSalesValue)} &bull; Risque : {formatCurrency(flopRisk)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
