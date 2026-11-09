import React, { useState, useEffect } from 'react';
import {
  X,
  Share2,
  Globe,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Layers,
  Sparkles,
  Users,
  Calendar,
  AlertCircle,
  FileCheck,
  RefreshCw,
  Clock,
  ArrowRight
} from 'lucide-react';
import { ProductItem, PublishedSessionMeta, PublishedSessionData } from '../types/merchandising';
import { 
  fetchPublishedSessions, 
  fetchSessionById,
  publishSession, 
  deleteSession, 
  buildShareUrl 
} from '../utils/sessionService';
import { activeAppCurrency, formatCurrency } from '../utils/csvParser';

interface SharePublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProducts: ProductItem[];
  currentSession: PublishedSessionMeta | null;
  isCustomDataLoaded: boolean;
  onSelectSession: (session: PublishedSessionData) => void;
  onSessionPublished: (newSession: PublishedSessionData) => void;
}

export const SharePublishModal: React.FC<SharePublishModalProps> = ({
  isOpen,
  onClose,
  currentProducts,
  currentSession,
  isCustomDataLoaded,
  onSelectSession,
  onSessionPublished,
}) => {
  const [activeTab, setActiveTab] = useState<'share' | 'catalog' | 'guide'>('share');
  
  // Publish form state
  const [sessionTitle, setSessionTitle] = useState<string>('');
  const [authorName, setAuthorName] = useState<string>('Équipe Merchandising');
  const [description, setDescription] = useState<string>('');
  const [customSlug, setCustomSlug] = useState<string>('');
  
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Catalog state
  const [sessionsList, setSessionsList] = useState<PublishedSessionMeta[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Initialize form default title when opening
  useEffect(() => {
    if (isOpen) {
      if (currentSession) {
        setPublishedUrl(buildShareUrl(currentSession.id));
        setSessionTitle(currentSession.title);
        setDescription(currentSession.description || '');
        setAuthorName(currentSession.author || 'Équipe Merchandising');
      } else {
        const dateStr = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        setSessionTitle(`Session Achats FW25 - ${dateStr}`);
        setPublishedUrl('');
      }
      loadCatalog();
    }
  }, [isOpen, currentSession]);

  const loadCatalog = async () => {
    setIsLoadingCatalog(true);
    try {
      const list = await fetchPublishedSessions();
      setSessionsList(list);
    } catch (err) {
      console.warn('Failed to load sessions catalog:', err);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  if (!isOpen) return null;

  const handleCopy = (urlToCopy?: string) => {
    const text = urlToCopy || publishedUrl;
    if (!text) return;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Copy fallback failed', err);
    }
    document.body.removeChild(textArea);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProducts || currentProducts.length === 0) {
      setPublishError('Aucun produit disponible à publier.');
      return;
    }

    setIsPublishing(true);
    setPublishError(null);

    try {
      const result = await publishSession({
        title: sessionTitle.trim() || 'Session Achats FW25',
        description: description.trim(),
        author: authorName.trim() || 'Merchandising',
        products: currentProducts,
        currency: activeAppCurrency,
        customSlug: customSlug.trim() || undefined,
      });

      const fullUrl = buildShareUrl(result.sessionId);
      setPublishedUrl(fullUrl);
      onSessionPublished(result.session);
      loadCatalog();
      
      // Auto-copy for great DX
      handleCopy(fullUrl);
    } catch (err: any) {
      setPublishError(err.message || 'Erreur lors de la publication de la session.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Confirmer la suppression de la session "${id}" ?`)) return;

    setDeletingId(id);
    try {
      const ok = await deleteSession(id);
      if (ok) {
        setSessionsList((prev) => prev.filter((s) => s.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-zinc-900 border border-zinc-700/80 rounded-sm w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400 text-black rounded-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-white flex items-center gap-2">
                Partage &amp; Publication Multi-Utilisateurs
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-xs">
                  URL PUBLIQUE EN LIGNE
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Générez une URL publique permanente pour permettre à vos collègues et directeurs d'accéder au dashboard.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-sm transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/60 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('share')}
            className={`pb-2 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'share'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Publier &amp; Partager l'URL</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('catalog');
              loadCatalog();
            }}
            className={`pb-2 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'catalog'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Catalogue des Sessions ({sessionsList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Guide Collaboratif</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {/* TAB 1: PUBLISH & SHARE */}
          {activeTab === 'share' && (
            <div className="space-y-5">
              
              {/* If already has a published URL */}
              {publishedUrl ? (
                <div className="p-4 bg-emerald-950/30 border border-emerald-500/40 rounded-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-xs font-bold text-emerald-300 font-display">
                        Session Publiée en Ligne &amp; Accessible
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400">
                      ID: <span className="text-amber-400">{currentSession?.id}</span>
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300">
                    Toute personne ouvrant ce lien direct accèdera immédiatement au tableau de bord complet avec vos données, graphiques, courbes de tailles et KPIs :
                  </p>

                  {/* URL Input with Copy Button */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={publishedUrl}
                      className="flex-1 bg-zinc-950 border border-emerald-500/50 p-2.5 text-xs font-mono text-emerald-300 rounded-sm outline-none select-all focus:ring-1 focus:ring-emerald-400"
                    />

                    <button
                      onClick={() => handleCopy()}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-sm transition-all shadow-md ${
                        copied
                          ? 'bg-emerald-500 text-black'
                          : 'bg-amber-400 hover:bg-amber-300 text-black'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Lien Copié !</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>Copier le Lien</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Summary badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-900/40 text-center font-mono">
                    <div className="p-2 bg-zinc-950/60 rounded-xs border border-zinc-800">
                      <div className="text-[10px] text-zinc-400">Articles</div>
                      <div className="text-xs font-bold text-white">{currentProducts.length} réf.</div>
                    </div>
                    <div className="p-2 bg-zinc-950/60 rounded-xs border border-zinc-800">
                      <div className="text-[10px] text-zinc-400">Unités Achats</div>
                      <div className="text-xs font-bold text-amber-400">
                        {currentProducts.reduce((acc, p) => acc + (p.totalBuyQty || 0), 0).toLocaleString('fr-FR')} U
                      </div>
                    </div>
                    <div className="p-2 bg-zinc-950/60 rounded-xs border border-zinc-800">
                      <div className="text-[10px] text-zinc-400">CA Réalisé</div>
                      <div className="text-xs font-bold text-emerald-400">
                        {formatCurrency(currentProducts.reduce((acc, p) => acc + (p.totalSalesValue || 0), 0))}
                      </div>
                    </div>
                    <div className="p-2 bg-zinc-950/60 rounded-xs border border-zinc-800">
                      <div className="text-[10px] text-zinc-400">Devise active</div>
                      <div className="text-xs font-bold text-zinc-200">{activeAppCurrency}</div>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={() => setPublishedUrl('')}
                      className="text-xs text-zinc-400 hover:text-white underline decoration-zinc-700 font-mono"
                    >
                      &larr; Publier une nouvelle version ou modifier les informations
                    </button>

                    <a
                      href={publishedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-mono"
                    >
                      <span>Ouvrir dans un nouvel onglet</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              ) : null}

              {/* Form to publish or update */}
              <form onSubmit={handlePublish} className="space-y-4">
                <div className="p-3 bg-zinc-950 rounded-sm border border-zinc-800 space-y-1">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <span>Prêt à publier la session actuelle</span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    {currentProducts.length} articles consolidés chargés dans le tableau de bord ({isCustomDataLoaded ? 'Issus de votre import CSV' : 'Session par défaut'}).
                  </p>
                </div>

                {publishError && (
                  <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xs text-xs text-rose-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{publishError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">
                      Titre de la Session <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={sessionTitle}
                      onChange={(e) => setSessionTitle(e.target.value)}
                      placeholder="Ex: FW25 Originals & Footwear"
                      className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-400 p-2.5 text-xs text-white rounded-sm outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-zinc-300">
                      Auteur / Direction / Équipe
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Ex: Équipe Merchandising Paris"
                      className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-400 p-2.5 text-xs text-white rounded-sm outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-300">
                    Description ou Notes de Réunion (Facultatif)
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex: Analyse préliminaire des volumes Samba OG et répartition des pointures pour la Tunisie et France."
                    rows={2}
                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-400 p-2.5 text-xs text-white rounded-sm outline-none resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-300">
                      Identifiant URL personnalisé (Optionnel)
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">ex: fw25-samba-octobre</span>
                  </div>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-'))}
                    placeholder="Identifiant court (laisser vide pour automatique)"
                    className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-400 p-2 text-xs font-mono text-zinc-300 rounded-sm outline-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isPublishing || currentProducts.length === 0}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-sm transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isPublishing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Publication en cours...</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-4 h-4" />
                        <span>🚀 Publier &amp; Obtenir le Lien Public</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: CATALOG OF PUBLISHED SESSIONS */}
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-zinc-400">
                  Consultez, partagez ou basculez entre les différentes sessions d'achats publiées sur le serveur :
                </p>
                <button
                  onClick={loadCatalog}
                  className="inline-flex items-center gap-1 text-[11px] font-mono text-amber-400 hover:text-amber-300"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCatalog ? 'animate-spin' : ''}`} />
                  <span>Actualiser</span>
                </button>
              </div>

              {isLoadingCatalog ? (
                <div className="py-8 text-center text-xs text-zinc-500 font-mono">
                  Chargement des sessions publiées...
                </div>
              ) : sessionsList.length === 0 ? (
                <div className="py-8 text-center space-y-2 border border-dashed border-zinc-800 rounded-sm p-6">
                  <Globe className="w-8 h-8 text-zinc-600 mx-auto" />
                  <div className="text-xs text-zinc-400">Aucune session publiée pour le moment.</div>
                  <button
                    onClick={() => setActiveTab('share')}
                    className="text-xs text-amber-400 hover:underline font-semibold"
                  >
                    Publier la première session maintenant
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
                  {sessionsList.map((item) => {
                    const isCurrent = currentSession?.id === item.id;
                    const sessionUrl = buildShareUrl(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-sm border transition-all ${
                          isCurrent
                            ? 'bg-amber-400/10 border-amber-400/50 ring-1 ring-amber-400/20'
                            : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white font-display">
                                {item.title}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] font-mono bg-amber-400 text-black font-bold px-1.5 py-0.2 rounded-xs">
                                  ACTIVE
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-400 font-mono mt-1">
                              <span className="text-zinc-500">Auteur: {item.author || 'Anonyme'}</span>
                              <span>&bull;</span>
                              <span>{item.productCount} réf.</span>
                              <span>&bull;</span>
                              <span className="text-amber-400 font-semibold">{item.totalBuyQty.toLocaleString('fr-FR')} U</span>
                              <span>&bull;</span>
                              <span className="text-emerald-400 font-semibold">{formatCurrency(item.totalSalesValue, item.currency)}</span>
                              <span>&bull;</span>
                              <span className="text-zinc-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                              </span>
                            </div>

                            {item.description && (
                              <p className="text-[11px] text-zinc-400 mt-1 italic line-clamp-1">
                                "{item.description}"
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                            <button
                              onClick={() => handleCopy(sessionUrl)}
                              className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xs text-xs font-mono transition-colors flex items-center gap-1"
                              title="Copier le lien direct de cette session"
                            >
                              <Copy className="w-3.5 h-3.5 text-amber-400" />
                              <span className="hidden sm:inline text-[10px]">Copier Lien</span>
                            </button>

                            <button
                              onClick={async () => {
                                const full = await fetchSessionById(item.id);
                                if (full) {
                                  onSelectSession(full);
                                  onClose();
                                }
                              }}
                              className={`px-2.5 py-1.5 text-xs font-bold rounded-xs transition-colors flex items-center gap-1 ${
                                isCurrent
                                  ? 'bg-zinc-800 text-zinc-400 cursor-default'
                                  : 'bg-amber-400 hover:bg-amber-300 text-black'
                              }`}
                            >
                              <span>{isCurrent ? 'Déjà chargée' : 'Charger'}</span>
                              {!isCurrent && <ArrowRight className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={(e) => handleDeleteSession(item.id, e)}
                              disabled={deletingId === item.id}
                              className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-950/30 rounded-xs transition-colors"
                              title="Supprimer cette session"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: COLLABORATION GUIDE */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs text-zinc-300">
              <div className="p-4 bg-zinc-950 rounded-sm border border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-white font-bold font-display text-sm">
                  <Users className="w-5 h-5 text-amber-400" />
                  <span>Fonctionnement du Partage Multi-Utilisateurs</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  L'application intègre un serveur de persistance complet. Lorsque vous importez un fichier CSV ou TSV issu de vos extractions Adidas, vous pouvez le publier en un clic.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xs space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-amber-400 text-black font-bold flex items-center justify-center text-xs">
                      1
                    </div>
                    <div className="font-semibold text-white">Importez votre CSV</div>
                    <p className="text-[11px] text-zinc-400">
                      Chargez vos données via l'onglet Importer (colonnes Article No, Display Size, Somme de Sales Qty, etc.).
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xs space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-amber-400 text-black font-bold flex items-center justify-center text-xs">
                      2
                    </div>
                    <div className="font-semibold text-white">Publiez en Ligne</div>
                    <p className="text-[11px] text-zinc-400">
                      Cliquez sur "Publier &amp; Obtenir le Lien Public". Le serveur sauvegarde instantanément l'assortiment avec les KPIs.
                    </p>
                  </div>

                  <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xs space-y-1.5">
                    <div className="w-6 h-6 rounded-full bg-amber-400 text-black font-bold flex items-center justify-center text-xs">
                      3
                    </div>
                    <div className="font-semibold text-white">Partagez l'URL</div>
                    <p className="text-[11px] text-zinc-400">
                      Envoyez l'URL par mail, Slack ou Teams. Vos collaborateurs accèdent directement à l'analyse sans aucun compte requis.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-zinc-950/60 rounded-sm border border-zinc-800 text-[11px] text-zinc-400 space-y-2">
                <div className="font-semibold text-zinc-200">Avantages pour les équipes Adidas :</div>
                <ul className="list-disc list-inside space-y-1 text-zinc-400">
                  <li><strong>Aucune installation :</strong> l'application tourne directement dans le navigateur (mobile, tablette, PC).</li>
                  <li><strong>Indépendance des filtres :</strong> chaque utilisateur peut filtrer les pointures, sports ou magasins de son côté sans impacter les autres.</li>
                  <li><strong>Historique conservé :</strong> les sessions restent accessibles dans le catalogue pour relecture ou comparatifs.</li>
                </ul>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-sm text-xs transition-colors"
          >
            Fermer
          </button>

          {publishedUrl && activeTab === 'share' && (
            <button
              onClick={() => handleCopy()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs rounded-sm transition-all"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Lien Copié !' : 'Copier l\'URL'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
