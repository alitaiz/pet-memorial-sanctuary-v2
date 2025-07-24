# Deployment Guide: Pet Memorials on Ubuntu 24.04

This guide provides step-by-step instructions to deploy the Pet Memorials application. The new architecture consists of two main parts that you will deploy to different places:

1.  **The Backend Data Layer (on Cloudflare):**
    *   **Cloudflare R2:** For storing uploaded images.
    *   **Cloudflare KV:** For storing memorial text data.
    *   **Cloudflare Worker:** A lightweight API for interacting with R2 and KV.

2.  **The Frontend & AI Proxy (on your VPS):**
    *   **React App:** The user interface.
    *   **Proxy Server:** A Node.js server that serves the React app and safely proxies AI requests to OpenAI from your VPS's location, bypassing regional blocks.

You must deploy the Cloudflare services first, as the frontend depends on them.

---

### **Part 1: Get an OpenAI API Key**

This is required for the "AI Assist" feature.
1.  Go to the OpenAI API key page: [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys).
2.  Sign up or log in. You may need to add a payment method.
3.  Click "**+ Create new secret key**".
4.  Give it a name (e.g., "Pet Memorials Key") and click "**Create secret key**".
5.  **Immediately copy your new API key.** It starts with `sk-`. Store it somewhere safe; you will need it for Part 3.

---

### **Part 2: Deploy the Backend Data Layer (Cloudflare)**

This backend handles all memorial data and image storage.

#### **Prerequisites**
- A [Cloudflare account](https://dash.cloudflare.com/sign-up).
- [Node.js](https://nodejs.org/) and `npm` installed on your **local machine**.

#### **Step 1: Install & Login with Wrangler CLI**
Wrangler is Cloudflare's command-line tool. Run these on your **local machine**.
```bash
npm install -g wrangler
wrangler login
```

#### **Step 2: Create a KV Namespace (for Text Data)**
1.  Go to your Cloudflare Dashboard -> **Workers & Pages** -> **KV**.
2.  Click **Create a namespace**, name it `pet-memorials-kv`, and click **Add**.
3.  After creation, **copy its ID**.

#### **Step 3: Create and Configure R2 Bucket (for Images)**

**A. Create the Bucket**
1.  In your Cloudflare Dashboard, go to **R2**.
2.  Click **Create bucket**, name it `pet-memorials-assets` (or another unique name), and click **Create bucket**.

**B. Enable Public Access (CRITICAL)**
1.  In your new bucket's settings page, go to the **Settings** tab.
2.  Find **Public URL** and click **Allow Access**.
3.  Use the free `r2.dev` subdomain provided. After enabling, **COPY THE PUBLIC URL**. It will look like `https://pub-xxxxxxxx.r2.dev`.

**C. Create an R2 API Token**
1.  From the R2 overview page, click **Manage R2 API Tokens** on the right.
2.  Click **Create API token**.
3.  Permissions: Choose **Object Admin Read & Write**.
4.  Click **Create API token**.
5.  **⚠️ Copy the `Access Key ID`, `Secret Access Key`, and your `Account ID` (found on the R2 overview page).**

**D. Add CORS Policy**
1.  In the bucket's **Settings** tab, scroll to **CORS Policy** and click **Add CORS policy**.
2.  Paste this JSON, replacing any existing content.
    ```json
    [
      {
        "AllowedOrigins": ["*"],
        "AllowedMethods": ["PUT", "GET"],
        "AllowedHeaders": ["*"],
        "MaxAgeSeconds": 3600
      }
    ]
    ```
3.  Click **Save**. For better security in production, replace `"*"` with your specific domain.

#### **Step 4: Configure and Deploy the Worker**

<div style="background-color: #ffebe6; border-left: 4px solid #d9534f; padding: 15px; margin: 15px 0;">
  <p style="margin-top: 0; font-weight: bold; color: #d9534f;">CRITICAL: Install Backend Dependencies</p>
  <p style="margin-bottom: 0;">Navigate into the <code>worker/</code> directory on your local machine and run <code>npm install</code> before deploying.</p>
</div>

```bash
# On your local machine, navigate to the worker directory
cd worker
npm install
```

**Next, run the following commands** to securely store your credentials for the worker. The OpenAI key is **NOT** set here.
```bash
# Set your R2 Access Key ID
wrangler secret put R2_ACCESS_KEY_ID

# Set your R2 Secret Access Key
wrangler secret put R2_SECRET_ACCESS_KEY

# Set your Cloudflare Account ID
wrangler secret put R2_ACCOUNT_ID

# Set the public URL of your R2 bucket
wrangler secret put R2_PUBLIC_URL
```

**Now, configure `wrangler.toml`:**
1.  Rename `worker/wrangler.toml.txt` to `wrangler.toml`.
2.  **KV Namespace:** Find `[[kv_namespaces]]` and paste your KV Namespace ID.
3.  **R2 Bucket:** Find `[[r2_buckets]]` and `[vars]`. Ensure the `bucket_name` and `R2_BUCKET_NAME` **exactly match** your R2 bucket's name.

**Finally, deploy the worker:**
```bash
# Make sure you are still inside the worker/ directory
wrangler deploy
```
After deployment, Wrangler gives you a worker URL (e.g., `https://pet-memorials-api.<...>.workers.dev`). **Copy this worker URL.**

---

### **Part 3: Deploy Frontend & AI Proxy (Your VPS)**

This server runs on your VPS, serves the React UI, and proxies AI requests.

#### **Step 1: Create New Project Files**
You will need to create a new directory and several new files. Copy the content from the `.txt` files provided in this update into new files with the correct names on your VPS.

1.  **Root `.gitignore`**: Copy content from `gitignore.txt` to a new file named `.gitignore` in your project's root directory.
2.  **Create Proxy Server Directory**: In your project's root, create a new directory: `mkdir proxy-server`
3.  **Proxy `package.json`**: Copy `proxy-server/package.json.txt` content to `proxy-server/package.json`.
4.  **Proxy `index.js`**: Copy `proxy-server/index.js.txt` content to `proxy-server/index.js`.
5.  **Proxy `.env.example`**: Copy `proxy-server/env.example.txt` content to `proxy-server/.env.example`.
6.  **Proxy `.gitignore`**: Copy `proxy-server/gitignore.txt` content to `proxy-server/.gitignore`.

Commit these new files to your git repository.

#### **Step 2: Set the API URL in the Frontend Code**
1.  On your **local machine**, open `src/config.ts`.
2.  **Replace the placeholder `API_BASE_URL`** with the worker URL you copied.
3.  Save, commit, and push this change to your repository.

#### **Step 3: Connect to VPS and Get Latest Code**
```bash
ssh your_username@your_vps_ip_address
# Navigate to your project directory, e.g., /var/www/pet-memorial-sanctuary
cd /path/to/your/project
git pull origin main
```

#### **Step 4: Install Dependencies and Build Frontend**
Run these commands from the **root** of your project directory on the VPS.
```bash
# Install root dependencies
npm install

# Build the static frontend files into the `dist/` folder
npm run build
```

#### **Step 5: Set Up and Configure the Proxy Server**
Now, navigate into the new proxy server directory and set it up.
```bash
# Move into the proxy server directory
cd proxy-server

# Install its dependencies
npm install

# Create a .env file to store your OpenAI key
# Use nano, vim, or your preferred editor to create and edit the file
nano .env
```
Inside the `.env` file, add your OpenAI API key like this, then save and exit (for `nano`, press `Ctrl+X`, then `Y`, then `Enter`):
```
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

#### **Step 6: Start/Restart the App with PM2**
This command now starts the new proxy server, which in turn serves the frontend.
```bash
# From the project root, make sure you are in the proxy-server/ directory
cd /path/to/your/project/proxy-server

# First time starting the app:
pm2 start npm --name "pet-memorials-app" -- run start -- --port 8002

# To restart after updates (e.g., after a new `git pull` and `npm run build`):
pm2 restart pet-memorials-app
```

#### **Step 7: Configure Firewall and PM2 Startup (First Time Only)**
```bash
sudo ufw allow 8002/tcp
pm2 startup
pm2 save
```

Your application is now fully deployed and the AI Assistant should work without regional errors!

---
### **Troubleshooting**
- **Uploads/Deletions Fail:** The issue is almost always a misconfiguration between R2 and the Worker. Double-check your secrets, `wrangler.toml` bucket names, and the R2 CORS policy. Use `wrangler tail` on your local machine to see live logs from the deployed worker.
- **AI Assist Fails:** Check the PM2 logs for your `pet-memorials-app` on the VPS (`pm2 logs pet-memorials-app`). The error is likely an incorrect or missing `OPENAI_API_KEY` in the `.env` file within the `proxy-server` directory.
- **Site Doesn't Load:** Ensure the `npm run build` command was successful and the `dist` folder exists in the project root. Check PM2 logs.
