const { Router } = require('express');
const { defaultRoute, HttpError } = require('../helpers/response');
const { createHash, publicEncrypt, randomBytes } = require('crypto');

const User = require('../database/models/User');

const serverRandomValue = 'xXVRMa84w7wXy8MICH/tRA==';

let router = Router();

const wait = ms => new Promise(r => setTimeout(r, ms));

router.post('/register', defaultRoute(async req => {
    if (req.body.name === 'guest') return new HttpError(400, 'Invalid username.');

    try {
        await User.create(req.body);
        return { email: req.body.email };
    } catch (err) {
        return new HttpError(409, 'Email already registered or another unknown error.');
    }
}));

router.post('/salt', defaultRoute(async req => {
    const { email } = req.body;
    const user = await User.getByEmail(email);
    await wait(Math.random() * 50);
    if (user) {
        let str = 'mini-mega';
        let padding = Array(200 - str.length).fill('P').join('');
        return {
            salt: createHash('sha256').update(str + padding + user.clientRandomValue).digest('base64'),
        };
    } else {
        let str = email + 'mini-mega';
        let padding = Array(200 - str.length).fill('P').join('');
        return {
            salt: createHash('sha256').update(str + padding + serverRandomValue).digest('base64'),
        };
    }
}));

router.post('/login', defaultRoute(async req => {
    const { email, authKey } = req.body;
    const user = await User.getByEmail(email);
    await wait(Math.random() * 50);
    let hashedAuthKey = createHash('sha256').update(authKey).digest('base64');
    if (user && user.hashedAuthKey === hashedAuthKey) {
        const sessionIdentifier = randomBytes(24).toString('base64');
        const encryptedSessionIdentifier = publicEncrypt(user.publicRsaKey, Buffer.from(sessionIdentifier, 'utf-8')).toString('base64');
        
        await User.createSession(user.uuid, sessionIdentifier);

        return {
            name: user.name,
            encryptedMasterKey: user.encryptedMasterKey,
            encryptedRsaPrivateKey: user.encryptedRsaPrivateKey,
            encryptedSessionIdentifier,
        }
    } else {
        return { error: 'Invalid credentials' };
    }
}));

router.post('/logout', (req, res) => {
    const { sessionIdentifier } = req.body;
    res.status(200).json({ error: null });

    User.destroySession(sessionIdentifier);
});

router.get('/list', defaultRoute(req => {
    return User.getAll();
}))

module.exports = router;
