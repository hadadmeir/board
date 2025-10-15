<?php
set_time_limit(300);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('HTTP/1.1 200 OK');
    exit;
}

header('Content-Type: application/json; charset=utf-8');

if (!isset($_REQUEST['method'])) {
    die(json_encode(array("error" => "No method")));
}

include_once("db_connect.php");

$method = mysqli_real_escape_string($connection, $_REQUEST['method']);

switch ($method) {
    case 'save':
        $data = json_decode(file_get_contents('php://input'), true);
        if ($data && is_array($data)) {
            file_put_contents('times.json', json_encode($data));
            echo json_encode(array("success" => true));
        } else {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(array("error" => "Invalid data"));
        }
        break;

    case 'load':
        $file = 'times.json';
        if (file_exists($file)) {
            echo file_get_contents($file);
        } else {
            echo json_encode(array(
                "weekday" => array(),
                "shabbat" => array(),
                "lesson" => array(),
                "activity" => array()
            ));
        }
        break;

    case 'messages':
        if (file_exists('messages_content.html')) {
            header('Content-Type: text/html; charset=utf-8');
            echo file_get_contents('messages_content.html');
        } else {
            echo '';
        }
        break;

    default:
        echo json_encode(array('error' => 'Method not found'));
        break;
}
?>
