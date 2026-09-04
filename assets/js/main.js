/*
 * Vanilla JS, nessuna dipendenza esterna. Riscrittura "logica" delle
 * interazioni del design di riferimento (che usava React):
 *  - toggle del menu mobile
 *  - header che diventa opaco allo scroll
 *  - parallax leggero sull'immagine dell'hero
 *  - fade-in delle sezioni allo scroll (IntersectionObserver)
 *  - contatori animati in "Chi siamo"
 */
(function () {
  "use strict";

  /* ---------- Header: stato "scrolled" ---------- */
  var header = document.getElementById("site-header");
  function aggiornaHeader() {
    if (!header) return;
    if (window.scrollY > 40) {
      header.classList.add("is-scrolled");
    } else {
      header.classList.remove("is-scrolled");
    }
  }

  /* ---------- Parallax leggero sull'hero (orizzontale) ---------- */
  var heroBg = document.getElementById("hero-bg");
  function aggiornaParallax() {
    if (!heroBg) return;
    // Il CSS applica "scale(1.2)" DOPO che il ritaglio (object-fit: cover)
    // è già stato calcolato sulla dimensione originale (100% x 780px) — così
    // il ritaglio resta identico all'originale, e lo zoom crea solo il
    // margine per lo scorrimento (10% per lato, essendo lo zoom del 20%).
    // "translateX" va scritto PRIMA di "scale" nella stringa: così viene
    // applicato per ultimo, in px reali non moltiplicati dallo zoom, e il
    // calcolo del limite (proporzionale a offsetWidth, la larghezza a
    // schermo prima del transform) resta corretto a qualunque risoluzione.
    // NOTA: se si aumenta ulteriormente lo spostamento (0.07) o la velocità
    // (0.4) qui sotto, va aumentato anche lo scale() in CSS in proporzione
    // (margine disponibile = (scale-1)/2 per lato), altrimenti si rischia
    // di scoprire il bordo della foto durante lo scroll.
    var maxOffsetX = heroBg.offsetWidth * 0.07; // < 10% di margine: sicurezza
    var offsetX = Math.min(window.scrollY * 0.4, maxOffsetX);
    // scroll giù -> foto a sinistra; scroll su -> torna verso destra
    heroBg.style.transform = "translateX(" + (offsetX * -1) + "px) scale(1.2)";
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      aggiornaHeader();
      aggiornaParallax();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  aggiornaHeader();
  aggiornaParallax();

  /* ---------- Menu mobile ---------- */
  var navToggle = document.getElementById("nav-toggle");
  var navMobile = document.getElementById("nav-mobile");

  function chiudiMenu() {
    if (!navToggle || !navMobile) return;
    navToggle.classList.remove("is-open");
    navMobile.classList.remove("is-open");
    navToggle.setAttribute("aria-expanded", "false");
  }

  if (navToggle && navMobile) {
    navToggle.addEventListener("click", function () {
      var aperto = navMobile.classList.toggle("is-open");
      navToggle.classList.toggle("is-open", aperto);
      navToggle.setAttribute("aria-expanded", aperto ? "true" : "false");
    });

    navMobile.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", chiudiMenu);
    });
  }

  /* ---------- Fade-in allo scroll (data-reveal) ---------- */
  var elementiReveal = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && elementiReveal.length) {
    var revealObserver = new IntersectionObserver(
      function (entries, observer) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    elementiReveal.forEach(function (el) {
      revealObserver.observe(el);
    });
  } else {
    // Nessun IntersectionObserver disponibile: mostra tutto subito.
    elementiReveal.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }

  /* ---------- Contatori animati ("Chi siamo") ---------- */
  var contatoriRow = document.querySelector("[data-counters]");
  if (contatoriRow) {
    function animaContatori() {
      var numeri = contatoriRow.querySelectorAll("[data-count-target]");
      var durata = 1200;
      var inizio = null;

      function step(timestamp) {
        if (inizio === null) inizio = timestamp;
        var t = Math.min(1, (timestamp - inizio) / durata);
        var ease = 1 - Math.pow(1 - t, 3); // easeOutCubic

        numeri.forEach(function (el) {
          var target = parseInt(el.getAttribute("data-count-target"), 10) || 0;
          var suffisso = el.getAttribute("data-count-suffix") || "";
          el.textContent = Math.round(target * ease) + suffisso;
        });

        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if ("IntersectionObserver" in window) {
      var counterObserver = new IntersectionObserver(
        function (entries, observer) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              animaContatori();
              observer.disconnect();
            }
          });
        },
        { threshold: 0.4 }
      );
      counterObserver.observe(contatoriRow);
    } else {
      animaContatori();
    }
  }

})();
