const store = require('../store');
const axios = require('axios').default;

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
            await axios.post(API_BASE + '/user/logout', { email, sessionIdentifier });
        } catch (e) {}
        store.name = '';
        store.email = '';
        store.masterKey = null;
        store.rsaPrivateKey = '';
        store.sessionIdentifier = '';
        this.log('Disconnected');
        require('../clis/main').show();
    });
};