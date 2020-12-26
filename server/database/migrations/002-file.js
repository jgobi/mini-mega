module.exports = {
    /**
     * @param {import('sqlite3').Database} db 
     */
    up (db) {
        return new Promise(resolve => {
            db.serialize(() => {
                db.run(`create table user_file (
                    file_handler text not null,
                    user_uuid text not null,
                    encrypted_file_key text not null,
                    primary key (file_handler, user_uuid),
                    foreign key (user_uuid) references user (uuid)
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
                db.run('drop table user_file', () => resolve());
            });
        });
    }
}