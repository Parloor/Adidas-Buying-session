import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing with generous limit for large CSV product imports
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Persistence directory
const DATA_DIR = path.join(__dirname, 'data_storage');
const SESSIONS_FILE = path.join(DATA_DIR, 'published_sessions.json');

// Ensure storage directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface StoredSession {
  id: string;
  title: string;
  description?: string;
  author?: string;
  createdAt: string;
  currency: string;
  productCount: number;
  totalSalesValue: number;
  totalBuyQty: number;
  products: any[];
}

import { INITIAL_ADIDAS_FW25_PRODUCTS } from './src/data/mockAdidasFW25.ts';

function getStoredSessions(): Record<string, StoredSession> {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      const content = fs.readFileSync(SESSIONS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Object.keys(parsed).length > 0) {
        return parsed;
      }
    }

    // Initialize with default session if none exists
    const defaultId = 'adidas-fw25-officiel';
    const totalSalesValue = INITIAL_ADIDAS_FW25_PRODUCTS.reduce((acc: number, p: any) => acc + (p.totalSalesValue || 0), 0);
    const totalBuyQty = INITIAL_ADIDAS_FW25_PRODUCTS.reduce((acc: number, p: any) => acc + (p.totalBuyQty || 0), 0);

    const initialSessions: Record<string, StoredSession> = {
      [defaultId]: {
        id: defaultId,
        title: 'Session Officielle Adidas FW25 (Échantillon Standard)',
        description: 'Session standard de merchandising incluant Samba OG, Spezial, Gazelle, Predator et Textile FW25.',
        author: 'Adidas Merchandising Central',
        createdAt: new Date().toISOString(),
        currency: 'DT',
        productCount: INITIAL_ADIDAS_FW25_PRODUCTS.length,
        totalSalesValue,
        totalBuyQty,
        products: INITIAL_ADIDAS_FW25_PRODUCTS,
      },
    };
    saveStoredSessions(initialSessions);
    return initialSessions;
  } catch (err) {
    console.error('Erreur lecture sessions:', err);
  }
  return {};
}

function saveStoredSessions(sessions: Record<string, StoredSession>) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf-8');
  } catch (err) {
    console.error('Erreur sauvegarde sessions:', err);
  }
}

// ================= API ROUTES =================

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// List all published sessions (lightweight metadata)
app.get('/api/sessions', (_req, res) => {
  const sessions = getStoredSessions();
  const sessionList = Object.values(sessions)
    .map(({ products, ...meta }) => meta)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  res.json({ sessions: sessionList });
});

// Get a specific session with full product data
app.get('/api/sessions/:id', (req, res) => {
  const { id } = req.params;
  const sessions = getStoredSessions();
  const session = sessions[id];

  if (!session) {
    return res.status(404).json({ error: `Session "${id}" introuvable` });
  }

  res.json(session);
});

// Publish / Save a new session
app.post('/api/sessions', (req, res) => {
  try {
    const { title, description, author, products, currency, customSlug } = req.body;

    if (!products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ error: 'Aucun produit valide fourni pour la session.' });
    }

    // Generate unique, readable slug ID
    let slug = '';
    if (customSlug && typeof customSlug === 'string') {
      slug = customSlug.toLowerCase().trim().replace(/[^a-z0-9_-]+/g, '-');
    }
    if (!slug) {
      const base = (title || 'session-fw25')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 24);
      const rand = Math.random().toString(36).substring(2, 7);
      slug = `${base || 'fw25'}-${rand}`;
    }

    const totalSalesValue = products.reduce((acc: number, p: any) => acc + (Number(p.totalSalesValue) || 0), 0);
    const totalBuyQty = products.reduce((acc: number, p: any) => acc + (Number(p.totalBuyQty) || 0), 0);

    const newSession: StoredSession = {
      id: slug,
      title: (title && String(title).trim()) || `Session Achats FW25 (${new Date().toLocaleDateString('fr-FR')})`,
      description: description ? String(description).trim() : '',
      author: author ? String(author).trim() : 'Équipe Merchandising',
      createdAt: new Date().toISOString(),
      currency: currency || 'DT',
      productCount: products.length,
      totalSalesValue,
      totalBuyQty,
      products,
    };

    const sessions = getStoredSessions();
    sessions[slug] = newSession;
    saveStoredSessions(sessions);

    console.log(`[API] Session publiée: "${newSession.title}" (ID: ${slug}, ${products.length} articles)`);

    res.status(201).json({
      success: true,
      session: newSession,
      sessionId: slug,
    });
  } catch (err: any) {
    console.error('Erreur publication session:', err);
    res.status(500).json({ error: err.message || 'Erreur serveur lors de la publication' });
  }
});

// Delete a session
app.delete('/api/sessions/:id', (req, res) => {
  const { id } = req.params;
  const sessions = getStoredSessions();
  if (sessions[id]) {
    delete sessions[id];
    saveStoredSessions(sessions);
    return res.json({ success: true, message: `Session ${id} supprimée` });
  }
  return res.status(404).json({ error: 'Session non trouvée' });
});

// ================= VITE DEV OR STATIC PROD =================

async function start() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Adidas Buying Session Server running on http://0.0.0.0:${PORT} [${isProd ? 'PROD' : 'DEV'}]`);
  });
}

start().catch((err) => {
  console.error('Fatal server start error:', err);
  process.exit(1);
});
