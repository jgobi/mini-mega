<?php

function auth_user () {
    $db = Flight::db();
    if (!isset($_SERVER['HTTP_AUTHORIZATION'])) {
        Flight::json(array('error' => 'Invalid authorization type'), 401);
        return FALSE;
    }

    $authorization = $_SERVER['HTTP_AUTHORIZATION'];
    $v = explode(' ', $authorization);
    if ($v[0] != 'Bearer') {
        Flight::json(array('error' => 'Invalid authorization type'), 401);
        return FALSE;
    }
    if (!isset($v[1])) {
        Flight::json(array('error' => 'No session provided'), 401);
        return FALSE;
    }

    $stmt = $db->prepare("SELECT * FROM session s INNER JOIN user u ON u.uuid = s.user_uuid WHERE `id`= :id LIMIT 1");
    $stmt->execute(array( 'id' => $v[1] ));
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($row == FALSE) {
        Flight::json(array('error' => 'Invalid session'), 401);
        return FALSE;
    } else {
        return $row;
    }
}
