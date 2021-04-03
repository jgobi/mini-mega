const store = require('../store');
const axios = require('axios').default;
const { createCipheriv } = require('crypto');
const { decodeInfoFileV2 } = require('../helpers/infoFile');
const { decryptInfo } = require('../helpers/decrypt');
const { deobfuscateFileKey } = require('../helpers/keys');
const readableSize = require('../helpers/readableSize');

const API_BASE = process.env.API_BASE;

/**
 * @param {import('@types/vorpal')} vorpal 
 * @param {any} options 
 */
module.exports = function (vorpal, options) {
    vorpal
    .command('link <link>', 'Link a file to your account via public shared link')
    .action(async function(args) {
        let url = args.link.split('/').pop();
        let [file, obfuscatedFileKeyB64] = url.split('#');

        let res = await axios.get(API_BASE + '/file/info/' + file, {
            responseType: 'arraybuffer'
        });

        const obfuscatedFileKey = Buffer.from(obfuscatedFileKeyB64, 'base64')
        const { key } = deobfuscateFileKey(obfuscatedFileKey);

        let info = decodeInfoFileV2(decryptInfo(res.data, key));
        this.log('File: ', info.fileName, '\nSize: ', info.fileSize, `(${readableSize(info.fileSize)})`, '\nLinking...');

        const cipher = createCipheriv('aes-128-ecb', store.masterKey, '').setAutoPadding(false);
        const encryptedFileKey = Buffer.concat([cipher.update(obfuscatedFileKey), cipher.final()]);
        
        let { handler } = (await axios.post(API_BASE + '/file/link', {
            handler: file,
            key: encryptedFileKey.toString('base64').substr(0, 43),
        }, {
            headers: {
                'Authorization': 'Bearer ' + store.sessionIdentifier,
            },
        })).data;

        this.log(`Done with handler ${handler}!\n`);
    });
};