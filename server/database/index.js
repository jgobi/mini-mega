const path = require('path');
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database(path.join(__dirname, '..', 'mini-mega.db'));

module.exports = db;