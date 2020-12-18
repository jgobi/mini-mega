const { readFileSync, writeFileSync, appendFileSync } = require('fs');
const { join } = require('path');

const CHUNK_SIZE = 0x1000000; // pelo menos 0x100000

const { deobfuscateFileKey } = require('../keys');
const { decryptChunk, decryptInfo } = require('../decrypt');
const { decodeInfoFileV1 } = require('../infoFile');
const { readFileChunk } = require('../readFile');

console.log('initializing...');

let obfuscatedFileKey = readFileSync(join(__dirname, process.argv[2]+'.key'), 'utf-8');
let { key, nonce } = deobfuscateFileKey(Buffer.from(obfuscatedFileKey, 'base64'));

let infoFile = readFileSync(join(__dirname, process.argv[2]+'.info'));
const { fileName, fileSize, macs } = decodeInfoFileV1(decryptInfo(infoFile, key));

const fileGenerator = readFileChunk(join(__dirname, process.argv[2]), CHUNK_SIZE);

let encryptedFileSize = 0

console.log('Original file name: ', fileName);
console.log('File size: ', fileSize, '\n');

console.log('Decrypting file with 16MB chunks.');

writeFileSync(join(__dirname, process.argv[3]), Buffer.alloc(0));
let ctr = 0;
let i = 0;
for (let buf of fileGenerator) {
    if (!buf) break;

    const macS = i*(CHUNK_SIZE/0x100000), macE = (i+1)*(CHUNK_SIZE/0x100000);
    encryptedFileSize += buf.length;
    
    console.log('chunk '+(i++));

    let dec = decryptChunk(buf, key, nonce, macs.slice(macS, macE), ctr);
    ctr = dec.ctr;
    
    let a = encryptedFileSize > fileSize ? encryptedFileSize - fileSize : 0;
    appendFileSync(join(__dirname, process.argv[3]), dec.decryptedChunk.slice(0, dec.decryptedChunk.length - a));
}
console.log('done!');