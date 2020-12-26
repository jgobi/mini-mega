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

process.env.API_BASE = 'http://localhost:3030/api';
process.env.PBKDF2_COST = 10000;

const fs = require('fs');
const store = require('./store');

store.localFolder = process.cwd();

try {
    fs.mkdirSync(store.TMP_PATH, { recursive: true });
} catch (err) {
    if (err.code !== 'EEXIST') {
        console.error('Cannot create .tmp directory, exiting...');
        process.exit(1);
    } else if (!fs.statSync(store.TMP_PATH).isDirectory()) {
        console.error('Cannot create .tmp directory, file with same name already exists, exiting...');
        process.exit(1);
    }
}
try {
    fs.mkdirSync(store.STORE_PATH, { recursive: true });
} catch (err) {
    if (err.code !== 'EEXIST') {
        console.error('Cannot create .store directory, exiting...');
        process.exit(1);
    } else if (!fs.statSync(store.STORE_PATH).isDirectory()) {
        console.error('Cannot create .store directory, file with same name already exists, exiting...');
        process.exit(1);
    }
}

try {
    let { name, masterKey, rsaPrivateKey, sessionIdentifier } = JSON.parse(fs.readFileSync(store.CREDENTIALS_FILE, 'utf-8'));
    
    store.name = name;
    store.masterKey = Buffer.from(masterKey, 'base64');
    store.rsaPrivateKey = rsaPrivateKey;
    store.sessionIdentifier = sessionIdentifier;
    store.stay = true;

    store.prompt = name + '@mini-mega$';
    require('./clis/user').delimiter('Local: ' + store.localFolder + '\t' + 'Remote: ' + store.remoteFolder + '\n' + store.prompt).show();
} catch (err) {
    store.prompt = 'guest@mini-mega$';
    require('./clis/main').delimiter('Local: ' + store.localFolder + '\t' + 'Remote: ' + store.remoteFolder + '\n' + store.prompt).show();
}
