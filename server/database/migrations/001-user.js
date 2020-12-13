module.exports = {
    /**
     * @param {import('sqlite3').Database} db 
     */
    up (db) {
        return new Promise(resolve => {
            db.serialize(() => {
                db.run(`create table user (
                    uuid text primary key,
                    name text not null,
                    email text unique not null,
                    client_random_value text not null,
                    encrypted_master_key text not null,
                    hashed_auth_key text not null,
                    public_rsa_key text not null,
                    encrypted_rsa_private_key text not null,
                    public_ed_key text not null,
                    encrypted_ed_private_key text not null
                )`);
                db.run(`create table session (
                    id text primary key,
                    user_uuid text not null,
                    foreign key (user_uuid) references user (uuid) on delete cascade on update cascade
                )`, () => resolve());
            });
        });
    },

    /**
     * @param {import('sqlite3').Database} db 
     */
    down (db) {
        return new Promise(resolve => {
            db.serialize(() => {
                db.run('drop table session');
                db.run('drop table user', () => resolve());
            });
        });
    }
}