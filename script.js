/* =========================================================
   TypeZen — Homepage Script (v1)
   Handles: navbar scroll state, mobile menu, scroll-reveal
   animations, a decorative self-typing hero demo, and the
   "Start Typing" buttons (real <button> elements, navigated
   to typing.html via JS click handlers).
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initNavbarScrollState();
  initMobileNav();
  initScrollReveal();
  initHeroDemoTyping();
  initStartButtons();
});

/**
 * Adds a background/blur treatment to the navbar once the
 * page has scrolled past the hero a little, so it stays
 * legible over any content beneath it.
 */
function initNavbarScrollState() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  const toggleScrolledClass = () => {
    navbar.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  toggleScrolledClass();
  window.addEventListener("scroll", toggleScrolledClass, { passive: true });
}

/**
 * Wires up the hamburger button to open/close the mobile
 * nav dropdown, and closes it again whenever a link inside
 * it is tapped.
 */
function initMobileNav() {
  const toggle = document.getElementById("navToggle");
  const mobileNav = document.getElementById("navMobile");
  if (!toggle || !mobileNav) return;

  const closeMenu = () => {
    toggle.setAttribute("aria-expanded", "false");
    mobileNav.classList.remove("is-open");
  };

  const openMenu = () => {
    toggle.setAttribute("aria-expanded", "true");
    mobileNav.classList.add("is-open");
  };

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    isOpen ? closeMenu() : openMenu();
  });

  mobileNav.querySelectorAll(".nav-mobile__item").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });
}

/**
 * Fades + slides elements marked with the `.reveal` class
 * into place the first time they enter the viewport.
 */
function initScrollReveal() {
  const revealEls = document.querySelectorAll(".reveal");
  if (!revealEls.length) return;

  // Fallback for browsers without IntersectionObserver support.
  if (!("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          // Small stagger for elements that reveal together.
          setTimeout(() => {
            entry.target.classList.add("is-visible");
          }, index * 60);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
  );

  revealEls.forEach((el) => observer.observe(el));
}

/**
 * Purely decorative: loops through a few sample phrases and
 * "types" them out character by character in the hero, to
 * hint at the product without being a real typing test.
 */
function initHeroDemoTyping() {
  const target = document.getElementById("demoText");
  if (!target) return;

  const phrases = [
    "the quick brown fox jumps over the lazy dog",
    "practice makes precision, not just speed",
    "every keystroke counts toward your best run",
    "type with rhythm, not just with haste",
  ];

  const TYPE_SPEED_MS = 45;
  const DELETE_SPEED_MS = 28;
  const PAUSE_AFTER_TYPE_MS = 1400;
  const PAUSE_AFTER_DELETE_MS = 300;

  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  // Respect users who prefer reduced motion: show a static phrase.
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  if (prefersReducedMotion) {
    target.textContent = phrases[0];
    return;
  }

  function tick() {
    const currentPhrase = phrases[phraseIndex];

    if (!isDeleting) {
      charIndex++;
      target.textContent = currentPhrase.slice(0, charIndex);

      if (charIndex === currentPhrase.length) {
        isDeleting = true;
        setTimeout(tick, PAUSE_AFTER_TYPE_MS);
        return;
      }
      setTimeout(tick, TYPE_SPEED_MS);
    } else {
      charIndex--;
      target.textContent = currentPhrase.slice(0, charIndex);

      if (charIndex === 0) {
        isDeleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
        setTimeout(tick, PAUSE_AFTER_DELETE_MS);
        return;
      }
      setTimeout(tick, DELETE_SPEED_MS);
    }
  }

  tick();
}


/**
 * Sends the user to the typing test page when any
 * "Start Typing" button is clicked. Kept as real <button>
 * elements (not <a> tags) and navigated via JS, per request.
 */
function initStartButtons() {
  const startButtons = [
    document.getElementById("navStartBtn"),
    document.getElementById("heroStartBtn"),
    document.getElementById("ctaStartBtn"),
  ].filter(Boolean);

  startButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      window.location.href = "typing.html";
    });
  });
}
