const fs = require('fs');

/**
 * 
 * @param {string|string[]} folders 
 * @param {boolean} critical Should exit if not success creating the folders;
 */
function createFolders (folders, critical = true) {
    if (typeof folders === 'string') folders = [folders];

    let errors = [];
    for (let folder of folders) {
        try {
            fs.mkdirSync(folder, { recursive: true });
        } catch (err) {
            if (err.code !== 'EEXIST') {
                if (critical) {
                    console.error('Cannot create', folder, 'directory, exiting...');
                    process.exit(1);
                } else errors.push(folder);
            } else if (!fs.statSync(folder).isDirectory()) {
                if (critical) {
                    console.error('Cannot create', folder, 'directory, file with same name already exists, exiting...');
                    process.exit(1);
                } else errors.push(folder);
            }
        }
    }

    return errors;
}

module.exports = {
    createFolders,
};
