// POST /api/visit · registra una visita di chathel.com (chiamata da main.js). Risponde sempre 204: la pagina non aspetta.
// Variabili in Vercel (progetto chathel-sito): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VISITS_SALT.
import { buildRow } from '../lib/visits.js';

const ORIGINS = new Set(['https://chathel.com', 'https://www.chathel.com']);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).end(); return; }
  const origin = String(req.headers.origin || '');
  if (origin && !ORIGINS.has(origin)) { res.status(204).end(); return; }
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VISITS_SALT } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VISITS_SALT) { res.status(204).end(); return; }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  const row = buildRow(req.headers, body || {}, VISITS_SALT);
  if (!row) { res.status(204).end(); return; }

  try {
    const r = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/site_visits`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    });
    if (!r.ok) console.error('site_visits insert', r.status, (await r.text().catch(() => '')).slice(0, 300));
  } catch (e) {
    console.error('site_visits insert failed');
  }
  res.status(204).end();
}
