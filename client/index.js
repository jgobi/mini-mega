// == BEGIN OF VORPAL HACK FOR WORKING MULTIPLE INSTANCES OF VORPAL ==
require('vorpal').prototype._init = function () {
    let self = this;

    self.ui.on('vorpal_ui_keypress', function (data) {
        if (self === self.ui.parent) {
            self.emit('keypress', data);
            self._onKeypress(data.key, data.value);
        }
    });

    self.use(require('vorpal/dist/vorpal-commons'));
};
// == END OF VORPAL HACK FOR WORKING MULTIPLE INSTANCES OF VORPAL ==

process.env.API_BASE = 'https://minicloud.ga/api';
process.env.PBKDF2_COST = 100000;

const fs = require('fs');
const { createFolders } = require('./helpers/folders');
const store = require('./store');

store.localFolder = process.cwd();

createFolders([store.TMP_PATH, store.STORE_PATH, store.INFO_STORE_PATH]);

try {
    let { name, masterKey, sessionIdentifier } = JSON.parse(fs.readFileSync(store.CREDENTIALS_FILE, 'utf-8'));
    
    store.name = name;
    store.masterKey = Buffer.from(masterKey, 'base64');
    store.sessionIdentifier = sessionIdentifier;
    store.stay = true;

    store.prompt = name + '@mini-mega$';
    require('./clis/user').delimiter('Local: ' + store.localFolder + '\t' + 'Remote: ' + store.remoteFolder + '\n' + store.prompt).show();
} catch (err) {
    if (err.code === 'ENOENT') {
        store.prompt = 'guest@mini-mega$';
        require('./clis/main').delimiter('Local: ' + store.localFolder + '\t' + 'Remote: ' + store.remoteFolder + '\n' + store.prompt).show();
    } else {
        console.error(err);
        process.exit(2);
    }
}
