const store = require('../store');
const fs = require('fs');
const path = require('path');
const { createCipheriv } = require('crypto');

const { generateFileKey, obfuscateFileKey } = require('../helpers/keys');
const { encryptChunk, encryptInfo } = require('../helpers/encrypt');
const { encodeInfoFileV2 } = require('../helpers/infoFile');
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

    let encryptedInfoFile = encryptInfo(encodeInfoFileV2(fileSize, fileName, macs), key);
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
    .command('encrypt <input> [output]', 'Encrypt file using the master key')
    .autocomplete({
        data: autocomplete,
    })
    .action(async function (args) {
        const input = path.isAbsolute(args.input) ? args.input : path.join(store.localFolder, args.input);
        const outputArg = args.output || input + '.enc';
        const output = path.isAbsolute(outputArg) ? outputArg : path.join(store.localFolder, outputArg);

        let relativeInput = path.relative(store.localFolder, input);
        let relativeOutput = path.relative(store.localFolder, output);
        this.log('Encrypting file "' + relativeInput + '" and saving result as "' + relativeOutput + '"...');
        try {
            encrypt(input, output);
            this.log('Done');
        } catch (err) {
            this.log('Error while encrypting: ' + err.toString());
        }
    });
};
