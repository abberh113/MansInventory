# Deployment Guide: Mans Luxury Empire

This guide outlines the steps to deploy the application with the optimized backend and fixed cart system.

## 1. Database: Supabase (Postgres)
- Create a new project in [Supabase](https://supabase.com/).
- Go to **Project Settings** > **Database**.
- Copy the **Connection String** (use the **Transaction Pooler** URL, usually on port 6543).
- **IMPORTANT**: Ensure the string starts with `postgresql+asyncpg://` instead of `postgresql://` or `postgres://` to work with the backend's async driver.
- Use your password: `MansInventory113$` (e.g., `postgresql+asyncpg://postgres:MansInventory113$@[PROJECT_REF].pooler.supabase.com:6543/postgres`).
- Toggle off `sslmode=disable` if using the pooler, or follow Supabase guides for SSL.

## 2. Backend: Google Cloud Run
The backend is dockerized and ready for Cloud Run.
- Install [Google Cloud CLI](https://cloud.google.com/sdk/docs/install).
- Build and push the image:
  ```bash
  cd backend
  gcloud builds submit --tag gcr.io/[PROJECT_ID]/mans-inventory-api
  ```
- Deploy to Cloud Run:
  ```bash
  gcloud run deploy mans-inventory-api \
    --image gcr.io/[PROJECT_ID]/mans-inventory-api \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars "DATABASE_URL=[YOUR_SUPABASE_URL],SECRET_KEY=[RANDOM_STRING]"
  ```
- Copy the **Service URL** (e.g., `https://api-xxx-uc.a.run.app`).

## 3. Frontend: Netlify
- Create a `frontend/.env` file with:
  ```
  VITE_API_URL=https://[YOUR_BACKEND_SERVICE_URL]
  ```
- Connect your GitHub repository to [Netlify](https://www.netlify.com/).
- Set the **Build Command**: `npm run build`
- Set the **Publish Directory**: `dist`
- Add the `VITE_API_URL` to Netlify's **Environment Variables**.
- Deployment will handle the `_redirects` file automatically for React Router.

## 4. Final Verification
- Add your Netlify URL (e.g., `https://mansluxury.netlify.app`) to the `BACKEND_CORS_ORIGINS` in your environment variables on Cloud Run.
- The cart should now be fixed at the top, and product loading will be significantly faster due to the new backend optimizations (pagination and item pre-fetching).
