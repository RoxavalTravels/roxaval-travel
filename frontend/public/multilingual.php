<?php
// Set ROXAVAL_BACKEND_PATH in the host configuration if Laravel is elsewhere.
$backend = getenv('ROXAVAL_BACKEND_PATH') ?: getenv('REDIRECT_ROXAVAL_BACKEND_PATH') ?: __DIR__.'/roxaval-backend-php';
if (!is_file($backend.'/vendor/autoload.php')) {
    http_response_code(503);
    exit('Website configuration is incomplete.');
}
define('ROXAVAL_FRONTEND_INDEX', __DIR__.'/index.html');
require $backend.'/vendor/autoload.php';
$app = require $backend.'/bootstrap/app.php';
$incoming = $_SERVER['REQUEST_URI'] ?? '/';
$uri = parse_url($incoming, PHP_URL_PATH) === '/sitemap.xml' ? $incoming : '/website'.$incoming;
$request = Illuminate\Http\Request::create($uri, 'GET', [], $_COOKIE, [], $_SERVER);
$app->handleRequest($request);
