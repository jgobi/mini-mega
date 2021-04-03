const store = require('../store');
const path = require('path');
const fs = require('fs');
const { decodeInfoFileV2 } = require('../helpers/infoFile');
const { readFileChunk } = require('../helpers/readFile');
const { decryptInfo, decryptChunk } = require('../helpers/decrypt');
const { deobfuscateFileKey } = require('../helpers/keys');
const { downloadFile } = require('../helpers/download');
const { INFO_STORE_PATH } = require('../store');
const readableSize = require('../helpers/readableSize');

const API_BASE = process.env.API_BASE;
const CHUNK_SIZE = 0x1000000; // pelo menos 0x100000

/**
 * @param {import('@types/vorpal')} vorpal 
 * @param {any} options 
 */
module.exports = function (vorpal, options) {
    vorpal
    .command('get <hash> [hashes...]', 'Download a file via hash')
    .autocomplete({
      data: () => store.files.map(a => a.fileHandler)
    })
    .action(async function(args) {
        if (!args.hashes) args.hashes = [];
        args.hashes.unshift(args.hash);
        
        for (let file of args.hashes) {
            let storeFile = store.files.find(a => a.fileHandler === file);
            if (!storeFile) {
                this.log(file + ' not found, run rl to update.');
                continue;
            }

            const { key, nonce } = deobfuscateFileKey(storeFile.obfuscatedFileKey);

            let info = decodeInfoFileV2(decryptInfo(fs.readFileSync(path.join(INFO_STORE_PATH, file)), key));
            this.log('File: ', info.fileName, '\nSize: ', info.fileSize, `(${readableSize(info.fileSize)})`, '\nDownloading...');

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
                let dec = decryptChunk(buf, key, nonce, info.macs.slice(macS, macE), ctr, info.alg);
                ctr = dec.ctr;
                
                let a = encryptedFileSize > info.fileSize ? encryptedFileSize - info.fileSize : 0;
                fs.appendFileSync(output, dec.decryptedChunk.slice(0, dec.decryptedChunk.length - a));
                i++;
            }

            fs.unlinkSync(encFilePath);
            this.log('Done!\n');
        }
    });
};