<?php
// Offline asset generation; never run on production requests.
$root = dirname(__DIR__).'/public';
$source = imagecreatefromjpeg($root.'/f1dc4405-8788-4026-86f6-8dcd6433d54c.jpg');
if (!$source) throw new RuntimeException('Hero source unavailable');
if (!is_dir($root.'/optimized')) mkdir($root.'/optimized', 0755);
foreach ([640, 960, 1376] as $width) {
    $height = (int) round(imagesy($source) * $width / imagesx($source));
    $target = imagecreatetruecolor($width, $height);
    imagecopyresampled($target, $source, 0, 0, 0, 0, $width, $height, imagesx($source), imagesy($source));
    if (!imagewebp($target, "$root/optimized/hero-sigiriya-$width.webp", 80)) throw new RuntimeException('WebP generation failed');
    if (!imageavif($target, "$root/optimized/hero-sigiriya-$width.avif", 60)) throw new RuntimeException('AVIF generation failed');
    imagedestroy($target);
}
imagedestroy($source);
