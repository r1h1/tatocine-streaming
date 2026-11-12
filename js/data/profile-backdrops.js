/**
 * TatoCine · js/data/profile-backdrops.js
 * Manifiesto de los 31 fondos del selector de perfiles (rutas `backdrop_path` de TMDB ya comprobadas, en el orden de
 * PROFILE_BACKDROP_FEATURED). Evita 31+ búsquedas a TMDB cada vez que se abre el selector: ahora no hay ninguna.
 * Imágenes: © sus titulares, servidas por TMDB (This product uses the TMDB API but is not endorsed or certified by TMDB).
 * Regenerar si cambia PROFILE_BACKDROP_FEATURED: resolver cada entrada con fetchProfileBackdropEntry() y pegar el resultado.
 */
var PROFILE_BACKDROP_MANIFEST = {
  v: 1, generated: "2026-11-12",
  items: [
    { label: "Stranger Things", type: "tv", backdrop_path: "/9P4IIMYY3HifqeruZq0ZZ9g7YUi.jpg" },
    { label: "Ratatouille", type: "movie", backdrop_path: "/zeoaHdXRDd5IoUiMVsNhwTZm78B.jpg" },
    { label: "Batman: El caballero de la noche", type: "movie", backdrop_path: "/cfT29Im5VDvjE0RpyKOSdCKZal7.jpg" },
    { label: "Yo, él y Raquel", type: "movie", backdrop_path: "/4sOeeDX9uBteu81ty2bcdbzU933.jpg" },
    { label: "Loki", type: "tv", backdrop_path: "/q3jHCb4dMfYF6ojikKuHd6LscxC.jpg" },
    { label: "Game of Thrones", type: "tv", backdrop_path: "/zZqpAXxVSBtxV9qPBcscfXBcL2w.jpg" },
    { label: "Pulp Fiction", type: "movie", backdrop_path: "/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg" },
    { label: "Star Wars: Episodio III", type: "movie", backdrop_path: "/5vDuLrjJXFS9PTF7Q1xzobmYKR9.jpg" },
    { label: "Naruto Shippuden", type: "tv", backdrop_path: "/z0YhJvomqedHF85bplUJEotkN5l.jpg" },
    { label: "Avengers: Doomsday", type: "movie", backdrop_path: "/rObL4of4eFA8yWaN9pRFo9aOVNi.jpg" },
    { label: "Spider-Man: Brand New Day", type: "movie", backdrop_path: "/subj7knTn4DeS6KS7qI66EQKe9i.jpg" },
    { label: "1917", type: "movie", backdrop_path: "/2lBOQK06tltt8SQaswgb8d657Mv.jpg" },
    { label: "El Padrino", type: "movie", backdrop_path: "/tSPT36ZKlP2WVHJLM4cQPLSzv3b.jpg" },
    { label: "Volver al futuro", type: "movie", backdrop_path: "/5bzPWQ2dFUl2aZKkp7ILJVVkRed.jpg" },
    { label: "American Psycho", type: "movie", backdrop_path: "/5oaMV2q0qzxkIW2ukU3lldLu5q2.jpg" },
    { label: "Spider-Man: A través del Spider-Verso", type: "movie", backdrop_path: "/kVd3a9YeLGkoeR50jGEXM6EqseS.jpg" },
    { label: "Dune: Parte uno", type: "movie", backdrop_path: "/qVgZu5BTx6pu4owCvVOm4zjTfOi.jpg" },
    { label: "Gravity Falls", type: "tv", backdrop_path: "/lhg7eA6CTOCL10QNVdKiyxkgPsL.jpg" },
    { label: "Coco", type: "movie", backdrop_path: "/g7CHF8gTLGooTbP4GznIGwaqAGL.jpg" },
    { label: "Toy Story", type: "movie", backdrop_path: "/8AqWECiUHnz1Crj69uB9vhiK9Le.jpg" },
    { label: "Lupin", type: "tv", backdrop_path: "/jgAZYiuRV37pCxmhx8NTdhE36RL.jpg" },
    { label: "Cars", type: "movie", backdrop_path: "/sd4xN5xi8tKRPrJOWwNiZEile7f.jpg" },
    { label: "El extraño mundo de Jack", type: "movie", backdrop_path: "/dSfrsjhqC6lYe7LYDYnzWeXZmEl.jpg" },
    { label: "Monster House", type: "movie", backdrop_path: "/aDnCTWpWMHcQxOeGWsITmoLuEGy.jpg" },
    { label: "Los Simpson", type: "tv", backdrop_path: "/jIArNHIekrCSVgdMbKPAXpPY03Y.jpg" },
    { label: "Rick y Morty", type: "tv", backdrop_path: "/iFOkrSrJRwE27PwbyQeYLlMJXzw.jpg" },
    { label: "WandaVision", type: "tv", backdrop_path: "/fSCb3lzRbHknuKD7apdH4RYJLkc.jpg" },
    { label: "Coraline", type: "movie", backdrop_path: "/hofnlIyF6bePkgQOpcuRWLvzf15.jpg" },
    { label: "Avengers: Endgame", type: "movie", backdrop_path: "/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg" },
    { label: "Avengers: Infinity War", type: "movie", backdrop_path: "/mDfJG3LC3Dqb67AZ52x3Z0jU0uB.jpg" },
    { label: "Iron Man", type: "movie", backdrop_path: "/cKvDv2LpwVEqbdXWoQl4XgGN6le.jpg" }
  ]
};
