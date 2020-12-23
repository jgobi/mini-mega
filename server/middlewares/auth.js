const User = require('../database/models/User');

const wait = ms => new Promise(r => setTimeout(r, ms));

/**
 * @type {import('express').RequestHandler}
 */
async function authMiddleware (req, res, next) {
    let [ type, session ] = (req.headers.authorization || '').split(' ');
    if (type !== 'Bearer') return res.status(401).json({ error: 'Invalid authorization type' });
    if (!session) return res.status(401).json({ error: 'No session provided' });

    let user = await User.getBySession(session);

    await wait(Math.random() * 50);
    
    if (!user) return res.status(401).json({ error: 'Invalid session' });
    
    req.user = user;
    next();

}

module.exports = authMiddleware;