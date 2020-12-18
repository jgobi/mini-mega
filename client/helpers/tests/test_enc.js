const { writeFileSync, appendFileSync } = require('fs');
const { join, basename } = require('path');

const CHUNK_SIZE = 0x1000000; // pelo menos 0x100000

const fullPath = join(__dirname, process.argv[2]);
const fileName = Buffer.from(basename(fullPath), 'utf-8');
if (fileName.length > 255) return console.error('Filename too long');

const { generateFileKey, obfuscateFileKey } = require('../keys');
const { encryptChunk, encryptInfo } = require('../encrypt');
const { encodeInfoFileV1 } = require('../infoFile');
const { readFileChunk } = require('../readFile');

console.log('Encrypting file ' + fileName + ' with 16MB chunks.');
let { key, nonce } = generateFileKey();

let paddingSize = 0;
let condensedMac = Buffer.alloc(16);
let macs = [];
let fileSize = 0;

const fileGenerator = readFileChunk(fullPath, CHUNK_SIZE);

writeFileSync(join(__dirname, process.argv[3]), Buffer.alloc(0));
let ctr = 0;
let i = 0;
for (let buf of fileGenerator) {
    if (!buf) break;
    console.log('chunk '+(i++));
    fileSize += buf.length;

    let enc = encryptChunk(buf, key, nonce, ctr, condensedMac);
    ctr = enc.ctr;
    paddingSize = enc.paddingSize;
    condensedMac = enc.condensedMac;
    macs.push(...enc.macs);
    
    appendFileSync(join(__dirname, process.argv[3]), enc.encryptedChunk);
}

console.log('finishing...');

let encryptedInfoFile = encryptInfo(encodeInfoFileV1(fileSize, fileName, macs), key);
writeFileSync(join(__dirname, process.argv[3]+'.info'), encryptedInfoFile);

let obfuscatedFileKey = obfuscateFileKey(key, nonce, condensedMac).toString('base64').substr(0, 43);
writeFileSync(join(__dirname, process.argv[3]+'.key'), obfuscatedFileKey, { encoding: 'utf-8'});

console.log('done!');