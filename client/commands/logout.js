const store = require('../store');
const axios = require('axios').default;
const { unlinkSync } = require('fs');

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
        store.files = [];
        try {
            unlinkSync(store.CREDENTIALS_FILE);
        } catch (err) {}
        this.log('Disconnected');

        store.prompt = 'guest@mini-mega$';
        require('../clis/main').delimiter('Local: ' + store.localFolder + '\t' + 'Remote: ' + store.remoteFolder + '\n' + store.prompt).show();
    });

    vorpal.find('exit').remove();

    vorpal
    .command('exit', 'Exit the application, disconnecting if needed')
    .alias('quit')
    .action(async function(args) {
        if (!store.stay) {
            try {
                await axios.post(API_BASE + '/user/logout', { sessionIdentifier: store.sessionIdentifier });
            } catch (e) {}
            this.log('Disconnected');
        }
        process.exit(0);
    });
};