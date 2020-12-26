const store = require('../store');
const axios = require('axios').default;
const path = require('path');
const { decodeInfoFileV1 } = require('../helpers/infoFile');
const { decryptInfo } = require('../helpers/decrypt');
const { createDecipheriv } = require('crypto');
const { deobfuscateFileKey } = require('../helpers/keys');

const API_BASE = process.env.API_BASE;

// A BIG TODO FOR ALL THIS FILE CAUSE I'M LAZY RIGHT NOW

/**
 * @param {import('@types/vorpal')} vorpal 
 * @param {any} options 
 */
module.exports = function (vorpal, options) {
    vorpal
    .command('rl', 'Show files on remote the lazy way')
    .action(async function(args) {
        let res = await axios.get(API_BASE + '/file/list', {
            headers: {
                'Authorization': 'Bearer ' + store.sessionIdentifier,
            }
        });
        store.files = res.data;
        this.log(store.files.map(a => a.fileHandler).join('\n'), '\n');
    });

    vorpal
    .command('info <hash>', 'Show info about a file on remote')
    .autocomplete({
        data: () => store.files.map(a => a.fileHandler)
    })
    .action(async function(args) {
        let file = args.hash;
        if (!store.files.find(a => a.fileHandler == file)) return this.log('Not found, run rl to update.');
        let res = await axios.get(API_BASE + '/file/info/' + file, {
            responseType: 'arraybuffer'
        });
        let encryptedObfuscatedFileKey = store.files.find(f => f.fileHandler === file).encryptedFileKey;

        const decipher = createDecipheriv('aes-128-ecb', store.masterKey, '').setAutoPadding(false);
        const obfuscatedFileKey = Buffer.concat([decipher.update(Buffer.from(encryptedObfuscatedFileKey, 'base64')), decipher.final()]);
        const { key } = deobfuscateFileKey(obfuscatedFileKey);

        let info = decodeInfoFileV1(decryptInfo(res.data, key));
        let shareLink = 'mini-mega://' + file + '#' + obfuscatedFileKey.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').substr(0, 43);
        this.log('File: ', info.fileName, '\nSize: ', info.fileSize, '\nShare link: ', shareLink, '\n');
    });

    vorpal
    .command('unlink <hash>', 'Delete a file on remote')
    .autocomplete({
        data: () => store.files.map(a => a.fileHandler)
    })
    .action(async function(args) {
        let file = args.hash;
        let idx = store.files.findIndex(f => f.fileHandler === file);
        if (idx < 0) return this.log('Not found, run rl to update.');
        const { confirm } = await this.prompt({
            name: 'confirm',
            type: 'confirm',
            message: 'Are you sure? ',
            default: false,
        });
        if (!confirm) return;

        await axios.delete(API_BASE + '/file/unlink/' + file, {
            headers: {
                'Authorization': 'Bearer ' + store.sessionIdentifier,
            }
        });
        store.files.splice(idx, 1);
        this.log('Done deleting.\n');
    });

    vorpal
    .command('rls [dir]', 'List files in remote directory')
    .action(async function (args) {
        const dir = args.dir || '.'
        const dest = path.isAbsolute(dir) ? dir : path.join(store.remoteFolder, dir);
        try {
            let files = ['files/', 'my_file.txt'];
            this.log(files.join('\n'), '\n');
        } catch (err) {
            this.log('Cannot access remote directory ' + dest);
        }

    });


    vorpal
    .command('rcd <dir>', 'Change remote directory')
    .action(async function (args) {
        const dest = path.isAbsolute(args.dir) ? args.dir : path.join(store.remoteFolder, args.dir);
        try {
            if (dest === '/' || dest === '/files') {
                store.remoteFolder = dest;
                vorpal.delimiter('Local: ' + store.localFolder + '\t' + 'Remote: ' + store.remoteFolder + '\n' + store.prompt);
            } else throw new Error();
        } catch (err) {
            this.log('Cannot change remote dir to ' + dest);
        }
    });
};
