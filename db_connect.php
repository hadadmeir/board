<?
session_start();

if (empty($HTTP_HOST)) {

    if (!empty($_ENV) && isset($_ENV['HTTP_HOST'])) {

        $HTTP_HOST = $_ENV['HTTP_HOST'];

    }

    else if (@getenv('HTTP_HOST')) {

        $HTTP_HOST = getenv('HTTP_HOST');

    }

    else {

        $HTTP_HOST = '';

    }

}

$user="hadadmei_shokeda";

$password="beyahad";

$database= "hadadmei_shokeda_new";

$connection = mysqli_connect('localhost',$user,$password,$database) or die("Unable to connect");

?>