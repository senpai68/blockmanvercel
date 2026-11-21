const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();
const path = require('path');

const accountJson = require(path.resolve(__dirname, '../account/account.json'));
const detailsJson = require('../account/details');

const userSchema = new mongoose.Schema({
    password: String,
    nickname: String,
    userId: String,
    birthday: String,
    introduction: String,
    diamonds: Number,
    gold: Number,
    sex: Number,
    picUrl: String,
    vip: Number
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// Un userId es valido si existe y no es "0" (el cliente manda 0 cuando no tiene sesion)
function isValidId(id) {
    return id !== undefined && id !== null && String(id).trim() !== '' && String(id).trim() !== '0';
}

// Busca al usuario y, si no existe en la base, lo crea vacio.
// Devuelve null si el userId no es valido (por ejemplo 0): ese usuario no existe.
async function getOrCreateUser(userId) {
    if (!isValidId(userId)) return null;
    const id = String(userId).trim();

    let user = await User.findOne({ userId: id });
    if (!user) {
        user = new User({ userId: id });
        await user.save();
    }
    return user;
}

function serverError(res, route, e) {
    console.log('ERROR en ' + route + ':', e.message);
    return res.status(500).json({ code: -1, message: 'Server error', data: null });
}

function badParams(res) {
    return res.status(400).json({ code: 6, message: 'Bad request : Params error please fill them', data: null });
}

router.post('/api/v1/app/set-password', async (req, res) => {
    try {
        const { password } = req.body;
        const userId = req.headers.userid;

        if (!isValidId(userId)) {
            return badParams(res);
        }

        const user = await getOrCreateUser(userId);

        user.password = password;
        await user.save();

        return res.status(200).json({ code: 1, message: 'SUCCESS', data: null });
    } catch (e) {
        return serverError(res, 'set-password', e);
    }
});

router.post('/api/v1/app/renew', async (req, res) => {
    try {
        const userId = (Math.floor(Math.random() * 100000) + 600000).toString();

        const user = new User({ userId });
        await user.save();

        res.status(200).json({ code: 1, message: 'SUCCESS', data: { userId, accessToken: 'Not implemented' } });
    } catch (e) {
        return serverError(res, 'renew', e);
    }
});

// El cliente 1.15.2 la pide al arrancar. Tiene que devolver el userId de la sesion
// guardada; si no, el cliente se queda con userId = 0.
router.get('/api/v1/app/auth-token', (req, res) => {
    const userId = req.headers.userid || req.query.userId || req.query.userid;
    console.log('AUTH-TOKEN userid =', userId, '| headers:', Object.keys(req.headers).join(','));

    const data = { accessToken: 'Not implemented' };
    if (isValidId(userId)) {
        data.userId = String(userId).trim();
    }

    res.status(200).json({ code: 1, message: 'SUCCESS', data });
});

// NUEVA: el cliente 1.15.2 la pide al arrancar
router.post('/api/v1/user/mac/id', (req, res) => {
    res.status(200).json({
        code: 1,
        message: 'SUCCESS',
        data: {}
    });
});

router.post('/api/v1/user/register', async (req, res) => {
    try {
        const { nickName, sex } = req.body;
        const userId = req.headers.userid;

        if (!nickName || !isValidId(userId)) {
            return badParams(res);
        }

        const user = await getOrCreateUser(userId);

        const existingUser = await User.findOne({ nickname: nickName });
        if (existingUser && existingUser.userId !== String(userId).trim()) {
            return res.status(400).json({ code: 7, message: 'Nickname already exists, choose another nickname', data: null });
        }

        user.nickname = nickName;
        user.sex = sex;
        user.picUrl = '';
        user.birthday = '';
        user.diamonds = 0;
        user.introduction = '';
        user.gold = 0;
        user.vip = 0;

        await user.save();

        const responseData = {
            userId: user.userId,
            nickName: user.nickname,
            sex: user.sex,
            picUrl: user.picUrl,
            details: user.introduction,
            birthday: user.birthday,
            vip: user.vip,
            expire: 0
        };

        res.status(200).json({
            code: 1,
            message: 'SUCCESS',
            data: responseData
        });
    } catch (e) {
        return serverError(res, 'register', e);
    }
});

router.post('/api/v1/user/details/info', async (req, res) => {
    try {
        const userId = req.headers['userid'];

        if (!userId) {
            return badParams(res);
        }

        // userId 0 = sin sesion: ese usuario no existe, no se crea nada en la base
        if (!isValidId(userId)) {
            return res.status(200).json({ code: 102, message: 'User ID not found.', data: null });
        }

        const user = await getOrCreateUser(userId);

        const userInfo = {
            userId: user.userId,
            sex: user.sex || 2,
            nickName: user.nickname || '',
            birthday: user.birthday || '',
            details: user.introduction || '',
            diamonds: user.diamonds || 0,
            golds: user.gold || 0,
            picUrl: user.picUrl || '',
            picType: 0,
            telephone: null,
            hasPassword: true,
            vip: user.vip || 0
        };

        res.status(200).json({ code: 1, message: 'SUCCESS', data: userInfo });
    } catch (e) {
        return serverError(res, 'details/info', e);
    }
});

router.post('/api/v1/app/login', async (req, res) => {
    try {
        const { uid, password } = req.body;

        if (!uid || !password) {
            return badParams(res);
        }

        // El cliente puede mandar el uid como numero o como texto
        const uidStr = String(uid).trim();

        if (!isValidId(uidStr)) {
            return res.status(200).json({
                code: 102,
                message: 'User ID or username not found.',
                data: null
            });
        }

        let user = await User.findOne({ userId: uidStr });

        // Si no esta en la base, mirar account.json y crearlo
        if (!user) {
            const acc = Object.values(accountJson).find(a => String(a.userId) === uidStr);
            if (acc) {
                user = new User({ userId: String(acc.userId), password: acc.password });
                await user.save();
            }
        }

        if (!user) {
            return res.status(200).json({
                code: 102,
                message: 'User ID or username not found.',
                data: null
            });
        }

        if (user.password !== password) {
            return res.status(200).json({
                code: 108,
                message: 'Incorrect password.',
                data: null
            });
        }

        res.status(200).json({
            code: 1,
            data: {
                userId: user.userId,
                accessToken: 'Not implemented',
                telephone: '',
                email: ''
            },
            message: 'SUCCESS'
        });
    } catch (e) {
        return serverError(res, 'login', e);
    }
});

module.exports = router;
