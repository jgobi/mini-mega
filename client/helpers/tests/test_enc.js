const { readFileSync, writeFileSync, appendFileSync } = require('fs');
const { join, basename } = require('path');

const CHUNK_SIZE = 0x1000000; // pelo menos 0x100000

const fullPath = join(__dirname, process.argv[2]);
const fileName = Buffer.from(basename(fullPath), 'utf-8');
if (fileName.length > 255) return console.error('Filename too long');

const file = readFileSync(fullPath);

const { generateFileKey, obfuscateFileKey } = require('../keys');
const { encryptChunk, encryptInfo } = require('../encrypt');
const { encodeInfoFileV1 } = require('../infoFile');

console.log('Encrypting buffer of ' + file.length + ' bytes.');
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


let encryptedInfoFile = encryptInfo(encodeInfoFileV1(file.length, fileName, macs), key);
writeFileSync(join(__dirname, process.argv[3]+'.info'), encryptedInfoFile);

let obfuscatedFileKey = obfuscateFileKey(key, nonce, condensedMac).toString('base64').substr(0, 43);
writeFileSync(join(__dirname, process.argv[3]+'.key'), obfuscatedFileKey, { encoding: 'utf-8'});
