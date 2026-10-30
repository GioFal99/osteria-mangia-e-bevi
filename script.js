/* Osteria Mangia e Bevi — public website */
(() => {
  "use strict";

  const menuToggle = document.getElementById("menu-toggle");
  const mainNav = document.getElementById("main-nav");
  const year = document.getElementById("current-year");

  if (year) year.textContent = String(new Date().getFullYear());

  if (menuToggle && mainNav) {
    const closeMenu = () => {
      mainNav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
      menuToggle.setAttribute("aria-label", "Menü öffnen");
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = mainNav.classList.toggle("is-open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute("aria-label", isOpen ? "Menü schließen" : "Menü öffnen");
    });

    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });
  }

  const gallery = document.getElementById("gallery-grid");
  const status = document.getElementById("gallery-status");
  const lightbox = document.getElementById("gallery-lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxClose = document.getElementById("lightbox-close");
  const imagesApi = "https://api.github.com/repos/giofal99/osteria-mangia-e-bevi/contents/images?ref=main";
  const imageExtensions = /\.(jpe?g|png|webp|gif|avif|bmp)$/i;

  function closeLightbox() {
    if (!lightbox || !lightboxImage) return;
    lightbox.classList.remove("is-open");
    lightboxImage.removeAttribute("src");
    lightboxImage.alt = "";
  }

  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightbox) {
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeLightbox();
  });

  function openLightbox(src, alt) {
    if (!lightbox || !lightboxImage) return;
    lightboxImage.src = src;
    lightboxImage.alt = alt;
    lightbox.classList.add("is-open");
  }

  function showImage(src, name) {
    const figure = document.createElement("figure");
    figure.className = "gallery-item";
    const img = document.createElement("img");
    img.src = src;
    img.alt = name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("click", () => openLightbox(img.currentSrc || img.src, img.alt));
    img.addEventListener("error", () => figure.remove(), { once: true });
    figure.appendChild(img);
    gallery.appendChild(figure);
  }

  async function loadGallery() {
    if (!gallery) return;
    try {
      const response = await fetch(imagesApi, {
        cache: "no-store",
        headers: { Accept: "application/vnd.github+json" }
      });
      if (!response.ok) {
        if (response.status === 403 || response.status === 429) {
          throw new Error("GitHub begrenzt gerade die Galerie-Abfragen. Bitte später erneut laden.");
        }
        throw new Error(`Galerie konnte nicht geladen werden (HTTP ${response.status}).`);
      }
      const files = await response.json();
      if (!Array.isArray(files)) throw new Error("Die Bildliste hat ein unerwartetes Format.");

      const images = files
        .filter((file) => file && file.type === "file" && imageExtensions.test(file.name || ""))
        .sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true, sensitivity: "base" }));

      gallery.replaceChildren();
      if (images.length === 0) {
        if (status) {
          status.textContent = "Zurzeit sind keine Fotos vorhanden.";
          gallery.appendChild(status);
        }
        return;
      }
      images.forEach((file) => {
        const src = file.download_url || `images/${encodeURIComponent(file.name)}`;
        showImage(src, file.name);
      });
    } catch (error) {
      console.error("Fehler beim Laden der Galerie:", error);
      gallery.replaceChildren();
      if (status) {
        status.textContent = error instanceof Error
          ? error.message
          : "Die Galerie konnte nicht geladen werden. Bitte später erneut versuchen.";
        gallery.appendChild(status);
      }
    }
  }

  loadGallery();
})();
