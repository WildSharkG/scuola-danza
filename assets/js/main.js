/*
 * Vanilla JS, nessuna dipendenza esterna. Riscrittura "logica" delle
 * interazioni del design di riferimento (che usava React):
 *  - toggle del menu mobile
 *  - header che diventa opaco allo scroll
 *  - parallax leggero sull'immagine dell'hero
 *  - fade-in delle sezioni allo scroll (IntersectionObserver)
 *  - contatori animati in "Chi siamo"
 *  - mappa "click-to-load" (niente richieste a Google finché non richiesto)
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

  /* ---------- Parallax leggero sull'hero ---------- */
  var heroBg = document.getElementById("hero-bg");
  function aggiornaParallax() {
    if (!heroBg) return;
    var offset = Math.min(window.scrollY * 0.3, 140);
    heroBg.style.transform = "translateY(" + offset * -1 + "px)";
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

  /* ---------- Mappa "click-to-load" ---------- */
  document.querySelectorAll("[data-mappa-src]").forEach(function (bottone) {
    bottone.addEventListener("click", function () {
      var src = bottone.getAttribute("data-mappa-src");
      if (!src) return;
      var iframe = document.createElement("iframe");
      iframe.src = src;
      iframe.loading = "lazy";
      iframe.referrerPolicy = "no-referrer-when-downgrade";
      iframe.setAttribute("title", "Mappa della sede");
      bottone.replaceWith(iframe);
    });
  });
})();
