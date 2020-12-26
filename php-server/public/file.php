<?php

require './auth_user.php';

Flight::route('GET /api/file/list', function () {
    $db = Flight::db();
    $user = auth_user();

    if ($user == FALSE) return;

    $stmt = $db->prepare("SELECT * FROM user_file WHERE user_uuid = :uuid");
    $stmt->execute(array( 'uuid' => $user['uuid'] ));

    $v = [];
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $v[] = array(
            'fileHandler' => $row['file_handler'],
            'userUuid' => $row['user_uuid'],
            'encryptedFileKey' => $row['encrypted_file_key'],
        );
    }
    Flight::json($v);
});


Flight::route('POST /api/file/link', function () {
    $db = Flight::db();
    $user = auth_user();

    if ($user == FALSE) return;

    $inputJSON = file_get_contents('php://input');
    $input = json_decode($inputJSON, TRUE);

    if (!isset($input['handler'], $input['key'])) {
        return Flight::json(array(
            'error' => 'HttpError',
            'message' => 'Invalid handler or key'
        ), 400);
    }

    $stmt = $db->prepare("INSERT INTO user_file (file_handler, user_uuid, encrypted_file_key) VALUES (:f, :u, :e)");
    $stmt->execute(array(
        'f' => $input['handler'],
        'u' => $user['uuid'],
        'e' => rtrim($input['key'], '=')
    ));

    Flight::json(array( 'handler' => $input['handler'] ));
});


Flight::route('DELETE /api/file/unlink/@handler', function ($handler) {
    $db = Flight::db();
    $user = auth_user();

    if ($user == FALSE) return;

    $stmt = $db->prepare("DELETE FROM user_file WHERE file_handler = :f AND user_uuid = :u");
    $stmt->execute(array(
        'f' => $handler,
        'u' => $user['uuid']
    ));

    $file = __DIR__ . '/../files/' . $handler;

    $stmt2 = $db->prepare("SELECT count(*) AS c FROM user_file WHERE file_handler = :f");
    $stmt2->execute(array( 'f' => $handler ));
    $row = $stmt2->fetch(PDO::FETCH_ASSOC);
    if ($row['c'] == 0) {
        unlink($file);
        unlink($file . '.info');
    }

    Flight::json(array( 'handler' => $handler ));
});


Flight::route('GET /api/file/info/@handler', function ($handler) {
    $file = __DIR__ . '/../files/' . $handler . '.info';

    if (file_exists($file)) {
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename=' . $handler . '.info');
        header('Content-Transfer-Encoding: binary');
        header('Cache-Control: public, max-age=15552000');
        header('Content-Length: ' . filesize($file));
        ob_clean();
        flush();
        readfile($file);
    } else {
        return Flight::json(array( 'error' => 'Not found' ), 404);
    }
});


Flight::route('GET /api/file/download/@handler', function ($handler) {
    $file = __DIR__ . '/../files/' . $handler;

    if (file_exists($file)) {
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename=' . $handler . '.info');
        header('Content-Transfer-Encoding: binary');
        header('Cache-Control: public, max-age=15552000');
        header('Content-Length: ' . filesize($file));
        ob_clean();
        flush();
        readfile($file);
    } else {
        return Flight::json(array( 'error' => 'Not found' ), 404);
    }
});


Flight::route('POST /api/file/create', function () {
    $db = Flight::db();
    $user = auth_user();

    if ($user == FALSE) return;

    $handler = str_replace(['+', '/'], ['-', '_'], base64_encode(random_bytes(9)));
    $file = __DIR__ . '/../files/' . $handler;

    if (move_uploaded_file($_FILES['info_file']['tmp_name'], $file . '.info') &&
        move_uploaded_file($_FILES['file']['tmp_name'], $file)) {
            $stmt = $db->prepare("INSERT INTO user_file (file_handler, user_uuid, encrypted_file_key) VALUES (:f, :u, :e)");
            $stmt->execute(array(
                'f' => $handler,
                'u' => $user['uuid'],
                'e' => rtrim($_POST['key'], '=')
            ));
            Flight::json(array( 'handler' => $handler ), 201);
    } else {
        Flight::json(array( 'error' => 'Unknown error when uploading file' ), 500);
    }
});

