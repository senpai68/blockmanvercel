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

// MiniGameToken. Parametros del cliente: typeId, targetId, gameVersion
function auth(req, res) {
  const gameId = String(req.query.typeId || req.query.gameId || '');
  const key = gameId.startsWith('g') ? gameId : 'g' + gameId;
  res.status(200).json(ok({
    dispUrl: base(req),
    downloadUrl: base(req) + '/v1/game-map',
    mapName: MAPS[key] || '',
    region: 0,
    requestId: {},
    signature: '',
    timestamp: Date.now(),
    token: 'dev-token',
  }));
}
router.get('/game/api/v2/game/auth', auth);
router.get('/game/api/v1/flow/game/auth', auth);

// PROVISIONAL: se desconoce la forma exacta de la respuesta
router.post('/v1/dispatch', (req, res) => {
  const [ip, port] = GAME_ADDR.split(':');
  res.status(200).json(ok({ ip, port: Number(port || 19130), gameAddr: GAME_ADDR }));
});

// Provisionales: solo registran lo que pide el cliente
router.get('/v1/game-map', (req, res) => res.status(200).json(ok({})));
router.get('/v1/game-res', (req, res) => res.status(200).json(ok({})));

module.exports = router;
