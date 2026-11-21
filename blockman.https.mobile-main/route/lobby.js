const express = require('express');
const router = express.Router();
const MAPS = require('../config/maps.json');

const ok = (data) => ({ code: 1, message: 'SUCCESS', data });
const base = (req) => 'https://' + req.headers.host;
const GAME_ADDR = process.env.GAME_ADDR || '127.0.0.1:19130';

// Registro de lo que pide el cliente (Vercel > Logs, buscar LOBBY)
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

// MiniGameToken (campos confirmados en el smali):
// dispUrl, downloadUrl, mapName (String), region (int), requestId (Map),
// signature (String), timestamp (long), token (String)
function tokenFor(req, key) {
  return {
    dispUrl: base(req),
    downloadUrl: base(req) + '/v1/game-map',
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

// GameResInfo (campos confirmados): durl (String), resVersion (int)
// durl = de donde descarga el cliente los recursos del juego.
// OJO: ese archivo aun no existe en tu servidor, asi que el siguiente
// error probable sera la descarga de recursos.
router.get('/v1/game-res', (req, res) => {
  const key = gameKey(req.query.gameType);
  res.status(200).json(ok({
    durl: base(req) + '/static/game-res/' + key + '.zip',
    resVersion: 1,
  }));
});

// Dispatch (campos confirmados): chatRoomId, code(int), dispUrl, gAddr,
// gameType, mapId, mapName, mapUrl, name, region (String), requestIds (Map),
// resVersion (int), signature, timestamp (long)
// El body que manda el cliente queda registrado arriba (body=).
router.post('/v1/dispatch', (req, res) => {
  const b = req.body || {};
  const key = gameKey(b.gameType || b.typeId || b.gameId || req.query.gameType);
  const mapName = MAPS[key] || '';
  res.status(200).json(ok({
    chatRoomId: '',
    code: 1,
    dispUrl: base(req),
    gAddr: GAME_ADDR,
    gameType: key,
    mapId: mapName.split('/').pop() || '',
    mapName,
    mapUrl: base(req) + '/v1/game-map?mapName=' + encodeURIComponent(mapName) + '&gameType=' + key,
    name: key,
    region: '0',
    requestIds: {},
    resVersion: 1,
    signature: '',
    timestamp: Date.now(),
  }));
});

// game-map devuelve MiniGameToken (confirmado en IGameApi)
router.get('/v1/game-map', (req, res) => {
  const key = gameKey(req.query.gameType);
  const t = tokenFor(req, key);
  if (req.query.mapName) t.mapName = String(req.query.mapName);
  res.status(200).json(ok(t));
});

module.exports = router;
