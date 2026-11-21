const express = require('express');
const mongoose = require('mongoose');

const path = require('path');
const configRouter = require('./route/config');

const userRouter = require('./route/user');
const gamesRouter = require('./route/games');

const decorationRouter = require('./route/decoration');
const mailboxRouter = require('./route/mailbox');
const shopRouter = require('./route/shop');
const lobbyRouter = require('./route/lobby');

const gamesJson = require('./config/games');

const databaseConfig = require('./config/database');

// Dont change these
const app = express();
const port = 3000;

console.log(
  'MONGODB_URI definida:',
  !!process.env.MONGODB_URI,
  'empieza por:',
  (process.env.MONGODB_URI || '').slice(0, 14)
);

let connPromise = null;
function connectDB() {
  if (mongoose.connection.readyState === 1) return Promise.resolve();
  if (!connPromise) {
    connPromise = mongoose
      .connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 8000,
        bufferCommands: false,
      })
      .then(() => {
        console.log(`MongoDB OK: conectado a ${databaseConfig.databaseType}`);
      })
      .catch((err) => {
        connPromise = null;
        console.log('MongoDB ERROR:', err.name, '-', err.message);
        throw err;
      });
  }
  return connPromise;
}

app.use(express.json());

// Portadas locales (/static/games-images/...)
app.use('/static', express.static(path.join(__dirname, 'static')));

// ---------------------------------------------------------------
// RESPUESTAS FIJAS con el tipo EXACTO que espera el cliente 1.15.2
// (van antes del middleware de MongoDB: no dependen de la base)
// ---------------------------------------------------------------
const ok = (data) => (req, res) =>
  res.status(200).json({ code: 1, message: 'SUCCESS', data });
const page = { pageNo: 0, pageSize: 20, totalPage: 0, totalSize: 0, data: [] };

// Boolean
app.get('/mailbox/api/v1/mail/new', ok(false));
app.get('/shop/api/v1/new/shop/user/gift/suit/receive', ok(false));
app.get('/user/api/v1/users/prefect/info/reward/check/:userId', ok(false));
app.get('/pay/api/v1/pay/payssion/flag', ok(false));
app.get('/pay/api/v1/pay/third/part', ok(false));

// String / Integer
app.get('/clan/api/v1/clan/tribe/id', ok(''));
app.get('/user/api/v1/users/device/token', ok('token'));
app.get('/activity/api/v1/collect/exchange/card/combine', ok(0));

// Map y objetos
app.get('/game/api/v1/games/update/list/:userId', ok({}));
app.get('/decoration/api/v1/new/decorations/check/resource', ok({}));

// PageData (objeto paginado)
app.get('/friend/api/v1/friends/follow', ok(page));
app.get('/msg/api/v1/msg/group/chat/list', ok(page));

// Lista de minijuegos (la app usa estas rutas para el launcher)
const gamesPage = (req, res) => {
  const pageNo = parseInt(req.query.pageNo) || 0;
  const data = pageNo === 0 ? gamesJson : [];
  res.status(200).json({
    code: 1,
    message: 'SUCCESS',
    data: {
      pageNo,
      pageSize: gamesJson.length,
      totalPage: 1,
      totalSize: gamesJson.length,
      data,
    },
  });
};
app.get('/game/api/v1/game/revision/list/more', gamesPage);

// CAMBIADO: by/condition devuelve TypePageData: { typeId, pageInfo: { ...pagina } }
app.get('/game/api/v1/game/revision/list/by/condition', (req, res) => {
  const pageNo = parseInt(req.query.pageNo) || 0;
  const typeId = parseInt(req.query.filterTypeId) || 0;
  res.status(200).json({
    code: 1,
    message: 'SUCCESS',
    data: {
      typeId,
      pageInfo: {
        pageNo,
        pageSize: gamesJson.length,
        totalPage: 1,
        totalSize: gamesJson.length,
        data: pageNo === 0 ? gamesJson : [],
      },
    },
  });
});

app.get('/game/api/v1/game/revision/list/recommend', ok(gamesJson));

// Categorias del launcher (GameRankingInfo)
app.get('/game/api/v1/category/list/by/language', ok([
  { typeId: 0, typeName: 'All', sortType: 'all', iconUrl: '', iconResId: 0 },
  { typeId: 1, typeName: 'Action', sortType: 'action', iconUrl: '', iconResId: 0 },
  { typeId: 2, typeName: 'PvP', sortType: 'pvp', iconUrl: '', iconResId: 0 },
]));

// Historial de juegos jugados: vacio a proposito
app.get('/game/api/v1/games/playlist/recently', ok([]));

// Tienda (skins/decoraciones): no depende de la base por ahora
app.use('/shop', shopRouter);

// Auth y dispatch de minijuegos (no dependen de la base).
// Montado en '/' porque sus rutas incluyen el prefijo completo
// (/game/api/v2/game/auth, /v1/dispatch, ...).
app.use('/', lobbyRouter);

// ---------------------------------------------------------------

app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (e) {
    res.status(503).json({ code: -1, message: 'db error: ' + e.message });
  }
});

app.use('/config', configRouter);
app.use('/user', userRouter);
app.use('/game', gamesRouter);

app.use('/decoration', decorationRouter);

app.use('/mailbox', mailboxRouter);

app.all('/', (req, res) => {
  res.status(200).send('Hello World');
});

// COMODIN: rutas que el cliente 1.15.2 pide y el servidor aun no tiene.
// Responde "SUCCESS" con datos vacios para que el juego no reciba 404.
app.use((req, res) => {
  console.log('STUB:', req.method, req.originalUrl);
  const p = req.path;
  const isList =
    /list|recently|follow|recommend|decorations|friends|users\/\d+\/type/.test(p);
  res.status(200).json({
    code: 1,
    message: 'SUCCESS',
    data: isList ? [] : {},
  });
});

app.listen(port, () => {
  console.log(`Success your server is available at http://localhost:${port}`);
});
