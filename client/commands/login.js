const { pbkdf2, createDecipheriv, privateDecrypt } = require('crypto');
const store = require('../store');
const axios = require('axios').default;

const API_BASE = process.env.API_BASE;
const PBKDF2_COST = +process.env.PBKDF2_COST;

function login1 (pass, salt) {
    return new Promise((resolve, reject) => {
        pbkdf2(pass, salt, PBKDF2_COST, 32, 'sha512', (err, derivedKey) => {
            if (err) return reject(err);

            const encryptionKey = derivedKey.slice(0, 16);
            const authKey = derivedKey.slice(16, 32).toString('base64');

            return resolve({
                encryptionKey,
                authKey,
            });
        });
    });
}

function login2(encryptionKey, encryptedMasterKey, encryptedRsaPrivateKey, encryptedSessionIdentifier) {
    const decipher = createDecipheriv('aes-128-ecb', encryptionKey, '');
    const masterKey = Buffer.concat([decipher.update(encryptedMasterKey, 'base64'), decipher.final()]);

    const decipher2 = createDecipheriv('aes-128-ecb', masterKey, '');
    const rsaPrivateKey = Buffer.concat([decipher2.update(encryptedRsaPrivateKey, 'base64'), decipher2.final()]);

    const sessionIdentifier = privateDecrypt(rsaPrivateKey, Buffer.from(encryptedSessionIdentifier, 'base64')).toString('base64');

    return {
        masterKey,
        rsaPrivateKey,
        sessionIdentifier,
    };
}


/**
 * @param {import('@types/vorpal')} vorpal 
 * @param {any} options 
 */
module.exports = function (vorpal, options) {
    vorpal
    .command('login', 'Login to your account')
    .action(async function(args) {
        const { email, pass } = await this.prompt([{
            name: 'email',
            message: 'Enter your e-mail: ',
            validate (input) { return input.includes('@') || 'Invalid e-mail'; },
            filter (input) { return input.toLowerCase() },
        }, {
            name: 'pass',
            type: 'password',
            message: 'Enter your password: ',
        }]);

        const ans1 = await axios.post(API_BASE + '/user/salt', { email: email });
        const { salt } = ans1.data;

        const { encryptionKey, authKey } = await login1(pass, salt);

        const ans2 = await axios.post(API_BASE + '/user/login', {
            email: email,
            authKey,
        });

        const { error, name, encryptedMasterKey, encryptedRsaPrivateKey, encryptedSessionIdentifier } = ans2.data;
        if (error) return this.log('Authentication failed: ', error);

        const { masterKey, rsaPrivateKey, sessionIdentifier } = login2(encryptionKey, encryptedMasterKey, encryptedRsaPrivateKey, encryptedSessionIdentifier);

        store.name = name;
        store.email = email;
        store.masterKey = masterKey;
        store.rsaPrivateKey = rsaPrivateKey;
        store.sessionIdentifier = sessionIdentifier;

        this.log('Authenticated as ' + name);
        require('../clis/user').delimiter(name + '@mini-mega$').show();
    })
};