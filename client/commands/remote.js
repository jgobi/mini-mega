const store = require('../store');
const fs = require('fs');
const path = require('path');

// A BIG TODO FOR ALL THIS FILE CAUSE I'M LAZY RIGHT NOW

/**
 * @param {import('@types/vorpal')} vorpal 
 * @param {any} options 
 */
module.exports = function (vorpal, options) {
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
