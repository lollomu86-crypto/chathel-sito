import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isBot, deviceOf, browserOf, osOf, normalizePath, referrerHost, header, buildRow, passwordOk, daysParam, romeDay } from '../lib/visits.js';
import visit from '../api/visit.js';
import visits from '../api/visits.js';

const CHROME_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const SAFARI_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

test('robot riconosciuti, browser veri no', () => {
  for (const ua of ['Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)', 'Googlebot/2.1', 'WhatsApp/2.23',
    'facebookexternalhit/1.1', 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/130.0 Safari/537.36',
    'vercel-screenshot/1.0', 'curl/8.4.0', '', 'x']) assert.equal(isBot(ua), true, ua);
  for (const ua of [CHROME_WIN, SAFARI_IPHONE, ANDROID]) assert.equal(isBot(ua), false, ua);
});

test('dispositivo, browser e sistema', () => {
  assert.deepEqual([deviceOf(CHROME_WIN), browserOf(CHROME_WIN), osOf(CHROME_WIN)], ['desktop', 'Chrome', 'Windows']);
  assert.deepEqual([deviceOf(SAFARI_IPHONE), browserOf(SAFARI_IPHONE), osOf(SAFARI_IPHONE)], ['mobile', 'Safari', 'iOS']);
  assert.deepEqual([deviceOf(ANDROID), osOf(ANDROID)], ['mobile', 'Android']);
  assert.equal(browserOf(CHROME_WIN.replace('Safari/537.36', 'Safari/537.36 Edg/130.0')), 'Edge');
});

test('percorso: home o link di hotel, il resto conta come home', () => {
  assert.deepEqual(normalizePath('/v/hotel-mare'), { path: '/v/hotel-mare', hotel: 'hotel-mare' });
  assert.deepEqual(normalizePath('/v/H07/'), { path: '/v/h07', hotel: 'h07' });
  for (const p of ['/', '/pannello-visite', '/v/', '/v/a/b', '/v/<script>', 42, null]) assert.deepEqual(normalizePath(p), { path: '/', hotel: null }, String(p));
});

test('provenienza: solo il nome del sito, mai chathel stesso', () => {
  assert.equal(referrerHost('https://www.google.com/search?q=chathel'), 'google.com');
  assert.equal(referrerHost('https://chathel.com/'), null);
  assert.equal(referrerHost('non un url'), null);
  assert.equal(referrerHost(''), null);
});

test('città di Vercel decodificata', () => {
  assert.equal(header({ 'x-vercel-ip-city': 'Reggio%20Emilia' }, 'x-vercel-ip-city'), 'Reggio Emilia');
  assert.equal(header({}, 'x-vercel-ip-city'), null);
});

test('riga della visita: niente IP salvato, codice anonimo che cambia col giorno', () => {
  const h = { 'user-agent': SAFARI_IPHONE, 'x-forwarded-for': '93.40.1.2, 10.0.0.1', 'x-vercel-ip-city': 'Pula', 'x-vercel-ip-country': 'IT', 'x-vercel-ip-country-region': 'SU' };
  const d1 = new Date('2026-11-20T10:00:00Z'), d2 = new Date('2026-11-21T10:00:00Z');
  const r1 = buildRow(h, { path: '/v/hotel-mare', ref: 'https://wa.me/' }, 'sale', d1);
  assert.equal(r1.city, 'Pula'); assert.equal(r1.country, 'IT'); assert.equal(r1.hotel, 'hotel-mare');
  assert.equal(r1.device, 'mobile'); assert.equal(r1.referrer, 'wa.me');
  assert.ok(!JSON.stringify(r1).includes('93.40'), 'IP non salvato');
  assert.equal(r1.visitor, buildRow(h, {}, 'sale', d1).visitor, 'stesso giorno = stesso codice');
  assert.notEqual(r1.visitor, buildRow(h, {}, 'sale', d2).visitor, 'giorno dopo = codice diverso');
  assert.notEqual(r1.visitor, buildRow(h, {}, 'altro', d1).visitor, 'dipende dalla parola segreta');
  assert.equal(buildRow({ 'user-agent': 'Googlebot/2.1' }, {}, 's', d1), null);
  assert.equal(buildRow(h, { webdriver: true }, 's', d1), null);
});

test('giorno italiano: mezzanotte di Roma', () => {
  assert.equal(romeDay(new Date('2026-11-20T23:30:00Z')), '2026-11-21');
});

test('password e periodo', () => {
  assert.equal(passwordOk('abc', 'abc'), true);
  assert.equal(passwordOk('abd', 'abc'), false);
  assert.equal(passwordOk('', ''), false);
  assert.equal(passwordOk(undefined, 'abc'), false);
  assert.equal(daysParam('7'), 7); assert.equal(daysParam('0'), 30); assert.equal(daysParam('9999'), 30); assert.equal(daysParam(undefined), 30);
});

// --- funzioni, con Supabase finto ---
function fakeRes() {
  const r = { code: 0, body: null, headers: {} };
  r.status = (c) => { r.code = c; return r; };
  r.end = () => r; r.json = (b) => { r.body = b; return r; };
  r.setHeader = (k, v) => { r.headers[k] = v; };
  return r;
}
function withEnv(env, fn) {
  const old = { ...process.env };
  Object.assign(process.env, env);
  return Promise.resolve(fn()).finally(() => { for (const k of Object.keys(env)) { if (k in old) process.env[k] = old[k]; else delete process.env[k]; } });
}
const ENV = { SUPABASE_URL: 'https://db.example', SUPABASE_SERVICE_ROLE_KEY: 'service', VISITS_SALT: 'sale', VISITS_PANEL_PASSWORD: 'segreta' };

test('POST /api/visit salva la riga su Supabase e risponde 204', async () => {
  const calls = [];
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async (url, opt) => { calls.push({ url, opt }); return { ok: true, status: 201 }; };
  try {
    await withEnv(ENV, async () => {
      const res = fakeRes();
      await visit({ method: 'POST', headers: { origin: 'https://chathel.com', 'user-agent': CHROME_WIN, 'x-vercel-ip-city': 'Cagliari', 'x-vercel-ip-country': 'IT' }, body: { path: '/v/h07' } }, res);
      assert.equal(res.code, 204);
      assert.equal(calls.length, 1);
      assert.equal(calls[0].url, 'https://db.example/rest/v1/site_visits');
      const row = JSON.parse(calls[0].opt.body);
      assert.equal(row.city, 'Cagliari'); assert.equal(row.hotel, 'h07');
      const bot = fakeRes();
      await visit({ method: 'POST', headers: { 'user-agent': 'bingbot/2.0' }, body: {} }, bot);
      assert.equal(bot.code, 204); assert.equal(calls.length, 1, 'robot non salvato');
      const other = fakeRes();
      await visit({ method: 'POST', headers: { origin: 'https://altro.it', 'user-agent': CHROME_WIN }, body: {} }, other);
      assert.equal(calls.length, 1, 'altra origine non salvata');
    });
  } finally { globalThis.fetch = oldFetch; }
});

test('GET /api/visits: password giusta = elenco, sbagliata = 401, non configurato = 503', async () => {
  const oldFetch = globalThis.fetch;
  let asked = '';
  globalThis.fetch = async (url) => { asked = url; return { ok: true, status: 200, json: async () => [{ ts: '2026-11-20T10:00:00Z', path: '/', city: 'Cagliari' }] }; };
  try {
    await withEnv(ENV, async () => {
      const ok = fakeRes();
      await visits({ method: 'GET', headers: { authorization: 'Bearer segreta' }, query: { days: '7' } }, ok);
      assert.equal(ok.code, 200); assert.equal(ok.body.visits.length, 1); assert.equal(ok.body.days, 7);
      assert.match(asked, /site_visits\?select=.*&ts=gte\..*&order=ts\.desc/);
      const no = fakeRes();
      await visits({ method: 'GET', headers: { authorization: 'Bearer sbagliata' }, query: {} }, no);
      assert.equal(no.code, 401);
    });
    const res = fakeRes();
    const saved = process.env.VISITS_PANEL_PASSWORD; delete process.env.VISITS_PANEL_PASSWORD;
    await visits({ method: 'GET', headers: {}, query: {} }, res);
    if (saved !== undefined) process.env.VISITS_PANEL_PASSWORD = saved;
    assert.equal(res.code, 503);
  } finally { globalThis.fetch = oldFetch; }
});
