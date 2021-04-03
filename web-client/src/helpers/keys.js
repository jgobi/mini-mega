/**
 * Deobfuscate an obfuscated fileKey
 * @param {Buffer} obfuscatedFileKey 
 */
export function deobfuscateFileKey (obfuscatedFileKey) {
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
