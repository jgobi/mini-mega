const store = require('../store');
const axios = require('axios').default;
const path = require('path');
const fs = require('fs');
const { decodeInfoFileV1 } = require('../helpers/infoFile');
const { readFileChunk } = require('../helpers/readFile');
const { decryptInfo, decryptChunk } = require('../helpers/decrypt');
const { deobfuscateFileKey } = require('../helpers/keys');
const { downloadFile } = require('../helpers/download');

const API_BASE = process.env.API_BASE;
const CHUNK_SIZE = 0x1000000; // pelo menos 0x100000

/**
 * @param {import('@types/vorpal')} vorpal 
 * @param {any} options 
 */
module.exports = function (vorpal, options) {
    vorpal
    .command('download <link>', 'Download a file via public shared link')
    .action(async function(args) {
        let [_, url] = args.link.split('://');
        let [file, obfuscatedFileKey] = url.split('#');

        let res = await axios.get(API_BASE + '/file/info/' + file, {
            responseType: 'arraybuffer'
        });

        const { key, nonce } = deobfuscateFileKey(Buffer.from(obfuscatedFileKey, 'base64'));

        let info = decodeInfoFileV1(decryptInfo(res.data, key));
        this.log('File: ', info.fileName, '\nSize: ', info.fileSize, '\nDownloading...');

        let encFilePath = path.join(store.TMP_PATH, file);
        await downloadFile(API_BASE + '/file/download/' + file, encFilePath);

        this.log('Decrypting file...')

        let output = path.join(store.localFolder, info.fileName);

        const fileGenerator = readFileChunk(encFilePath, CHUNK_SIZE);

        let encryptedFileSize = 0

        fs.writeFileSync(output, Buffer.alloc(0));
        let ctr = 0;
        let i = 0;
        for (let buf of fileGenerator) {
            if (!buf) break;
            
            const macS = i*(CHUNK_SIZE/0x100000), macE = (i+1)*(CHUNK_SIZE/0x100000);
            encryptedFileSize += buf.length;
            let dec = decryptChunk(buf, key, nonce, info.macs.slice(macS, macE), ctr);
            ctr = dec.ctr;
            
            let a = encryptedFileSize > info.fileSize ? encryptedFileSize - info.fileSize : 0;
            fs.appendFileSync(output, dec.decryptedChunk.slice(0, dec.decryptedChunk.length - a));
            i++;
        }

        fs.unlinkSync(encFilePath);
        this.log('Done!\n');
    });
};