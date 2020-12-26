const { randomBytes } = require('crypto');
const db = require('../index');
const { objectPropsToCamelCase } = require('../../helpers/common');

/**
 * 
 * @param {object} user 
 * @param {string} user.name 
 * @param {string} user.email 
 * @param {string} user.clientRandomValue 
 * @param {string} user.encryptedMasterKey 
 * @param {string} user.hashedAuthKey 
 * @param {string} user.publicRsaKey 
 * @param {string} user.encryptedRsaPrivateKey 
 * @param {string} user.publicEdKey 
 * @param {string} user.encryptedEdPrivateKey 
 */
function create (user) {
    return new Promise ((resolve, reject) => {
        const uuid = randomBytes(16).toString('base64').substr(0, 22);
        db.run(`insert into user (
            uuid, name, email, client_random_value, encrypted_master_key,
            hashed_auth_key, public_rsa_key, encrypted_rsa_private_key,
            public_ed_key, encrypted_ed_private_key
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            uuid,
            user.name,
            user.email,
            user.clientRandomValue,
            user.encryptedMasterKey,
            user.hashedAuthKey,
            user.publicRsaKey,
            user.encryptedRsaPrivateKey,
            user.publicEdKey,
            user.encryptedEdPrivateKey,
        ], (err) => {
            if (err) reject(err);
            else resolve(uuid);
        })
    });
}

function getByEmail (email) {
    return new Promise((resolve, reject) => {
        db.get('select * from user where email = ?', [email], (err, row) => {
            if (err) reject(err)
            else resolve(row ? objectPropsToCamelCase(row) : null);
        })
    });
}

function getAll () {
    return new Promise((resolve, reject) => {
        db.all('select * from user', (err, rows) => {
            if (err) reject(err)
            else resolve(rows.map(objectPropsToCamelCase));
        })
    });
}

function getBySession (session) {
    return new Promise((resolve, reject) => {
        db.get('select * from session s inner join user u on u.uuid = s.user_uuid where id = ?', [session], (err, row) => {
            if (err) reject(err)
            else resolve(row ? objectPropsToCamelCase(row) : null);
        })
    });
}

function createSession (uuid, session) {
    return new Promise((resolve, reject) => {
        db.run('insert into session (id, user_uuid) values (?, ?)', [session, uuid], err => {
            if (err) reject(err);
            else resolve({
                uuid,
                session,
            });
        });
    });
}

function destroySession (session) {
    return new Promise((resolve, reject) => {
        db.run('delete from session where id = ?', [session], err => {
            if (err) reject(err);
            else resolve();
        });
    });
}

module.exports = {
    create,
    getByEmail,
    getBySession,
    createSession,
    destroySession,
    getAll,
};