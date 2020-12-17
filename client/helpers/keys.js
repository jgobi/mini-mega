const { randomBytes } = require('crypto');

/**
 * Generate a random file key and nonce
 */
function generateFileKey () {
    let key   = randomBytes(16);
    let nonce = randomBytes(8);

    return { key, nonce };
}

/**
 * Obfuscate a fileKey and a nonce using a condensed MAC
 * @param {Buffer} fileKey 
 * @param {Buffer} nonce 
 * @param {Buffer} condensedMac 
 */
function obfuscateFileKey (fileKey, nonce, condensedMac) {
    let obfuscated = Buffer.allocUnsafe(32);
    let arr = [
        fileKey.readInt32BE(0) ^ nonce.readInt32BE(0),
        fileKey.readInt32BE(4) ^ nonce.readInt32BE(4),
        fileKey.readInt32BE(8) ^ condensedMac.readInt32BE(0) ^ condensedMac.readInt32BE(4),
        fileKey.readInt32BE(12) ^ condensedMac.readInt32BE(8) ^ condensedMac.readInt32BE(12),
        nonce.readInt32BE(0),
        nonce.readInt32BE(4),
        condensedMac.readInt32BE(0) ^ condensedMac.readInt32BE(4),
        condensedMac.readInt32BE(8) ^ condensedMac.readInt32BE(12),
    ];
    for (let i in arr) {
        obfuscated.writeInt32BE(arr[i], i*4);
    }
    return obfuscated;
}


/**
 * Deobfuscate an obfuscated fileKey
 * @param {Buffer} obfuscatedFileKey 
 */
function deobfuscateFileKey (obfuscatedFileKey) {
    const arr = [
        obfuscatedFileKey.readInt32BE(16),
        obfuscatedFileKey.readInt32BE(20),
        obfuscatedFileKey.readInt32BE(24),
        obfuscatedFileKey.readInt32BE(28),
    ]
    
    let deobfuscated = Buffer.allocUnsafe(16);
    
    for (let i = 0; i < 4; i++)  {
        deobfuscated.writeInt32BE(obfuscatedFileKey.readInt32BE(i*4) ^ arr[i], i*4);
    }
    return {
        key: deobfuscated,
        nonce: obfuscatedFileKey.slice(16, 24),
    };
}

module.exports = {
    generateFileKey,
    obfuscateFileKey,
    deobfuscateFileKey,
}