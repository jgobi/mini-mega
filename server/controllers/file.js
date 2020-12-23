const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Router } = require('express');
const Busboy = require('busboy');

const authMiddleware = require('../middlewares/auth');
const { defaultRoute, HttpError } = require('../helpers/response');

let router = Router();

const File = require('../database/models/File');

router.post('/create', authMiddleware, (req, res) => {
    let handler = crypto.randomBytes(9).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
    
    var busboy = new Busboy({ headers: req.headers });
    let key = '';
    busboy.on('file', function(fieldName, file, filename, encoding, mimetype) {
        if (fieldName === 'info_file')
            file.pipe(fs.createWriteStream(path.join(__dirname, '..', 'files', handler+'.info')))
        else if (fieldName === 'file')
            file.pipe(fs.createWriteStream(path.join(__dirname, '..', 'files', handler+'.enc')))
    });
    busboy.on('field', function(fieldName, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
        if (fieldName === 'key')
            key = val.substr(0, 43);
    });
    busboy.on('finish', async function() {
        console.log('Created file with handler ' + handler);
        await File.link(handler, req.user.uuid, key);
        res.status(201).json({
            handler,
        });
    });
    req.pipe(busboy);
});

router.post('/link', authMiddleware, defaultRoute(async req => {
    let { handler, key } = req.body;
    if (!handler || !key) return new HttpError(400, 'Invalid handler or key')
    await File.link(handler, req.user.uuid, key.substr(0, 43));
    return { handler };
}));

router.delete('/unlink/:handler', authMiddleware, defaultRoute(async req => {
    let { handler } = req.params;
    if (!handler) return new HttpError(400, 'Invalid handler')
    await File.unlink(handler, req.user.uuid);
    return { handler };
}));


router.get('/list', authMiddleware, defaultRoute(req => {
    return File.getAllByUser(req.user.uuid);
}));

router.get('/info/:handler', authMiddleware, async (req, res) => {
    let { handler } = req.params;
    try {
        let userFile = await File.get(handler, req.user.uuid);
        if (userFile) return res.download(path.join(__dirname, '..', 'files', handler + '.info'));
        else throw new Error();
    } catch (err) {
        return res.status(404).json({ error: 'Not found' });
    }

});

module.exports = router;
