// Info file format version 1
// 0 1 2 3 4 5 6 7 8 9 a b c d e f
// v|s i z e|r|n|f i l e n a m e .
// .|n m|c o n c m a c s . .|x x x
// 
// v = version (1 - CCM, 2 - GCM) - 1 byte
// size = floor(file size / 16) - UInt32 (4 bytes)
// r = file size % 16 - 1 byte
// n = file name size - 1 byte unsigned
// filename.. = utf-8 encoded string (n bytes)
// nm = number of macs in file - UInt16 (2 bytes)
// concmacs.. = concatenated macs (nm * 16 bytes)
// xxx = 0 padding until info file size is multiple of 16


/**
 * 
 * @param {number} fileSize 
 * @param {Buffer} fileName 
 * @param {Buffer[]} macs 
 */
function encodeInfoFileV2(fileSize, fileName, macs) {
    const version = 2;

    const fileSize16 = Math.floor(fileSize / 16);
    const remainder = fileSize % 16;

    const fileInfoSize = 9 + fileName.length + 16*macs.length;
    const paddingInfoSize = fileInfoSize % 16 === 0 ? 0 : 16 - fileInfoSize % 16;

    let infoFile = Buffer.allocUnsafe(fileInfoSize + paddingInfoSize);
    infoFile.fill(0, fileInfoSize, fileInfoSize + paddingInfoSize); // xx
    infoFile.writeUInt8(version, 0); // v
    infoFile.writeUInt32BE(fileSize16, 1); // size
    infoFile.writeUInt8(remainder, 5); // r
    infoFile.writeUInt8(fileName.length, 6); // n
    infoFile.set(fileName, 7); // filename
    infoFile.writeUInt16BE(macs.length, 7 + fileName.length); // nm
    let macsStart = 9 + fileName.length;
    for (let i in macs) {
        infoFile.set(macs[i], macsStart + i*16); // concmacs
    }

    return infoFile;
}

/**
 * 
 * @param {Buffer} file
 */
function decodeInfoFileV2(file) {
    const isVersion1Or2 = file.readUInt8(0) === 1 || file.readUInt8(0) === 2;
    if (!isVersion1Or2) throw new Error('Info file version is invalid');

    const fileSize16 = file.readUInt32BE(1) * 16; // size
    const remainder = file.readUInt8(5); // r
    const fileNameSize = file.readUInt8(6); // n
    const fileName = file.slice(7, 7 + fileNameSize).toString('utf-8'); // filename
    
    const nMacs = file.readUInt16BE(7 + fileNameSize); // nmac
    const macs = [];
    let macsStart = 9 + fileNameSize;
    for (let i = 0; i < nMacs; i++) {
        macs.push(file.slice(macsStart + i*16, macsStart + (i+1)*16)); // concmacs
    }

    return {
        alg: 'aes-128-' + (file.readUInt8(0) === 1 ? 'ccm' : 'gcm'),
        fileSize: fileSize16 + remainder,
        fileName,
        macs,
    };
}

module.exports = {
    encodeInfoFileV2,
    decodeInfoFileV2,
};