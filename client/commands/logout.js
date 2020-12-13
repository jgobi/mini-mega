const store = require('../store');
const axios = require('axios').default;
const { unlinkSync } = require('fs');
const path = require('path');

const API_BASE = process.env.API_BASE;

/**
 * @param {import('@types/vorpal')} vorpal 
 * @param {any} options 
 */
module.exports = function (vorpal, options) {
    vorpal
    .command('logout', 'Disconnect from session')
    .action(async function(args) {
        if (!store.sessionIdentifier) {
            return this.log('Not currently logged in');
        }
        try {
            await axios.post(API_BASE + '/user/logout', { sessionIdentifier: store.sessionIdentifier });
        } catch (e) {}
        store.name = '';
        store.masterKey = null;
        store.rsaPrivateKey = '';
        store.sessionIdentifier = '';
        try {
            unlinkSync(path.join(__dirname, '..', '.credentials.json'));
        } catch (err) {}
        this.log('Disconnected');
        require('../clis/main').show();
    });
};