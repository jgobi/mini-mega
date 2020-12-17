const { readFileSync, writeFileSync, appendFileSync } = require('fs');
const { join } = require('path');

const CHUNK_SIZE = 0x1000000; // pelo menos 0x100000

const file = readFileSync(join(__dirname, process.argv[2]));

const { deobfuscateFileKey } = require('../keys');
const { decryptChunk } = require('../decrypt');

const BUF_SIZE = file.length;

let obfuscatedFileKey = readFileSync(join(__dirname, process.argv[2]+'.key'), 'utf-8');
let { key, nonce } = deobfuscateFileKey(Buffer.from(obfuscatedFileKey, 'base64'));
let info = readFileSync(join(__dirname, process.argv[2]+'.info'));

console.log('Decrypting buffer of ' + BUF_SIZE + ' bytes.');

let paddingSize = info.readInt8(0);
let nMacs = info.readInt32BE(1);
let macs = [];
for (let i = 0; i < nMacs; i++) {
    macs.push(info.slice(5+i*16, 5+(i+1)*16));
}

writeFileSync(join(__dirname, process.argv[3]), Buffer.alloc(0));
let ctr = 0;
for (let i = 0; i < file.length; i += CHUNK_SIZE) {
    const j = ( i + CHUNK_SIZE < file.length ) ? i + CHUNK_SIZE : file.length;
    let buf = file.slice(i, j);
    const macS = i/0x100000, macE = Math.ceil(j/0x100000);
    console.log(macS, macE)
    console.log('chunk '+i/CHUNK_SIZE);

    let dec = decryptChunk(buf, key, nonce, macs.slice(macS, macE), ctr);
    ctr = dec.ctr;
    
    let a = j === file.length ? paddingSize : 0;
    appendFileSync(join(__dirname, process.argv[3]), dec.decryptedChunk.slice(0, dec.decryptedChunk.length - a));
}