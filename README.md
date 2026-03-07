## UMIS Authentication

This project now includes a complete authentication foundation for the UMIS system:

- Protected home page at `/`
- Faculty and Student self-registration at `/register`
- Login at `/login`
- Forgot password and reset password flows
- Email verification and resend verification
- `bcryptjs` password hashing
- `jose` signed HTTP-only session cookies
- `Resend` email delivery for verification and recovery
- MongoDB-backed user persistence using the existing unified user model

## Environment variables

Create `.env.local` from `.env.example` and configure:

- `MONGODB_URI`
- `AUTH_SECRET`
- `APP_URL`
- `NEXT_PUBLIC_APP_URL`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

If `RESEND_API_KEY` is omitted during local development, auth emails are logged to the server console as preview links.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Anonymous users are redirected to `/login`.

## Core routes

- `/` protected UMIS dashboard
- `/login` sign in
- `/register` faculty/student registration
- `/forgot-password` request reset email
- `/reset-password?token=...` set a new password
- `/verify-email?token=...` verify account email

## API routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/resend-verification`
