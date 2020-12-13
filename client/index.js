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

const vorpal = new (require('vorpal'))();
const vorpal2 = new (require('vorpal'))();

const axios = require('axios').default;

let name = '';
let email = '';
let masterKey = null;
let rsaPrivateKey = '';
let sessionIdentifier = '';

vorpal.use(require('./commands/register'));
 
vorpal
.command('login', 'Login to your account')
.action(async function(args) {
    const { email_, pass } = await this.prompt([{
        name: 'email_',
        message: 'Enter your e-mail: ',
        validate (input) { return input.includes('@') || 'Invalid e-mail'; },
        filter (input) { return input.toLowerCase() },
    }, {
        name: 'pass',
        type: 'password',
        message: 'Enter your password: ',
    }]);

    const ans1 = await axios.post('http://localhost:3030/api/user/salt', { email: email_ });
    const { salt } = ans1.data;

    const { encryptionKey, authKey } = await require('./login').login1(pass, salt);

    const ans2 = await axios.post('http://localhost:3030/api/user/login', {
        email: email_,
        authKey,
    });

    const { error, name: name_, encryptedMasterKey, encryptedRsaPrivateKey, encryptedSessionIdentifier } = ans2.data;
    if (error) return this.log('Authentication failed: ', error);

    const { masterKey: mk, rsaPrivateKey: rpk, sessionIdentifier: sid } = require('./login').login2(encryptionKey, encryptedMasterKey, encryptedRsaPrivateKey, encryptedSessionIdentifier);

    name = name_;
    email = email_;
    masterKey = mk;
    rsaPrivateKey = rpk;
    sessionIdentifier = sid;

    this.log('Authenticated as ' + name);
    vorpal2.delimiter(name + '@mini-mega$').show();
})

vorpal2.find('exit').remove();
vorpal2
.command('exit', 'Disconnect from session')
.alias('logout')
.action(async function(args) {
    if (!sessionIdentifier) {
        return this.log('Not currently logged in');
    }
    try {
        await axios.post('http://localhost:3030/api/user/logout', { email, sessionIdentifier });
    } catch (e) {}
    name = '';
    email = '';
    masterKey = null;
    rsaPrivateKey = '';
    sessionIdentifier = '';
    this.log('Disconnected');
    vorpal.show();
});

vorpal
.delimiter('guest@mini-mega$')
.show();
