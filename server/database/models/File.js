const db = require('../index');
const { objectPropsToCamelCase } = require('../../helpers/common');

/**
 * 
 * @param {string} fileHandler 
 * @param {string} userUuid 
 * @param {string} encryptedFileKey 
 */
function link (fileHandler, userUuid, encryptedFileKey) {
    return new Promise((resolve, reject) => {
        db.run(`insert into user_file (
            file_handler, user_uuid, encrypted_file_key
        ) values (?, ?, ?)`, [
            fileHandler,
            userUuid,
            encryptedFileKey
        ], (err, row) => {
            if (err) reject(err)
            else resolve({ fileHandler, userUuid });
        })
    });
}

/**
 * 
 * @param {string} fileHandler 
 * @param {string} userUuid 
 */
function unlink (fileHandler, userUuid) {
    return new Promise((resolve, reject) => {
        db.run('delete from user_file where file_handler = ? and user_uuid = ?', [
            fileHandler, userUuid,
        ], err => {
            if (err) reject(err);
            else resolve({ fileHandler, userUuid });
        });
    });
}

/**
 * 
 * @param {string} userUuid 
 */
function getAllByUser (userUuid) {
    return new Promise((resolve, reject) => {
        db.all('select * from user_file where user_uuid = ?', [userUuid], (err, rows) => {
            if (err) reject(err)
            else resolve(rows.map(objectPropsToCamelCase));
        });
    });
}

/**
 * 
 * @param {string} fileHandler 
 * @param {string} userUuid 
 */
function get (fileHandler, userUuid) {
    return new Promise((resolve, reject) => {
        db.get('select * from user_file where file_handler = ? and user_uuid = ?', [fileHandler, userUuid], (err, row) => {
            if (err) reject(err)
            else resolve(objectPropsToCamelCase(row));
        });
    });
}

/**
 * 
 * @param {string} fileHandler 
 */
function isReferenced (fileHandler) {
    return new Promise((resolve, reject) => {
        db.get('select count(*) as c from user_file where file_handler = ?', [fileHandler], (err, row) => {
            if (err) reject(err)
            else resolve(row.c > 0);
        });
    });
}

module.exports = {
    get,
    link,
    unlink,
    getAllByUser,
    isReferenced,
};