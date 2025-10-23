<html lang="es">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Buscardor de Películas</title>
    <meta content="width=device-width, initial-scale=1.0" name="viewport">
    <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
    <meta name="description" content="▷ Streamig, pantallas netflix, disney, max, paramount y más" />
    <!-- Open Graph -->
    <meta property="og:locale" content="es" />
    <meta property="og:type" content="website">
    <meta property="og:title" content="▷ Streamig, pantallas netflix, disney, max, paramount y más" />
    <meta property="og:url" content="https://digitalnetlc.com/">
    <meta property="og:description" content="▷ Streamig, pantallas netflix, disney, max, paramount y más" />
    <meta property="og:site_name" content="DigitalNetLC" />
    <meta property="og:image" content="https://digitalnetlc.com/logonet/">
    <meta property="og:image:type" content="image/jpg" />
    <meta property=" og:image:width" content="555">
    <!--Ancho -->
    <meta property=" og:image:height" content="555">
    <!--Altura -->
    <meta property="twitter:card" content="summary_large_image">
    <meta name="twitter:label1" content="Tiempo de lectura" />
    <meta name="twitter:data1" content="9 minutos" />
    <meta property="twitter:url" content="https://digitalnetlc.com/">
    <meta property="twitter:title" content="▷ Streamig, pantallas netflix, disney, max, paramount y más">
    <meta property="twitter:description" content="▷ Streamig, pantallas netflix, disney, max, paramount y más">
    <meta property="twitter:image" content="https://digitalnetlc.com/logonet/">
    <!-- favicon -->
    <link rel="icon" type="image/png" sizes="32x32"
        href="<?php echo get_bloginfo('template_directory'); ?>/img/iconfavico/favico-32x32.png">
    <link rel="icon" type="image/png" sizes="96x96"
        href="<?php echo get_bloginfo('template_directory'); ?>/img/iconfavico/favico-96x96.png">
    <link rel="icon" type="image/png" sizes="16x16"
        href="<?php echo get_bloginfo('template_directory'); ?>/img/iconfavico/favico-16x16.png">
    <!-- Fin favicon -->
    <link rel="manifest" href="<?php echo get_bloginfo('template_directory'); ?>/img/iconfavico/manifest.json">
    <meta name="msapplication-TileColor" content="#ffffff">
    <!-- libreria -->
    <link rel="stylesheet"
        href="<?php echo get_bloginfo('template_directory'); ?>/biosite/digital/webpack/css/bootstrap.min.css"
        media="all">

    <link rel='stylesheet' id='main-css'
        href='./wp-content/themes/digitalnetlc/frontend/assets/main.css@ver=2.11.10.css' type='text/css' media='all' />

    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.0/css/all.min.css">
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css" rel="stylesheet">

    <!-- Font Awesome -->
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
    <link rel="stylesheet" href="https://use.fontawesome.com/releases/v5.1.0/css/all.css"
        integrity="sha384-lKuwvrZot6UHsBSfcMvOkWwlCMgc0TaWr+30HWe3a4ltaBwTZhyTEggF5tJv8tbt" crossorigin="anonymous">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css" rel="stylesheet">


    <!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-C9QMVCF9Y4"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-C9QMVCF9Y4');
</script>
<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '9180491848628668');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=9180491848628668&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->
</head>


<body>

    <header>
        <div class="logo" onclick="location.reload()">
            <img src="https://digitalnetlc.com/logo5/" alt="DIGITALNETLC Logo">
        </div>
        
        <div class="menu-toggle-wrapper" onclick="toggleMenu()">
            <div class="icon nav-icon-5">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>


        <nav class="menu">
            <button type="button" onclick="location.href='https://digitalnetlc.com/'">Inico</button>
            <button type="button" onclick="location.href='#netflix-section'">Netflix</button>
            <button type="button" onclick="location.href='#disney-section'">Disney+</button>
            <button type="button" onclick="location.href='#future-section'">Estrenos</button>
            <button type="button" onclick="location.href='#contact'">Contacto</button>
        </nav>

        <a href="https://wa.me/15852826352" target="_blank" class="whatsapp-btn" aria-label="Contactar por WhatsApp">
            <i class="fa-solid fa-comment"></i>
        </a>
    </header>
    <script>
        function toggleMenu() {
            const menu = document.querySelector('.menu');
            const icon = document.querySelector('.icon');
            menu.classList.toggle('active');
            icon.classList.toggle('open');
        }
    
        // Seleccionar todos los botones dentro del menú
        document.querySelectorAll('.menu button').forEach(button => {
            button.addEventListener('click', () => {
                const menu = document.querySelector('.menu');
                const icon = document.querySelector('.icon');
                menu.classList.remove('active');
                icon.classList.remove('open');
            });
        });
    </script>
    
    <style>
        body {
            margin: 0;
            font-family: 'Inter', sans-serif;
        }

        header {
            background-color: #111;;
            color: #fff;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 30px;
        }

        .logo img {
            max-width: 140px;
            height: auto;
        }

        .menu {
            display: flex;
            gap: 30px;
            margin-left: auto;
            margin-right: auto;
        }

        .menu button {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 12px 25px;
            background: none;
            border: 2px solid #ff0000;
            border-radius: 30px;
            color: #fff;
            font-size: 15px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
        }

        .menu button:hover {
            transform: scale(1.05);
            color: #d10e00;
        }

        .menu-toggle-wrapper {
            display: none;
            /* Oculta el toggle por defecto */
        }

        /* nav-icon-5 */
        .nav-icon-5 {
            width: 35px;
            height: 30px;
            margin: 10px 10px;
            position: relative;
            cursor: pointer;
            display: inline-block;
        }

        .nav-icon-5 span {
            background-color: #fff;
            position: absolute;
            border-radius: 2px;
            transition: .3s cubic-bezier(.8, .5, .2, 1.4);
            width: 100%;
            height: 4px;
        }

        .nav-icon-5 span:nth-child(1) {
            top: 0px;
            left: 0px;
        }

        .nav-icon-5 span:nth-child(2) {
            top: 13px;
            left: 0px;
            opacity: 1;
        }

        .nav-icon-5 span:nth-child(3) {
            bottom: 0px;
            left: 0px;
        }

        .nav-icon-5.open span:nth-child(1) {
            transform: rotate(45deg);
            top: 13px;
        }

        .nav-icon-5.open span:nth-child(2) {
            opacity: 0;
        }

        .nav-icon-5.open span:nth-child(3) {
            transform: rotate(-45deg);
            top: 13px;
        }

        .whatsapp-btn {
            width: 50px;
            height: 50px;
            background-color: #25d366;
            color: #fff;
            border: none;
            border-radius: 50%;
            font-size: 20px;
            transition: transform 0.3s;
            display: flex;
            text-decoration: none;
            justify-content: center;
            align-items: center;
        }

        .whatsapp-btn:hover {
            transform: scale(1.1);
        }

        .whatsapp-btn i {
            font-size: 24px;
        }

        /* Responsivo */
        @media (max-width: 768px) {
            header {
                flex-wrap: wrap;
                padding: 10px 20px;
            }

        

            .menu {
                flex-direction: column;
                display: none;
                width: 100%;
                text-align: center;
            }

            .menu button {
                font-size: 20px;
                width: 100%;
                padding: 15px;
                border-top: 1px solid #111;;
            }

            .menu button:first-child {
                border-top: none;
            }

            .menu-toggle-wrapper {
                display: block;
                /* Muestra el toggle en pantallas pequeñas */
            }

            .menu.active {
                display: flex;
            }

            .navbar-brand {
            color: white;
            font-weight: bold;
            font-size: 1.2rem;
            margin-bottom: 10px;
        }

        .form-inline {
            margin-top: 10px;
        }

        .form-control {
            width: 100%; /* Establecer un ancho más pequeño */
            font-size: 1rem; /* Reducir el tamaño de la fuente */
        }
        }
    </style>

    <!-- Nueva sección para el texto y el formulario debajo del header -->
    <div class="search-container">
        <div class="search-content">
            <span class="navbar-brand">Buscar trailer</span>
            <form id="search-form" class="form-inline">
                <input id="search" class="form-control mr-sm-2" type="search" placeholder="buscar una película"
                    aria-label="Search">
            </form>
        </div>
    </div>

    <style>
        body {
            background-color: #111;
            color: #ffffff;
            margin: 0;
            padding: 0;
            height: 100vh; /* Asegura que la altura de la página ocupe toda la ventana */
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }

        nav {
            background-color: #111;
        }

        nav a {
            color: #ffffff;
        }

        .movie-card img {
            border-radius: 10px;
        }

        .category-section {
            margin-bottom: 30px;
        }

        .category-title {
            font-size: 1.8rem;
            color: #83cfdf;
            cursor: pointer;
            transition: color 0.3s ease;
        }

        .category-title:hover {
            color: #ffa500;
            text-decoration: underline;
        }

        .movie-card {
            padding: 10px;
            transition: transform 0.3s, box-shadow 0.3s;
        }

        .movie-card:hover {
            transform: scale(1.05);
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
        }

        .movie-description {
            background: var(--color5);
            border-radius: 0 0 0.5rem 0.5rem;
        }

        .movie-title {
            color: var(--color3);
            padding: 0.5rem;
            font-size: 1rem;
        }

        .movie-vote {
            background: var(--color2);
            color: orange;
            text-align: center;
            padding: 0.5rem;
            border-radius: 0.5rem;
        }

        .movie-img {
            border-radius: 0.5rem 0.5rem 0 0;
            max-height: 100%;
        }

        .modal-content {
            background-color: #1c1c1e;
            color: #ffffff;
            border-radius: 10px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.7);
        }

        .modal-header,
        .modal-body {
            color: #ffffff;
        }

        .modal-header h5 {
            color: #83cfdf;
            font-weight: bold;
            font-size: 1.5rem;
        }

        .modal-body p {
            font-size: 1rem;
            line-height: 1.5;
        }

        #movie-trailer {
            background-color: #292b2f;
            padding: 15px;
            margin-top: 15px;
            border-radius: 10px;
            text-align: center;
        }

        .logo img {
            max-width: 150px;
            height: 100px;
        }

        header .container {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        header {
            background-color: #111;
            color: #fff;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 30px;
        }

        .whatsapp-btn {
            width: 50px;
            height: 50px;
            background-color: #25d366;
            color: #fff;
            border: none;
            border-radius: 50%;
            font-size: 20px;
            transition: transform 0.3s;
            display: flex;
            text-decoration: none;
            justify-content: center;
            align-items: center;
        }

        .whatsapp-btn:hover {
            transform: scale(1.1);
        }

        .whatsapp-btn i {
            font-size: 24px;
        }

        /* Estilo de la sección de búsqueda */
        .search-container {
            background-color: #292b2f;
            text-align: center;
            flex: 1; /* Asegura que ocupe todo el espacio disponible */
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px 0;
        }

        .search-content {
            text-align: center;
        }

        .navbar-brand {
            color: white;
            font-weight: bold;
            font-size: 1.2rem;
            margin-bottom: 10px;
        }

        .form-inline {
            margin-top: 10px;
        }

        .form-control {
            width: 100%; /* Establecer un ancho más pequeño */
            font-size: 1rem; /* Reducir el tamaño de la fuente */
        }

         /* Responsivo */
         @media (max-width: 768px) {

            .navbar-brand {
            font-size: 1.25rem;
        }
        .form-control {
            font-size: 1.5rem; /* Reducir el tamaño de la fuente */
        }
        }
    </style>
    
    <section>
        <div class="container-fluid mt-5 p-5">
            <div id="movie-content" class="row d-flex justify-content-center"></div>
        </div>
    </section>

    <div class="modal fade" id="movieModal" tabindex="-1" aria-labelledby="movieModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="movieModalLabel"></h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"
                        aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <p id="movie-description"></p>
                    <div id="movie-trailer" class="mt-3">
                        <!-- Trailer will load here -->
                    </div>
                </div>
            </div>
        </div>
    </div>


    <main class="container mt-5">
        <!-- Categorías de películas -->
        <section id="netflix-section" class="category-section">
            <h2 class="category-title" data-provider="netflix">Originales de Netflix</h2>
            <div id="netflix-content" class="row"></div>
        </section>

        <section id="disney-section" class="category-section">
            <h2 class="category-title" data-provider="disney">Disney+ Populares</h2>
            <div id="disney-content" class="row"></div>
        </section>

        <section id="future-section" class="category-section">
            <h2 class="category-title">Estrenos 2025</h2>
            <div id="future-content" class="row"></div>
        </section>


    </main>



    <script>
        const API_KEY = "249f222afb1002186f4d88b2b5418b55";
        const IMAGE_PATH = "https://image.tmdb.org/t/p/w500";
        const API_DETAILS = "https://api.themoviedb.org/3/movie/";

        const PROVIDERS = {
            netflix: 8,
            disney: 337,
            hbo: 384,
        };

        const SECTIONS = {
            netflix: document.getElementById("netflix-content"),
            disney: document.getElementById("disney-content"),
            hbo: document.getElementById("hbo-content"),
            future: document.getElementById("future-content"),
        };

        const mainContent = document.getElementById("movie-content");
        const form = document.getElementById("search-form");
        const search = document.getElementById("search");


        // Cargar películas populares y próximas al cargar la página
        document.addEventListener("DOMContentLoaded", () => {
            loadPopularMovies("netflix", PROVIDERS.netflix);
            loadPopularMovies("disney", PROVIDERS.disney);
            loadPopularMovies("hbo", PROVIDERS.hbo);

            loadUpcomingMovies();
        });


        // Manejar búsqueda de películas
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const query = search.value.trim();
            if (query) {
                getMovies(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&&language=es-ES&query=${query}`);
            }
        });





        // Función para cargar películas de proveedores populares
        async function loadPopularMovies(section, providerId) {
            const url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=es-ES&sort_by=popularity.desc&with_watch_providers=${providerId}&watch_region=US&release_date.gte=2020-01-01`;
            const movies = await fetchMovies(url);
            displayMovies(section, movies);
        }
        async function loadUpcomingMovies() {
            const url = `https://api.themoviedb.org/3/discover/movie?api_key=${API_KEY}&language=es-ES&sort_by=popularity.desc&release_date.gte=2025-01-01&release_date.lte=2025-12-31`;
            const movies = await fetchMovies(url);
            displayMovies("future", movies);
        }

        async function fetchMovies(url) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error("Failed to fetch movies.");
                const data = await response.json();
                return data.results;
            } catch (error) {
                console.error(error);
                return [];
            }
        }

        function displayMovies(section, movies) {
            const content = SECTIONS[section];
            if (!movies.length) {
                content.innerHTML = "<p>No movies found.</p>";
                return;
            }

            content.innerHTML = movies
                .slice(0, 12) // Limitar a 12 películas por sección
                .map(movie => `
                    <div class="col-xs-12 col-sm-6 col-md-3">
                        <div class="movie-card" onclick="showMovieTrailer(${movie.id}, '${movie.title.replace(/'/g, "\\'")}', '${movie.overview.replace(/'/g, "\\'")}')">
                            <img class="img-fluid" src="${IMAGE_PATH}${movie.poster_path}" alt="${movie.title}">
                            <h3 class="mt-2">${movie.title}</h3>
                        </div>
                    </div>
                `)
                .join("");
        }

        // Mostrar tráiler y detalles de la película
async function showMovieTrailer(movieId, title, overview) {
    try {
        // Intentar obtener el trailer en español
        let trailerResp = await fetch(`${API_DETAILS}${movieId}/videos?api_key=${API_KEY}&language=es-ES`);
        let trailerData = await trailerResp.json();

        // Buscar el trailer en español
        let trailer = trailerData.results.find(video => video.type === "Trailer" && video.site === "YouTube");

        // Si no se encuentra en español, intentar en inglés
        if (!trailer) {
            trailerResp = await fetch(`${API_DETAILS}${movieId}/videos?api_key=${API_KEY}&language=en-US`);
            trailerData = await trailerResp.json();
            trailer = trailerData.results.find(video => video.type === "Trailer" && video.site === "YouTube");
        }

        // Configurar el modal con los datos obtenidos
        document.getElementById("movieModalLabel").innerText = title;
        document.getElementById("movie-description").innerText = overview;

        // Incluir subtítulos en español de manera predeterminada si el tráiler está disponible
        document.getElementById("movie-trailer").innerHTML = trailer ? `
            <iframe width="100%" height="400" 
                src="https://www.youtube.com/embed/${trailer.key}?cc_load_policy=1&hl=es&cc_lang_pref=es" 
                frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                allowfullscreen></iframe>
        ` : "<p>No trailer available.</p>";

        // Mostrar el modal
        const movieModal = new bootstrap.Modal(document.getElementById("movieModal"));
        movieModal.show();
    } catch (error) {
        console.error("Error fetching trailer:", error);
    }
}



        // Mostrar películas obtenidas por búsqueda
        async function getMovies(url) {
            try {
                const resp = await fetch(url + "&language=es-ES");
                if (!resp.ok) throw new Error("Failed to fetch movies.");
                const respData = await resp.json();
                showMovies(respData.results);
            } catch (error) {
                console.error(error);
            }
        }

        function showMovies(movies) {
            mainContent.innerHTML = movies.slice(0, 4) // Limitar a 4 películas para cada búsqueda
                .map(movie => `
                    <div class="col-xs-12 col-sm-6 col-md-4 col-lg-3 p-2">
                        <div class="movie-card" onclick="showMovieTrailer(${movie.id}, '${movie.title.replace(/'/g, "\\'")}', '${movie.overview.replace(/'/g, "\\'")}')">
                            <img class="img-fluid movie-img" src="${IMAGE_PATH + movie.poster_path}" alt="${movie.title}">
                            <div class="movie-description p-3">
                                <h3 class="movie-title">${movie.title}</h3>
                            </div>
                        </div>
                    </div>
                `).join('');
        }
    </script>


    <!-- Botón arriba -->
    <div id="goTopBtn" class="go-top-btn">↑</div>
    <style>
        /* Botón "Ir arriba" */
        .go-top-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 50px;
            height: 50px;
            background-color: #d10e00;
            /* Rojo */
            color: white;
            font-size: 20px;
            text-align: center;
            line-height: 50px;
            border-radius: 50%;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            transition: background-color 0.3s, transform 0.3s;
            display: none;
            /* Oculto inicialmente */
            z-index: 1000;
        }

        .go-top-btn:hover {
            background-color: #6d0000;
            /* Rojo oscuro al pasar el cursor */
            transform: scale(1.1);
            /* Ampliación ligera */
        }

        /* Mostrar el botón cuando el usuario ha hecho scroll */
        .show {
            display: block;
        }

        /* Responsivo */
        @media (max-width: 768px) {
            .go-top-btn {
                width: 40px;
                height: 40px;
                font-size: 16px;
                line-height: 40px;
                bottom: 15px;
                right: 25px;
            }
        }

        @media (max-width: 480px) {
            .go-top-btn {
                width: 35px;
                height: 35px;
                font-size: 14px;
                line-height: 35px;
                bottom: 10px;
                right: 20px;
            }
        }
    </style>
    <script>
        // Selección del botón
        const goTopBtn = document.getElementById('goTopBtn');

        // Mostrar el botón después de hacer scroll
        window.onscroll = function () {
            if (document.body.scrollTop > 200 || document.documentElement.scrollTop > 200) {
                goTopBtn.classList.add('show');
            } else {
                goTopBtn.classList.remove('show');
            }
        };

        // Hacer scroll hacia arriba al hacer clic
        goTopBtn.addEventListener('click', function () {
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Efecto de desplazamiento suave
            });
        });
    </script>
    <!-- Fin Botón arriba -->


    <!-- Footer -->
    <footer>
        <div class="footer-container">
            <!-- Columna 1: Información de Contacto -->
            <div class="footer-column" id="contact">
                <h4>Contacto</h4>
                <ul>
                    <li>
                        <a href="mailto:info@digitalnetlc.com">
                            <i class="fas fa-envelope"></i> info@digitalnetlc.com
                        </a>
                    </li>
                    <li>
                        <a href="https://wa.me/15852826352" target="_blank">
                            <i class="fab fa-whatsapp"></i> WhatsApp: +1 858 282 6352
                        </a>
                    </li>
                </ul>
            </div>


            <!-- Columna 2: Servicios -->
            <div class="footer-column">
                <h4>Servicios</h4>
                <ul>
                    <li>
                        <a href="#services">
                            <i class="fas fa-tv"></i> Cuentas de Streaming
                        </a>
                    </li>
                    <li>
                        <a href="#services">
                            <i class="fas fa-desktop"></i> Pantallas
                        </a>
                    </li>
                    <li>
                        <a href="#services">
                            <i class="fas fa-key"></i> Licencias de Software
                        </a>
                    </li>
                </ul>
            </div>

            <!-- Columna 3: Redes Sociales -->
            <div class="footer-column">
                <h4>Redes Sociales</h4>
                <ul class="social-media">
                    <li>
                        <a href="https://www.facebook.com/profile.php?id=61568578229017" target="_blank"
                            class="social-icon">
                            <i class="fab fa-facebook-f"></i>
                        </a>
                    </li>
                    <li>
                        <a href="https://www.instagram.com/digitalnetlc" target="_blank" class="social-icon">
                            <i class="fab fa-instagram"></i>
                        </a>
                    </li>
                    <li>
                        <a href="https://www.tiktok.com/@digitalnetlc" target="_blank" class="social-icon">
                            <i class="fab fa-tiktok"></i>
                        </a>
                    </li>
                </ul>
            </div>

            <!-- Columna 4: Información Legal -->
            <div class="footer-column">
                <h4>Información Legal</h4>
                <ul>
                    <li>
                        <a href="/terminos">
                            <i class="fas fa-file-contract"></i> Términos y Condiciones
                        </a>
                    </li>
                    <li>
                        <a href="/privacidad">
                            <i class="fas fa-shield-alt"></i> Política de Privacidad
                        </a>
                    </li>
                </ul>
            </div>
        </div>

        <!-- Copyright -->
        <div class="footer-bottom">
            <p>&copy; 2024 DIGITALNETLC. Todos los derechos reservados.</p>
            <p>Desarrollado por
                <a href="https://cactosmediaagency.com" target="_blank" class="cactos-link" style=" color: #A044FF;
    text-decoration: none;
    font-weight: bold;
    transition: color 0.3s ease;">Cactos Media Agency</a>
            </p>
        </div>
    </footer>

    <style>
        /* Footer General */
        footer {
            background-color: #222;
            color: #fff;
            padding: 20px;
            font-size: 14px;
        }

        .footer-container {
            display: flex;
            justify-content: space-between;
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 20px;
            flex-wrap: wrap;
        }

        .footer-column {
            width: 22%;
            margin-bottom: 20px;
        }

        .footer-column h4 {
            font-size: 16px;
            margin-bottom: 15px;
            font-weight: bold;
            color: #ff0000;
        }

        .footer-column ul {
            list-style: none;
            padding: 0;
        }

        .footer-column ul li {
            margin: 10px 0;
        }

        .footer-column ul li a {
            color: #fff;
            text-decoration: none;
            /* Elimina los subrayados */
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: color 0.3s ease;
        }

        .footer-column ul li a:hover {
            color: #ff0000;
        }

        .footer-bottom p {
            font-size: 14px;
            margin: 0;
        }

        /* Redes Sociales */
        .social-media {
            display: flex;
            gap: 10px;
            padding: 0;
            margin: 0;
        }

        .social-media li {
            list-style: none;
        }

        .social-media li a {
            width: 40px;
            height: 40px;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 18px;
            border-radius: 50%;
            background-color: #ff0000;
            color: #fff;
            transition: all 0.3s ease;
        }

        .social-media li a:hover {
            transform: translateY(-5px);
            background-color: #fff;
            color: #ff0000;
        }

        /* Copyright */
        .footer-bottom {
            text-align: center;
            padding: 20px 0;
            font-size: 12px;
        }

        .footer-bottom a {
            color: #ff0000;
            text-decoration: none;
            /* Elimina los subrayados */
            transition: color 0.3s ease;
        }

        .footer-bottom a:hover {
            color: #fff;
        }

        /* Responsividad */
        @media (max-width: 992px) {
            .footer-column {
                flex: 1 1 45%;
            }
        }

        @media (max-width: 768px) {
            .footer-column {
                flex: 1 1 100%;
                text-align: center;
            }

            .social-media {
                justify-content: center;
            }
        }
    </style>


    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js"></script>
    <!-- Font Awesome (Para los iconos) -->
    <script src="https://kit.fontawesome.com/a076d05399.js" crossorigin="anonymous"></script>
    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"></script>
    <script type="text/javascript" defer src="./wp-content/themes/digitalnetlc/frontend/assets/platform.js"
        id=""></script>
</body>

</html>