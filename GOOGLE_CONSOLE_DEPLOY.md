# 🖱 Google Cloud Console Deployment Guide

If you prefer to use the **Google Cloud Console website** instead of the command line, follow these exact steps to deploy your backend.

---

### Step 1: Navigate to Cloud Run
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. In the Search bar at the top, type **"Cloud Run"** and click on it.
3. Click on your service name: **`manspos`**.

### Step 2: Edit & Deploy New Revision
1. Click the button at the top: **"Edit & Deploy New Revision"**.
2. Scroll down to the **"Continuous Deployment"** section.
3. Click **"Setup with Cloud Build"** (or "Edit" if you've already linked GitHub).

### Step 3: Configure the Build (Monorepo Fix)
This is the most important part for your project:
1. **Source Repository**: Select your GitHub repository (`MansInventory`).
2. **Branch**: Enter **`main`**.
3. **Build Configuration**:
   *   Select **"Cloud Build Configuration File (yaml/json)"**.
   *   **Location**: It should be already set to `/cloudbuild.yaml` (since I created this for you in the root).
4. Click **"Save"**.

### Step 4: Configure Environment Variables
Before you click Deploy, your backend needs to know about your database:
1. Click on the **"Variables & Secrets"** tab.
2. Click **"Add Variable"** and enter:
   *   **Name**: `DATABASE_URL`
   *   **Value**: `postgresql+asyncpg://postgres.mbqmkeetmvwjodmkgmoz:MansInventory113%24@aws-1-eu-west-2.pooler.supabase.com:6543/postgres`
3. Add these as well (optional but recommended):
   *   **Name**: `SECRET_KEY` | **Value**: `Any-secret-string-of-your-choice`
   *   **Name**: `ALGORITHM` | **Value**: `HS256`

### Step 5: Finalize and Deploy
1. Click **"Deploy"** at the bottom of the page.
2. You will see a progress bar. Once it turns green, your backend is live!

---

### 📡 How to monitor progress
If your build fails, you can see why by clicking:
1. **Cloud Build** in the left menu.
2. **History**.
3. Click on the latest build to see the logs.

---

**Success!** Following these steps will keep your backend perfectly synced with your code and your Supabase database.
