<?php

add_theme_support('custom-logo', array(
    'height'      => 100,
    'width'       => 400,
    'flex-height' => true,
    'flex-width'  => true,
    'header-text' => array('site-title', 'site-description'),
));

add_theme_support('post-thumbnails');

function register_my_menu() {
    register_nav_menu('header-menu', __('Header Menu'));
}

add_action('init', 'register_my_menu');

// Permitir la carga de plugins desde la PC
function allow_svg_upload($mimes) {
    $mimes['svg'] = 'image/svg+xml';
    return $mimes;
}

add_filter('upload_mimes', 'allow_svg_upload');

function custom_404_page() {
    if (is_404()) {
        $custom_404_page_slug = '404-2'; // Reemplaza '404-2' con el slug de tu página 404 personalizada
        $custom_404_page = get_page_by_path($custom_404_page_slug);
        
        if ($custom_404_page) {
            header("HTTP/1.1 404 Not Found");
            include(get_template_directory() . '/404.php'); // Opcionalmente, puedes crear un archivo 404.php en tu tema para el diseño.
            exit;
        }
    }
}

add_action('template_redirect', 'custom_404_page');




?>
