create table user (
    uuid char(22) primary key,
    name varchar(190) not null,
    email varchar(190) unique not null,
    client_random_value text not null,
    encrypted_master_key text not null,
    hashed_auth_key text not null,
    public_rsa_key text not null,
    encrypted_rsa_private_key text not null,
    public_ed_key text not null,
    encrypted_ed_private_key text not null
);

create table session (
    id char(32) primary key,
    user_uuid char(22) not null,
    foreign key (user_uuid) references user (uuid) on delete cascade on update cascade
);

create table user_file (
    file_handler char(12) not null,
    user_uuid char(22) not null,
    encrypted_file_key text not null,
    primary key (file_handler, user_uuid),
    foreign key (user_uuid) references user (uuid)
);
