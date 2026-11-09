import { 
  BarChart3, 
  Trophy, 
  Ruler, 
  UploadCloud, 
  Download, 
  FileSpreadsheet, 
  RotateCcw,
  Sparkles,
  Layers,
  Scale,
  TrendingUp,
  Share2,
  Globe
} from 'lucide-react';
import { activeAppCurrency } from '../utils/csvParser';
import { PublishedSessionMeta } from '../types/merchandising';

export type AppTab = 'macro' | 'sportCategory' | 'sizeWeights' | 'ranking';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  onOpenDataHub: () => void;
  onOpenShareModal: () => void;
  onResetData: () => void;
  onExportCSV: () => void;
  onDownloadTemplate: () => void;
  totalProducts: number;
  isCustomDataLoaded: boolean;
  currentSession: PublishedSessionMeta | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenDataHub,
  onOpenShareModal,
  onResetData,
  onExportCSV,
  onDownloadTemplate,
  totalProducts,
  isCustomDataLoaded,
  currentSession,
}) => {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Brand Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            {/* Adidas 3-Stripes Mark */}
            <div className="flex items-end gap-1 h-9 w-9 bg-zinc-900 border border-zinc-700/80 p-1.5 rounded-xs shadow-inner" title="Adidas Merchandising Intelligence">
              <span className="w-1.5 h-3 bg-white -skew-x-12 rounded-xs"></span>
              <span className="w-1.5 h-5 bg-white -skew-x-12 rounded-xs"></span>
              <span className="w-1.5 h-7 bg-amber-400 -skew-x-12 rounded-xs"></span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold tracking-widest uppercase text-amber-400">
                  ADIDAS BUYING SESSION
                </span>
                <span className="text-zinc-600">/</span>
                <span className="text-xs font-mono tracking-wider text-zinc-400 uppercase">
                  FW25 PERFORMANCE SUITE
                </span>
                <span className="text-[10px] font-mono bg-zinc-900 text-amber-300 border border-zinc-700 px-1.5 py-0.2 rounded">
                  Devise: {activeAppCurrency}
                </span>
                {currentSession ? (
                  <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1">
                    <Globe className="w-3 h-3 text-emerald-400" />
                    <span>EN LIGNE: {currentSession.title}</span>
                  </span>
                ) : isCustomDataLoaded ? (
                  <span className="text-[10px] font-mono bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                    IMPORT LOCAL (NON PUBLIÉ)
                  </span>
                ) : null}
              </div>
              <h1 className="text-lg sm:text-xl font-bold font-display tracking-tight text-white flex items-center gap-2">
                Tableau de Bord des Achats FW25
                <span className="text-xs font-normal text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-xs">
                  {totalProducts} références
                </span>
              </h1>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onOpenShareModal}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all rounded-xs shadow-md ${
                currentSession
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                  : 'bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-amber-200 text-black'
              }`}
              title="Générer un lien public ou consulter les sessions partagées"
            >
              <Share2 className="w-4 h-4" />
              <span>{currentSession ? 'Partager le Lien Public' : 'Publier en Ligne / Partager'}</span>
            </button>

            <button
              onClick={onOpenDataHub}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-700/80 transition-colors rounded-xs shadow-sm"
              title="Importer ou coller directement vos données d'extraction"
            >
              <UploadCloud className="w-4 h-4 text-amber-400" />
              <span>Importer CSV</span>
            </button>

            <button
              onClick={onDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 transition-colors rounded-xs"
              title="Télécharger le modèle avec les en-têtes officiels"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Modèle CSV</span>
            </button>

            <button
              onClick={onExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 transition-colors rounded-xs"
              title="Exporter les KPIs en CSV"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Exporter</span>
            </button>

            {isCustomDataLoaded && (
              <button
                onClick={onResetData}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 hover:bg-zinc-800 border border-zinc-800 transition-colors rounded-xs"
                title="Revenir aux données initiales"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Clean Dedicated Pages (Tabs) as requested */}
        <nav className="flex items-center space-x-1 sm:space-x-2 mt-3.5 overflow-x-auto pb-1 scrollbar-none border-t border-zinc-900 pt-2">
          
          {/* Page I: Vue Macro */}
          <button
            onClick={() => setActiveTab('macro')}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xs border transition-all ${
              activeTab === 'macro'
                ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-transparent font-medium'
            }`}
          >
            <BarChart3 className={`w-4 h-4 ${activeTab === 'macro' ? 'text-black' : 'text-amber-400'}`} />
            <span>I. Vue Macro (Volumes &amp; Poids)</span>
          </button>

          {/* Page II: Vue par Sport Category */}
          <button
            onClick={() => setActiveTab('sportCategory')}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xs border transition-all ${
              activeTab === 'sportCategory'
                ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-transparent font-medium'
            }`}
          >
            <TrendingUp className={`w-4 h-4 ${activeTab === 'sportCategory' ? 'text-black' : 'text-amber-400'}`} />
            <span>II. Par Sport Category (Tout)</span>
          </button>

          {/* Page III: Comparatif à la Taille */}
          <button
            onClick={() => setActiveTab('sizeWeights')}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xs border transition-all ${
              activeTab === 'sizeWeights'
                ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-transparent font-medium'
            }`}
          >
            <Scale className={`w-4 h-4 ${activeTab === 'sizeWeights' ? 'text-black' : 'text-amber-400'}`} />
            <span>III. Comparatif à la Taille</span>
          </button>

          {/* Page IV: Palmarès & Ranking Articles */}
          <button
            onClick={() => setActiveTab('ranking')}
            className={`flex items-center gap-2 px-4 py-2 text-xs rounded-xs border transition-all ${
              activeTab === 'ranking'
                ? 'bg-amber-400 text-black border-amber-300 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border-transparent font-medium'
            }`}
          >
            <Trophy className={`w-4 h-4 ${activeTab === 'ranking' ? 'text-black' : 'text-amber-400'}`} />
            <span>IV. Palmarès Articles</span>
          </button>

        </nav>
      </div>
    </header>
  );
};
