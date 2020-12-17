const crypto = require('crypto');
const { obfuscateFileKey, deobfuscateFileKey } = require('../keys');
const { encryptChunk } = require('../encrypt');
const { decryptChunk } = require('../decrypt');

const BUF_SIZE = +process.argv[2] || 16;

console.log('Encrypting and decrypting buffer of ' + BUF_SIZE + ' bytes.');
let chunk = crypto.randomBytes(BUF_SIZE);

let key = crypto.randomBytes(16);
console.log('key', key);

let nonce = crypto.randomBytes(8);

let enc = encryptChunk(chunk, key, nonce);
console.log('Padding Size:', enc.paddingSize);


let obfuscatedFileKey = obfuscateFileKey(key, nonce, enc.condensedMac).toString('base64').substr(0, 43);
console.log('obfuscated key', obfuscatedFileKey);

let deobfuscatedFileKey = deobfuscateFileKey(Buffer.from(obfuscatedFileKey, 'base64'));
console.log('deobfuscated key', deobfuscatedFileKey.key);

let dec = decryptChunk(enc.encryptedChunk, deobfuscatedFileKey.key, deobfuscatedFileKey.nonce, enc.macs);
if (Buffer.compare(chunk, dec.decryptedChunk.slice(0, dec.decryptedChunk.length - enc.paddingSize)) === 0)
    console.log('SUCCESS!')
else
    console.log('FAIL: the buffers are not equal.', chunk, dec.decryptedChunk);
