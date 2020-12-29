function readableSize (size) {
    if (size < 1e3) return size + 'B';
    if (size < 1e6) return Math.round(size/1e3) + 'kB';
    if (size < 1e9) return Math.round(size/1e6) + 'MB';
    return Math.round(size/1e9) + 'GB';
}

module.exports = readableSize;
