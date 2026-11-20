const express = require('express');
const mongoose = require('mongoose');

const path = require('path');
const configRouter = require('./route/config');

const userRouter = require('./route/user');
const gamesRouter = require('./route/games');

const decorationRouter = require('./route/decoration');
const mailboxRouter = require('./route/mailbox');

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
