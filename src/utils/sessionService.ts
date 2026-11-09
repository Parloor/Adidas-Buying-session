import { ProductItem, PublishedSessionMeta, PublishedSessionData } from '../types/merchandising';

const API_BASE = '/api/sessions';

export async function fetchPublishedSessions(): Promise<PublishedSessionMeta[]> {
  try {
    const res = await fetch(API_BASE);
    if (!res.ok) {
      throw new Error(`Erreur réseau (${res.status})`);
    }
    const data = await res.json();
    return data.sessions || [];
  } catch (err) {
    console.warn('[SessionService] Impossible de récupérer la liste des sessions:', err);
    return [];
  }
}

export async function fetchSessionById(id: string): Promise<PublishedSessionData | null> {
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Erreur lors de la récupération de la session (${res.status})`);
    }
    return await res.json();
  } catch (err) {
    console.error(`[SessionService] Erreur chargement session ${id}:`, err);
    throw err;
  }
}

export interface PublishSessionPayload {
  title: string;
  description?: string;
  author?: string;
  products: ProductItem[];
  currency?: string;
  customSlug?: string;
}

export async function publishSession(payload: PublishSessionPayload): Promise<{
  success: boolean;
  session: PublishedSessionData;
  sessionId: string;
}> {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Erreur lors de la publication (${res.status})`);
  }

  return await res.json();
}

export async function deleteSession(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.error(`[SessionService] Erreur suppression session ${id}:`, err);
    return false;
  }
}

export function buildShareUrl(sessionId: string): string {
  if (typeof window === 'undefined') return `/?session=${sessionId}`;
  const origin = window.location.origin;
  return `${origin}/?session=${encodeURIComponent(sessionId)}`;
}
