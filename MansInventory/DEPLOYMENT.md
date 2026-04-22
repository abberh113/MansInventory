# 🚀 Mans POS Backend Deployment Guide

This project is configured as a **Monorepo**. To deploy the backend to Google Cloud Run without using the manual console, follow these steps.

## Method 1: Automatic Deployment (Recommended)
You have a `cloudbuild.yaml` file in your root directory. This automates the build and deployment every time you push to GitHub (via Google Cloud Build Triggers).

1.  **Commit and Push your changes**:
    ```bash
    git add .
    git commit -m "Update: Added new feature"
    git push origin main
    ```
2.  **Wait for the Build**:
    Google Cloud Build will automatically:
    *   Find the `backend/` folder.
    *   Build the Docker image.
    *   Push it to your registry.
    *   Deploy the `manspos` service in `europe-west1`.

---

## Method 2: Manual Deployment via CLI
If you have the [Google Cloud SDK (gcloud)](https://cloud.google.com/sdk/docs/install) installed, you can trigger a build manually from your terminal.

1.  **Initialize the Build**:
    Run this command from the **root** of the `MansInventory` folder:
    ```bash
    gcloud builds submit --config cloudbuild.yaml .
    ```

---

## 🛠 Required Configuration (One-Time Setup)
Make sure your environment variables are set in Cloud Run using this CLI command:

```bash
gcloud run services update manspos \
  --set-env-vars DATABASE_URL="postgresql+asyncpg://postgres.mbqmkeetmvwjodmkgmoz:MansInventory113%24@aws-1-eu-west-2.pooler.supabase.com:6543/postgres",SECRET_KEY="mans-luxury-super-secret-key-2024",ALGORITHM="HS256" \
  --region europe-west1
```

---

## 📡 Monitoring Logs
To check your logs directly from your terminal:
```bash
gcloud beta run services logs tail manspos --region europe-west1
```

---

**Success!** Your system is now set up for a professional, code-driven deployment workflow.
