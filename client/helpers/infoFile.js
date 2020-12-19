// Info file format version 1
// v|size|r|n|filename.
// .|nmac|concmacs.|xx|
// 
// v = version (1) - 1 byte
// size = floor(file size / 16) - UInt32 (4 bytes)
// r = file size % 16 - 1 byte
// n = file name size - 1 byte unsigned
// filename..... = utf-8 encoded string (n bytes)
// nmac = number of macs in file - UInt32 (4 bytes)
// concmacs = concatenated macs (nmac * 16 bytes)
// xx = 0 padding until info file size is multiple of 16


/**
 * 
 * @param {number} fileSize 
 * @param {Buffer} fileName 
 * @param {Buffer[]} macs 
 */
function encodeInfoFileV1(fileSize, fileName, macs) {
    const version = 1;

    const fileSize16 = Math.floor(fileSize / 16);
    const remainder = fileSize % 16;

    const fileInfoSize = 11 + fileName.length + 16*macs.length;
    const paddingInfoSize = fileInfoSize % 16 === 0 ? 0 : 16 - fileInfoSize % 16;

    let infoFile = Buffer.allocUnsafe(fileInfoSize + paddingInfoSize);
    infoFile.fill(0, fileInfoSize, fileInfoSize + paddingInfoSize); // xx
    infoFile.writeUInt8(version, 0); // v
    infoFile.writeUInt32BE(fileSize16, 1); // size
    infoFile.writeUInt8(remainder, 5); // r
    infoFile.writeUInt8(fileName.length, 6); // n
    infoFile.set(fileName, 7); // filename
    infoFile.writeUInt32BE(macs.length, 7 + fileName.length); // nmac
    let macsStart = 11 + fileName.length;
    for (let i in macs) {
        infoFile.set(macs[i], macsStart + i*16); // concmacs
    }

    return infoFile;
}

/**
 * 
 * @param {Buffer} file
 */
function decodeInfoFileV1(file) {
    const isVersion1 = file.readUInt8(0) === 1;
    if (!isVersion1) throw new Error('Info file version is invalid');

    const fileSize16 = file.readUInt32BE(1) * 16; // size
    const remainder = file.readUInt8(5); // r
    const fileNameSize = file.readUInt8(6); // n
    const fileName = file.slice(7, 7 + fileNameSize).toString('utf-8'); // filename
    
    const nMacs = file.readUInt32BE(7 + fileNameSize); // nmac
    const macs = [];
    let macsStart = 11 + fileNameSize;
    for (let i = 0; i < nMacs; i++) {
        macs.push(file.slice(macsStart + i*16, macsStart + (i+1)*16)); // concmacs
    }

    return {
        fileSize: fileSize16 + remainder,
        fileName,
        macs,
    };
}

module.exports = {
    encodeInfoFileV1,
    decodeInfoFileV1,
};