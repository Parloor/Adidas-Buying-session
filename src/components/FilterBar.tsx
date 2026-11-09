import React, { useMemo, useState } from 'react';
import { 
  Search, 
  X, 
  SlidersHorizontal, 
  Sparkles, 
  Filter, 
  Globe, 
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  Layers,
  ArrowRight
} from 'lucide-react';
import { FilterState, ProductItem } from '../types/merchandising';
import { formatCurrency } from '../utils/csvParser';
import { getSanitizedAgeGroup, buildPivotTable, computeDatasetTotals } from '../utils/pivotEngine';
import { renderColorDot } from './RankingView';

interface FilterBarProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  products: ProductItem[];
  allProducts?: ProductItem[]; // Entire catalogue to compute global weights
  availableStores?: string[];
  totalFiltered: number;
  totalAll: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  setFilters,
  products,
  allProducts = [],
  totalFiltered,
  totalAll,
}) => {
  const [showPivotSummary, setShowPivotSummary] = useState(false);
  const [pivotActiveTab, setPivotActiveTab] = useState<'sport' | 'ageGroup' | 'division' | 'gender' | 'color' | 'salesLine'>('sport');

  // Global Catalogue Totals
  const catalogueProducts = allProducts.length > 0 ? allProducts : products;
  const globalTotals = useMemo(() => {
    let buyValue = 0;
    let salesValue = 0;
    let buyQty = 0;
    let salesQty = 0;
    catalogueProducts.forEach((p) => {
      buyValue += p.totalBuyValue || 0;
      salesValue += p.totalSalesValue || 0;
      buyQty += p.totalBuyQty || 0;
      salesQty += p.totalSalesQty || 0;
    });
    return { buyValue, salesValue, buyQty, salesQty };
  }, [catalogueProducts]);

  // Current filtered totals for the Active Impact Banner
  const filteredTotals = useMemo(() => {
    let buyValue = 0;
    let salesValue = 0;
    let buyQty = 0;
    let salesQty = 0;
    products.forEach((p) => {
      buyValue += p.totalBuyValue || 0;
      salesValue += p.totalSalesValue || 0;
      buyQty += p.totalBuyQty || 0;
      salesQty += p.totalSalesQty || 0;
    });
    const str = buyQty > 0 ? Math.round((salesQty / buyQty) * 1000) / 10 : 0;
    const globalBuyShare = globalTotals.buyValue > 0 ? Math.round((buyValue / globalTotals.buyValue) * 1000) / 10 : 0;
    const globalSalesShare = globalTotals.salesValue > 0 ? Math.round((salesValue / globalTotals.salesValue) * 1000) / 10 : 0;
    const deltaShare = Math.round((globalSalesShare - globalBuyShare) * 10) / 10;
    return { buyValue, salesValue, buyQty, salesQty, str, globalBuyShare, globalSalesShare, deltaShare };
  }, [products, globalTotals]);

  // Helper to compute global buy & sales shares for any option
  const computeOptionStats = (key: keyof ProductItem, val: string) => {
    let bVal = 0;
    let sVal = 0;
    catalogueProducts.forEach((p) => {
      const itemVal = key === 'ageGroup' ? getSanitizedAgeGroup(p) : (p[key] || '');
      if (itemVal === val) {
        bVal += p.totalBuyValue || 0;
        sVal += p.totalSalesValue || 0;
      }
    });
    const bShare = globalTotals.buyValue > 0 ? Math.round((bVal / globalTotals.buyValue) * 100) : 0;
    const sShare = globalTotals.salesValue > 0 ? Math.round((sVal / globalTotals.salesValue) * 100) : 0;
    return `${bShare}% Ach. | ${sShare}% Vte`;
  };

  // --- Dynamic Pivot Extraction of All Elements from the CSV File (NO arbitrary regrouping) ---
  
  // 1. All Sports present in file
  const availableSports = useMemo(() => {
    return Array.from(new Set(catalogueProducts.map((p) => p.sport))).filter(Boolean).sort();
  }, [catalogueProducts]);

  // 2. All Divisions present in file
  const availableDivisions = useMemo(() => {
    return Array.from(new Set(catalogueProducts.map((p) => p.division))).filter(Boolean).sort();
  }, [catalogueProducts]);

  // 3. All Age Groups present in file (ADULT, JUNIOR, KIDS, INFANT, etc.)
  const availableAgeGroups = useMemo(() => {
    return Array.from(new Set(catalogueProducts.map(getSanitizedAgeGroup))).filter(Boolean).sort();
  }, [catalogueProducts]);

  // 4. All Genders present in file
  const availableGenders = useMemo(() => {
    return Array.from(new Set(catalogueProducts.map((p) => p.gender))).filter(Boolean).sort();
  }, [catalogueProducts]);

  // 5. All Product Types present in file
  const availableProductTypes = useMemo(() => {
    return Array.from(new Set(catalogueProducts.map((p) => p.productType).filter(Boolean))).sort();
  }, [catalogueProducts]);

  // 6. All Sales Lines / Franchises present in file
  const availableSalesLines = useMemo(() => {
    return Array.from(new Set(catalogueProducts.map((p) => p.salesLine).filter(Boolean))).sort();
  }, [catalogueProducts]);

  // 7. All Colors present in file
  const availableColors = useMemo(() => {
    return Array.from(new Set(catalogueProducts.map((p) => p.color).filter(Boolean) as string[])).sort();
  }, [catalogueProducts]);

  // --- Dynamic Pivot Tables for the interactive summary modal/panel ---
  const pivotTotalsObj = useMemo(() => computeDatasetTotals(catalogueProducts), [catalogueProducts]);
  
  const pivotSportsData = useMemo(() => {
    return buildPivotTable(catalogueProducts, (p) => p.sport, pivotTotalsObj, pivotTotalsObj);
  }, [catalogueProducts, pivotTotalsObj]);

  const pivotAgeGroupsData = useMemo(() => {
    return buildPivotTable(catalogueProducts, getSanitizedAgeGroup, pivotTotalsObj, pivotTotalsObj);
  }, [catalogueProducts, pivotTotalsObj]);

  const pivotDivisionsData = useMemo(() => {
    return buildPivotTable(catalogueProducts, (p) => p.division, pivotTotalsObj, pivotTotalsObj);
  }, [catalogueProducts, pivotTotalsObj]);

  const pivotGendersData = useMemo(() => {
    return buildPivotTable(catalogueProducts, (p) => p.gender, pivotTotalsObj, pivotTotalsObj);
  }, [catalogueProducts, pivotTotalsObj]);

  const pivotColorsData = useMemo(() => {
    return buildPivotTable(catalogueProducts, (p) => p.color || 'Sans Couleur', pivotTotalsObj, pivotTotalsObj);
  }, [catalogueProducts, pivotTotalsObj]);

  const pivotFranchisesData = useMemo(() => {
    return buildPivotTable(catalogueProducts, (p) => p.salesLine || 'Autre', pivotTotalsObj, pivotTotalsObj);
  }, [catalogueProducts, pivotTotalsObj]);

  const hasActiveFilters = 
    filters.search !== '' ||
    filters.sport !== 'all' ||
    filters.division !== 'all' ||
    (filters.ageGroup && filters.ageGroup !== 'all') ||
    filters.gender !== 'all' ||
    filters.category !== 'all' ||
    (filters.productType && filters.productType !== 'all') ||
    (filters.salesLine && filters.salesLine !== 'all') ||
    (filters.color && filters.color !== 'all') ||
    filters.performanceTier !== 'all';

  const resetAllFilters = () => {
    setFilters({
      search: '',
      sport: 'all',
      division: 'all',
      ageGroup: 'all',
      gender: 'all',
      category: 'all',
      productType: 'all',
      salesLine: 'all',
      color: 'all',
      performanceTier: 'all',
      sortBy: 'salesValue',
      sortOrder: 'desc',
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-sm space-y-3.5 shadow-sm">
      
      {/* Top Bar: Search + Master Sport Selector + Reset button */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Rechercher par Article No. (B75806...), Nom, Franchise, Sport, Couleur..."
            value={filters.search}
            onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
            className="w-full pl-9 pr-8 py-2 bg-zinc-950 border border-zinc-800 text-zinc-100 placeholder-zinc-500 text-xs rounded-xs outline-none focus:border-amber-400 transition-colors"
          />
          {filters.search && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, search: '' }))}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Master Sport Quick Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-400" />
            Sport :
          </span>
          <button
            onClick={() => setFilters((prev) => ({ ...prev, sport: 'all' }))}
            className={`px-2.5 py-1 text-xs font-mono rounded-xs shrink-0 transition-colors ${
              filters.sport === 'all'
                ? 'bg-amber-400 text-black font-bold'
                : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
            }`}
          >
            Tous ({availableSports.length})
          </button>
          {availableSports.map((sp) => (
            <button
              key={sp}
              onClick={() => setFilters((prev) => ({ ...prev, sport: sp }))}
              className={`px-2.5 py-1 text-xs font-mono rounded-xs shrink-0 transition-colors ${
                filters.sport === sp
                  ? 'bg-amber-400 text-black font-bold'
                  : 'bg-zinc-950 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              {sp}
            </button>
          ))}
        </div>

        {/* Action Buttons: Table Pivot des Filtres + Reset + Counters */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShowPivotSummary(!showPivotSummary)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-xs border transition-colors ${
              showPivotSummary 
                ? 'bg-amber-400/10 text-amber-300 border-amber-500/50' 
                : 'bg-zinc-950 text-zinc-300 hover:text-white hover:bg-zinc-850 border-zinc-800'
            }`}
            title="Afficher la table pivot complète de tous les éléments extraits du fichier"
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Table Pivot Fichier</span>
            {showPivotSummary ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <span className="text-xs font-mono text-zinc-400 px-1">
            <strong className="text-white">{totalFiltered}</strong> / {totalAll}
          </span>

          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/60 rounded-xs transition-colors"
              title="Réinitialiser tous les filtres"
            >
              <X className="w-3 h-3" />
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Interactive File Pivot Summary Drawer (Table Pivot de tous les éléments du fichier) */}
      {showPivotSummary && (
        <div className="p-3.5 bg-zinc-950 border border-amber-500/30 rounded-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <TableIcon className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                Table Pivot d'Extraction du Fichier
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                (Cliquez sur une ligne pour appliquer immédiatement le filtre)
              </span>
            </div>
            {/* Dimensions Tabs */}
            <div className="flex items-center gap-1">
              {[
                { id: 'sport', label: `Sports (${availableSports.length})` },
                { id: 'ageGroup', label: `Âges / Tranches (${availableAgeGroups.length})` },
                { id: 'division', label: `Divisions (${availableDivisions.length})` },
                { id: 'gender', label: `Genres (${availableGenders.length})` },
                { id: 'color', label: `Couleurs (${availableColors.length})` },
                { id: 'salesLine', label: `Franchises (${availableSalesLines.length})` },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setPivotActiveTab(t.id as any)}
                  className={`px-2 py-0.5 text-[11px] font-mono rounded-xs transition-colors ${
                    pivotActiveTab === t.id
                      ? 'bg-amber-400 text-black font-semibold'
                      : 'text-zinc-400 hover:text-white bg-zinc-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pivot Table Content */}
          <div className="overflow-x-auto max-h-60 scrollbar-thin">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-zinc-900/80 text-zinc-400 text-[10px] uppercase sticky top-0">
                <tr>
                  <th className="py-1.5 px-2.5">Élément Pivot</th>
                  <th className="py-1.5 px-2.5 text-right">Articles</th>
                  <th className="py-1.5 px-2.5 text-right">Achats CA</th>
                  <th className="py-1.5 px-2.5 text-right">Ventes CA</th>
                  <th className="py-1.5 px-2.5 text-right">STR %</th>
                  <th className="py-1.5 px-2.5 text-right">Poids Vtes</th>
                  <th className="py-1.5 px-2.5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {(() => {
                  let activeData = pivotSportsData;
                  let filterKey: keyof FilterState = 'sport';
                  if (pivotActiveTab === 'ageGroup') {
                    activeData = pivotAgeGroupsData;
                    filterKey = 'ageGroup';
                  } else if (pivotActiveTab === 'division') {
                    activeData = pivotDivisionsData;
                    filterKey = 'division';
                  } else if (pivotActiveTab === 'gender') {
                    activeData = pivotGendersData;
                    filterKey = 'gender';
                  } else if (pivotActiveTab === 'color') {
                    activeData = pivotColorsData;
                    filterKey = 'color';
                  } else if (pivotActiveTab === 'salesLine') {
                    activeData = pivotFranchisesData;
                    filterKey = 'salesLine';
                  }

                  return activeData.map((row) => {
                    const isSelected = (filters[filterKey] as string) === row.name;
                    return (
                      <tr 
                        key={row.name}
                        onClick={() => {
                          setFilters((prev) => ({
                            ...prev,
                            [filterKey]: isSelected ? 'all' : row.name,
                          }));
                        }}
                        className={`hover:bg-zinc-850/80 cursor-pointer transition-colors ${
                          isSelected ? 'bg-amber-400/10 font-bold text-amber-300' : 'text-zinc-200'
                        }`}
                      >
                        <td className="py-1.5 px-2.5 flex items-center gap-2">
                          {pivotActiveTab === 'color' && renderColorDot(row.name)}
                          <span>{row.name}</span>
                          {isSelected && <span className="text-[10px] text-amber-400 font-normal">[Filtre Actif]</span>}
                        </td>
                        <td className="py-1.5 px-2.5 text-right text-zinc-400">{row.count}</td>
                        <td className="py-1.5 px-2.5 text-right text-amber-400/90">{formatCurrency(row.buyValue)}</td>
                        <td className="py-1.5 px-2.5 text-right text-emerald-400">{formatCurrency(row.salesValue)}</td>
                        <td className="py-1.5 px-2.5 text-right font-bold text-white">{row.sellThroughRate}%</td>
                        <td className="py-1.5 px-2.5 text-right text-zinc-400">{row.globalSalesValueShare}%</td>
                        <td className="py-1.5 px-2.5 text-center">
                          <span className="text-[10px] text-amber-400 underline">
                            {isSelected ? 'Désactiver' : 'Filtrer'}
                          </span>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8-Column Dynamic Pivot Filter Dropdowns */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-2.5 pt-1 border-t border-zinc-800/80">
        
        {/* 1. Sports Category */}
        <div>
          <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
            1. Sport *
          </label>
          <select
            value={filters.sport}
            onChange={(e) => setFilters((prev) => ({ ...prev, sport: e.target.value }))}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs py-1.5 px-2 rounded-xs outline-none focus:border-amber-400 transition-colors truncate"
          >
            <option value="all">Tous les Sports ({availableSports.length})</option>
            {availableSports.map((sp) => {
              const activeCount = products.filter((p) => p.sport === sp).length;
              return (
                <option key={sp} value={sp}>
                  {sp} ({activeCount > 0 ? `${activeCount} art.` : '0 art.'} | {computeOptionStats('sport', sp)})
                </option>
              );
            })}
          </select>
        </div>

        {/* 2. Division */}
        <div>
          <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
            2. Division
          </label>
          <select
            value={filters.division}
            onChange={(e) => setFilters((prev) => ({ ...prev, division: e.target.value }))}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs py-1.5 px-2 rounded-xs outline-none focus:border-amber-400 transition-colors truncate"
          >
            <option value="all">Toutes ({availableDivisions.length})</option>
            {availableDivisions.map((div) => {
              const activeCount = products.filter((p) => p.division === div).length;
              return (
                <option key={div} value={div}>
                  {div} ({activeCount > 0 ? `${activeCount} art.` : '0 art.'} | {computeOptionStats('division', div)})
                </option>
              );
            })}
          </select>
        </div>

        {/* 3. Age Group (ADULT, JUNIOR, KIDS, INFANT) */}
        <div>
          <label className="block text-[10px] font-mono text-cyan-400 mb-1 uppercase tracking-wider font-semibold">
            3. Tranche Âge
          </label>
          <select
            value={filters.ageGroup || 'all'}
            onChange={(e) => setFilters((prev) => ({ ...prev, ageGroup: e.target.value }))}
            className="w-full bg-zinc-950 border border-zinc-800 text-cyan-300 text-xs py-1.5 px-2 rounded-xs outline-none focus:border-cyan-400 transition-colors truncate"
          >
            <option value="all">Tous âges ({availableAgeGroups.length})</option>
            {availableAgeGroups.map((ag) => {
              const activeCount = products.filter((p) => getSanitizedAgeGroup(p) === ag).length;
              return (
                <option key={ag} value={ag}>
                  {ag} ({activeCount > 0 ? `${activeCount} art.` : '0 art.'} | {computeOptionStats('ageGroup', ag)})
                </option>
              );
            })}
          </select>
        </div>

        {/* 4. Gender (Men, Women, Unisex, Kids, Infant) */}
        <div>
          <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
            4. Genre
          </label>
          <select
            value={filters.gender}
            onChange={(e) => setFilters((prev) => ({ ...prev, gender: e.target.value }))}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs py-1.5 px-2 rounded-xs outline-none focus:border-amber-400 transition-colors truncate"
          >
            <option value="all">Tous genres ({availableGenders.length})</option>
            {availableGenders.map((gen) => {
              const label = gen === 'Women' ? 'Femme / Women' : gen === 'Men' ? 'Homme / Men' : gen;
              const activeCount = products.filter((p) => p.gender === gen).length;
              return (
                <option key={gen} value={gen}>
                  {label} ({activeCount > 0 ? `${activeCount} art.` : '0 art.'} | {computeOptionStats('gender', gen)})
                </option>
              );
            })}
          </select>
        </div>

        {/* 5. Product Type */}
        <div>
          <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
            5. Product Type
          </label>
          <select
            value={filters.productType || 'all'}
            onChange={(e) => setFilters((prev) => ({ ...prev, productType: e.target.value }))}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs py-1.5 px-2 rounded-xs outline-none focus:border-amber-400 transition-colors truncate"
          >
            <option value="all">Tous types ({availableProductTypes.length})</option>
            {availableProductTypes.map((pt) => {
              const activeCount = products.filter((p) => p.productType === pt).length;
              return (
                <option key={pt} value={pt}>
                  {pt} ({activeCount > 0 ? `${activeCount} art.` : '0 art.'})
                </option>
              );
            })}
          </select>
        </div>

        {/* 6. Sales Line / Franchise */}
        <div>
          <label className="block text-[10px] font-mono text-zinc-400 mb-1 uppercase tracking-wider">
            6. Franchise
          </label>
          <select
            value={filters.salesLine || 'all'}
            onChange={(e) => setFilters((prev) => ({ ...prev, salesLine: e.target.value }))}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs py-1.5 px-2 rounded-xs outline-none focus:border-amber-400 transition-colors truncate"
          >
            <option value="all">Toutes ({availableSalesLines.length})</option>
            {availableSalesLines.map((sl) => {
              const activeCount = products.filter((p) => p.salesLine === sl).length;
              return (
                <option key={sl} value={sl}>
                  {sl} ({activeCount > 0 ? `${activeCount} art.` : '0 art.'})
                </option>
              );
            })}
          </select>
        </div>

        {/* 7. Color / Couleur */}
        <div>
          <label className="block text-[10px] font-mono text-amber-400 mb-1 uppercase tracking-wider font-semibold">
            7. Couleur
          </label>
          <select
            value={filters.color || 'all'}
            onChange={(e) => setFilters((prev) => ({ ...prev, color: e.target.value }))}
            className="w-full bg-zinc-950 border border-zinc-800 text-amber-300 text-xs py-1.5 px-2 rounded-xs outline-none focus:border-amber-400 transition-colors truncate"
          >
            <option value="all">Toutes ({availableColors.length})</option>
            {availableColors.map((col) => {
              const activeCount = products.filter((p) => p.color?.toLowerCase() === col.toLowerCase()).length;
              return (
                <option key={col} value={col}>
                  {col} ({activeCount > 0 ? `${activeCount} art.` : '0 art.'})
                </option>
              );
            })}
          </select>
        </div>

        {/* 8. Classement / Tri */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
              8. Classement
            </label>
            <button
              onClick={() => setFilters((prev) => ({ 
                ...prev, 
                sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' 
              }))}
              className="text-[10px] font-mono text-amber-400 hover:text-white transition-colors cursor-pointer"
              title={`Ordre actuel : ${filters.sortOrder === 'desc' ? 'Décroissant (cliquer pour inverser)' : 'Croissant (cliquer pour inverser)'}`}
            >
              {filters.sortOrder === 'desc' ? '↓ Décr.' : '↑ Croiss.'}
            </button>
          </div>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters((prev) => ({ 
              ...prev, 
              sortBy: e.target.value as FilterState['sortBy']
            }))}
            className="w-full bg-zinc-950 border border-zinc-800 text-amber-400 font-semibold text-xs py-1.5 px-2 rounded-xs outline-none focus:border-amber-400 transition-colors truncate"
          >
            <option value="salesValue">Ventes CA (Valeur)</option>
            <option value="salesQty">Ventes Volume (Unités)</option>
            <option value="sellThroughRate">Taux STR %</option>
            <option value="flopScore">Risque Flop (Stock &amp; STR)</option>
            <option value="stockValue">Stock en Valeur</option>
            <option value="stockQty">Stock Résiduel (U)</option>
            <option value="buyQty">Achats Volume</option>
            <option value="name">Nom Produit (A-Z)</option>
          </select>
        </div>

      </div>

      {/* Global Impact Summary Strip: Comparison of Buy Weight vs Sales Weight for current selection */}
      <div className="bg-zinc-950 px-3.5 py-2 rounded-xs border border-zinc-850 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-zinc-400">
          <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            Poids sélection au Global :{' '}
            <strong className="text-amber-400">{filteredTotals.globalBuyShare}%</strong> des Achats Totaux ({formatCurrency(filteredTotals.buyValue)})
            {' '}vs{' '}
            <strong className="text-emerald-400">{filteredTotals.globalSalesShare}%</strong> des Ventes CA ({formatCurrency(filteredTotals.salesValue)})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-zinc-500">&bull;</span>
          <span className="text-zinc-400">
            STR Moyen : <strong className={filteredTotals.str >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{filteredTotals.str}%</strong>
          </span>
          <span className="text-zinc-500">&bull;</span>
          <span className="text-zinc-400">
            Écart Poids (Δ) :{' '}
            <strong className={filteredTotals.deltaShare >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {filteredTotals.deltaShare >= 0 ? `+${filteredTotals.deltaShare}` : filteredTotals.deltaShare}%
            </strong>
          </span>
        </div>
      </div>

    </div>
  );
};
