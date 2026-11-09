import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutGrid, 
  Table as TableIcon, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  AlertCircle,
  Eye,
  Ruler,
  Flame,
  Snowflake,
  Search,
  X,
  Filter,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  Layers
} from 'lucide-react';
import { ProductItem, FilterState } from '../types/merchandising';
import { formatCurrency } from '../utils/csvParser';
import { getTopArticles, getFlopArticles, calculateFlopScore, getSanitizedAgeGroup } from '../utils/pivotEngine';

interface RankingViewProps {
  products: ProductItem[];
  allProducts?: ProductItem[];
  filters?: FilterState;
  setFilters?: React.Dispatch<React.SetStateAction<FilterState>>;
  onSelectProduct: (product: ProductItem) => void;
  onSelectProductSizeCurve: (product: ProductItem) => void;
}

export type ArticleSortColumn = 
  | 'rank'
  | 'name' 
  | 'color'
  | 'division' 
  | 'retailPrice' 
  | 'wholesalePrice' 
  | 'totalBuyQty' 
  | 'totalBuyValue' 
  | 'totalSalesQty' 
  | 'totalSalesValue' 
  | 'sellThroughRate' 
  | 'stockQty' 
  | 'stockValue' 
  | 'flopScore';

// Helper to render color preview swatch dot
export const renderColorDot = (colorName?: string) => {
  if (!colorName) return null;
  const lower = colorName.toLowerCase().trim();
  let bg = '#71717a';
  let border = '#52525b';

  if (lower.includes('blanc') || lower.includes('white')) {
    bg = '#ffffff';
    border = '#d4d4d8';
  } else if (lower.includes('noir') || lower.includes('black')) {
    bg = '#09090b';
    border = '#3f3f46';
  } else if (lower.includes('bleu') || lower.includes('blue')) {
    bg = '#2563eb';
    border = '#60a5fa';
  } else if (lower.includes('rouge') || lower.includes('red')) {
    bg = '#e11d48';
    border = '#fb7185';
  } else if (lower.includes('vert') || lower.includes('green')) {
    bg = '#10b981';
    border = '#34d399';
  } else if (lower.includes('rose') || lower.includes('pink')) {
    bg = '#ec4899';
    border = '#f472b6';
  } else if (lower.includes('jaune') || lower.includes('yellow')) {
    bg = '#eab308';
    border = '#fde047';
  } else if (lower.includes('orange')) {
    bg = '#f97316';
    border = '#fb923c';
  } else if (lower.includes('gris') || lower.includes('grey') || lower.includes('gray') || lower.includes('argent')) {
    bg = '#a1a1aa';
    border = '#e4e4e7';
  } else if (lower.includes('kaki') || lower.includes('khaki') || lower.includes('olive')) {
    bg = '#65a30d';
    border = '#84cc16';
  } else if (lower.includes('violet') || lower.includes('purple')) {
    bg = '#9333ea';
    border = '#c084fc';
  }

  return (
    <span 
      className="inline-block w-2.5 h-2.5 rounded-full shrink-0" 
      style={{ backgroundColor: bg, border: `1px solid ${border}` }}
    />
  );
};

export const RankingView: React.FC<RankingViewProps> = ({
  products,
  allProducts,
  filters,
  setFilters,
  onSelectProduct,
  onSelectProductSizeCurve,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [presetTab, setPresetTab] = useState<'all' | 'top30' | 'flop30'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [colorFilter, setColorFilter] = useState<string>('all');
  const [ageGroupFilter, setAgeGroupFilter] = useState<string>('all');

  // Internal sorting state for table headers and direct classement selection
  const [sortColumn, setSortColumn] = useState<ArticleSortColumn>('totalSalesValue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Sync with external FilterBar `filters.sortBy` if provided and changed
  useEffect(() => {
    if (filters?.sortBy) {
      if (filters.sortBy === 'salesValue') setSortColumn('totalSalesValue');
      else if (filters.sortBy === 'salesQty') setSortColumn('totalSalesQty');
      else if (filters.sortBy === 'sellThroughRate') setSortColumn('sellThroughRate');
      else if (filters.sortBy === 'buyQty') setSortColumn('totalBuyQty');
      else if (filters.sortBy === 'stockQty') setSortColumn('stockQty');
      else if (filters.sortBy === 'stockValue') setSortColumn('stockValue');
      else if (filters.sortBy === 'flopScore') setSortColumn('flopScore');
      else if (filters.sortBy === 'name') setSortColumn('name');
    }
    if (filters?.sortOrder) {
      setSortDirection(filters.sortOrder);
    }
  }, [filters?.sortBy, filters?.sortOrder]);

  const formatEuro = (val: number) => {
    return formatCurrency(val);
  };

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('fr-FR').format(val);
  };

  // Safe numeric getter
  const safeNum = (v: any): number => {
    if (typeof v === 'number' && !isNaN(v)) return v;
    return 0;
  };

  // Compute available colors across all provided products with article counts
  const availableColorsWithCount = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((p) => {
      const c = p.color?.trim();
      if (c) {
        counts.set(c, (counts.get(c) || 0) + 1);
      }
    });

    const list = Array.from(counts.entries()).map(([name, count]) => ({
      name,
      count,
    }));

    list.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    return list;
  }, [products]);

  // Available divisions
  const availableDivisions = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.division))).filter(Boolean).sort();
  }, [products]);

  // Available age groups
  const availableAgeGroups = useMemo(() => {
    return Array.from(new Set(products.map(getSanitizedAgeGroup))).filter(Boolean).sort();
  }, [products]);

  // Pre-filter products according to Division, Age Group, Color and Search query BEFORE slicing Top/Flop
  const filteredPool = useMemo(() => {
    return products.filter((p) => {
      if (divisionFilter !== 'all' && p.division !== divisionFilter) {
        return false;
      }
      if (ageGroupFilter !== 'all' && getSanitizedAgeGroup(p) !== ageGroupFilter) {
        return false;
      }
      if (colorFilter !== 'all') {
        const c = p.color?.trim();
        if (!c || c.toLowerCase() !== colorFilter.toLowerCase()) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.name.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchSport = p.sport.toLowerCase().includes(q);
        const matchDiv = p.division.toLowerCase().includes(q);
        const matchColor = p.color ? p.color.toLowerCase().includes(q) : false;
        if (!matchName && !matchSku && !matchSport && !matchDiv && !matchColor) {
          return false;
        }
      }
      return true;
    });
  }, [products, divisionFilter, colorFilter, searchQuery]);

  // Compute Top 30 and Flop 30 based on the current filtered pool
  const top30List = useMemo(() => getTopArticles(filteredPool, 30), [filteredPool]);
  const flop30List = useMemo(() => getFlopArticles(filteredPool, 30), [filteredPool]);

  // Determine base list based on active preset tab
  const baseList = useMemo(() => {
    if (presetTab === 'top30') return top30List;
    if (presetTab === 'flop30') return flop30List;
    return filteredPool;
  }, [presetTab, top30List, flop30List, filteredPool]);

  // Final processed and sorted list
  const displayedProducts = useMemo(() => {
    const list = baseList.map((p, originalIndex) => {
      const stockVal = safeNum(p.stockValue) > 0 
        ? safeNum(p.stockValue) 
        : Math.max(0, safeNum(p.stockQty) * safeNum(p.wholesalePrice));
      const flop = calculateFlopScore({ ...p, stockValue: stockVal });

      return {
        ...p,
        stockValue: stockVal,
        flopScore: flop,
        originalIndex,
      };
    });

    // Sort list according to active column header / classement criterion
    return list.sort((a, b) => {
      let valA: string | number = 0;
      let valB: string | number = 0;

      switch (sortColumn) {
        case 'rank':
          if (presetTab === 'flop30') {
            // Rank in flop tab is by flopScore desc, then STR asc
            if (b.flopScore !== a.flopScore) {
              return sortDirection === 'asc' ? a.flopScore - b.flopScore : b.flopScore - a.flopScore;
            }
            return sortDirection === 'asc' 
              ? safeNum(b.sellThroughRate) - safeNum(a.sellThroughRate)
              : safeNum(a.sellThroughRate) - safeNum(b.sellThroughRate);
          }
          valA = safeNum(a.totalSalesValue);
          valB = safeNum(b.totalSalesValue);
          break;

        case 'name':
          return sortDirection === 'asc' 
            ? a.name.localeCompare(b.name, 'fr', { numeric: true }) 
            : b.name.localeCompare(a.name, 'fr', { numeric: true });

        case 'color':
          const colA = a.color || 'ZZZ';
          const colB = b.color || 'ZZZ';
          return sortDirection === 'asc' 
            ? colA.localeCompare(colB, 'fr') 
            : colB.localeCompare(colA, 'fr');

        case 'division':
          return sortDirection === 'asc' 
            ? a.division.localeCompare(b.division) 
            : b.division.localeCompare(a.division);

        case 'retailPrice':
          valA = safeNum(a.retailPrice); valB = safeNum(b.retailPrice); break;
        case 'wholesalePrice':
          valA = safeNum(a.wholesalePrice); valB = safeNum(b.wholesalePrice); break;
        case 'totalBuyQty':
          valA = safeNum(a.totalBuyQty); valB = safeNum(b.totalBuyQty); break;
        case 'totalBuyValue':
          valA = safeNum(a.totalBuyValue); valB = safeNum(b.totalBuyValue); break;
        case 'totalSalesQty':
          valA = safeNum(a.totalSalesQty); valB = safeNum(b.totalSalesQty); break;
        case 'totalSalesValue':
          valA = safeNum(a.totalSalesValue); valB = safeNum(b.totalSalesValue); break;
        case 'sellThroughRate':
          valA = safeNum(a.sellThroughRate); valB = safeNum(b.sellThroughRate); break;
        case 'stockQty':
          valA = safeNum(a.stockQty); valB = safeNum(b.stockQty); break;
        case 'stockValue':
          valA = safeNum(a.stockValue); valB = safeNum(b.stockValue); break;
        case 'flopScore':
          valA = safeNum(a.flopScore); valB = safeNum(b.flopScore); break;
        default:
          valA = safeNum(a.totalSalesValue); valB = safeNum(b.totalSalesValue);
      }

      const diff = (valA as number) - (valB as number);
      if (diff !== 0) {
        return sortDirection === 'asc' ? diff : -diff;
      }

      // Tie-breakers
      if (sortColumn === 'flopScore') {
        // Lower STR first
        return safeNum(a.sellThroughRate) - safeNum(b.sellThroughRate);
      }
      return (b.totalSalesValue || 0) - (a.totalSalesValue || 0);
    });
  }, [baseList, sortColumn, sortDirection, presetTab]);

  // Click handler for column headers
  const handleSortHeader = (col: ArticleSortColumn) => {
    if (sortColumn === col) {
      const nextDir = sortDirection === 'desc' ? 'asc' : 'desc';
      setSortDirection(nextDir);
      if (setFilters) {
        setFilters((prev) => ({ ...prev, sortOrder: nextDir }));
      }
    } else {
      setSortColumn(col);
      setSortDirection('desc');
      if (setFilters) {
        let extSort: FilterState['sortBy'] = 'salesValue';
        if (col === 'totalSalesValue') extSort = 'salesValue';
        else if (col === 'totalSalesQty') extSort = 'salesQty';
        else if (col === 'sellThroughRate') extSort = 'sellThroughRate';
        else if (col === 'totalBuyQty') extSort = 'buyQty';
        else if (col === 'stockQty') extSort = 'stockQty';
        else if (col === 'stockValue') extSort = 'stockValue';
        else if (col === 'flopScore') extSort = 'flopScore';
        else if (col === 'name') extSort = 'name';
        setFilters((prev) => ({ ...prev, sortBy: extSort, sortOrder: 'desc' }));
      }
    }
  };

  // Direct classement changer via dropdown
  const handleDirectClassementChange = (col: ArticleSortColumn) => {
    setSortColumn(col);
    if (col === 'flopScore') {
      setSortDirection('desc');
    } else if (col === 'sellThroughRate') {
      setSortDirection('desc');
    }
    if (setFilters) {
      let extSort: FilterState['sortBy'] = 'salesValue';
      if (col === 'totalSalesValue') extSort = 'salesValue';
      else if (col === 'totalSalesQty') extSort = 'salesQty';
      else if (col === 'sellThroughRate') extSort = 'sellThroughRate';
      else if (col === 'totalBuyQty') extSort = 'buyQty';
      else if (col === 'stockQty') extSort = 'stockQty';
      else if (col === 'stockValue') extSort = 'stockValue';
      else if (col === 'flopScore') extSort = 'flopScore';
      else if (col === 'name') extSort = 'name';
      setFilters((prev) => ({ ...prev, sortBy: extSort }));
    }
  };

  const handleToggleSortDirection = () => {
    const nextDir = sortDirection === 'desc' ? 'asc' : 'desc';
    setSortDirection(nextDir);
    if (setFilters) {
      setFilters((prev) => ({ ...prev, sortOrder: nextDir }));
    }
  };

  const handleResetFilters = () => {
    setColorFilter('all');
    setDivisionFilter('all');
    setAgeGroupFilter('all');
    setSearchQuery('');
    setPresetTab('all');
    setSortColumn('totalSalesValue');
    setSortDirection('desc');
    if (setFilters) {
      setFilters((prev) => ({
        ...prev,
        color: 'all',
        division: 'all',
        search: '',
        sortBy: 'salesValue',
        sortOrder: 'desc',
      }));
    }
  };

  const hasActiveFilters = colorFilter !== 'all' || divisionFilter !== 'all' || searchQuery.trim() !== '' || presetTab !== 'all';

  const renderSortTh = (
    label: string, 
    col: ArticleSortColumn, 
    align: 'left' | 'right' | 'center' = 'right',
    extraClass: string = ''
  ) => {
    const isSorted = sortColumn === col;
    return (
      <th
        onClick={() => handleSortHeader(col)}
        className={`py-3 px-3 select-none cursor-pointer hover:bg-zinc-800 transition-colors ${
          align === 'left' ? 'text-left' : align === 'center' ? 'text-center' : 'text-right'
        } ${extraClass}`}
        title={`Cliquer pour trier par ${label} (${isSorted ? (sortDirection === 'desc' ? 'ordre décroissant' : 'ordre croissant') : 'cliquer pour trier'})`}
      >
        <div className={`inline-flex items-center gap-1 font-mono uppercase text-[11px] ${
          isSorted ? 'text-amber-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
        }`}>
          <span>{label}</span>
          {isSorted ? (
            sortDirection === 'desc' ? (
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
    <div className="space-y-4">
      
      {/* Top Bar: View Mode Switcher, Presets & Counter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-zinc-900/90 p-4 rounded-sm border border-zinc-800 shadow-xs">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold font-display text-white flex items-center gap-2">
              <span>Palmarès &amp; Ranking Produits FW25</span>
              <span className="text-xs font-mono text-amber-400 bg-zinc-950 px-2 py-0.5 rounded-sm border border-zinc-800">
                {displayedProducts.length} articles
              </span>
            </h2>

            {presetTab === 'top30' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-600/70 px-2.5 py-0.5 rounded-xs shadow-xs">
                <Flame className="w-3.5 h-3.5 text-emerald-400" />
                Top 30 CA Ventes
              </span>
            )}

            {presetTab === 'flop30' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold bg-rose-950 text-rose-300 border border-rose-600/70 px-2.5 py-0.5 rounded-xs shadow-xs">
                <Snowflake className="w-3.5 h-3.5 text-rose-400" />
                Flop 30 Risque Stock &amp; Faible STR
              </span>
            )}

            {colorFilter !== 'all' && (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-zinc-950 text-zinc-200 border border-amber-400/60 px-2.5 py-0.5 rounded-xs">
                {renderColorDot(colorFilter)}
                <span>Couleur : <strong>{colorFilter}</strong></span>
                <button 
                  onClick={() => setColorFilter('all')} 
                  className="text-zinc-400 hover:text-white ml-1"
                  title="Enlever filtre couleur"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Classement interactif en temps réel • Cliquez sur les en-têtes du tableau ou utilisez le sélecteur de classement ci-dessous pour ordonner le palmarès.
          </p>
        </div>

        {/* Action Controls: Presets (Top 30 / Flop 30 / Tous) + View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Preset Tabs */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-sm border border-zinc-800">
            <button
              onClick={() => {
                setPresetTab('all');
                setSortColumn('totalSalesValue');
                setSortDirection('desc');
              }}
              className={`px-3 py-1 text-xs font-mono rounded-xs transition-colors ${
                presetTab === 'all'
                  ? 'bg-zinc-800 text-white font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Tous ({filteredPool.length})
            </button>
            <button
              onClick={() => {
                setPresetTab('top30');
                setSortColumn('totalSalesValue');
                setSortDirection('desc');
              }}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-mono rounded-xs transition-colors ${
                presetTab === 'top30'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-600 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-emerald-400" />
              Top 30 CA
            </button>
            <button
              onClick={() => {
                setPresetTab('flop30');
                setSortColumn('flopScore');
                setSortDirection('desc');
              }}
              className={`flex items-center gap-1 px-3 py-1 text-xs font-mono rounded-xs transition-colors ${
                presetTab === 'flop30'
                  ? 'bg-rose-950 text-rose-300 border border-rose-600 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Snowflake className="w-3.5 h-3.5 text-rose-400" />
              Flop 30 Stocks &amp; STR
            </button>
          </div>

          {/* View Toggle (Table / Gallery) */}
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-sm border border-zinc-800">
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tableau</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-xs transition-colors ${
                viewMode === 'cards'
                  ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Galerie</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar: Color Filter, Division, Search & Dedicated Classement Selector */}
      <div className="bg-zinc-900/60 p-3.5 rounded-sm border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Side: Color Filter & Division Filter & Search */}
        <div className="flex flex-wrap items-center gap-2.5">
          
          {/* 1. FILTRE COULEUR (Demandé explicitement par l'utilisateur) */}
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 px-2 py-1 rounded-xs transition-colors">
            <Palette className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Couleur :</span>
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="bg-transparent text-xs text-zinc-200 font-medium outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-zinc-950 text-zinc-200">
                Toutes les couleurs ({availableColorsWithCount.length})
              </option>
              {availableColorsWithCount.map((c) => (
                <option key={c.name} value={c.name} className="bg-zinc-950 text-zinc-200">
                  {c.name} ({c.count})
                </option>
              ))}
            </select>
            {colorFilter !== 'all' && (
              <button
                onClick={() => setColorFilter('all')}
                className="text-zinc-400 hover:text-white ml-0.5"
                title="Réinitialiser couleur"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* 2. Filtre Division */}
          {availableDivisions.length > 1 && (
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded-xs">
              <Layers className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span className="text-[10px] font-mono text-zinc-400 uppercase">Division :</span>
              <select
                value={divisionFilter}
                onChange={(e) => setDivisionFilter(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 outline-none cursor-pointer"
              >
                <option value="all" className="bg-zinc-950 text-zinc-200">Toutes divisions ({availableDivisions.length})</option>
                {availableDivisions.map((d) => (
                  <option key={d} value={d} className="bg-zinc-950 text-zinc-200">{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* 3. Filtre Tranche d'Âge (ADULT, JUNIOR, KIDS, INFANT) */}
          {availableAgeGroups.length > 1 && (
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded-xs">
              <span className="text-[10px] font-mono text-cyan-400 uppercase">Âge :</span>
              <select
                value={ageGroupFilter}
                onChange={(e) => setAgeGroupFilter(e.target.value)}
                className="bg-transparent text-xs text-cyan-300 outline-none cursor-pointer"
              >
                <option value="all" className="bg-zinc-950 text-zinc-200">Tous âges ({availableAgeGroups.length})</option>
                {availableAgeGroups.map((ag) => (
                  <option key={ag} value={ag} className="bg-zinc-950 text-zinc-200">{ag}</option>
                ))}
              </select>
              {ageGroupFilter !== 'all' && (
                <button
                  onClick={() => setAgeGroupFilter('all')}
                  className="text-zinc-400 hover:text-white ml-0.5"
                  title="Réinitialiser filtre âge"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* 3. Recherche Rapide Réf / Nom */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Rechercher réf, nom, couleur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs pl-8 pr-7 py-1 rounded-xs outline-none focus:border-amber-400 w-52 transition-colors"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1.5 text-zinc-500 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:text-amber-300 bg-zinc-950 px-2.5 py-1 rounded-xs border border-zinc-800 hover:border-amber-400/50 transition-colors"
              title="Réinitialiser tous les filtres locaux"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Réinitialiser</span>
            </button>
          )}

        </div>

        {/* Right Side: CLASSEMENT SELECTOR & ORDER (Corrige l'anomalie de classement) */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-zinc-950 border border-zinc-800 px-2.5 py-1 rounded-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">Classement :</span>
            <select
              value={sortColumn}
              onChange={(e) => handleDirectClassementChange(e.target.value as ArticleSortColumn)}
              className="bg-transparent text-xs text-amber-400 font-semibold outline-none cursor-pointer pr-1"
            >
              <option value="totalSalesValue" className="bg-zinc-950 text-zinc-200">1. Ventes CA (€ Valeur)</option>
              <option value="totalSalesQty" className="bg-zinc-950 text-zinc-200">2. Ventes Volume (Unités)</option>
              <option value="sellThroughRate" className="bg-zinc-950 text-zinc-200">3. Taux STR % (Écoulement)</option>
              <option value="flopScore" className="bg-zinc-950 text-zinc-200">4. Risque Flop (Stocks &amp; STR)</option>
              <option value="stockValue" className="bg-zinc-950 text-zinc-200">5. Stock Résiduel (€ Valeur)</option>
              <option value="stockQty" className="bg-zinc-950 text-zinc-200">6. Stock Résiduel (Unités)</option>
              <option value="totalBuyValue" className="bg-zinc-950 text-zinc-200">7. Achats en Valeur (€)</option>
              <option value="totalBuyQty" className="bg-zinc-950 text-zinc-200">8. Achats en Volume (Unités)</option>
              <option value="retailPrice" className="bg-zinc-950 text-zinc-200">9. Prix Public (PPC)</option>
              <option value="wholesalePrice" className="bg-zinc-950 text-zinc-200">10. Coût d'Achat Net</option>
              <option value="name" className="bg-zinc-950 text-zinc-200">11. Ordre Alphabétique (Nom)</option>
            </select>
          </div>

          {/* Toggle Sort Direction (Asc / Desc) with clear visual label */}
          <button
            onClick={handleToggleSortDirection}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xs border text-xs font-mono transition-colors ${
              sortDirection === 'desc'
                ? 'bg-zinc-950 border-zinc-800 text-zinc-200 hover:text-white hover:border-zinc-700'
                : 'bg-amber-950/60 border-amber-600/70 text-amber-300 font-bold'
            }`}
            title={`Direction de tri active : ${sortDirection === 'desc' ? 'Décroissant (plus grand d\'abord)' : 'Croissant (plus petit d\'abord)'}`}
          >
            {sortDirection === 'desc' ? (
              <>
                <ArrowDown className="w-3.5 h-3.5 text-amber-400" />
                <span>Décroissant</span>
              </>
            ) : (
              <>
                <ArrowUp className="w-3.5 h-3.5 text-amber-400" />
                <span>Croissant</span>
              </>
            )}
          </button>
        </div>

      </div>

      {displayedProducts.length === 0 ? (
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-sm p-12 text-center text-zinc-400">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <p className="text-sm font-medium text-white">Aucun article ne correspond aux critères sélectionnés.</p>
          <p className="text-xs text-zinc-500 mt-1">
            {colorFilter !== 'all' && `Filtre actif : Couleur "${colorFilter}". `}
            Essayez de réinitialiser vos filtres.
          </p>
          <button
            onClick={handleResetFilters}
            className="mt-3 px-3 py-1.5 text-xs font-mono bg-zinc-800 text-amber-400 hover:bg-zinc-700 rounded-xs transition-colors"
          >
            Réinitialiser les filtres
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* Dense Table View with fully interactive clickable headers */
        <div className="overflow-x-auto bg-zinc-900/60 border border-zinc-800 rounded-sm shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/90 font-mono text-[11px] text-zinc-400 uppercase tracking-wider">
                {renderSortTh('Rang', 'rank', 'center', 'w-16')}
                <th className="py-3 px-3 w-16 text-zinc-500">Visuel</th>
                {renderSortTh('Réf / Nom Article', 'name', 'left', 'min-w-[190px]')}
                {renderSortTh('Couleur', 'color', 'left', 'w-28')}
                {renderSortTh('Division & Sport', 'division', 'left')}
                {renderSortTh('PPC', 'retailPrice', 'right')}
                {renderSortTh('Coût', 'wholesalePrice', 'right')}
                {renderSortTh('Achats Qté', 'totalBuyQty', 'right', 'bg-zinc-950/40 font-semibold text-zinc-300')}
                {renderSortTh('Achats Val', 'totalBuyValue', 'right', 'bg-zinc-950/40 font-semibold text-zinc-300')}
                {renderSortTh('Ventes Qté', 'totalSalesQty', 'right', 'bg-emerald-950/20 font-semibold text-emerald-400')}
                {renderSortTh('Ventes CA', 'totalSalesValue', 'right', 'bg-emerald-950/20 font-semibold text-emerald-400')}
                {renderSortTh('STR %', 'sellThroughRate', 'center')}
                {renderSortTh('Stock (U)', 'stockQty', 'right')}
                {renderSortTh('Stock Val (€)', 'stockValue', 'right', 'text-amber-400')}
                {renderSortTh('Score Flop', 'flopScore', 'right', 'text-rose-400')}
                <th className="py-3 px-3 text-center text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850 text-zinc-300">
              {displayedProducts.map((item, index) => {
                const str = safeNum(item.sellThroughRate);
                const isHot = str >= 85;
                const isMedium = str >= 70 && str < 85;
                const isHighStockRisk = safeNum(item.stockQty) > 200 && str < 65;

                // Rank badge styling
                const isTop1 = index === 0 && (sortColumn === 'totalSalesValue' || presetTab === 'top30');
                const isTop2 = index === 1 && (sortColumn === 'totalSalesValue' || presetTab === 'top30');
                const isTop3 = index === 2 && (sortColumn === 'totalSalesValue' || presetTab === 'top30');
                const isFlopTop = presetTab === 'flop30' || sortColumn === 'flopScore';

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-zinc-800/80 transition-colors group cursor-pointer ${
                      presetTab === 'flop30' ? 'hover:border-l-2 hover:border-l-rose-500' : ''
                    }`}
                    onClick={() => onSelectProduct(item)}
                  >
                    {/* Rank Badge */}
                    <td className="py-2.5 px-3 text-center font-mono font-bold">
                      {isFlopTop ? (
                        <span className="inline-block bg-rose-950 text-rose-300 border border-rose-700/80 text-[11px] px-1.5 py-0.5 rounded-xs">
                          #{index + 1}
                        </span>
                      ) : isTop1 ? (
                        <span className="inline-block bg-amber-400 text-black text-[11px] px-2 py-0.5 rounded-xs font-black shadow-xs">
                          #1
                        </span>
                      ) : isTop2 ? (
                        <span className="inline-block bg-zinc-200 text-black text-[11px] px-2 py-0.5 rounded-xs font-black">
                          #2
                        </span>
                      ) : isTop3 ? (
                        <span className="inline-block bg-amber-700 text-white text-[11px] px-2 py-0.5 rounded-xs font-bold">
                          #3
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-xs">
                          #{index + 1}
                        </span>
                      )}
                    </td>

                    {/* Photo thumbnail */}
                    <td className="py-2.5 px-3">
                      <div className="relative w-11 h-11 rounded-xs overflow-hidden border border-zinc-800 bg-zinc-950">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800';
                          }}
                        />
                      </div>
                    </td>

                    {/* Name & SKU */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                        {item.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono mt-0.5">
                        <span className="text-amber-400 font-medium">{item.sku}</span>
                        <span>·</span>
                        <span className="text-zinc-300 font-semibold">{getSanitizedAgeGroup(item)}</span>
                        <span>·</span>
                        <span>{item.gender}</span>
                      </div>
                    </td>

                    {/* Couleur (Demandé pour le palmarès articles) */}
                    <td className="py-2.5 px-3">
                      {item.color ? (
                        <div className="flex items-center gap-1.5">
                          {renderColorDot(item.color)}
                          <span 
                            onClick={(e) => {
                              e.stopPropagation();
                              if (item.color) setColorFilter(item.color);
                            }}
                            className="text-xs text-zinc-300 font-mono hover:text-amber-400 hover:underline cursor-pointer"
                            title={`Cliquer pour filtrer uniquement la couleur "${item.color}"`}
                          >
                            {item.color}
                          </span>
                        </div>
                      ) : (
                        <span className="text-zinc-600 font-mono text-[11px]">-</span>
                      )}
                    </td>

                    {/* Division & Sport */}
                    <td className="py-2.5 px-3">
                      <div className="text-zinc-200 font-semibold">{item.division}</div>
                      <div className="text-[10px] text-amber-400/90 font-mono mt-0.5">{item.sport}</div>
                    </td>

                    {/* Retail Price */}
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-300">
                      {formatEuro(item.retailPrice)}
                    </td>

                    {/* Wholesale Price */}
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-400">
                      {formatEuro(item.wholesalePrice)}
                    </td>

                    {/* Buy Quantity */}
                    <td className="py-2.5 px-3 text-right font-mono font-medium text-zinc-200 bg-zinc-950/20 tabular-nums">
                      {formatNumber(item.totalBuyQty)}
                    </td>

                    {/* Buy Value */}
                    <td className="py-2.5 px-3 text-right font-mono text-zinc-400 bg-zinc-950/20">
                      {formatEuro(item.totalBuyValue)}
                    </td>

                    {/* Sales Quantity */}
                    <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-400 bg-emerald-950/10 tabular-nums">
                      {formatNumber(item.totalSalesQty)}
                    </td>

                    {/* Sales Value */}
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 bg-emerald-950/10">
                      {formatEuro(item.totalSalesValue)}
                    </td>

                    {/* STR % */}
                    <td className="py-2.5 px-3 text-center font-mono">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`font-bold ${isHot ? 'text-emerald-400' : isMedium ? 'text-amber-400' : 'text-rose-400'}`}>
                          {item.sellThroughRate}%
                        </span>
                        <div className="w-14 bg-zinc-800 h-1 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${isHot ? 'bg-emerald-400' : isMedium ? 'bg-amber-400' : 'bg-rose-400'}`}
                            style={{ width: `${Math.min(100, item.sellThroughRate)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Remaining Stock Qty */}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      <span className={isHighStockRisk ? 'text-rose-300 font-bold' : item.stockQty > 300 ? 'text-amber-300 font-semibold' : 'text-zinc-300'}>
                        {formatNumber(item.stockQty)}
                      </span>
                    </td>

                    {/* Remaining Stock Value */}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-300 font-semibold">
                      {formatEuro(item.stockValue)}
                    </td>

                    {/* Flop Score */}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      <span className={item.flopScore > 5000 ? 'text-rose-400 font-bold' : 'text-zinc-500'}>
                        {formatEuro(item.flopScore)}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onSelectProduct(item)}
                          className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xs transition-colors"
                          title="Fiche Produit 360°"
                        >
                          <Eye className="w-4 h-4 text-amber-400" />
                        </button>
                        <button
                          onClick={() => onSelectProductSizeCurve(item)}
                          className="p-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-cyan-300 rounded-xs transition-colors"
                          title="Courbe de tailles"
                        >
                          <Ruler className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Visual Cards Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayedProducts.map((item, index) => {
            const str = safeNum(item.sellThroughRate);
            const isHot = str >= 85;
            const isMedium = str >= 70 && str < 85;
            const isFlopTop = presetTab === 'flop30' || sortColumn === 'flopScore';

            return (
              <div
                key={item.id}
                onClick={() => onSelectProduct(item)}
                className="bg-zinc-900/80 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700 rounded-sm overflow-hidden flex flex-col justify-between transition-all duration-200 cursor-pointer group shadow-sm"
              >
                <div>
                  {/* Image container with Rank badge */}
                  <div className="relative aspect-4/3 w-full bg-zinc-950 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800';
                      }}
                    />

                    {/* Rank Badge */}
                    <div className={`absolute top-2 left-2 backdrop-blur-xs font-mono text-xs font-bold px-2 py-0.5 rounded-xs border ${
                      isFlopTop 
                        ? 'bg-rose-950/90 text-rose-300 border-rose-600'
                        : index === 0 
                        ? 'bg-amber-400 text-black border-amber-300 font-black'
                        : index === 1 
                        ? 'bg-zinc-200 text-black border-white font-black'
                        : index === 2 
                        ? 'bg-amber-700 text-white border-amber-600'
                        : 'bg-zinc-950/90 text-amber-400 border-zinc-700'
                    }`}>
                      #{index + 1}
                    </div>

                    {/* STR Badge */}
                    <div className={`absolute top-2 right-2 font-mono text-xs font-bold px-2 py-0.5 rounded-xs backdrop-blur-xs ${
                      isHot 
                        ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600'
                        : isMedium
                        ? 'bg-amber-950/90 text-amber-300 border border-amber-600'
                        : 'bg-rose-950/90 text-rose-300 border border-rose-600'
                    }`}>
                      {item.sellThroughRate}% STR
                    </div>

                    {/* Quick SKU and Color tag */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-zinc-950/80 backdrop-blur-xs px-2 py-0.5 rounded-xs border border-zinc-800">
                      <span className="text-zinc-300 font-mono text-[10px]">{item.sku}</span>
                      {item.color && (
                        <>
                          <span className="text-zinc-600">&bull;</span>
                          <span className="flex items-center gap-1 text-[10px] text-zinc-300 font-mono">
                            {renderColorDot(item.color)}
                            <span>{item.color}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] text-zinc-400 font-mono uppercase">
                        <span>{item.division}</span>
                        <span>·</span>
                        <span className="text-amber-400 font-semibold">{item.sport}</span>
                        <span>·</span>
                        <span>{getSanitizedAgeGroup(item)}</span>
                      </div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors mt-0.5 line-clamp-1">
                        {item.name}
                      </h3>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 bg-zinc-950/70 p-2.5 rounded-xs border border-zinc-850 text-xs">
                      <div>
                        <div className="text-[10px] text-zinc-400 font-mono">Achats Totaux</div>
                        <div className="font-semibold text-zinc-200 tabular-nums">
                          {formatNumber(item.totalBuyQty)} u.
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono">
                          {formatEuro(item.totalBuyValue)}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-zinc-400 font-mono">Ventes Réalisées</div>
                        <div className="font-bold text-emerald-400 tabular-nums">
                          {formatNumber(item.totalSalesQty)} u.
                        </div>
                        <div className="text-[10px] text-emerald-400/80 font-mono">
                          {formatEuro(item.totalSalesValue)}
                        </div>
                      </div>
                    </div>

                    {/* Stock & Flop Risk strip */}
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pt-1">
                      <span>Stock : <strong className="text-zinc-200">{formatNumber(item.stockQty)} u.</strong></span>
                      <span className="text-amber-300 font-bold">{formatEuro(item.stockValue)}</span>
                    </div>

                    {/* Progress Sell-Through Bar */}
                    <div className="w-full bg-zinc-950 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${isHot ? 'bg-emerald-400' : isMedium ? 'bg-amber-400' : 'bg-rose-400'}`}
                        style={{ width: `${Math.min(100, item.sellThroughRate)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-3 pt-0 border-t border-zinc-800/60 mt-2 flex items-center justify-between text-xs text-zinc-400">
                  <span className="text-[11px] text-zinc-400 font-mono">PPC: {item.retailPrice} €</span>
                  <span className="text-amber-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                    <span>Fiche &amp; Tailles</span>
                    <span>&rarr;</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
