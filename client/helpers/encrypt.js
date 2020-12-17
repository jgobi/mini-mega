const crypto = require('crypto');

/**
 * Encrypt a chunk of data
 * @param {Buffer} chunk 
 * @param {Buffer} key 
 * @param {Buffer} nonce 
 * @param {Number} ctr 
 * @param {Buffer|null} condensedMac 
 */
function encryptChunk(chunk, key, nonce, ctr = 0, condensedMac = null) {
    if (condensedMac === null) condensedMac = Buffer.alloc(16);

    let macs = [];
    
    // Pad the chunk if necessary
    const paddingSize = chunk.length % 16 === 0 ? 0 : 16 - chunk.length % 16;
    let padding = Buffer.alloc(paddingSize);
    let paddedChunk = Buffer.concat([chunk, padding], chunk.length + paddingSize);

    for (let i = 0; i < paddedChunk.length; i += 0x100000) { // 1MB sub-chunks
        const j = ( i + 0x100000 < paddedChunk.length ) ? i + 0x100000 : paddedChunk.length;

        let data = paddedChunk.slice(i, j);

        // set iv as being concatenation of nonce and counter (ctr)
        let iv = Buffer.allocUnsafe(12);
        iv.set(nonce, 0);
        iv.writeUInt32BE(ctr, 8);
        
        // encrypt the data
        const cipher = crypto.createCipheriv('aes-128-ccm', key, iv, {
          authTagLength: 16
        }).setAutoPadding(false);
        const encryptedData = cipher.update(data);
        cipher.final();
        paddedChunk.set(encryptedData, i);

        // get and save mac
        const mac = cipher.getAuthTag();
        macs.push(mac);

        // update condensed mac
        let newCondensedMac = Buffer.allocUnsafe(16);
        for (let k = 0; k < 16; k++) {
            newCondensedMac[k] = condensedMac[k] ^ mac[k];
        }
        const cipherMac = crypto.createCipheriv('aes-128-ecb', key, '').setAutoPadding(false);
        condensedMac = Buffer.concat([cipherMac.update(newCondensedMac), cipherMac.final()]);
        
        // update counter
        ctr += Math.ceil((j - i)/16);
    }

    return {
        paddingSize,
        encryptedChunk: paddedChunk,
        ctr,
        macs,
        condensedMac,
    };
}

module.exports = {
    encryptChunk,
};