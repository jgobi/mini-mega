const { readFileSync, writeFileSync, appendFileSync } = require('fs');
const { join } = require('path');

const CHUNK_SIZE = 0x1000000; // pelo menos 0x100000

const file = readFileSync(join(__dirname, process.argv[2]));

const { generateFileKey, obfuscateFileKey } = require('../keys');
const { encryptChunk } = require('../encrypt');

const BUF_SIZE = file.length;

console.log('Encrypting buffer of ' + BUF_SIZE + ' bytes.');
let { key, nonce } = generateFileKey();


let paddingSize = 0;
let condensedMac = Buffer.alloc(16);
let macs = [];
writeFileSync(join(__dirname, process.argv[3]), Buffer.alloc(0));
let ctr = 0;
for (let i = 0; i < file.length; i += CHUNK_SIZE) {
    const j = ( i + CHUNK_SIZE < file.length ) ? i + CHUNK_SIZE : file.length;
    let buf = file.slice(i, j);
    console.log('chunk '+i/CHUNK_SIZE);

    let enc = encryptChunk(buf, key, nonce, ctr, condensedMac);
    ctr = enc.ctr;
    paddingSize = enc.paddingSize;
    condensedMac = enc.condensedMac;
    macs.push(...enc.macs);
    
    appendFileSync(join(__dirname, process.argv[3]), enc.encryptedChunk);
}


let bb = Buffer.alloc(1 + 4 + 16*macs.length);
bb.writeInt8(paddingSize, 0);
bb.writeInt32BE(macs.length, 1);
for (let i in macs) {
    bb.set(macs[i], 5 + i*16);
}

writeFileSync(join(__dirname, process.argv[3]+'.info'), bb);
let obfuscatedFileKey = obfuscateFileKey(key, nonce, condensedMac).toString('base64').substr(0, 43);
writeFileSync(join(__dirname, process.argv[3]+'.key'), obfuscatedFileKey, { encoding: 'utf-8'});
