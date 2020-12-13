const path = require('path');
const fs = require('fs');
const db = require('./database');

function insert (mig) {
    return new Promise((resolve, reject) => {
        db.run('INSERT INTO migrated VALUES (?)', [mig], (err) => {
            if (err) reject(err);
            else resolve();
        })
    });
}

function destroy (mig) {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM migrated WHERE name = ?', [mig], err => {
            if (err) reject(err);
            else resolve();
        })
    })
}


function migrate () {
    db.all('SELECT * FROM migrated', async (err, rows) => {
        const migrations = fs.readdirSync(path.join(__dirname, 'database', 'migrations'));
        const migrated = rows.map(r => r.name);

        const toMigrate = migrations.filter(m => !migrated.includes(m));

        if (toMigrate.length === 0) return console.log('Database up to date!');
        
        for (let mig of toMigrate) {
            console.log('Executing migration '+mig+'...');
            await require('./database/migrations/'+mig).up(db);
            await insert(mig);
            console.log('Success!');
        }
    });
}

function undoMigrate () {
    db.all('SELECT * FROM migrated', async (err, rows) => {
        const migrated = rows.map(r => r.name).pop();
        if (!migrated) return console.log('No migrations to undo.');
        console.log('Undoing migration '+migrated+'...');
        await require('./database/migrations/'+migrated).down(db);
        await destroy(migrated);
        console.log('Success!');
    });
}

function undoAllMigrations () {
    db.all('SELECT * FROM migrated', async (err, rows) => {
        const migrated = rows.map(r => r.name).reverse();
        for (let mig of migrated) {
            console.log('Undoing migration '+mig+'...');
            await require('./database/migrations/'+mig).down(db);
            await destroy(mig);
            console.log('Success!');
        }
    });
}

function main () {
    db.run('CREATE TABLE IF NOT EXISTS migrated (name text primary key)', () => {
        if (process.argv[2] === 'up') migrate();
        else if (process.argv[2] === 'down' && !process.argv[3]) undoMigrate();
        else if (process.argv[2] === 'down' && process.argv[3] === 'all') undoAllMigrations();
        else console.error('Invalid command.\n\nUsage: node migrate < up | down [all] >');
    });
}

main();