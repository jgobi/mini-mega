const path = require('path');

module.exports = {
    name: '',
    masterKey: null,
    rsaPrivateKey: '',
    sessionIdentifier: '',
    stay: false,
    prompt: '',
    localFolder: './',
    remoteFolder: '/',
    files: [],

    TMP_PATH: path.join(__dirname, '.tmp'),
    STORE_PATH: path.join(__dirname, '.store'),
    CREDENTIALS_FILE: path.join(__dirname, '.credentials.json'),
};