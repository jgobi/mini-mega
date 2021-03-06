import { createDecipheriv } from 'browserify-aes/browser';
import { Buffer } from 'safe-buffer';

/**
 * Decrypt a chunk of data
 * @param {Buffer} chunk 
 * @param {Buffer} key 
 * @param {Buffer} nonce 
 * @param {Buffer[]} macs 
 * @param {Number} ctr 
 */
export function decryptChunk(chunk, key, nonce, macs, ctr = 0) {
    // It's not necessary to pad the chunk, as its already ok (as it's encrypted)
    const decryptedChunk = Buffer.allocUnsafe(chunk.length);
    for (let i = 0; i < chunk.length; i += 0x100000) { // 1MB sub-chunks
        const j = ( i + 0x100000 < chunk.length ) ? i + 0x100000 : chunk.length;

        let data = chunk.slice(i, j);
        // set iv as being concatenation of nonce and counter (ctr)
        let iv = Buffer.allocUnsafe(12);
        iv.set(nonce, 0);
        iv.writeUInt32BE(ctr, 8);
        
        // decrypt the data
        const decipher = createDecipheriv('aes-128-gcm', key, iv, {
          authTagLength: 16
        });
        decipher.setAutoPadding(false);
        decipher.setAuthTag(Buffer.from(macs[Math.floor(i/0x100000)]));
        const decryptedData = decipher.update(data);
        decipher.final();
        decryptedChunk.set(decryptedData, i);

        // update counter
        ctr += Math.ceil((j - i)/16);
    }

    return {
        decryptedChunk,
        ctr,
    };
}

/**
 * Decrypt buffer iv|encrypted_data returning decrypted data.
 * @param {Buffer} buffer 
 * @param {Buffer} fileKey 
 */
export function decryptInfo(buffer, fileKey) {
    const iv = buffer.slice(0, 16);
    const data = buffer.slice(16);
    const decipher = createDecipheriv('aes-128-cbc', fileKey, iv).setAutoPadding(false);
    const decrypted = Buffer.concat([
        decipher.update(data),
        decipher.final(),
    ]);
    return decrypted;
}
