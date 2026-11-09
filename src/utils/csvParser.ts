import Papa from 'papaparse';
import { ProductItem, Division, SportUniverse, Gender, OverallKPIs, SizeBreakdown, StoreBreakdown } from '../types/merchandising';

export interface CSVParseResult {
  products: ProductItem[];
  errors: string[];
  totalRowsProcessed: number;
  detectedCurrency: 'DT' | '€' | '$';
}

// Global active currency (defaults to DT based on user's TND/DT input)
export let activeAppCurrency: string = 'DT';

export function setActiveCurrency(curr: string) {
  activeAppCurrency = curr;
}

export function formatCurrency(val: number, currency: string = activeAppCurrency): string {
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(Math.round(val * 10) / 10);
  return `${formatted} ${currency}`;
}

// Normalise column keys (remove accents, trim, lowercase, keep alphanum)
function normalizeKey(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

export function parseAdidasCSV(csvText: string): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    // Detect delimiter: handle tabs (\t), semicolons (;), or commas (,)
    Papa.parse<Record<string, string>>(csvText, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const rows = results.data;
        const errors: string[] = [];

        if (!rows || rows.length === 0) {
          resolve({ 
            products: [], 
            errors: ['Le fichier ou texte est vide ou non reconnu.'], 
            totalRowsProcessed: 0,
            detectedCurrency: 'DT' 
          });
          return;
        }

        // Detect currency in text or headers
        let detectedCurrency: 'DT' | '€' | '$' = 'DT';
        if (csvText.includes('DT') || csvText.includes('TND') || csvText.includes('First TND Price')) {
          detectedCurrency = 'DT';
        } else if (csvText.includes('€') || csvText.includes('EUR')) {
          detectedCurrency = '€';
        } else if (csvText.includes('$') || csvText.includes('USD')) {
          detectedCurrency = '$';
        }
        activeAppCurrency = detectedCurrency;

        // Map column names flexibly across French, English, and Adidas exact extraction formats
        const firstRow = rows[0];
        const keyMap: Record<string, string> = {};
        
        Object.keys(firstRow).forEach((origKey) => {
          const norm = normalizeKey(origKey);
          
          // SKU / Reference
          if (
            norm.includes('articleno') || 
            norm.includes('articlenumber') || 
            norm === 'articleno' || 
            norm === 'sku' || 
            norm.includes('sku') || 
            norm.includes('ref') || 
            norm.includes('code') ||
            (norm.includes('article') && !norm.includes('name') && !norm.includes('nom') && !norm.includes('image'))
          ) {
            keyMap['sku'] = origKey;
          } 
          // Name / Article Name
          else if (norm.includes('articlename') || norm.includes('nom') || norm.includes('name') || norm.includes('desc') || norm.includes('designation')) {
            keyMap['name'] = origKey;
          }
          // 1. Image URL (check early to avoid any conflict with 'age' in 'image')
          else if (
            norm.includes('urlimage') || 
            norm.includes('imageurl') || 
            norm.includes('photo') || 
            norm.includes('visuel') || 
            norm.includes('picture') || 
            norm === 'image' ||
            norm.includes('image') || 
            norm === 'url' || 
            norm.includes('img')
          ) {
            keyMap['imageUrl'] = origKey;
          }
          // 2. Age Group (ADULT, KIDS, JUNIOR, INFANT) - strictly NOT an image/photo/url/marge/pourcent
          else if (
            !norm.includes('image') &&
            !norm.includes('img') &&
            !norm.includes('photo') &&
            !norm.includes('url') &&
            !norm.includes('picture') &&
            !norm.includes('marge') &&
            !norm.includes('pourcent') &&
            (
              norm.includes('agegroup') || 
              norm === 'age' || 
              norm === 'agegrp' || 
              norm.includes('groupeage') || 
              norm.includes('groupedage') || 
              norm.includes('trancheage') || 
              norm.includes('tranchedage') || 
              norm.includes('tranchedeage') || 
              norm.startsWith('age')
            )
          ) {
            keyMap['ageGroup'] = origKey;
          }
          // Division (FOOTWEAR, APPAREL, ACCESSORIES, HARDWARE)
          else if (norm.includes('productdivision') || norm.includes('division') || norm === 'div' || norm.includes('rayon')) {
            keyMap['division'] = origKey;
          }
          // Sports Category (ORIGINALS, FOOTBALL, RUNNING, GOLF, MOTORSPORT...)
          else if (
            norm.includes('sportscategory') || 
            norm.includes('sport') || 
            norm.includes('discipline') || 
            norm.includes('activite') || 
            norm.includes('activity') || 
            norm.includes('monde') || 
            norm.includes('concept')
          ) {
            keyMap['sport'] = origKey;
          }
          // Gender (MALE, FEMALE, UNISEX, MEN, WOMEN)
          else if (norm.includes('gender') || norm.includes('genre') || norm.includes('sexe')) {
            keyMap['gender'] = origKey;
          }
          // Product Group / Category (SHOES, APPAREL...)
          else if (norm.includes('productgroup') || norm.includes('prodgroup') || norm.includes('famille') || norm.includes('category') || norm.includes('categorie')) {
            keyMap['category'] = origKey;
          }
          // Product Type (SHOES - LOW (NON FOOTBALL)...)
          else if (norm.includes('producttype') || norm.includes('typeproduit') || norm.includes('typedeproduit') || norm.includes('silhouett') || norm.includes('model') || norm.includes('modele')) {
            keyMap['productType'] = origKey;
          }
          // Sales Line / Franchise (SAMBA, GAZELLE, PREDATOR...)
          else if (norm.includes('salesline') || norm.includes('lignevente') || norm.includes('franchis') || norm.includes('gamme') || norm === 'ligne' || norm === 'line') {
            keyMap['salesLine'] = origKey;
          }
          // Base Color (Blanc, Noir, Rouge, Color Description, Colour...)
          else if (
            norm.includes('basecolor') || 
            norm.includes('colordesc') ||
            norm.includes('color') || 
            norm.includes('colour') || 
            norm.includes('couleur') ||
            norm.includes('colorway') ||
            norm.includes('colorcode') ||
            norm === 'col' ||
            norm.includes('teinte')
          ) {
            keyMap['color'] = origKey;
          }
          // Size (Display Size-France, Pointure, Taille)
          else if (norm.includes('displaysize') || norm.includes('size') || norm.includes('taille') || norm.includes('pointure')) {
            keyMap['size'] = origKey;
          }
          // Retail Price / First TND Price
          else if (
            norm.includes('firsttndprice') || 
            norm.includes('tndprice') || 
            norm.includes('pxvente') || 
            norm.includes('prixvente') || 
            norm.includes('retail') || 
            norm.includes('ppc') || 
            (norm.includes('price') && !norm.includes('purchase') && !norm.includes('achat') && !norm.includes('net') && !norm.includes('cost'))
          ) {
            keyMap['retailPrice'] = origKey;
          }
          // Wholesale Price / Purchase Net Price
          else if (
            norm.includes('purchasenetprice') || 
            norm.includes('netprice') || 
            norm.includes('purchase') || 
            norm.includes('pxachat') || 
            norm.includes('prixachat') || 
            norm.includes('cost') || 
            norm.includes('wholesale')
          ) {
            keyMap['wholesalePrice'] = origKey;
          }
          // Sales Qty (Somme de Sales Qty, Qte Vente)
          else if (
            norm.includes('sommedesalesqty') || 
            norm.includes('salesqty') || 
            norm.includes('qtevent') || 
            norm.includes('venteqte') || 
            norm.includes('unitesvendues') || 
            norm.includes('qtevendue')
          ) {
            keyMap['salesQty'] = origKey;
          }
          // Buy Qty (Total Achat, Qte Achat, Buy Qty)
          else if (
            norm === 'totalachat' || 
            norm.includes('totalachat') || 
            norm.includes('qteach') || 
            norm.includes('buyqty') || 
            norm.includes('achatqte') || 
            norm.includes('qtecommandee') || 
            norm.includes('achatunite')
          ) {
            keyMap['buyQty'] = origKey;
          }
          // Sales Value / Turnover (Somme de Turnover, Valeur Vente)
          else if (
            norm.includes('turnover') || 
            norm.includes('valvent') || 
            norm.includes('salesval') || 
            norm.includes('ventevaleur') || 
            norm === 'ca' || 
            norm.includes('chiffredaffaires') || 
            norm.includes('valeurvente')
          ) {
            keyMap['salesValue'] = origKey;
          }
          // Buy Value (Valeur Achat, Buy Value)
          else if (norm.includes('valeach') || norm.includes('buyval') || norm.includes('achatvaleur') || norm.includes('montantachat') || norm.includes('valeurachat')) {
            keyMap['buyValue'] = origKey;
          }
          // Store / Point de vente
          else if (norm.includes('magasin') || norm.includes('store') || norm.includes('pos') || norm.includes('pointdevente') || norm.includes('boutique')) {
            keyMap['store'] = origKey;
          }
        });

        // Group rows by SKU / Reference to aggregate articles gracefully
        const productMap = new Map<string, {
          sku: string;
          name: string;
          division: Division;
          sport: SportUniverse;
          gender: Gender;
          category: string;
          productType: string;
          salesLine: string;
          color?: string;
          ageGroup?: string;
          productGroup?: string;
          imageUrl: string;
          retailPrice: number;
          wholesalePrice: number;
          totalBuyQty: number;
          totalBuyValue: number;
          totalSalesQty: number;
          totalSalesValue: number;
          sizeMap: Map<string, { buyQty: number; salesQty: number }>;
          storeMap: Map<string, { buyQty: number; salesQty: number; buyValue: number; salesValue: number }>;
        }>();

        // Helper to parse numbers in French or English format (e.g. "40,6", "449 DT", "2 245")
        const parseNum = (val: string | number | undefined): number => {
          if (val === undefined || val === null) return 0;
          if (typeof val === 'number') return isNaN(val) ? 0 : val;
          const str = val.toString().trim();
          const cleaned = str
            .replace(/(DT|TND|EUR|USD|€|\$)/gi, '')
            .trim()
            .replace(/\s+/g, '')
            .replace(',', '.');
          const num = parseFloat(cleaned);
          return isNaN(num) ? 0 : num;
        };

        rows.forEach((row, idx) => {
          const skuRaw = (keyMap['sku'] ? row[keyMap['sku']] : row['Article No.'] || row['sku'] || row['Reference'] || row['Article'])?.trim();
          if (!skuRaw) {
            return; // Skip empty row
          }

          const name = (keyMap['name'] ? row[keyMap['name']] : row['Article Name'] || row['Nom'] || row['Name'] || row['Description'] || skuRaw)?.trim();
          const divisionRaw = (keyMap['division'] ? row[keyMap['division']] : row['Product Division'] || row['Division'])?.trim() || 'Footwear';
          const sportRaw = (keyMap['sport'] ? row[keyMap['sport']] : row['Sports Category'] || row['Sport'])?.trim() || 'Originals';
          const genderRaw = (keyMap['gender'] ? row[keyMap['gender']] : row['Gender'] || row['Genre'])?.trim() || 'Unisex';
          const category = (keyMap['category'] ? row[keyMap['category']] : row['Product Group'] || row['Category'] || row['Categorie'])?.trim() || 'Chaussures';
          const productType = (keyMap['productType'] ? row[keyMap['productType']] : row['Product Type'] || row['Type Produit'] || row['Silhouette'])?.trim() || 'SHOES - LOW (NON FOOTBALL)';
          const salesLine = (keyMap['salesLine'] ? row[keyMap['salesLine']] : row['Sales Line'] || row['Ligne Vente'] || row['Franchise'])?.trim() || (name ? name.split(' ')[0] : 'SAMBA');
          const color = (
            keyMap['color'] 
              ? row[keyMap['color']] 
              : row['Base Color'] || 
                row['Color Description'] || 
                row['Color'] || 
                row['Colour'] || 
                row['Couleur'] || 
                row['Colorway'] || 
                row['Base Colour'] || 
                row['Col']
          )?.trim();
          let ageGroup = (keyMap['ageGroup'] ? row[keyMap['ageGroup']] : row['Age Group'] || row['AgeGroup'] || row['Groupe Age'])?.trim();
          let imageUrl = (keyMap['imageUrl'] ? row[keyMap['imageUrl']] : row['URL Image'] || row['Image'] || row['Photo'] || row['URL'])?.trim() || '';

          // Safeguard: Check if ageGroup actually contains an image URL (e.g. starts with http, www, has image extensions)
          if (ageGroup && (
            ageGroup.startsWith('http://') || 
            ageGroup.startsWith('https://') || 
            ageGroup.startsWith('//') || 
            ageGroup.includes('www.') || 
            ageGroup.includes('.jpg') || 
            ageGroup.includes('.jpeg') || 
            ageGroup.includes('.png') || 
            ageGroup.includes('.webp') ||
            ageGroup.includes('/assets/') ||
            ageGroup.includes('/images/') ||
            ageGroup.includes('i.ibb.co') ||
            ageGroup.includes('unsplash')
          )) {
            // It's definitely an image URL, NOT an age group!
            if (!imageUrl) {
              imageUrl = ageGroup;
            }
            ageGroup = ''; // clear out corrupted age group
          }

          const buyQty = parseNum(keyMap['buyQty'] ? row[keyMap['buyQty']] : row['Total Achat'] || row['Qte Achat'] || row['Buy Qty']);
          const salesQty = parseNum(keyMap['salesQty'] ? row[keyMap['salesQty']] : row['Somme de Sales Qty'] || row['Qte Vente'] || row['Sales Qty']);
          
          let wholesalePrice = parseNum(keyMap['wholesalePrice'] ? row[keyMap['wholesalePrice']] : row['Purchase Net Price'] || row['Prix Achat'] || row['Wholesale']);
          let retailPrice = parseNum(keyMap['retailPrice'] ? row[keyMap['retailPrice']] : row['First TND Price'] || row['Prix Vente'] || row['Retail']);

          let buyVal = parseNum(keyMap['buyValue'] ? row[keyMap['buyValue']] : row['Valeur Achat'] || row['Buy Value']);
          let salesVal = parseNum(keyMap['salesValue'] ? row[keyMap['salesValue']] : row['Somme de Turnover'] || row['Valeur Vente'] || row['Sales Value']);

          // If unit prices are known but values missing:
          if (buyVal <= 0 && wholesalePrice > 0 && buyQty > 0) {
            buyVal = Math.round(wholesalePrice * buyQty * 100) / 100;
          }
          if (salesVal <= 0 && retailPrice > 0 && salesQty > 0) {
            salesVal = Math.round(retailPrice * salesQty * 100) / 100;
          }

          // If prices are missing but values and quantities are present:
          if (wholesalePrice <= 0 && buyQty > 0 && buyVal > 0) {
            wholesalePrice = Math.round((buyVal / buyQty) * 100) / 100;
          }
          if (retailPrice <= 0 && salesQty > 0 && salesVal > 0) {
            retailPrice = Math.round((salesVal / salesQty) * 100) / 100;
          }

          const storeName = (keyMap['store'] ? row[keyMap['store']] : row['Magasin'] || row['Store'] || row['Point de Vente'])?.trim() || 'Réseau Franchise';
          const sizeName = (keyMap['size'] ? row[keyMap['size']] : row['Display Size-France'] || row['Taille'] || row['Size'] || row['Pointure'])?.trim() || 'Standard';

          // Categorise division (Adidas main divisions: Footwear, Apparel, Accessories, Hardware)
          let division: Division = 'Footwear';
          const lowerDiv = (divisionRaw || '').toLowerCase().trim();
          if (
            lowerDiv.includes('apparel') || 
            lowerDiv.includes('textile') || 
            lowerDiv.includes('vetement') || 
            lowerDiv.includes('clothing') ||
            lowerDiv === 'app'
          ) {
            division = 'Apparel';
          } else if (lowerDiv.includes('hardware') || lowerDiv === 'hw') {
            division = 'Hardware';
          } else if (
            lowerDiv.includes('access') || 
            lowerDiv.includes('gear') || 
            lowerDiv.includes('materiel') || 
            lowerDiv.includes('equip') || 
            lowerDiv.includes('ball') ||
            lowerDiv.includes('bag') ||
            lowerDiv.includes('sock') ||
            lowerDiv === 'acc' ||
            lowerDiv.includes('acc/')
          ) {
            division = 'Accessories';
          } else if (lowerDiv.includes('foot') || lowerDiv.includes('chauss') || lowerDiv === 'ftw') {
            division = 'Footwear';
          } else if (divisionRaw && divisionRaw.trim()) {
            division = divisionRaw.trim();
          }

          // Categorise sport (PRESERVE ALL SPORTS FROM CSV: Golf is Golf, Motorsport is Motorsport, etc. - NO regrouping)
          let sport: SportUniverse = 'Originals';
          if (sportRaw && sportRaw.trim()) {
            const rawSport = sportRaw.trim();
            const lowerSport = rawSport.toLowerCase();
            if (lowerSport === 'golf' || lowerSport.includes('golf')) {
              sport = 'Golf';
            } else if (lowerSport.includes('motor')) {
              sport = 'Motorsport';
            } else if (lowerSport === 'padel') {
              sport = 'Padel';
            } else if (lowerSport === 'tennis') {
              sport = 'Tennis';
            } else if (lowerSport === 'basketball' || lowerSport.includes('basket')) {
              sport = 'Basketball';
            } else if (lowerSport === 'football' || (lowerSport.includes('foot') && !lowerSport.includes('wear'))) {
              sport = 'Football';
            } else if (lowerSport === 'running' || lowerSport.includes('run')) {
              sport = 'Running';
            } else if (lowerSport.includes('orig')) {
              sport = 'Originals';
            } else if (lowerSport.includes('train') || lowerSport.includes('gym') || lowerSport.includes('fit')) {
              sport = 'Training';
            } else if (lowerSport.includes('out') || lowerSport.includes('terrex') || lowerSport.includes('hike')) {
              sport = 'Outdoor';
            } else if (lowerSport.includes('swim') || lowerSport.includes('nata')) {
              sport = 'Swim';
            } else {
              sport = rawSport.charAt(0).toUpperCase() + rawSport.slice(1);
            }
          } else {
            // Infer from article name if sport is missing in CSV
            const lowerName = (name || '').toLowerCase();
            if (lowerName.includes('golf')) sport = 'Golf';
            else if (lowerName.includes('predator') || lowerName.includes('copa') || lowerName.includes('football')) sport = 'Football';
            else if (lowerName.includes('adios') || lowerName.includes('boston') || lowerName.includes('run')) sport = 'Running';
            else sport = 'Originals';
          }

          // Categorise gender: IMPORTANT: Check Women / Female / Woman FIRST so "female" isn't caught by "male"
          let gender: Gender = 'Unisex';
          const lowerGender = (genderRaw || '').toLowerCase().trim();
          if (
            lowerGender === 'w' ||
            lowerGender === 'f' ||
            lowerGender === 'woman' ||
            lowerGender.includes('woman') ||
            lowerGender.includes('women') ||
            lowerGender.includes('female') ||
            lowerGender.includes('femme') ||
            lowerGender.includes('dame') ||
            lowerGender.includes('fille') ||
            lowerGender.includes('girl')
          ) {
            gender = 'Women';
          } else if (
            lowerGender.includes('infan') ||
            lowerGender.includes('bebe') ||
            lowerGender.includes('baby')
          ) {
            gender = 'Infant';
          } else if (
            lowerGender.includes('kid') || 
            lowerGender.includes('enfant') || 
            lowerGender.includes('junior') ||
            lowerGender.includes('boy') ||
            lowerGender.includes('garcon')
          ) {
            gender = 'Kids';
          } else if (
            lowerGender === 'm' ||
            lowerGender === 'man' ||
            lowerGender === 'men' ||
            lowerGender.includes('male') || 
            lowerGender.includes('homme') || 
            lowerGender.includes('men') ||
            lowerGender.includes('garcon')
          ) {
            gender = 'Men';
          } else if (lowerGender === 'unisex' || lowerGender.includes('mixte') || lowerGender.includes('uni')) {
            gender = 'Unisex';
          } else if (genderRaw && genderRaw.trim()) {
            gender = genderRaw.trim();
          }

          // Normalize Age Group: Keep INFANT, KIDS, JUNIOR, ADULT distinct (NO merging of INFANT into KIDS!)
          let normalizedAgeGroup = 'ADULT';
          if (ageGroup && ageGroup.trim()) {
            const rawAG = ageGroup.trim();
            const lowerAG = rawAG.toLowerCase();
            if (lowerAG.includes('infan') || lowerAG.includes('baby') || lowerAG.includes('bebe') || lowerAG === 'inf') {
              normalizedAgeGroup = 'INFANT';
            } else if (lowerAG.includes('jun') || lowerAG.includes('ado') || lowerAG === 'jnr' || lowerAG === 'jr') {
              normalizedAgeGroup = 'JUNIOR';
            } else if (lowerAG.includes('kid') || lowerAG.includes('enf') || lowerAG === 'child') {
              normalizedAgeGroup = 'KIDS';
            } else if (lowerAG.includes('adu')) {
              normalizedAgeGroup = 'ADULT';
            } else if (
              !lowerAG.startsWith('http') && 
              !lowerAG.includes('/') && 
              !lowerAG.includes('.jpg') && 
              !lowerAG.includes('.png') && 
              lowerAG.length <= 25
            ) {
              normalizedAgeGroup = rawAG.toUpperCase();
            } else {
              normalizedAgeGroup = 'ADULT';
            }
          } else if (gender === 'Infant') {
            normalizedAgeGroup = 'INFANT';
          } else if (gender === 'Kids') {
            const lowerName = (name || '').toLowerCase();
            if (lowerName.includes('infan') || lowerName.includes('baby') || lowerName.includes('bebe')) {
              normalizedAgeGroup = 'INFANT';
            } else if (lowerName.includes('junior') || lowerName.includes('jnr')) {
              normalizedAgeGroup = 'JUNIOR';
            } else {
              normalizedAgeGroup = 'KIDS';
            }
          } else {
            // Infer from name or product type
            const lowerName = (name || '').toLowerCase();
            if (lowerName.includes('infan') || lowerName.includes('baby') || lowerName.includes('bebe')) {
              normalizedAgeGroup = 'INFANT';
            } else if (lowerName.includes('junior') || lowerName.includes('jnr') || lowerName.includes(' jr ') || lowerName.endsWith(' jr')) {
              normalizedAgeGroup = 'JUNIOR';
            } else if (lowerName.includes('kids') || lowerName.includes('enfant')) {
              normalizedAgeGroup = 'KIDS';
            }
          }

          if (!productMap.has(skuRaw)) {
            productMap.set(skuRaw, {
              sku: skuRaw,
              name: name || skuRaw,
              division,
              sport,
              gender,
              category,
              productType,
              salesLine,
              color,
              ageGroup: normalizedAgeGroup,
              imageUrl,
              retailPrice: retailPrice || 449,
              wholesalePrice: wholesalePrice || 40.6,
              totalBuyQty: 0,
              totalBuyValue: 0,
              totalSalesQty: 0,
              totalSalesValue: 0,
              sizeMap: new Map(),
              storeMap: new Map(),
            });
          }

          const prod = productMap.get(skuRaw)!;
          if (imageUrl && !prod.imageUrl) prod.imageUrl = imageUrl;
          if (retailPrice > 0) prod.retailPrice = retailPrice;
          if (wholesalePrice > 0) prod.wholesalePrice = wholesalePrice;
          if (color && !prod.color) prod.color = color;
          if (normalizedAgeGroup && !prod.ageGroup) prod.ageGroup = normalizedAgeGroup;

          prod.totalBuyQty += buyQty;
          prod.totalBuyValue += buyVal;
          prod.totalSalesQty += salesQty;
          prod.totalSalesValue += salesVal;

          // Update size
          if (!prod.sizeMap.has(sizeName)) {
            prod.sizeMap.set(sizeName, { buyQty: 0, salesQty: 0 });
          }
          const sizeEntry = prod.sizeMap.get(sizeName)!;
          sizeEntry.buyQty += buyQty;
          sizeEntry.salesQty += salesQty;

          // Update store
          if (!prod.storeMap.has(storeName)) {
            prod.storeMap.set(storeName, { buyQty: 0, salesQty: 0, buyValue: 0, salesValue: 0 });
          }
          const storeEntry = prod.storeMap.get(storeName)!;
          storeEntry.buyQty += buyQty;
          storeEntry.salesQty += salesQty;
          storeEntry.buyValue += buyVal;
          storeEntry.salesValue += salesVal;
        });

        const finalProducts: ProductItem[] = [];

        productMap.forEach((p, sku) => {
          const sellThroughRate = p.totalBuyQty > 0 
            ? Math.round((p.totalSalesQty / p.totalBuyQty) * 1000) / 10 
            : 0;
          const valueSellThroughRate = p.totalBuyValue > 0 
            ? Math.round((p.totalSalesValue / p.totalBuyValue) * 1000) / 10 
            : 0;
          const stockQty = Math.max(0, p.totalBuyQty - p.totalSalesQty);
          const stockValue = stockQty * p.wholesalePrice;
          const grossMarginValue = p.totalSalesValue - (p.totalSalesQty * p.wholesalePrice);
          const grossMarginRate = p.totalSalesValue > 0 
            ? Math.round((grossMarginValue / p.totalSalesValue) * 1000) / 10 
            : 0;

          // Build sizes array
          const sizes: SizeBreakdown[] = Array.from(p.sizeMap.entries()).map(([size, data]) => {
            const sizeSTR = data.buyQty > 0 ? Math.round((data.salesQty / data.buyQty) * 1000) / 10 : 0;
            const salesShare = p.totalSalesQty > 0 ? Math.round((data.salesQty / p.totalSalesQty) * 1000) / 10 : 0;
            const buyShare = p.totalBuyQty > 0 ? Math.round((data.buyQty / p.totalBuyQty) * 1000) / 10 : 0;
            return {
              size,
              buyQty: data.buyQty,
              salesQty: data.salesQty,
              sellThroughRate: sizeSTR,
              stockQty: Math.max(0, data.buyQty - data.salesQty),
              salesShare,
              buyShare,
              recommendation: sizeSTR > 90 
                ? 'Sous-acheté (Rupture)' 
                : sizeSTR < 60 
                ? 'Sur-acheté (Risque solde)' 
                : 'Ratio équilibré',
            };
          });

          // Sort sizes
          sizes.sort((a, b) => a.size.localeCompare(b.size, undefined, { numeric: true, sensitivity: 'base' }));

          // Build stores array
          const stores: StoreBreakdown[] = Array.from(p.storeMap.entries()).map(([storeName, data], sIdx) => {
            const storeSTR = data.buyQty > 0 ? Math.round((data.salesQty / data.buyQty) * 1000) / 10 : 0;
            return {
              storeId: `store-${sIdx + 1}`,
              storeName,
              buyQty: data.buyQty,
              salesQty: data.salesQty,
              buyValue: data.buyValue,
              salesValue: data.salesValue,
              sellThroughRate: storeSTR,
              stockQty: Math.max(0, data.buyQty - data.salesQty),
            };
          });

          finalProducts.push({
            id: `imported-${sku}`,
            sku,
            name: p.name,
            division: p.division,
            sport: p.sport,
            gender: p.gender,
            category: p.category,
            productType: p.productType,
            salesLine: p.salesLine,
            color: p.color,
            ageGroup: p.ageGroup,
            currency: detectedCurrency,
            imageUrl: p.imageUrl || 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800',
            retailPrice: p.retailPrice,
            wholesalePrice: p.wholesalePrice,
            totalBuyQty: p.totalBuyQty,
            totalBuyValue: p.totalBuyValue,
            totalSalesQty: p.totalSalesQty,
            totalSalesValue: p.totalSalesValue,
            sellThroughRate,
            valueSellThroughRate,
            stockQty,
            stockValue,
            grossMarginValue,
            grossMarginRate,
            sizes,
            stores,
          });
        });

        resolve({
          products: finalProducts,
          errors,
          totalRowsProcessed: rows.length,
          detectedCurrency,
        });
      },
      error: (err: any) => {
        resolve({
          products: [],
          errors: [`Erreur d'analyse CSV : ${err.message}`],
          totalRowsProcessed: 0,
          detectedCurrency: 'DT',
        });
      },
    });
  });
}

// Compute aggregate KPIs for the current set of products
export function calculateOverallKPIs(products: ProductItem[]): OverallKPIs {
  const initial: OverallKPIs = {
    totalBuyQty: 0,
    totalBuyValue: 0,
    totalSalesQty: 0,
    totalSalesValue: 0,
    overallSellThrough: 0,
    overallValueSellThrough: 0,
    totalStockQty: 0,
    totalStockValue: 0,
    totalStockRetailValue: 0,
    totalGrossMargin: 0,
    overallMarginRate: 0,
    averageRetailPrice: 0,
    averageCostPrice: 0,
    productCount: products.length,
  };

  if (products.length === 0) return initial;

  products.forEach((p) => {
    initial.totalBuyQty += p.totalBuyQty || 0;
    initial.totalBuyValue += p.totalBuyValue || 0;
    initial.totalSalesQty += p.totalSalesQty || 0;
    initial.totalSalesValue += p.totalSalesValue || 0;
    
    // Exact stock quantity
    const sQty = typeof p.stockQty === 'number' && !isNaN(p.stockQty)
      ? p.stockQty
      : Math.max(0, (p.totalBuyQty || 0) - (p.totalSalesQty || 0));
    initial.totalStockQty += sQty;

    // Exact stock value at wholesale (cost / prix d'achat net)
    const sValWholesale = typeof p.stockValue === 'number' && !isNaN(p.stockValue) && p.stockValue > 0
      ? p.stockValue
      : sQty * (p.wholesalePrice || 0);
    initial.totalStockValue += sValWholesale;

    // Exact stock value at retail (prix de vente public / first TND price)
    const sValRetail = sQty * (p.retailPrice || 0);
    initial.totalStockRetailValue! += sValRetail;

    initial.totalGrossMargin += p.grossMarginValue || 0;
  });

  initial.overallSellThrough = initial.totalBuyQty > 0 
    ? Math.round((initial.totalSalesQty / initial.totalBuyQty) * 1000) / 10 
    : 0;

  initial.overallValueSellThrough = initial.totalBuyValue > 0 
    ? Math.round((initial.totalSalesValue / initial.totalBuyValue) * 1000) / 10 
    : 0;

  initial.overallMarginRate = initial.totalSalesValue > 0 
    ? Math.round((initial.totalGrossMargin / initial.totalSalesValue) * 1000) / 10 
    : 0;

  initial.averageRetailPrice = initial.totalSalesQty > 0 
    ? Math.round((initial.totalSalesValue / initial.totalSalesQty) * 10) / 10 
    : 0;

  initial.averageCostPrice = initial.totalBuyQty > 0 
    ? Math.round((initial.totalBuyValue / initial.totalBuyQty) * 10) / 10 
    : 0;

  return initial;
}

// Export formatted CSV of active products
export function exportProductsToCSV(products: ProductItem[], filename: string = 'Adidas_FW25_Buying_Report.csv') {
  const curr = activeAppCurrency;
  const exportRows = products.map((p, idx) => ({
    'Rang': idx + 1,
    'Article No. (SKU)': p.sku,
    'Article Name': p.name,
    'Product Division': p.division,
    'Sports Category': p.sport,
    'Product Type': p.productType,
    'Sales Line': p.salesLine,
    'Base Color': p.color || '',
    'Gender': p.gender,
    [`Prix Vente (${curr})`]: p.retailPrice,
    [`Prix Achat Net (${curr})`]: p.wholesalePrice,
    'Total Achat (Qté)': p.totalBuyQty,
    [`Valeur Achat (${curr})`]: p.totalBuyValue,
    'Somme Sales Qty': p.totalSalesQty,
    [`Somme Turnover (${curr})`]: p.totalSalesValue,
    'Sell-Through (%)': `${p.sellThroughRate}%`,
    'Stock Restant (U)': p.stockQty,
    [`Valeur Stock (${curr})`]: p.stockValue,
    [`Marge Brute (${curr})`]: p.grossMarginValue,
    'Taux de Marge (%)': `${p.grossMarginRate}%`,
    'URL Image': p.imageUrl,
  }));

  const csv = Papa.unparse(exportRows, { delimiter: ';' });
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export template CSV matching exact user extraction columns
export function downloadSampleCSV() {
  const sampleRows = [
    {
      'Article No.': 'B75806',
      'Article Name': 'SAMBA OG',
      'Age Group': 'ADULT',
      'Product Division': 'FOOTWEAR',
      'Sports Category': 'ORIGINALS',
      'Product Group': 'SHOES',
      'Product Type': 'SHOES - LOW (NON FOOTBALL)',
      'Sales Line': 'SAMBA',
      'Base Color': 'Blanc',
      'Gender': 'MALE',
      'Display Size-France': '41 1/3',
      'URL Image': 'https://i.ibb.co/xK3ykXHy/B75806-16-FOOTWEAR-ZIP-Turntable-3d-1-white.png',
      'First TND Price': '449 DT',
      'Purchase Net Price': '40,6',
      'Somme de Sales Qty': 1,
      'Total Achat': 1,
      'Somme de Turnover': 449,
    },
    {
      'Article No.': 'B75806',
      'Article Name': 'SAMBA OG',
      'Age Group': 'ADULT',
      'Product Division': 'FOOTWEAR',
      'Sports Category': 'ORIGINALS',
      'Product Group': 'SHOES',
      'Product Type': 'SHOES - LOW (NON FOOTBALL)',
      'Sales Line': 'SAMBA',
      'Base Color': 'Blanc',
      'Gender': 'MALE',
      'Display Size-France': '42',
      'URL Image': 'https://i.ibb.co/xK3ykXHy/B75806-16-FOOTWEAR-ZIP-Turntable-3d-1-white.png',
      'First TND Price': '449 DT',
      'Purchase Net Price': '40,6',
      'Somme de Sales Qty': 1,
      'Total Achat': 1,
      'Somme de Turnover': 449,
    },
    {
      'Article No.': 'B75807',
      'Article Name': 'SAMBA OG',
      'Age Group': 'ADULT',
      'Product Division': 'FOOTWEAR',
      'Sports Category': 'ORIGINALS',
      'Product Group': 'SHOES',
      'Product Type': 'SHOES - LOW (NON FOOTBALL)',
      'Sales Line': 'SAMBA',
      'Base Color': 'Noir',
      'Gender': 'MALE',
      'Display Size-France': '38',
      'URL Image': 'https://i.ibb.co/8gP5d9tM/B75807-16-FOOTWEAR-ZIP-Turntable-3d-1-white.png',
      'First TND Price': '449 DT',
      'Purchase Net Price': '40,6',
      'Somme de Sales Qty': 10,
      'Total Achat': 10,
      'Somme de Turnover': 4490,
    },
  ];

  const csv = Papa.unparse(sampleRows, { delimiter: '\t' });
  const blob = new Blob(['\ufeff' + csv], { type: 'text/tab-separated-values;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'Modele_Import_Adidas_FW25.tsv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
