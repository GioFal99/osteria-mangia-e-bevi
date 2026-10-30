# API contract for the Raspberry Pi photo manager

The files `admin.html` and `admin.js` are only the browser interface. They do **not** authenticate users or write files by themselves. They expect a same-origin server API under `./api`. Until that backend exists, the page intentionally reports that the administration server is unavailable.

## Required endpoints

- `GET /api/session` — return `{ "authenticated": true|false, "csrfToken": "..." }`.
- `POST /api/login` — JSON `{ "username": "...", "password": "..." }`; on success set a server-managed session cookie and return `{ "authenticated": true, "csrfToken": "..." }`.
- `POST /api/logout` — invalidate the server session and its cookie.
- `GET /api/photos` — return `{ "photos": [{ "name": "...", "url": "..." }] }`.
- `POST /api/upload` — multipart/form-data with repeated `photos` fields; maximum 9 images per request.
- `DELETE /api/photos/{filename}` — delete one image from the gallery.

For all state-changing requests after login, validate the `X-CSRF-Token` header and the authenticated server session.

## Security requirements for the backend

1. Store the username/password verifier on the Pi, never in this repository or in JavaScript. Store a strong password hash, not a plaintext password.
2. Use HTTPS for the external website and set session cookies `HttpOnly`, `Secure`, and `SameSite=Strict` (or a justified equivalent). Rotate session IDs on login and expire sessions.
3. Rate-limit login attempts and return generic authentication errors.
4. Accept only JPEG, PNG, and WebP after checking file content/signature, not just the browser-provided MIME type or filename. Limit each file size and total request size.
5. Generate safe server-side filenames; never use a user-provided path. Store uploads only in the dedicated gallery directory, never an executable/web-script directory.
6. Enforce the maximum of 9 files on the server. Handle duplicate names safely and validate deletions against the gallery directory.
7. Add CSRF protection, strict same-origin checks, and authorization checks to upload and delete endpoints.
8. Keep backups of the image directory and server configuration. Log security events without logging passwords or session secrets.

## Deployment note

GitHub Pages is static hosting and cannot implement these server endpoints. The front end may be reviewed on GitHub, but login/upload/delete will work only after the secure API is implemented and served from the Raspberry Pi (or another trusted server) on the same origin. Do not enter real credentials while the site is hosted only on GitHub Pages.
