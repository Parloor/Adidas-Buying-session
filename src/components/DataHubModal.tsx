import React, { useState, useRef } from 'react';
import { 
  X, 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  ArrowRight,
  Info,
  ClipboardPaste,
  FileText,
  Sparkles
} from 'lucide-react';
import { parseAdidasCSV, downloadSampleCSV } from '../utils/csvParser';
import { ProductItem } from '../types/merchandising';

interface DataHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyProducts: (products: ProductItem[]) => void;
  onPublishDirectly?: (products: ProductItem[]) => void;
}

const USER_SAMBA_SAMPLE = `Article No.\tArticle Name\tAge Group\tProduct Division\tSports Category\tProduct Group\tProduct Type\tSales Line\tBase Color\tGender\tDisplay Size-France\tURL Image\tFirst TND Price\tPurchase Net Price\tSomme de Sales Qty\tTotal Achat\tSomme de Turnover
B75806\tSAMBA OG\tADULT\tFOOTWEAR\tORIGINALS\tSHOES\tSHOES - LOW (NON FOOTBALL)\tSAMBA\tBlanc\tMALE\t41 1/3\thttps://i.ibb.co/xK3ykXHy/B75806-16-FOOTWEAR-ZIP-Turntable-3d-1-white.png\t449 DT\t40,6\t1\t1\t449
B75806\tSAMBA OG\tADULT\tFOOTWEAR\tORIGINALS\tSHOES\tSHOES - LOW (NON FOOTBALL)\tSAMBA\tBlanc\tMALE\t42\thttps://i.ibb.co/xK3ykXHy/B75806-16-FOOTWEAR-ZIP-Turntable-3d-1-white.png\t449 DT\t40,6\t1\t1\t449
B75806\tSAMBA OG\tADULT\tFOOTWEAR\tORIGINALS\tSHOES\tSHOES - LOW (NON FOOTBALL)\tSAMBA\tBlanc\tMALE\t44\thttps://i.ibb.co/xK3ykXHy/B75806-16-FOOTWEAR-ZIP-Turntable-3d-1-white.png\t449 DT\t40,6\t1\t1\t449
B75806\tSAMBA OG\tADULT\tFOOTWEAR\tORIGINALS\tSHOES\tSHOES - LOW (NON FOOTBALL)\tSAMBA\tBlanc\tMALE\t44 2/3\thttps://i.ibb.co/xK3ykXHy/B75806-16-FOOTWEAR-ZIP-Turntable-3d-1-white.png\t449 DT\t40,6\t2\t2\t898
B75806\tSAMBA OG\tADULT\tFOOTWEAR\tORIGINALS\tSHOES\tSHOES - LOW (NON FOOTBALL)\tSAMBA\tBlanc\tMALE\t45 1/3\thttps://i.ibb.co/xK3ykXHy/B75806-16-FOOTWEAR-ZIP-Turntable-3d-1-white.png\t449 DT\t40,6\t1\t1\t449
B75807\tSAMBA OG\tADULT\tFOOTWEAR\tORIGINALS\tSHOES\tSHOES - LOW (NON FOOTBALL)\tSAMBA\tNoir\tMALE\t37 1/3\thttps://i.ibb.co/8gP5d9tM/B75807-16-FOOTWEAR-ZIP-Turntable-3d-1-white.png\t449 DT\t40,6\t5\t5\t2245
B75807\tSAMBA OG\tADULT\tFOOTWEAR\tORIGINALS\tSHOES\tSHOES - LOW (NON FOOTBALL)\tSAMBA\tNoir\tMALE\t38\thttps://i.ibb.co/8gP5d9tM/B75807-16-FOOTWEAR-ZIP-Turntable-3d-1-white.png\t449 DT\t40,6\t10\t10\t4490
B75807\tSAMBA OG\tADULT\tFOOTWEAR\tORIGINALS\tSHOES\tSHOES - LOW (NON FOOTBALL)\tSAMBA\tNoir\tMALE\t40 2/3\thttps://i.ibb.co/8gP5d9tM/B75807-16-FOOTWEAR-ZIP-Turntable-3d-1-white.png\t449 DT\t40,6\t3\t3\t1347
B75807\tSAMBA OG\tADULT\tFOOTWEAR\tORIGINALS\tSHOES\tSHOES - LOW (NON FOOTBALL)\tSAMBA\tNoir\tMALE\t46 2/3\thttps://i.ibb.co/8gP5d9tM/B75807-16-FOOTWEAR-ZIP-Turntable-3d-1-white.png\t449 DT\t40,6\t1\t1\t449`;

export const DataHubModal: React.FC<DataHubModalProps> = ({
  isOpen,
  onClose,
  onApplyProducts,
  onPublishDirectly,
}) => {
  const [activeInputMode, setActiveInputMode] = useState<'upload' | 'paste'>('paste');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [pastedText, setPastedText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [parsedPreview, setParsedPreview] = useState<{
    products: ProductItem[];
    errors: string[];
    totalRows: number;
    fileName: string;
    currency: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const processRawText = async (text: string, sourceName: string) => {
    if (!text || text.trim() === '') return;
    setIsProcessing(true);

    try {
      const result = await parseAdidasCSV(text);
      setParsedPreview({
        products: result.products,
        errors: result.errors,
        totalRows: result.totalRowsProcessed,
        fileName: sourceName,
        currency: result.detectedCurrency,
      });
    } catch (err: any) {
      setParsedPreview({
        products: [],
        errors: [`Erreur de traitement des données : ${err.message}`],
        totalRows: 0,
        fileName: sourceName,
        currency: 'DT',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileProcess = async (file: File) => {
    if (!file) return;
    const text = await file.text();
    processRawText(text, file.name);
  };

  const handleLoadSample = () => {
    setPastedText(USER_SAMBA_SAMPLE);
    setActiveInputMode('paste');
    processRawText(USER_SAMBA_SAMPLE, 'Exemple Adidas Samba OG FW25');
  };

  const handleConfirmImport = () => {
    if (parsedPreview && parsedPreview.products.length > 0) {
      onApplyProducts(parsedPreview.products);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div 
        className="bg-zinc-900 border border-zinc-700/80 rounded-sm w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-400 text-black rounded-xs">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold font-display text-white">
                Importer Votre Fichier CSV / Extraction Merchandising
              </h2>
              <p className="text-xs text-zinc-400">
                Supporte directement les extractions Adidas avec Article No, Display Size, First TND Price, Somme de Sales Qty, Total Achat...
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

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          
          {/* Input Mode Selector Tabs */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveInputMode('paste')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xs transition-colors ${
                  activeInputMode === 'paste'
                    ? 'bg-amber-400 text-black'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <ClipboardPaste className="w-4 h-4" />
                <span>Coller le Texte / Tableau Excel</span>
              </button>

              <button
                onClick={() => setActiveInputMode('upload')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xs transition-colors ${
                  activeInputMode === 'upload'
                    ? 'bg-amber-400 text-black'
                    : 'bg-zinc-950 text-zinc-400 hover:text-white border border-zinc-800'
                }`}
              >
                <UploadCloud className="w-4 h-4" />
                <span>Déposer un Fichier (.csv, .tsv, .txt)</span>
              </button>
            </div>

            <button
              onClick={handleLoadSample}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-amber-300 hover:text-amber-200 bg-amber-400/10 border border-amber-400/30 rounded-xs transition-colors"
              title="Tester immédiatement l'exemple Samba OG (B75806 & B75807)"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tester Exemple Samba OG</span>
            </button>
          </div>

          {/* Paste Tab */}
          {activeInputMode === 'paste' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Collez vos colonnes brutes ci-dessous (séparées par tabulations ou points-virgules) :</span>
                {pastedText && (
                  <button
                    onClick={() => {
                      setPastedText('');
                      setParsedPreview(null);
                    }}
                    className="text-zinc-500 hover:text-zinc-300 font-mono text-[11px]"
                  >
                    Effacer
                  </button>
                )}
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Exemple:
Article No.	Article Name	Product Division	Sports Category	Product Type	Sales Line	Display Size-France	URL Image	First TND Price	Purchase Net Price	Somme de Sales Qty	Total Achat	Somme de Turnover
B75806	SAMBA OG	FOOTWEAR	ORIGINALS	SHOES - LOW (NON FOOTBALL)	SAMBA	41 1/3	https://i.ibb.co/xK3ykXHy/...	449 DT	40,6	1	1	449"
                rows={7}
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-400 p-3 text-xs font-mono text-zinc-200 rounded-sm outline-none resize-y placeholder:text-zinc-600"
              />
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => processRawText(pastedText, 'Extraction Presse-papier')}
                  disabled={!pastedText.trim() || isProcessing}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs rounded-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <FileText className="w-4 h-4" />
                  <span>{isProcessing ? 'Traitement en cours...' : 'Analyser & Prévisualiser'}</span>
                </button>
              </div>
            </div>
          )}

          {/* File Upload Tab */}
          {activeInputMode === 'upload' && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragActive(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileProcess(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-sm p-8 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-amber-400 bg-amber-400/5' 
                  : 'border-zinc-700 hover:border-zinc-500 bg-zinc-950/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileProcess(e.target.files[0]);
                  }
                }}
              />

              <UploadCloud className="w-12 h-12 text-amber-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-white">
                Glissez-déposez votre fichier ici, ou cliquez pour parcourir
              </p>
              <p className="text-xs text-zinc-400 mt-1">
                Prend en charge séparateurs tabulation (\t), virgule (,), point-virgule (;).
              </p>
              <span className="inline-block mt-3 text-[11px] font-mono text-zinc-500">
                Format .CSV ou .TSV UTF-8
              </span>
            </div>
          )}

          {/* Download sample template banner */}
          <div className="flex items-center justify-between p-3.5 bg-zinc-950 rounded-sm border border-zinc-800">
            <div className="flex items-center gap-2.5">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <div>
                <div className="text-xs font-semibold text-white">Modèle exact d'extraction Adidas</div>
                <div className="text-[11px] text-zinc-400">Téléchargez le modèle type avec les en-têtes officiels FW25</div>
              </div>
            </div>

            <button
              onClick={downloadSampleCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Télécharger Modèle</span>
            </button>
          </div>

          {/* Parsing Results Preview if processed */}
          {parsedPreview && (
            <div className="bg-zinc-950 rounded-sm p-4 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Données reconnues : {parsedPreview.fileName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-zinc-800 text-amber-300 px-2 py-0.5 rounded-xs border border-zinc-700">
                    Devise : {parsedPreview.currency}
                  </span>
                  <span className="text-xs font-mono text-amber-400 font-bold">
                    {parsedPreview.products.length} articles consolidés
                  </span>
                </div>
              </div>

              <div className="text-xs text-zinc-400 font-mono">
                {parsedPreview.totalRows} lignes traitées avec succès.
              </div>

              {parsedPreview.errors.length > 0 && (
                <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xs text-xs text-rose-300 space-y-1">
                  {parsedPreview.errors.map((err, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Sample parsed articles list */}
              {parsedPreview.products.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-[11px] font-mono text-zinc-400 uppercase">Aperçu des articles importés :</span>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto text-xs font-mono">
                    {parsedPreview.products.map((p) => (
                      <div key={p.sku} className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-xs flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 truncate">
                          {p.imageUrl && (
                            <img src={p.imageUrl} alt={p.name} className="w-8 h-8 object-contain bg-white rounded-xs shrink-0" />
                          )}
                          <div className="truncate">
                            <span className="text-amber-400 font-bold">{p.sku}</span> - <span className="text-white font-sans">{p.name}</span>
                            <div className="text-[10px] text-zinc-400">
                              {p.sport} &bull; {p.salesLine} &bull; {p.sizes.length} pointure(s)
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-emerald-400 font-bold">
                            {p.sellThroughRate}% STR
                          </div>
                          <div className="text-[10px] text-zinc-400">
                            {p.totalSalesQty} / {p.totalBuyQty} U
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Guide on Accepted Columns */}
          <div className="p-4 bg-zinc-950/40 rounded-sm border border-zinc-800/80 space-y-2 text-xs text-zinc-400">
            <div className="font-semibold text-zinc-300 flex items-center gap-1.5 font-display">
              <Info className="w-4 h-4 text-amber-400" />
              <span>Correspondance parfaite avec vos colonnes d'extraction Adidas :</span>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-mono text-zinc-400 list-disc list-inside">
              <li><strong className="text-zinc-200">Article No.</strong> &rarr; SKU</li>
              <li><strong className="text-zinc-200">Article Name</strong> &rarr; Nom article</li>
              <li><strong className="text-zinc-200">Sports Category</strong> &rarr; Sport (Originals, Running...)</li>
              <li><strong className="text-zinc-200">Product Division</strong> &rarr; Footwear, Apparel</li>
              <li><strong className="text-zinc-200">Display Size-France</strong> &rarr; Pointures exactes</li>
              <li><strong className="text-zinc-200">URL Image</strong> &rarr; Photo HD 3D Turntable</li>
              <li><strong className="text-zinc-200">First TND Price</strong> &rarr; Prix de vente unitaire (DT)</li>
              <li><strong className="text-zinc-200">Purchase Net Price</strong> &rarr; Prix d'achat net unitaire</li>
              <li><strong className="text-zinc-200">Somme de Sales Qty</strong> &rarr; Quantités vendues</li>
              <li><strong className="text-zinc-200">Total Achat</strong> &rarr; Quantités achetées</li>
              <li><strong className="text-zinc-200">Somme de Turnover</strong> &rarr; Chiffre d'affaires réalisé</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-sm text-xs transition-colors"
          >
            Fermer
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleConfirmImport}
              disabled={!parsedPreview || parsedPreview.products.length === 0}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 font-semibold text-xs rounded-sm transition-all ${
                parsedPreview && parsedPreview.products.length > 0
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 cursor-pointer'
                  : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
              }`}
            >
              <span>Appliquer au Dashboard</span>
            </button>

            {onPublishDirectly && (
              <button
                onClick={() => {
                  if (parsedPreview && parsedPreview.products.length > 0) {
                    onPublishDirectly(parsedPreview.products);
                    onClose();
                  }
                }}
                disabled={!parsedPreview || parsedPreview.products.length === 0}
                className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 font-bold text-xs rounded-sm transition-all shadow-md ${
                  parsedPreview && parsedPreview.products.length > 0
                    ? 'bg-amber-400 hover:bg-amber-300 text-black cursor-pointer shadow-amber-400/10'
                    : 'bg-zinc-800/50 text-zinc-600 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>🚀 Publier &amp; Obtenir Lien Public ({parsedPreview?.products.length || 0} art.)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
