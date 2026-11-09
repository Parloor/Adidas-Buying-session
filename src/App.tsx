/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Header, AppTab } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { MacroOverviewView } from './components/MacroOverviewView';
import { SportCategoryView } from './components/SportCategoryView';
import { SizeWeightAnalysisView } from './components/SizeWeightAnalysisView';
import { RankingView } from './components/RankingView';
import { ArticleDetailModal } from './components/ArticleDetailModal';
import { DataHubModal } from './components/DataHubModal';
import { SharePublishModal } from './components/SharePublishModal';
import { INITIAL_ADIDAS_FW25_PRODUCTS } from './data/mockAdidasFW25';
import { ProductItem, FilterState, PublishedSessionMeta, PublishedSessionData } from './types/merchandising';
import { calculateOverallKPIs, exportProductsToCSV, downloadSampleCSV, setActiveCurrency } from './utils/csvParser';
import { calculateFlopScore, getSanitizedAgeGroup } from './utils/pivotEngine';
import { fetchSessionById, buildShareUrl } from './utils/sessionService';
import { Globe, Share2, AlertCircle, CheckCircle2, RefreshCw, X } from 'lucide-react';

export default function App() {
  const [products, setProducts] = useState<ProductItem[]>(INITIAL_ADIDAS_FW25_PRODUCTS);
  const [isCustomDataLoaded, setIsCustomDataLoaded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<AppTab>('macro');
  const [selectedSport, setSelectedSport] = useState<string>('Originals');
  
  // Published Session State
  const [currentSession, setCurrentSession] = useState<PublishedSessionMeta | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(false);
  const [sessionToast, setSessionToast] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Modals state
  const [selectedProductModal, setSelectedProductModal] = useState<ProductItem | null>(null);
  const [sizeCurveProduct, setSizeCurveProduct] = useState<ProductItem | null>(null);
  const [isDataHubOpen, setIsDataHubOpen] = useState<boolean>(false);

  // Filters state (Sport Category is first master filter)
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    sport: 'all', // Master filter
    division: 'all',
    ageGroup: 'all', // Age Group filter (ADULT, JUNIOR, KIDS)
    gender: 'all',
    category: 'all',
    productType: 'all',
    salesLine: 'all',
    color: 'all', // Color filter
    performanceTier: 'all',
    sortBy: 'salesValue',
    sortOrder: 'desc',
  });

  // Load session from URL parameter (?session=XYZ) on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session');
    if (sessionId) {
      loadSession(sessionId);
    }
  }, []);

  const loadSession = async (sessionId: string) => {
    setIsLoadingSession(true);
    setSessionError(null);
    try {
      const data = await fetchSessionById(sessionId);
      if (data && data.products && data.products.length > 0) {
        setProducts(data.products);
        setCurrentSession(data);
        setIsCustomDataLoaded(true);
        if (data.currency) {
          setActiveCurrency(data.currency);
        }
        setSessionToast(`Session "${data.title}" chargée avec succès (${data.productCount} références).`);
        setTimeout(() => setSessionToast(null), 4500);
      } else {
        setSessionError(`La session "${sessionId}" est introuvable ou a été supprimée.`);
      }
    } catch (err: any) {
      setSessionError(`Impossible de charger la session "${sessionId}". Vérifiez la connexion.`);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products
      .filter((item) => {
        // Search filter
        if (filters.search.trim()) {
          const q = filters.search.toLowerCase().trim();
          const matchSku = item.sku.toLowerCase().includes(q);
          const matchName = item.name.toLowerCase().includes(q);
          const matchCategory = item.category.toLowerCase().includes(q);
          const matchSport = item.sport.toLowerCase().includes(q);
          const matchProductType = item.productType ? item.productType.toLowerCase().includes(q) : false;
          const matchSalesLine = item.salesLine ? item.salesLine.toLowerCase().includes(q) : false;

          if (!matchSku && !matchName && !matchCategory && !matchSport && !matchProductType && !matchSalesLine) {
            return false;
          }
        }

        // Master Filter: Sport Category
        if (filters.sport !== 'all' && item.sport !== filters.sport) {
          return false;
        }

        // Division (Footwear, Apparel, Accessories...)
        if (filters.division !== 'all' && item.division !== filters.division) {
          return false;
        }

        // Age Group (ADULT, JUNIOR, KIDS, INFANT...)
        if (filters.ageGroup && filters.ageGroup !== 'all') {
          const itemAg = getSanitizedAgeGroup(item);
          if (itemAg !== filters.ageGroup.toUpperCase().trim()) {
            return false;
          }
        }

        // Gender (Robust matching for Women / Woman / Female)
        if (filters.gender !== 'all') {
          const gLower = (item.gender || '').toLowerCase();
          const fLower = filters.gender.toLowerCase();
          const isFilterWomen = fLower === 'women' || fLower === 'woman' || fLower === 'female';
          const isItemWomen = gLower === 'women' || gLower === 'woman' || gLower === 'female';
          if (isFilterWomen) {
            if (!isItemWomen) return false;
          } else if (item.gender !== filters.gender) {
            return false;
          }
        }

        // Category / Product Group
        if (filters.category !== 'all' && item.category !== filters.category) {
          return false;
        }

        // Product Type
        if (filters.productType && filters.productType !== 'all' && item.productType !== filters.productType) {
          return false;
        }

        // Sales Line
        if (filters.salesLine && filters.salesLine !== 'all' && item.salesLine !== filters.salesLine) {
          return false;
        }

        // Color filter
        if (filters.color && filters.color !== 'all') {
          const c = item.color?.trim();
          if (!c || c.toLowerCase() !== filters.color.toLowerCase()) {
            return false;
          }
        }

        // Performance Tier
        if (filters.performanceTier === 'high' && item.sellThroughRate < 80) {
          return false;
        }
        if (filters.performanceTier === 'medium' && (item.sellThroughRate < 60 || item.sellThroughRate >= 80)) {
          return false;
        }
        if (filters.performanceTier === 'low' && item.sellThroughRate >= 60) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA = 0;
        let valB = 0;

        switch (filters.sortBy) {
          case 'salesValue':
            valA = a.totalSalesValue || 0;
            valB = b.totalSalesValue || 0;
            break;
          case 'salesQty':
            valA = a.totalSalesQty || 0;
            valB = b.totalSalesQty || 0;
            break;
          case 'sellThroughRate':
            valA = a.sellThroughRate || 0;
            valB = b.sellThroughRate || 0;
            break;
          case 'buyQty':
            valA = a.totalBuyQty || 0;
            valB = b.totalBuyQty || 0;
            break;
          case 'stockQty':
            valA = a.stockQty || 0;
            valB = b.stockQty || 0;
            break;
          case 'stockValue':
            valA = a.stockValue || ((a.stockQty || 0) * (a.wholesalePrice || 0));
            valB = b.stockValue || ((b.stockQty || 0) * (b.wholesalePrice || 0));
            break;
          case 'flopScore':
            valA = calculateFlopScore(a);
            valB = calculateFlopScore(b);
            break;
          case 'name':
            return filters.sortOrder === 'asc' 
              ? a.name.localeCompare(b.name, 'fr', { numeric: true }) 
              : b.name.localeCompare(a.name, 'fr', { numeric: true });
          default:
            valA = a.totalSalesValue || 0;
            valB = b.totalSalesValue || 0;
        }

        return filters.sortOrder === 'asc' ? valA - valB : valB - valA;
      });
  }, [products, filters]);

  // Overall KPIs on currently filtered set
  const currentKPIs = useMemo(() => {
    return calculateOverallKPIs(filteredProducts);
  }, [filteredProducts]);

  // Handlers
  const handleApplyCustomProducts = (importedProducts: ProductItem[]) => {
    setProducts(importedProducts);
    setIsCustomDataLoaded(true);
    setCurrentSession(null); // Unsaved session until published
    setActiveTab('macro');
  };

  const handlePublishDirectlyFromModal = (importedProducts: ProductItem[]) => {
    setProducts(importedProducts);
    setIsCustomDataLoaded(true);
    setCurrentSession(null);
    setActiveTab('macro');
    setIsShareModalOpen(true);
  };

  const handleSessionPublished = (newSession: PublishedSessionData) => {
    setCurrentSession(newSession);
    setProducts(newSession.products);
    setIsCustomDataLoaded(true);
    
    // Sync browser URL cleanly without reload
    const newUrl = `${window.location.pathname}?session=${encodeURIComponent(newSession.id)}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    setSessionToast(`Session "${newSession.title}" publiée avec succès ! Lien public actif.`);
    setTimeout(() => setSessionToast(null), 4500);
  };

  const handleSelectPublishedSession = (session: PublishedSessionData) => {
    setCurrentSession(session);
    setProducts(session.products);
    setIsCustomDataLoaded(true);
    if (session.currency) {
      setActiveCurrency(session.currency);
    }

    const newUrl = `${window.location.pathname}?session=${encodeURIComponent(session.id)}`;
    window.history.pushState({ path: newUrl }, '', newUrl);

    setSessionToast(`Session "${session.title}" chargée.`);
    setTimeout(() => setSessionToast(null), 3500);
  };

  const handleResetData = () => {
    setProducts(INITIAL_ADIDAS_FW25_PRODUCTS);
    setIsCustomDataLoaded(false);
    setCurrentSession(null);
    window.history.pushState({}, '', window.location.pathname);
  };

  const handleExportCSV = () => {
    exportProductsToCSV(filteredProducts, `Adidas_FW25_Buying_KPIs_${new Date().toISOString().split('T')[0]}.csv`);
  };

  const handleOpenProductSizeCurve = (product: ProductItem) => {
    setSizeCurveProduct(product);
    setActiveTab('sizeWeights');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      
      {/* Header with Brand Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDataHub={() => setIsDataHubOpen(true)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onResetData={handleResetData}
        onExportCSV={handleExportCSV}
        onDownloadTemplate={downloadSampleCSV}
        totalProducts={products.length}
        isCustomDataLoaded={isCustomDataLoaded}
        currentSession={currentSession}
      />

      {/* Persistent Session Information Banner if viewing a published session */}
      {currentSession && (
        <div className="bg-emerald-950/40 border-b border-emerald-500/30 px-4 py-2 text-xs">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold text-emerald-300 font-display">Session Publique Active :</span>
              <span className="font-bold text-white">{currentSession.title}</span>
              <span className="text-zinc-400 text-[11px] hidden md:inline">
                &bull; Publiée par <strong className="text-zinc-200">{currentSession.author || 'Équipe Merchandising'}</strong> ({products.length} articles)
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] font-mono">
              <button 
                onClick={() => setIsShareModalOpen(true)}
                className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xs transition-colors flex items-center gap-1 font-semibold"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Partager / Lien Public</span>
              </button>

              <button 
                onClick={() => setIsShareModalOpen(true)}
                className="px-2 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-xs transition-colors"
              >
                Catalogue Sessions
              </button>

              <button 
                onClick={handleResetData}
                className="text-zinc-500 hover:text-zinc-300 p-1 rounded-xs"
                title="Quitter la session"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading banner */}
      {isLoadingSession && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-300 flex items-center justify-center gap-2 font-mono">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
          <span>Chargement de la session partagée depuis le serveur...</span>
        </div>
      )}

      {/* Toast Notification */}
      {sessionToast && (
        <div className="bg-emerald-900/80 border-b border-emerald-500 px-4 py-2 text-xs text-emerald-200 flex items-center justify-between font-mono animate-in slide-in-from-top duration-200">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{sessionToast}</span>
            </div>
            <button onClick={() => setSessionToast(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error Notification */}
      {sessionError && (
        <div className="bg-rose-950/80 border-b border-rose-500 px-4 py-2 text-xs text-rose-200 flex items-center justify-between font-mono">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400" />
              <span>{sessionError}</span>
            </div>
            <button onClick={() => setSessionError(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Global Multi-Level Cascading Filter Bar (Master: Sport Category) */}
        <FilterBar
          filters={filters}
          setFilters={setFilters}
          totalFiltered={filteredProducts.length}
          totalAll={products.length}
          products={filteredProducts}
          allProducts={products}
        />

        {/* Page I: Vue Macro (Volumes, Poids Achats vs Ventes, Sell-Through) */}
        {activeTab === 'macro' && (
          <MacroOverviewView
            products={filteredProducts}
            kpis={currentKPIs}
            onNavigateToSportCategory={(sp) => {
              const targetSport = sp || 'all';
              setSelectedSport(targetSport);
              setFilters((prev) => ({
                ...prev,
                sport: targetSport,
                division: 'all',
                ageGroup: 'all',
                gender: 'all',
                category: 'all',
                productType: 'all',
                salesLine: 'all',
              }));
              setActiveTab('sportCategory');
            }}
            onNavigateToSizes={() => setActiveTab('sizeWeights')}
          />
        )}

        {/* Page II: Vue par Sport Category (Divisions tout, Age Group tout, Gender tout, Product Type tout, Sales Line tout, Tops & Flops) */}
        {activeTab === 'sportCategory' && (
          <SportCategoryView
            products={products}
            allProducts={products}
            initialSport={filters.sport !== 'all' ? filters.sport : selectedSport}
            onSportChange={(sp) => {
              setSelectedSport(sp);
              setFilters((prev) => ({ ...prev, sport: sp }));
            }}
            onSelectProduct={(p) => setSelectedProductModal(p)}
            onNavigateToSizes={(p) => {
              if (p) setSizeCurveProduct(p);
              setActiveTab('sizeWeights');
            }}
          />
        )}

        {/* Page III: Comparatif à la Taille (Poids Ventes vs Achats à la taille) */}
        {activeTab === 'sizeWeights' && (
          <SizeWeightAnalysisView
            products={filteredProducts}
            selectedProduct={sizeCurveProduct}
            onSelectProduct={(p) => setSelectedProductModal(p)}
          />
        )}

        {/* Page IV: Palmarès & Ranking Articles */}
        {activeTab === 'ranking' && (
          <RankingView
            products={filteredProducts}
            allProducts={products}
            filters={filters}
            setFilters={setFilters}
            onSelectProduct={(p) => setSelectedProductModal(p)}
            onSelectProductSizeCurve={handleOpenProductSizeCurve}
          />
        )}

      </main>

      {/* Article 360° Detail Modal */}
      <ArticleDetailModal
        product={selectedProductModal}
        onClose={() => setSelectedProductModal(null)}
        onOpenSizeCurveView={handleOpenProductSizeCurve}
      />

      {/* Data Hub / CSV Upload Modal */}
      <DataHubModal
        isOpen={isDataHubOpen}
        onClose={() => setIsDataHubOpen(false)}
        onApplyProducts={handleApplyCustomProducts}
        onPublishDirectly={handlePublishDirectlyFromModal}
      />

      {/* Multi-user Sharing & Session Publishing Modal */}
      <SharePublishModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        currentProducts={products}
        currentSession={currentSession}
        isCustomDataLoaded={isCustomDataLoaded}
        onSelectSession={handleSelectPublishedSession}
        onSessionPublished={handleSessionPublished}
      />

      {/* Subtle Merchandising Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-4 text-center text-xs text-zinc-500 font-mono">
        ADIDAS BUYING INTELLIGENCE &bull; FW25 &bull; PARTAGE PUBLIC MULTI-UTILISATEURS &bull; POIDS ACHATS VS VENTES
      </footer>
    </div>
  );
}
