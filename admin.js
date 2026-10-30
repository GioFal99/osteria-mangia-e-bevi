/* Owner photo manager frontend.
   Server-side authentication and validation are mandatory; see BACKEND-API.md. */
(() => {
  "use strict";
  const API = "./api";
  const status = document.getElementById("admin-status");
  const loginPanel = document.getElementById("login-panel");
  const photosPanel = document.getElementById("photos-panel");
  const unavailablePanel = document.getElementById("unavailable-panel");
  const loginForm = document.getElementById("login-form");
  const uploadForm = document.getElementById("upload-form");
  const photoFiles = document.getElementById("photo-files");
  const selectionInfo = document.getElementById("selection-info");
  const uploadButton = document.getElementById("upload-button");
  const logoutButton = document.getElementById("logout-button");
  const photoGrid = document.getElementById("photo-grid");
  let csrfToken = "";

  function showStatus(message, type = "") {
    if (!status) return;
    status.textContent = message;
    status.className = `admin-status${type ? ` ${type}` : ""}`;
  }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (csrfToken && options.method && options.method !== "GET") {
      headers.set("X-CSRF-Token", csrfToken);
    }
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers,
      credentials: "same-origin",
      cache: "no-store"
    });
    let payload = {};
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      payload = await response.json();
    }
    if (!response.ok) {
      const message = payload && typeof payload.error === "string"
        ? payload.error
        : `Serverantwort ${response.status}`;
      throw new Error(message);
    }
    return payload;
  }

  function setAuthenticated(authenticated) {
    loginPanel.hidden = authenticated;
    photosPanel.hidden = !authenticated;
    unavailablePanel.hidden = true;
  }

  function renderPhotos(photos) {
    photoGrid.replaceChildren();
    if (!Array.isArray(photos) || photos.length === 0) {
      const empty = document.createElement("p");
      empty.className = "admin-hint";
      empty.textContent = "Noch keine Fotos in der Galerie.";
      photoGrid.appendChild(empty);
      return;
    }
    photos.forEach((photo) => {
      if (!photo || typeof photo.name !== "string" || typeof photo.url !== "string") return;
      const card = document.createElement("article");
      card.className = "admin-photo";
      const image = document.createElement("img");
      image.src = photo.url;
      image.alt = photo.name;
      image.loading = "lazy";
      const name = document.createElement("p");
      name.className = "admin-photo-name";
      name.textContent = photo.name;
      const remove = document.createElement("button");
      remove.className = "admin-button admin-danger";
      remove.type = "button";
      remove.textContent = "Foto löschen";
      remove.addEventListener("click", async () => {
        if (!window.confirm(`Soll „${photo.name}“ wirklich gelöscht werden?`)) return;
        remove.disabled = true;
        try {
          await request(`/photos/${encodeURIComponent(photo.name)}`, { method: "DELETE" });
          showStatus("Foto wurde gelöscht.", "success");
          await loadPhotos();
        } catch (error) {
          showStatus(error.message || "Foto konnte nicht gelöscht werden.", "error");
          remove.disabled = false;
        }
      });
      card.append(image, name, remove);
      photoGrid.appendChild(card);
    });
  }

  async function loadPhotos() {
    const data = await request("/photos");
    renderPhotos(data.photos);
  }

  async function checkSession() {
    try {
      const data = await request("/session");
      csrfToken = typeof data.csrfToken === "string" ? data.csrfToken : "";
      if (data.authenticated === true) {
        setAuthenticated(true);
        showStatus("Angemeldet. Die Galerie kann verwaltet werden.", "success");
        await loadPhotos();
      } else {
        setAuthenticated(false);
        showStatus("Bitte mit Ihrem Inhaberzugang anmelden.");
      }
    } catch (error) {
      loginPanel.hidden = true;
      photosPanel.hidden = true;
      unavailablePanel.hidden = false;
      showStatus("Der Verwaltungsserver ist noch nicht erreichbar. Die Funktionen werden erst nach Einrichtung des Raspberry-Pi-Backends aktiviert.", "error");
    }
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = loginForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const formData = new FormData(loginForm);
      const data = await request("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: formData.get("username"), password: formData.get("password") })
      });
      csrfToken = typeof data.csrfToken === "string" ? data.csrfToken : "";
      loginForm.reset();
      setAuthenticated(true);
      showStatus("Anmeldung erfolgreich.", "success");
      await loadPhotos();
    } catch (error) {
      showStatus(error.message || "Anmeldung fehlgeschlagen.", "error");
    } finally {
      submit.disabled = false;
    }
  });

  photoFiles.addEventListener("change", () => {
    const files = Array.from(photoFiles.files || []);
    const valid = files.filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
    if (files.length > 9) {
      selectionInfo.textContent = "Bitte höchstens 9 Fotos gleichzeitig auswählen.";
      selectionInfo.className = "admin-hint";
      uploadButton.disabled = true;
    } else if (valid.length !== files.length) {
      selectionInfo.textContent = "Bitte nur JPG-, PNG- oder WebP-Bilder auswählen.";
      uploadButton.disabled = true;
    } else {
      selectionInfo.textContent = `${files.length} Foto(s) ausgewählt.`;
      uploadButton.disabled = files.length === 0;
    }
  });

  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const files = Array.from(photoFiles.files || []);
    if (files.length < 1 || files.length > 9) {
      showStatus("Bitte zwischen 1 und 9 Fotos auswählen.", "error");
      return;
    }
    if (files.some((file) => !["image/jpeg", "image/png", "image/webp"].includes(file.type))) {
      showStatus("Es sind nur JPG-, PNG- und WebP-Dateien erlaubt.", "error");
      return;
    }
    uploadButton.disabled = true;
    const body = new FormData();
    files.forEach((file) => body.append("photos", file, file.name));
    try {
      const data = await request("/upload", { method: "POST", body });
      showStatus(typeof data.message === "string" ? data.message : "Upload abgeschlossen.", "success");
      uploadForm.reset();
      selectionInfo.textContent = "Erlaubt: JPG, PNG und WebP. Die Servergröße wird zusätzlich geprüft.";
      await loadPhotos();
    } catch (error) {
      showStatus(error.message || "Upload fehlgeschlagen.", "error");
    } finally {
      uploadButton.disabled = false;
    }
  });

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      await request("/logout", { method: "POST" });
      csrfToken = "";
      setAuthenticated(false);
      photoGrid.replaceChildren();
      showStatus("Du wurdest abgemeldet.", "success");
    } catch (error) {
      showStatus(error.message || "Abmeldung fehlgeschlagen.", "error");
    } finally {
      logoutButton.disabled = false;
    }
  });

  checkSession();
})();
