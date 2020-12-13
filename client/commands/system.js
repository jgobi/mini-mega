const store = require('../store');
const fs = require('fs');
const path = require('path');

const autocomplete = (input) => {
    try {
        let dest = path.isAbsolute(input) ? input : store.localFolder + '/' + input;
        dest = dest.endsWith('/') ? dest : path.dirname(dest);
        let files = fs.readdirSync(dest, { withFileTypes: true }).filter(a => a.isDirectory()).map(a => a.name + '/');
        files.unshift('../');
        return files;
    } catch (err) {
        return [];
    }
}

/**
 * @param {import('@types/vorpal')} vorpal 
 * @param {any} options 
 */
module.exports = function (vorpal, options) {
    vorpal
    .command('ls [dir]', 'List files in local directory')
    .autocomplete({
        data: autocomplete,
    })
    .action(async function (args) {
        const dir = args.dir || '.'
        const dest = path.isAbsolute(dir) ? dir : path.join(store.localFolder, dir);
        try {
            let files = fs.readdirSync(dest, { withFileTypes: true });
            files.sort((a,b) => b.isDirectory() - a.isDirectory() && a.name.localeCompare(b.name));
            this.log(files.map(f => f.name + (f.isDirectory() ? '/' : '')).join('\n'), '\n');
        } catch (err) {
            this.log('Cannot access local directory ' + dest);
        }

    });


    vorpal
    .command('cd <dir>', 'Change local directory')
    .autocomplete({
        data: autocomplete,
    })
    .action(async function (args) {
        const dest = path.isAbsolute(args.dir) ? args.dir : path.join(store.localFolder, args.dir);
        try {
            const stats = fs.statSync(dest);
            if (stats.isDirectory()) {
                store.localFolder = dest;
                vorpal.delimiter('Local: ' + store.localFolder + '\t' + 'Remote: ' + store.remoteFolder + '\n' + store.prompt);
            } else {
                this.log('Not a directory');
            }
        } catch (err) {
            this.log('Cannot change local dir to ' + dest);
        }
    });
};
