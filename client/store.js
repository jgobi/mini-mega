const path = require('path');

const BASE_PATH = __dirname;

module.exports = {
    name: '',
    masterKey: null,
    sessionIdentifier: '',
    stay: false,
    prompt: '',
    localFolder: './',
    remoteFolder: '/',
    files: [],

    TMP_PATH: path.join(BASE_PATH, '.tmp'),
    STORE_PATH: path.join(BASE_PATH, '.store'),
    INFO_STORE_PATH: path.join(BASE_PATH, '.store', 'info'),
    CREDENTIALS_FILE: path.join(BASE_PATH, '.credentials.json'),
};