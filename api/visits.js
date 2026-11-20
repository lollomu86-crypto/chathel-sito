// GET /api/visits?days=30 · elenco delle visite per il pannello (chathel.com/pannello-visite).
// Serve l'intestazione "Authorization: Bearer <password>" uguale a VISITS_PANEL_PASSWORD (variabile in Vercel).
import { passwordOk, daysParam } from '../lib/visits.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  if (req.method !== 'GET') { res.status(405).end(); return; }
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VISITS_PANEL_PASSWORD } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VISITS_PANEL_PASSWORD) {
    res.status(503).json({ error: 'not_configured' });
    return;
  }
  const auth = String(req.headers.authorization || '');
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!passwordOk(given, VISITS_PANEL_PASSWORD)) {
    await wait(800); // rallenta chi prova password a caso
    res.status(401).json({ error: 'wrong_password' });
    return;
  }

  const days = daysParam(req.query && req.query.days);
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const cols = 'ts,path,hotel,city,region,country,device,browser,os,referrer,visitor';
  const url = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/site_visits?select=${cols}&ts=gte.${encodeURIComponent(since)}&order=ts.desc&limit=5000`;
  try {
    const r = await fetch(url, { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } });
    if (!r.ok) { res.status(502).json({ error: 'database', status: r.status }); return; }
    res.status(200).json({ days, visits: await r.json() });
  } catch {
    res.status(502).json({ error: 'database' });
  }
}
