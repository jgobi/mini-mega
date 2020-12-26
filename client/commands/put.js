const fs = require('fs');
const path = require('path');
const axios = require('axios').default;
const FormData = require('form-data');

const store = require('../store');

const API_BASE = process.env.API_BASE;

const { createCipheriv, randomBytes } = require('crypto');

const { generateFileKey, obfuscateFileKey } = require('../helpers/keys');
const { encryptChunk, encryptInfo } = require('../helpers/encrypt');
const { encodeInfoFileV1 } = require('../helpers/infoFile');
const { readFileChunk } = require('../helpers/readFile');

const CHUNK_SIZE = 0x1000000; // pelo menos 0x100000

const autocomplete = (input) => {
    try {
        let dest = path.isAbsolute(input) ? input : store.localFolder + '/' + input;
        dest = dest.endsWith('/') ? dest : path.dirname(dest);
        let files = fs.readdirSync(dest, { withFileTypes: true }).map(a => a.isDirectory() ? a.name + '/' : a.name);
        files.unshift('../');
        return files;
    } catch (err) {
        return [];
    }
}


/**
 * @param {string} fullPath 
 * @param {string} destination 
 */
function encrypt (fullPath, destination) {
    const fileName = Buffer.from(path.basename(fullPath), 'utf-8');
    if (fileName.length > 255) return console.error('Filename too long');

    let { key, nonce } = generateFileKey();

    let paddingSize = 0;
    let condensedMac = Buffer.alloc(16);
    let macs = [];
    let fileSize = 0;

    const fileGenerator = readFileChunk(fullPath, CHUNK_SIZE);

    fs.writeFileSync(destination, Buffer.alloc(0));
    let ctr = 0;
    for (let buf of fileGenerator) {
        if (!buf) break;
        fileSize += buf.length;

        let enc = encryptChunk(buf, key, nonce, ctr, condensedMac);
        ctr = enc.ctr;
        paddingSize = enc.paddingSize;
        condensedMac = enc.condensedMac;
        macs.push(...enc.macs);
        
        fs.appendFileSync(destination, enc.encryptedChunk);
    }

    let encryptedInfoFile = encryptInfo(encodeInfoFileV1(fileSize, fileName, macs), key);
    fs.writeFileSync(destination + '.info', encryptedInfoFile);

    let obfuscatedFileKey = obfuscateFileKey(key, nonce, condensedMac);

    const cipher = createCipheriv('aes-128-ecb', store.masterKey, '').setAutoPadding(false);
    const encryptedObfuscatedFileKey = Buffer.concat([cipher.update(obfuscatedFileKey), cipher.final()]);

    fs.writeFileSync(destination + '.key', encryptedObfuscatedFileKey);
}



/**
 * @param {import('@types/vorpal')} vorpal 
 * @param {any} options 
 */
module.exports = function (vorpal, options) {
    vorpal
    .command('put <file>', 'Encrypt and upload a file to the server')
    .autocomplete({
        data: autocomplete,
    })
    .action(async function(args) {
        const input = path.isAbsolute(args.file) ? args.file : path.join(store.localFolder, args.file);
        const output = path.join(store.TMP_PATH, randomBytes(9).toString('base64').replace(/\+/g, '-').replace(/\//g, '_'));

        let relativeInput = path.relative(store.localFolder, input);
        this.log('Encrypting file "' + relativeInput + '...');

        encrypt(input, output);

        this.log('Uploading file "' + relativeInput + '...');

        let form = new FormData();
        form.append('key', fs.readFileSync(output + '.key').toString('base64').substr(0, 43));
        form.append('file', fs.createReadStream(output));
        form.append('info_file', fs.createReadStream(output + '.info'));

        let res = await axios.post(API_BASE + '/file/create', form, {
            headers: {
                ...form.getHeaders(),
                'Authorization': 'Bearer ' + store.sessionIdentifier,
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        this.log('Cleaning temporary files...');
        fs.unlinkSync(output);
        fs.unlinkSync(output + '.key');
        fs.unlinkSync(output + '.info');

        let { handler } = res.data;
        this.log(`Done with file handler: ${handler} !\n`);
    })
    .cancel(() => void 0);
}