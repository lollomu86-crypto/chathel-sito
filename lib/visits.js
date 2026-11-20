// ChatHel · logica delle visite del sito (usata da api/visit.js e api/visits.js, provata da test/visits.test.js).
// Niente dipendenze. Non si salva l'IP: serve solo, insieme al browser e a una parola segreta, per un codice anonimo
// che cambia ogni giorno (stesso visitatore nello stesso giorno = stesso codice; il giorno dopo non si collega).
import { createHash, timingSafeEqual } from 'node:crypto';

const BOT = /bot\b|bot\/|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|skype|discord|slack|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|vercel|python|curl|wget|httpclient|node-fetch|undici|axios|go-http|java\/|okhttp|scrapy|semrush|ahrefs|mj12|dotbot|petal|yandex|baidu|bytespider|gptbot|claude|anthropic|perplexity|ccbot/i;

/** true se il browser dichiara di essere un programma automatico (motori di ricerca, anteprime dei link, test). */
export function isBot(ua) {
  if (!ua || ua.length < 20) return true;
  return BOT.test(ua);
}

export function deviceOf(ua = '') {
  if (/iPad|Tablet|PlayBook|Silk|Android(?!.*Mobile)/i.test(ua)) return 'tablet';
  if (/Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function browserOf(ua = '') {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/OPR\/|Opera/.test(ua)) return 'Opera';
  if (/SamsungBrowser/.test(ua)) return 'Samsung Internet';
  if (/Firefox\/|FxiOS/.test(ua)) return 'Firefox';
  if (/CriOS|Chrome\//.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua)) return 'Safari';
  return 'Altro';
}

export function osOf(ua = '') {
  if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X|Macintosh/.test(ua)) return 'Mac';
  if (/CrOS/.test(ua)) return 'ChromeOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Altro';
}

/** Solo due forme di percorso: la home "/" o il link di un hotel "/v/<nome>". Il resto conta come home. */
export function normalizePath(p) {
  const m = typeof p === 'string' ? p.toLowerCase().match(/^\/v\/([a-z0-9-]{1,60})\/?$/) : null;
  return m ? { path: `/v/${m[1]}`, hotel: m[1] } : { path: '/', hotel: null };
}

/** Solo il nome del sito di provenienza (niente percorso o parametri); vuoto se arriva da chathel stesso. */
export function referrerHost(ref) {
  if (typeof ref !== 'string' || !ref) return null;
  try {
    const h = new URL(ref).hostname.toLowerCase().replace(/^www\./, '');
    if (!h || h === 'chathel.com' || h.endsWith('.chathel.com')) return null;
    return h.slice(0, 120);
  } catch { return null; }
}

/** Le intestazioni geografiche di Vercel arrivano codificate (es. "Reggio%20Emilia"). */
export function header(headers, name) {
  const v = headers[name];
  const s = Array.isArray(v) ? v[0] : v;
  if (!s) return null;
  try { return decodeURIComponent(String(s)).slice(0, 80); } catch { return String(s).slice(0, 80); }
}

/** Data in Italia (AAAA-MM-GG): il codice del visitatore cambia a mezzanotte italiana. */
export function romeDay(now) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(now);
}

export function visitorId(salt, day, ip, ua) {
  return createHash('sha256').update(`${salt}|${day}|${ip}|${ua}`).digest('hex').slice(0, 16);
}

/** Riga da salvare per una visita, oppure null se va scartata (robot, richiesta non valida). */
export function buildRow(headers, body, salt, now = new Date()) {
  const ua = String(headers['user-agent'] || '');
  if (isBot(ua)) return null;
  if (body && body.webdriver === true) return null;
  const { path, hotel } = normalizePath(body && body.path);
  const fwd = String(headers['x-forwarded-for'] || headers['x-real-ip'] || '');
  const ip = fwd.split(',')[0].trim();
  return {
    ts: now.toISOString(),
    path,
    hotel,
    city: header(headers, 'x-vercel-ip-city'),
    region: header(headers, 'x-vercel-ip-country-region'),
    country: (header(headers, 'x-vercel-ip-country') || '').slice(0, 8) || null,
    device: deviceOf(ua),
    browser: browserOf(ua),
    os: osOf(ua),
    referrer: referrerHost(body && body.ref),
    visitor: visitorId(salt, romeDay(now), ip, ua),
  };
}

/** Confronto della password del pannello a tempo costante. */
export function passwordOk(given, expected) {
  if (typeof given !== 'string' || typeof expected !== 'string' || !expected) return false;
  const a = createHash('sha256').update(given).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Giorni da mostrare nel pannello: 1-400, predefinito 30. */
export function daysParam(v) {
  const n = Number.parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) && n >= 1 && n <= 400 ? n : 30;
}
