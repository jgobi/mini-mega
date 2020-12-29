const store = require('../store');
const axios = require('axios').default;
const path = require('path');
const { decodeInfoFileV1 } = require('../helpers/infoFile');
const { decryptInfo } = require('../helpers/decrypt');
const { createDecipheriv } = require('crypto');
const { deobfuscateFileKey } = require('../helpers/keys');
const { readdirSync, readFileSync } = require('fs');
const { downloadFile } = require('../helpers/download');
const readableSize = require('../helpers/readableSize');

const API_BASE = process.env.API_BASE;

function updateFiles (remoteFiles) {
    let diff = remoteFiles.filter(r => !store.files.find(f => f.fileHandler === r.fileHandler));
    for (let file of diff) {
        let info = readFileSync(path.join(store.INFO_STORE_PATH, file.fileHandler));

        const decipher = createDecipheriv('aes-128-ecb', store.masterKey, '').setAutoPadding(false);
        const obfuscatedFileKey = Buffer.concat([decipher.update(Buffer.from(file.encryptedFileKey, 'base64')), decipher.final()]);
        const { key } = deobfuscateFileKey(obfuscatedFileKey);
        let { fileName, fileSize } = decodeInfoFileV1(decryptInfo(info, key));
        store.files.push({
            ...file,
            fileName,
            fileSize,
            obfuscatedFileKey,
        });
    }
    if (diff.length > 0)
        store.files.sort((a, b) => a.fileName.localeCompare(b.fileName));
}

/**
 * @param {import('@types/vorpal')} vorpal 
 * @param {any} options 
 */
module.exports = function (vorpal, options) {
    vorpal
    .command('rl', 'Show files on remote')
    .action(async function(args) {
        let remoteFiles = (await axios.get(API_BASE + '/file/list', {
            headers: {
                'Authorization': 'Bearer ' + store.sessionIdentifier,
            }
        })).data;

        let remoteHandlers = remoteFiles.map(a => a.fileHandler);
        let localInfoHandlers = readdirSync(store.INFO_STORE_PATH);
        let differenceInfo = remoteHandlers.filter(x => !localInfoHandlers.includes(x));

        if (differenceInfo.length > 0) {
            let p = [];
            let l = differenceInfo.length;
            let ll = Math.ceil(Math.log10(l));
            let c = 0;
            process.stdout.write('\rDownloading missing files... ' + String(c).padStart(ll) + '/' + l);

            for (let info of differenceInfo) {
                p.push(
                    downloadFile(API_BASE + '/file/info/' + info, path.join(store.INFO_STORE_PATH, info))
                    .then(() => {
                        c++;
                        process.stdout.write('\rDownloading missing files... ' + String(c).padStart(ll) + '/' + l);
                    })
                );
            }
            await Promise.all(p).then(() => process.stdout.write('\r' + Array(30 + ll * 4).fill(' ').join('') + '\r'));
        }

        updateFiles(remoteFiles);
        this.log('File Handler |  Size | Name');
        this.log(store.files.map(a => `${a.fileHandler} | ${readableSize(a.fileSize).padStart(5)} | ${a.fileName}`).join('\n'), '\n');
    });

    vorpal
    .command('info <hash>', 'Show info about a file on remote')
    .autocomplete({
        data: () => store.files.map(a => a.fileHandler)
    })
    .action(async function(args) {
        let file = args.hash;
        let info = store.files.find(a => a.fileHandler == file);
        if (!info) return this.log('Not found, run rl to update.');
        
        let shareLink = 'mini-mega://' + info.fileHandler + '#' + info.obfuscatedFileKey.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').substr(0, 43);
        this.log('File: ', info.fileName, '\nSize: ', info.fileSize, `(${readableSize(info.fileSize)})`, '\nShare link: ', shareLink, '\n');
    });

    vorpal
    .command('unlink <hash> [hashes...]', 'Delete a file on remote')
    .autocomplete({
        data: () => store.files.map(a => a.fileHandler)
    })
    .action(async function(args) {
        if (!args.hashes) args.hashes = [];
        args.hashes.unshift(args.hash);
        
        for (let file of args.hashes) {
            let idx = store.files.findIndex(f => f.fileHandler === file);
            if (idx < 0) {
                this.log(file + ' not found, run rl to update.');
                continue;
            }
            let info = store.files[idx];
            this.log('Deleting file: ', info.fileName, '\nHandler: ', info.fileHandler, '\nSize: ', info.fileSize, `(${readableSize(info.fileSize)})`);
            const { confirm } = await this.prompt({
                name: 'confirm',
                type: 'confirm',
                message: 'Are you sure? ',
                default: false,
            });
            if (!confirm) continue;

            await axios.delete(API_BASE + '/file/unlink/' + file, {
                headers: {
                    'Authorization': 'Bearer ' + store.sessionIdentifier,
                }
            });
            store.files.splice(idx, 1);
            this.log('Done deleting.\n');
        }
    });

    // vorpal
    // .command('rls [dir]', 'List files in remote directory')
    // .action(async function (args) {
    //     const dir = args.dir || '.'
    //     const dest = path.isAbsolute(dir) ? dir : path.join(store.remoteFolder, dir);
    //     try {
    //         let files = ['files/', 'my_file.txt'];
    //         this.log(files.join('\n'), '\n');
    //     } catch (err) {
    //         this.log('Cannot access remote directory ' + dest);
    //     }

    // });


    // vorpal
    // .command('rcd <dir>', 'Change remote directory')
    // .action(async function (args) {
    //     const dest = path.isAbsolute(args.dir) ? args.dir : path.join(store.remoteFolder, args.dir);
    //     try {
    //         if (dest === '/' || dest === '/files') {
    //             store.remoteFolder = dest;
    //             vorpal.delimiter('Local: ' + store.localFolder + '\t' + 'Remote: ' + store.remoteFolder + '\n' + store.prompt);
    //         } else throw new Error();
    //     } catch (err) {
    //         this.log('Cannot change remote dir to ' + dest);
    //     }
    // });
};
