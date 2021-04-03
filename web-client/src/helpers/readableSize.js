export function readableSize (size) {
    if (size < 1e3) return size + 'B';
    if (size < 1e4) return Math.round(size/1e2)/10 + 'kB';
    if (size < 1e6) return Math.round(size/1e3) + 'kB';
    if (size < 1e7) return Math.round(size/1e5)/10 + 'MB';
    if (size < 1e9) return Math.round(size/1e6) + 'MB';
    if (size < 1e10) return Math.round(size/1e8)/10 + 'GB';
    return Math.round(size/1e9) + 'GB';
}
