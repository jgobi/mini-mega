const { randomBytes, createHash, pbkdf2, createCipheriv, generateKeyPair } = require('crypto');
const axios = require('axios').default;

const API_BASE = process.env.API_BASE;
const PBKDF2_COST = +process.env.PBKDF2_COST;

/**
 * @typedef RegisterInfo
 * @property {string} name
 * @property {string} email
 * @property {string} clientRandomValue
 * @property {string} encryptedMasterKey
 * @property {string} hashedAuthKey
 * @property {string} publicRsaKey
 * @property {string} encryptedRsaPrivateKey
 * @property {string} publicEdKey
 * @property {string} encryptedEdPrivateKey
 * 
 * 
 * @param {string} name 
 * @param {string} email 
 * @param {string} pass 
 * @returns {Promise<RegisterInfo>}
 */
function register (name, email, pass) {
    return new Promise((resolve, reject) => {
        const masterKey = randomBytes(16);
        const clientRandomValue = randomBytes(16).toString('base64');
        const padding = Array(191).fill('P').join('');
        const salt = createHash('sha256').update('mini-mega' + padding + clientRandomValue).digest().toString('base64');

        pbkdf2(pass, salt, PBKDF2_COST, 32, 'sha512', (err, derivedKey) => {
            if (err) return reject(err);

            const derivedEncryptionKey = derivedKey.slice(0, 16);
            const cipher = createCipheriv('aes-128-ecb', derivedEncryptionKey, '');
            const encryptedMasterKey = Buffer.concat([cipher.update(masterKey), cipher.final()]);


            const derivedAuthKey = derivedKey.slice(16, 32).toString('base64');
            const hashedAuthKey = createHash('sha256').update(derivedAuthKey).digest().toString('base64');


            generateKeyPair('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem',
                }
            }, (err, publicRsaKey, privateRsaKey) => {
                if (err) return reject(err);
                
                const cipher = createCipheriv('aes-128-ecb', masterKey, '');
                const encryptedRsaPrivateKey = Buffer.concat([cipher.update(privateRsaKey), cipher.final()]);

                generateKeyPair('ed25519', {
                    publicKeyEncoding: {
                        type: 'spki',
                        format: 'pem'
                    },
                    privateKeyEncoding: {
                        type: 'pkcs8',
                        format: 'pem',
                    }
                }, (err, publicEdKey, privateEdKey) => {
                    if (err) return reject(err);
                    
                    const cipher = createCipheriv('aes-128-ecb', masterKey, '');
                    const encryptedEdPrivateKey = Buffer.concat([cipher.update(privateEdKey), cipher.final()]);
        
                    return resolve({
                        name,
                        email,
                        clientRandomValue,
                        encryptedMasterKey: encryptedMasterKey.toString('base64'),
                        hashedAuthKey,
                        publicRsaKey,
                        encryptedRsaPrivateKey: encryptedRsaPrivateKey.toString('base64'),
                        publicEdKey,
                        encryptedEdPrivateKey: encryptedEdPrivateKey.toString('base64'),
                    });
                });
              });
        });
    });
}


/**
 * @param {import('@types/vorpal')} vorpal 
 * @param {any} options 
 */
module.exports = function (vorpal, options) {
    vorpal
    .command('register', 'Register a new account')
    .action(async function(args) {
        let { name, email, pass, pass2 } = await this.prompt([{
            name: 'name',
            message: 'Enter your username: ',
            validate (input) { return /[@\$]/.test(input) || input === 'guest' ? 'Invalid username' : true },
            filter (input) { return input.toLowerCase().replace(/\s/g, '-'); }
        }, {
            name: 'email',
            message: 'Enter your e-mail: ',
            validate (input) { return input.includes('@') || 'Invalid e-mail'; },
            filter (input) { return input.toLowerCase(); }
        }, {
            name: 'pass',
            type: 'password',
            message: 'Enter your password: ',
            // validate (input) { return input.length >= 8 || 'Password too short. Must be at least 8 characters long'; },
        }, {
            name: 'pass2',
            type: 'password',
            message: 'Enter your password again: ',
            validate (input, hash) { return hash.pass === input || 'Passwords don\'t match'; },
        }]);

        if (pass !== pass2) {
            return this.log('Passwords must be the same')
        }

        try {
            let payload = await register(name, email, pass);
            let ans = await axios.post(API_BASE + '/user/register', payload);
            this.log('Success! ', ans.data);
        } catch (e) {
            this.log('Error: ', e.response.data.message);
        }
    })
    .cancel(() => void 0);
}