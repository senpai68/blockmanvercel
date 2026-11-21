const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const MAPS = require('../config/maps.json');

const ok = (data) => ({ code: 1, message: 'SUCCESS', data });
const base = (req) => 'https://' + req.headers.host;

// ---------------------------------------------------------------
// MULTIPLAYER: direccion del servidor del motor (TCP/UDP, NO Vercel)
//   GAME_ADDR  = "IP:puerto" por defecto para todos los juegos
//   GAME_ADDRS = JSON por juego, ej: {"g1008":"1.2.3.4:19130","g1002":"1.2.3.4:19131"}
// Se configuran en Vercel > Settings > Environment Variables.
// ---------------------------------------------------------------
const GAME_ADDR = process.env.GAME_ADDR || '';
let GAME_ADDRS = {};
try { GAME_ADDRS = JSON.parse(process.env.GAME_ADDRS || '{}'); } catch (e) {
  console.log('GAME_ADDRS invalido (debe ser JSON):', e.message);
}
const addrFor = (key) => GAME_ADDRS[key] || GAME_ADDR;

// ---------------------------------------------------------------
// MAPAS: zips en static/game-res/<gameId>.zip  (el nombre DEBE ser <gameId>.zip)
// Sube el numero de un juego cuando cambies su zip: el cliente lo vuelve a bajar.
// ---------------------------------------------------------------
const RES_DIR = path.join(__dirname, '..', 'static', 'game-res');
const RES_VERSION = { g1008: 1 };
// Si defines GAME_RES_BASE (ej. https://mi-hosting.com/game-res) los zips se sirven desde ahi
// y NO desde Vercel (Vercel limita las respuestas de funciones a 4.5 MB).
// Sin GAME_RES_BASE funciona como antes (static/game-res/).
const GAME_RES_BASE = (process.env.GAME_RES_BASE || '').replace(/\/+$/, '');
const hasZip = (key) => GAME_RES_BASE
  ? !!MAPS[key]
  : fs.existsSync(path.join(RES_DIR, key + '.zip'));
const zipUrl = (req, key) => GAME_RES_BASE
  ? GAME_RES_BASE + '/' + key + '.zip'
  : base(req) + '/static/game-res/' + key + '.zip';
const resVer = (key) => RES_VERSION[key] || 1;

// Registro de lo que pide el cliente (Vercel > Logs, buscar LOBBY / GAME-RES)
router.use((req, res, next) => {
  console.log('LOBBY', req.method, req.originalUrl,
    'query=', JSON.stringify(req.query || {}),
    'body=', JSON.stringify(req.body || {}),
    'uid=', req.headers['x-shahe-uid'] || '-',
    'token=', req.headers['x-shahe-token'] ? 'si' : 'no');
  next();
});

const gameKey = (v) => {
  const s = String(v || '');
  return s.startsWith('g') ? s : 'g' + s;
};

// MiniGameToken: dispUrl, downloadUrl, mapName, region(int), requestId(Map),
// signature, timestamp(long), token
function tokenFor(req, key) {
  return {
    dispUrl: base(req),
    downloadUrl: hasZip(key) ? zipUrl(req, key) : '',
    mapName: MAPS[key] || '',
    region: 0,
    requestId: {},
    signature: '',
    timestamp: Date.now(),
    token: 'dev-token',
  };
}

function auth(req, res) {
  const key = gameKey(req.query.typeId || req.query.gameId);
  res.status(200).json(ok(tokenFor(req, key)));
}
router.get('/game/api/v2/game/auth', auth);
router.get('/game/api/v1/flow/game/auth', auth);

// GameResInfo: durl (String), resVersion (int)
router.get('/v1/game-res', (req, res) => {
  const key = gameKey(req.query.gameType);
  const zip = hasZip(key);
  console.log('GAME-RES', key,
    'engine=', req.query.engineVersion,
    'resVersion local=', req.query.resVersion,
    'zip=', zip);
  if (!zip) return res.status(200).json(ok({}));   // sin zip: no inventar URL (daria 404)
  res.status(200).json(ok({ durl: zipUrl(req, key), resVersion: resVer(key) }));
});

// Dispatch: chatRoomId, code, dispUrl, gAddr, gameType, mapId, mapName, mapUrl,
// name, region(String), requestIds(Map), resVersion, signature, timestamp
// gAddr = servidor multijugador al que el cliente se conecta tras descargar el mapa.
router.post('/v1/dispatch', (req, res) => {
  const b = req.body || {};
  const key = gameKey(b.gameType || b.typeId || b.gameId || req.query.gameType);
  const mapName = MAPS[key] || '';
  const addr = addrFor(key);
  if (!addr) console.log('DISPATCH ERROR: falta GAME_ADDR (IP:puerto del servidor del motor)');
  console.log('DISPATCH', key, 'gAddr=', addr || '(vacio)');
  res.status(200).json(ok({
    chatRoomId: '',
    code: 1,
    dispUrl: base(req),
    gAddr: addr,
    gameType: key,
    mapId: mapName.split('/').pop() || '',
    mapName,
    mapUrl: hasZip(key) ? zipUrl(req, key) : '',
    name: key,
    region: '0',
    requestIds: {},
    resVersion: resVer(key),
    signature: '',
    timestamp: Date.now(),
  }));
});

// game-map devuelve MiniGameToken
router.get('/v1/game-map', (req, res) => {
  const key = gameKey(req.query.gameType);
  const t = tokenFor(req, key);
  if (req.query.mapName) t.mapName = String(req.query.mapName);
  res.status(200).json(ok(t));
});

// Diagnostico: abre https://TU-DOMINIO/v1/maps-status en el navegador
router.get('/v1/maps-status', (req, res) => {
  let files = [];
  try { files = fs.readdirSync(RES_DIR); } catch (e) { files = ['ERROR: ' + e.message]; }
  res.status(200).json({
    gameResBase: GAME_RES_BASE || '(no definido: se usa static/game-res)',
    resDir: RES_DIR,
    zips: files,
    resVersions: RES_VERSION,
    gAddrDefault: GAME_ADDR,
    gAddrPerGame: GAME_ADDRS,
    gAddrDefinido: !!GAME_ADDR,
    gAddrIsLocal: /^(127\.|localhost|0\.0\.0\.0)/.test(GAME_ADDR),
  });
});

module.exports = router;
