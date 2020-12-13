const { pbkdf2, createDecipheriv, privateDecrypt } = require('crypto');

const PBKDF2_COST = 10000;
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



module.exports = { login1, login2 };