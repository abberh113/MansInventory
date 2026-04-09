# 🚀 Modern Deployment Guide: Vercel + Netlify + Supabase

This guide explains how to deploy the Mans Inventory system using the new stack.

## 1. Backend (Vercel)
Vercel will host your FastAPI backend.

### Setup Steps:
1.  Go to [Vercel](https://vercel.com/) and click **"Add New" -> "Project"**.
2.  Import your GitHub repository.
3.  **ROOT DIRECTORY**: Set this to **`backend`**.
4.  **FRAMEWORK PRESET**: Select **"Other"**.
5.  **Environment Variables**: Add all keys from your `backend/.env` file:
    *   `DATABASE_URL`
    *   `SECRET_KEY`
    *   `ALGORITHM`
    *   `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAILS_FROM_EMAIL` (for email functionality)
6.  Click **Deploy**.

---

## 2. Frontend (Netlify)
Netlify will host your Vite/React frontend.

### Setup Steps:
1.  Go to [Netlify](https://app.netlify.com/) and click **"Add new site" -> "Import an existing project"**.
2.  Connect your GitHub repository.
3.  **BASE DIRECTORY**: Set this to **`frontend`**.
4.  **BUILD COMMAND**: `npm run build`
5.  **PUBLISH DIRECTORY**: `dist`
6.  **Environment Variables**:
    *   `VITE_API_URL`: Set this to your **Vercel Backend URL** (e.g., `https://your-backend.vercel.app`).
7.  Click **Deploy site**.

---

## 3. Database (Supabase)
Your database is already on Supabase. Ensure your `DATABASE_URL` in Vercel settings is current.

---

## 🛠 Summary of Changes
- Created `backend/vercel.json` for Vercel Python deployment.
- Created `frontend/netlify.toml` for Netlify build and routing.
- Deployment strategies updated from Google Cloud Run to Vercel/Netlify.
