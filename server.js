/**
 * NetShort â€” single-file production server (Render ke liye)
 * ---------------------------------------------------------
 * 1) dist/ ki built files serve karta hai (SPA fallback ke saath)
 * 2) /api/netshort/* ko upstream API par proxy karta hai (CORS bypass)
 * 3) Upstream down ho to procedurally banaya gaya DEMO data deta hai
 *
 * Koi dependency nahi. Render settings:
 *   Build Command : npm install && npm run build
 *   Start Command : node server.js
 *   Env           : VITE_API_BASE_URL=/api/netshort
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(ROOT, 'dist');
const PORT = process.env.PORT || 3000;
const PREFIX = '/api/netshort';
const UPSTREAM = (process.env.API_UPSTREAM || 'https://netshort.sansekai.my.id').replace(/\/+$/, '');
const MOCK = (process.env.MOCK_FALLBACK || 'on').toLowerCase() !== 'off';
const TIMEOUT = Number(process.env.PROXY_TIMEOUT || 10000);

/* ------------------------------------------------------------------ */
/* DEMO DATA (upstream down hone par)                                  */
/* ------------------------------------------------------------------ */
const TITLES = [
  ['The CEO\'s Secret Bride', ['Romantis', 'CEO'], 'Populer'],
  ['Revenge of the Hidden Heir', ['Balas Dendam', 'Keluarga'], 'Baru'],
  ['My Billionaire Roommate', ['Romantis', 'Komedi'], null],
  ['Reborn as the Doctor Queen', ['Reborn', 'Fantasi'], 'Populer'],
  ['The Substitute Wife', ['Romantis', 'Melodrama'], null],
  ['Alpha\'s Rejected Mate', ['Werewolf', 'Romantis'], 'Baru'],
  ['Contract Marriage 99 Days', ['Romantis', 'Kontrak'], null],
  ['The Legend of Sword Immortal', ['Xianxia', 'Aksi'], 'Populer'],
  ['Married to My Ex\'s Uncle', ['Romantis', 'Balas Dendam'], 'Baru'],
  ['Twins of the Fallen Family', ['Keluarga', 'Reborn'], null],
  ['Boss, Your Wife Ran Away', ['Romantis', 'Komedi'], 'Populer'],
  ['Hacker in the Palace', ['Aksi', 'Fantasi'], null],
];
const cover = (i) => `https://picsum.photos/seed/netshort${i}/400/600`;
const wide = (i) => `https://picsum.photos/seed/netshortwide${i}/1200/675`;

const drama = (t, i) => ({
  id: null,
  shortPlayId: `demo-${i + 1}`,
  shortPlayLibraryId: `lib-demo-${i + 1}`,
  shortPlayName: t[0],
  shortPlayLabels: t[1].join(','),
  labelArray: t[1],
  isNewLabel: t[2] === 'Baru',
  labelLanguageIds: ['id'],
  shortPlayCover: cover(i + 1),
  groupShortPlayCover: wide(i + 1),
  contentModel: null,
  isChase: false,
  script: 1,
  scriptName: t[2],
  scriptType: 1,
  heatScore: 1250000 - i * 61000,
  heatScoreShow: `${(12500 - i * 610).toLocaleString('id-ID')} rb`,
  totalReserveNum: '0',
  isReserve: 0,
  publishTime: Date.now(),
  expGroup: null,
  expName: null,
  sceneId: null,
  highImage: wide(i + 1),
  isNeedHighImage: true,
  isForceShortPlay: false,
});

const ALL = TITLES.map(drama);
const sec = (name, remark, items) => ({
  contentType: 1,
  groupId: `grp-${remark}`,
  contentName: name,
  contentModel: 1,
  contentInfos: items,
  heatShowSwitch: 1,
  freeEndTime: 0,
  hiddenName: 0,
  highShowCount: null,
  contentRemark: remark,
});

const MOCK_THEATERS = [
  sec('ðŸ”¥ Trending Sekarang', 'trending', ALL.slice(0, 8)),
  sec('ðŸ‘ Drama Populer', 'popular', ALL.slice(4, 12)),
  sec('â° Rilis Terbaru', 'new', ALL.slice(2, 11)),
  sec('ðŸŽ¤ Romantis', 'romance', ALL.filter((d) => d.labelArray.includes('Romantis'))),
];
const MOCK_FORYOU = {
  ...sec('Untukmu', 'foryou', ALL),
  maxOffset: 40,
  freeConfigId: null,
  highShowCount: 8,
  completed: false,
};
const MOCK_SEARCH = {
  language: 'id',
  searchCode: [],
  shadedWordSearchResult: ALL.map((d, i) => ({
    id: null,
    shortPlayId: d.shortPlayId,
    shortPlayLibraryId: d.shortPlayLibraryId,
    popularityValue: null,
    shortPlayName: d.shortPlayName,
    shortPlayCover: d.shortPlayCover,
    shotIntroduce: 'Demo data â€” upstream API sedang tidak tersedia.',
    type: null,
    labelNames: d.labelArray.join(','),
    labelNameList: d.labelArray,
    script: 1,
    scriptName: d.scriptName,
    scriptType: 1,
    sortNumber: i,
    heatScore: d.heatScore,
    scoreShow: null,
    e_bm25_score: '0',
    starMessage: null,
    actorList: null,
    formatHeatScore: d.heatScoreShow,
  })),
  searchCodeSearchResult: [],
  noResult: [],
  total: ALL.length,
  abValue: 1,
  isNewLabel: false,
  e_request_sequence_id: 'demo',
  abtestHitNewBO: null,
};
const D0 = ALL[0];
const MOCK_EPISODES = {
  shortPlayId: D0.shortPlayId,
  shortPlayLibraryId: D0.shortPlayLibraryId,
  shortPlayName: D0.shortPlayName,
  shortPlayCover: D0.shortPlayCover,
  shortPlayLabels: D0.labelArray,
  isNewLabel: true,
  shotIntroduce:
    'Ini data contoh (mock) karena API NetShort asli tidak dapat dihubungi. Semua fitur UI tetap bisa dicoba.',
  payPoint: 0,
  totalEpisode: 8,
  goldCoinPrice: 0,
  isFinish: 0,
  isChase: false,
  defaultLikeNums: 12400,
  defaultChaseNums: 8811,
  onlineState: 1,
  recordHistory: 0,
  language: 'id',
  shortPlayType: 1,
  script: 1,
  scriptName: 'Populer',
  scriptType: 1,
  videoPriceTemplateId: 'demo',
  shortPlayEpisodeInfos: Array.from({ length: 8 }, (_, i) => ({
    shortPlayId: D0.shortPlayId,
    shortPlayLibraryId: D0.shortPlayLibraryId,
    episodeId: `demo-ep-${i + 1}`,
    episodeNo: i + 1,
    episodeType: 1,
    episodeCover: cover(i + 1),
    likeNums: '1200',
    chaseNums: '900',
    isLike: false,
    isChase: false,
    playVoucher:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    playClarity: '720p',
    sdkVid: `demo-${i + 1}`,
    isLock: false,
    isVip: false,
    isAd: false,
    episodeGoldCoinPrice: 0,
    subtitleList: [],
    pressType: 1,
  })),
};

function mockFor(apiPath) {
  if (apiPath.startsWith(`${PREFIX}/theaters`)) return MOCK_THEATERS;
  if (apiPath.startsWith(`${PREFIX}/foryou`)) return MOCK_FORYOU;
  if (apiPath.startsWith(`${PREFIX}/search`)) return MOCK_SEARCH;
  if (apiPath.startsWith(`${PREFIX}/allepisode`)) return MOCK_EPISODES;
  return null;
}

/* ------------------------------------------------------------------ */
/* HTTP                                                                */
/* ------------------------------------------------------------------ */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
};

function json(res, status, obj, source) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'x-data-source': source,
  });
  res.end(body);
}

async function proxy(req, res, apiPath) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const up = await fetch(`${UPSTREAM}${apiPath}`, {
      method: req.method,
      headers: { accept: '*/*', 'user-agent': 'netshort-proxy/1.0' },
      signal: ctrl.signal,
      redirect: 'follow',
    });
    const buf = Buffer.from(await up.arrayBuffer());
    clearTimeout(timer);
    if (!up.ok && MOCK) {
      const m = mockFor(apiPath);
      if (m) {
        console.log(`[mock] ${apiPath} (upstream ${up.status})`);
        return json(res, 200, m, 'mock');
      }
    }
    res.writeHead(up.status, {
      'content-type': up.headers.get('content-type') || 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=60',
      'access-control-allow-origin': '*',
      'x-data-source': 'upstream',
    });
    res.end(buf);
  } catch (err) {
    clearTimeout(timer);
    const reason = err.name === 'AbortError' ? 'upstream timeout' : err.message;
    const m = MOCK ? mockFor(apiPath) : null;
    if (m) {
      console.log(`[mock] ${apiPath} (${reason})`);
      return json(res, 200, m, 'mock');
    }
    json(res, 502, { error: 'upstream_unreachable', detail: reason }, 'error');
  }
}

function serveStatic(res, urlPath) {
  let rel = decodeURIComponent(urlPath.split('?')[0]);
  if (rel === '/' || rel === '') rel = '/index.html';
  let file = path.join(DIST, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(DIST)) file = path.join(DIST, 'index.html');

  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (path.extname(rel)) {
      res.writeHead(404, { 'content-type': 'text/plain' });
      return res.end('Not found');
    }
    file = path.join(DIST, 'index.html');
  }
  const ext = path.extname(file).toLowerCase();
  const immut = file.includes(`${path.sep}assets${path.sep}`);
  res.writeHead(200, {
    'content-type': MIME[ext] || 'application/octet-stream',
    'cache-control': immut ? 'public, max-age=31536000, immutable' : 'public, max-age=0, must-revalidate',
  });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer((req, res) => {
    const url = req.url || '/';
    if (url === '/healthz') {
      res.writeHead(200, { 'content-type': 'text/plain' });
      return res.end('ok');
    }
    if (url.startsWith(PREFIX)) return proxy(req, res, url);
    if (!fs.existsSync(path.join(DIST, 'index.html'))) {
      res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      return res.end('dist/index.html not found â€” build command check karo (npm run build).');
    }
    serveStatic(res, url);
  })
  .listen(PORT, '0.0.0.0', () => {
    console.log(`NetShort server on 0.0.0.0:${PORT}`);
    console.log(`  proxy: ${PREFIX}/* -> ${UPSTREAM}`);
    console.log(`  mock : ${MOCK ? 'ON' : 'OFF'}`);
  });
