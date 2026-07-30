## UMIS Authentication

This project now includes a complete authentication foundation for the UMIS system:

- Protected home page at `/`
- Admin bootstrap at `/admin/setup`
- Admin login at `/admin/login`
- Production-style admin console at `/admin`
- Admin master-data management for universities, colleges, departments, and other enum-style values
- Admin user management and system notice publishing
- Faculty and Student self-registration at `/register`
- Login at `/login`
- Forgot password and reset password flows
- Email verification and resend verification
- `bcryptjs` password hashing
- `jose` signed HTTP-only session cookies
- `Resend` email delivery for verification and recovery
- MongoDB-backed user persistence using the existing unified user model

## Environment variables

Create `.env.local` from `.env.example` and configure the variables documented
there. On start-up the server validates them and **fails fast** with an
aggregated report of anything missing or malformed (see
[`docs/20_Foundational_Hardening.md`](docs/20_Foundational_Hardening.md) §3).

**Always required:** `MONGODB_URI`, `AUTH_SECRET` (≥32 chars).

**Required in production** (optional in development): `ADMIN_BOOTSTRAP_SECRET`,
`RESEND_API_KEY`, and the Cloudflare R2 group — `CLOUDFLARE_ACCOUNT_ID`,
`CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`,
`CLOUDFLARE_R2_BUCKET_NAME`, `CLOUDFLARE_R2_PUBLIC_URL`,
`NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL`.

**Optional:** `APP_URL`, `NEXT_PUBLIC_APP_URL`, `RESEND_FROM_EMAIL`, `LOG_LEVEL`.

If `RESEND_API_KEY` is omitted during local development, auth emails are logged
to the server console as preview links. To bypass validation for a build/CI step
without full secrets, set `SKIP_ENV_VALIDATION=1` (never in production).

## Migration

After pulling the schema rename from `collegeName/schoolName` to `universityName/collegeName`, run:

```bash
npm run migrate:institution-terminology
```

This migrates existing MongoDB documents for users, organizations, master data, and the module collections that previously stored `schoolName`.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Anonymous users are redirected to `/login`.

## Core routes

- `/` protected UMIS dashboard
- `/admin` admin dashboard
- `/admin/login` admin login
- `/admin/setup` initialize the first admin
- `/admin/master-data` institutional enum and master-data management
- `/admin/users` user access management
- `/admin/system` notices, news, and dashboard messages
- `/login` sign in
- `/register` faculty/student registration
- `/forgot-password` request reset email
- `/reset-password?token=...` set a new password
- `/verify-email?token=...` verify account email

## API routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/admin-login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/resend-verification`
- `POST /api/admin/bootstrap` (requires `x-admin-bootstrap-secret` in production)
- `GET/POST /api/admin/master-data`
- `PATCH /api/admin/master-data/[id]`
- `GET /api/admin/users`
- `PATCH /api/admin/users/[id]`
- `GET/POST /api/admin/system-updates`
- `PATCH /api/admin/system-updates/[id]`
