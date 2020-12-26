<?php

$serverRandomValue = 'd8JPiQvvZHZ/dha6W6aZ6A==';

Flight::route('POST /api/user/register', function () {
    $db = Flight::db();
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, TRUE);


    $uuid = rtrim(base64_encode(random_bytes(16)), '=');

    $stmt = $db->prepare('INSERT INTO user (`uuid`, `name`, `email`, `client_random_value`,
    `encrypted_master_key`, `hashed_auth_key`, `public_rsa_key`, `encrypted_rsa_private_key`,
    `public_ed_key`, `encrypted_ed_private_key`) VALUES (:u, :n, :e, :c, :m, :h, :pr, :er, :pe, :ee)');
    
    $stmt->execute(array(
        'u'  => $uuid,
        'n'  => $input['name'],
        'e'  => $input['email'],
        'c'  => $input['clientRandomValue'],
        'm'  => $input['encryptedMasterKey'],
        'h'  => $input['hashedAuthKey'],
        'pr' => $input['publicRsaKey'],
        'er' => $input['encryptedRsaPrivateKey'],
        'pe' => $input['publicEdKey'],
        'ee' => $input['encryptedEdPrivateKey'],
    ));

    Flight::json(array('email' => $input['email']));
});


Flight::route('POST /api/user/salt', function () {
    $db = Flight::db();
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, TRUE);

    $stmt = $db->prepare("SELECT `email`, `client_random_value` FROM user WHERE `email`=:email LIMIT 1"); 
    $stmt->execute(array( 'email' => $input['email'] ));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    $str = '';
    if ($row == FALSE) {
        $str .= $input['email'] . 'mini-mega';
        $str .= str_repeat('P', 200 - strlen($str));
        $str .= base64_decode($serverRandomValue);
    } else {
        $str .= 'mini-mega';
        $str .= str_repeat('P', 200 - strlen($str));
        $str .= base64_decode($row['client_random_value']);
    }

    $salt = base64_encode(hash('sha256', $str, TRUE));

    Flight::json(array('salt' => $salt));
});


Flight::route('POST /api/user/login', function () {
    $db = Flight::db();
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, TRUE);

    $stmt = $db->prepare("SELECT * FROM user WHERE `email`=:email LIMIT 1"); 
    $stmt->execute(array( 'email' => $input['email'] ));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    $hashedAuthKey = base64_encode(hash('sha256', base64_decode($input['authKey']), TRUE));

    if ($row != FALSE && $row['hashed_auth_key'] == $hashedAuthKey) {
        $session = base64_encode(random_bytes(24));
        $encSession;
        if (openssl_public_encrypt($session, $encSession, $row['public_rsa_key'], OPENSSL_PKCS1_OAEP_PADDING)) {
            $stmt2 = $db->prepare("INSERT INTO session (`id`, `user_uuid`) VALUES (:s, :u)");
            $stmt2->execute(array( 's' => $session, 'u' => $row['uuid'] ));

            Flight::json(array(
                'name' => $row['name'],
                'encryptedMasterKey' => $row['encrypted_master_key'],
                'encryptedRsaPrivateKey' => $row['encrypted_rsa_private_key'],
                'encryptedSessionIdentifier' => base64_encode($encSession)
            ));
        } else {
            Flight::json(array('error' => 'Internal error'));
        }
    } else {
        Flight::json(array('error' => 'Invalid credentials'));
    }
});

Flight::route('POST /api/user/logout', function () {
    $db = Flight::db();
    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, TRUE);

    $stmt = $db->prepare("DELETE FROM session WHERE id = :id");
    $stmt->execute(array( 'id' => $input['sessionIdentifier'] ));

    Flight::json(array( 'error' => null ));
});


Flight::route('GET /api/user/list', function () {
    $db = Flight::db();
    $stmt = $db->prepare("SELECT * FROM user");
    $stmt->execute();

    $v = [];
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $v[] = $row;
    }
    Flight::json($v);
});