const store = require('../store');
const fs = require('fs');
const path = require('path');
const { createDecipheriv } = require('crypto');

const { deobfuscateFileKey } = require('../helpers/keys');
const { decryptChunk, decryptInfo } = require('../helpers/decrypt');
const { decodeInfoFileV1 } = require('../helpers/infoFile');
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
 * @param {string} inputPath 
 * @param {string} [outputPath] 
 */
function* decrypt (inputPath, outputPath) {
    let encryptedObfuscatedFileKey = fs.readFileSync(inputPath+'.key');

    const decipher = createDecipheriv('aes-128-ecb', store.masterKey, '').setAutoPadding(false);
    const obfuscatedFileKey = Buffer.concat([decipher.update(encryptedObfuscatedFileKey), decipher.final()]);

    let { key, nonce } = deobfuscateFileKey(obfuscatedFileKey);

    let infoFile = fs.readFileSync(inputPath+'.info');
    const { fileName, fileSize, macs } = decodeInfoFileV1(decryptInfo(infoFile, key));

    const output = outputPath || path.join(store.localFolder, fileName);
    yield output;
    
    const fileGenerator = readFileChunk(inputPath, CHUNK_SIZE);

    let encryptedFileSize = 0

    fs.writeFileSync(output, Buffer.alloc(0));
    let ctr = 0;
    let i = 0;
    for (let buf of fileGenerator) {
        if (!buf) break;
        
        const macS = i*(CHUNK_SIZE/0x100000), macE = (i+1)*(CHUNK_SIZE/0x100000);
        encryptedFileSize += buf.length;
        let dec = decryptChunk(buf, key, nonce, macs.slice(macS, macE), ctr);
        ctr = dec.ctr;
        
        let a = encryptedFileSize > fileSize ? encryptedFileSize - fileSize : 0;
        fs.appendFileSync(output, dec.decryptedChunk.slice(0, dec.decryptedChunk.length - a));
        i++;
    }
}

/**
 * @param {import('@types/vorpal')} vorpal 
 * @param {any} options 
 */
module.exports = function (vorpal, options) {
    vorpal
    .command('decrypt <input> [output]', 'Decrypt file using the master key')
    .autocomplete({
        data: autocomplete,
    })
    .action(async function (args) {
        const input = path.isAbsolute(args.input) ? args.input : path.join(store.localFolder, args.input);
        const output = args.output && (path.isAbsolute(args.output) ? args.output : path.join(store.localFolder, args.output));
        let decrypterGenerator = decrypt(input, output);
        let outputFileName = decrypterGenerator.next().value;

        let relativeInput = path.relative(store.localFolder, input);
        let relativeOutput = path.relative(store.localFolder, outputFileName);

        this.log('Decrypting file "' + relativeInput + '" and saving result as "' + relativeOutput + '"...');
        try {
            decrypterGenerator.next();
            this.log('Done');
        } catch (err) {
            this.log('Error while decrypting: ' + err.toString());
        }
    });
};
