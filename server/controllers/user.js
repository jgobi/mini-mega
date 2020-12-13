const { Router } = require('express');
const { defaultRoute, HttpError } = require('../helpers/response');
const { createHash, publicEncrypt, randomBytes } = require('crypto');

const serverRandomValue = 'xXVRMa84w7wXy8MICH/tRA==';

let router = Router();

let users = [];

const wait = ms => new Promise(r => setTimeout(r, ms));

router.post('/register', defaultRoute(req => {
    if (req.body.name === 'guest') return new HttpError(400, 'Invalid username.');
    if (users.find(u => u.email === req.body.email)) return new HttpError(409, 'Email already registered.');
    req.body.sessions = [];
    users.push(req.body);
    return { email: req.body.email };
}));

router.post('/salt', defaultRoute(async req => {
    const { email } = req.body;
    const user = users.find(u => u.email === email);
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
    const user = users.find(u => u.email === email);
    await wait(Math.random() * 50);
    let hashedAuthKey = createHash('sha256').update(authKey).digest('base64');
    if (user && user.hashedAuthKey === hashedAuthKey) {

        const sessionIdentifier = randomBytes(16);
        const encryptedSessionIdentifier = publicEncrypt(user.publicRsaKey, sessionIdentifier).toString('base64');
        user.sessions.push(encryptedSessionIdentifier);

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
    const { email, sessionIdentifier } = req.body;
    res.status(200).json({ error: null });

    const user = users.find(u => u.email === email);
    if (user) {
        const encryptedSessionIdentifier = publicEncrypt(user.publicRsaKey, Buffer.from(sessionIdentifier, 'base64')).toString('base64');
        user.sessions.splice(user.sessions.indexOf(encryptedSessionIdentifier), 1);
    };
});

router.get('/list', defaultRoute(req => {
    return users;
}))

module.exports = router;
