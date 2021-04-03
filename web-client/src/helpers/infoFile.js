// Info file format version 1
// 0 1 2 3 4 5 6 7 8 9 a b c d e f
// v|s i z e|r|n|f i l e n a m e .
// .|n m|c o n c m a c s . .|x x x
// 
// v = version (2) - 1 byte
// size = floor(file size / 16) - UInt32 (4 bytes)
// r = file size % 16 - 1 byte
// n = file name size - 1 byte unsigned
// filename.. = utf-8 encoded string (n bytes)
// nm = number of macs in file - UInt16 (2 bytes)
// concmacs.. = concatenated macs (nm * 16 bytes)
// xxx = 0 padding until info file size is multiple of 16

/**
 * 
 * @param {Buffer} file
 */
export function decodeInfoFileV2(file) {
    const isVersion1 = file.readUInt8(0) === 2;
    if (!isVersion1) throw new Error('Info file version is invalid');

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
        fileSize: fileSize16 + remainder,
        fileName,
        macs,
    };
}
