const fs = require('fs');

function* readFileChunk(filePath, chunkSize = 0x1000000) { // 16MB
    const buffer = Buffer.alloc(chunkSize);
    const fd = fs.openSync(filePath, 'r');

    while (1) {
        let nread = fs.readSync(fd, buffer, 0, chunkSize, null);
        if (nread === 0) {
            fs.closeSync(fd);
            break;
        } else if (nread < chunkSize) {
            yield buffer.slice(0, nread);
        } else {
            yield buffer;
        }
    }
}

module.exports = {
    readFileChunk,
};