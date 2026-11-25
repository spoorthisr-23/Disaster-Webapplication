# Wasmer Edge Deployment & Fullstack Sync Rules

## 1. Wasmer Package & Registry Rules
- **Immutable Package Versions**: Wasmer package registry strictly rejects re-publishing existing versions (`GraphQL API failure: version already exists`). CI/CD pipelines must auto-increment the patch version in `wasmer.toml` on every release (e.g. `0.1.$(( github.run_number + 10 ))`).
- **Headless Deployments**: Always execute `wasmer deploy --non-interactive --no-wait` in CI/CD and non-interactive scripts to prevent interactive terminal hangs.
- **Root Manifest Binding**: When linking an existing Wasmer app, bind the exact registered `app_id` and `name` directly into the project's root `app.yaml` instead of creating nested subprojects.
- **Directory Invariant**: The Wasmer package and PHP runtime live at the repository root (`wasmer.toml`, `composer.json`, `app.yaml`). CI/CD runs directly from the repository root.

## 2. Fullstack Frontend Build & Sync
- **React Source vs Public Assets**: The React frontend source lives in `resources/` (`resources/index.html`, `resources/js/`, `resources/css/`), while Laravel and Wasmer serve static assets from `public/`.
- **Build Trigger**: Whenever modifying UI components in `resources/js/`, run from the repository root:
  ```powershell
  npm run build
  ```
- Vite cleans obsolete asset hashes from `public/assets` upon rebuilding and outputs `public/index.html` + `public/assets/*` without overwriting `public/index.php`.

## 3. Remote Cloud Database Synchronization (TiDB)
- **Container Statelesness**: Wasmer Edge containers run statelessly and cannot execute interactive shell commands on demand.
- **Post-Deploy Migration Route**: Maintain a secure/protected route `/migrate-setup` in `routes/web.php` that executes `Artisan::call('migrate:fresh --seed --force')` on the live TiDB database to synchronize schema updates immediately post-deployment.

## 4. Multi-Tenant Role Boundaries
- **Citizens**: Public SOS submission and tracking by request code (`REQ-XXXXXXXX`) without account registration.
- **Volunteers**: Field responders strictly operating via the offline-capable **Android Kotlin App** via REST APIs.
- **Admins & Organizations**: Authorized coordinators operating via the Web Command Portal (`/login`) with scoped asset management (`/api/my-shelters`, `/api/my-resources`).
