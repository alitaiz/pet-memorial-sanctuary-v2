# Deployment Guide: Pet Memorials on Ubuntu 24.04

This guide provides step-by-step instructions to deploy the full Pet Memorials application, which consists of three main parts:
1.  **The Storage Service:** Cloudflare R2 for storing uploaded images.
2.  **The Backend API:** A Cloudflare Worker that handles data logic and generates secure upload URLs.
3.  **The Frontend App:** The React application you see, hosted on your VPS.

You must deploy the backend services (R2 and Worker) first, as the frontend depends on them.

---

### **Part 1: Deploy the Backend API (Cloudflare Worker)**

This backend makes your memorials accessible from any device.

#### **Prerequisites**
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (the free plan is sufficient).
- [Node.js](https://nodejs.org/) and `npm` installed on your **local machine**.

#### **Step 1: Install Wrangler CLI on Your Local Machine**
Wrangler is the command-line tool for managing Cloudflare Workers.
```bash
npm install -g wrangler
```

#### **Step 2: Log in to Cloudflare**
This command will open a browser window asking you to log in to your Cloudflare account.
```bash
wrangler login
```

#### **Step 3: Create a KV Namespace**
KV is the key-value database where memorial *text data* will be stored.
1. Go to your Cloudflare Dashboard.
2. On the right sidebar, click **Workers & Pages**, then select **KV**.
3. Click **Create a namespace**.
4. Enter a name, for example `pet-memorials-kv`, and click **Add**.
5. After creation, you will see your new namespace in a list. **Copy its ID**.

---

### **Part 2: Setting up Cloudflare R2 for Image Storage**

R2 is where the actual image files will be stored. This is a crucial step.

#### **Step 1: Create an R2 Bucket**
1.  In your Cloudflare Dashboard, go to **R2**.
2.  Click **Create bucket**.
3.  Enter a unique bucket name (e.g., `pet-memorials-assets`). **This name must be globally unique.**
4.  Choose a location (or leave as "Automatic").
5.  Click **Create bucket**.

#### **Step 2: Enable Public Access (CRITICAL FOR VIEWING IMAGES)**
For images to be visible on your memorial pages, the R2 bucket must be accessible to the public internet.
1.  After creating your bucket, click on its name to go to its settings page.
2.  Go to the **Settings** tab.
3.  Find the **Public URL** section (previously called "Public Development URL").
4.  Click the **Allow Access** button. You might be prompted to enter your domain. If you do not have a domain connected to Cloudflare, you can use a free `r2.dev` subdomain provided by Cloudflare.
5.  After enabling, **COPY THE PUBLIC URL**. It will look like `https://pub-xxxxxxxx.r2.dev`. This is the base URL for all your images.

#### **Step 3: Create an R2 API Token**
We need to give our Worker permission to manage the R2 bucket.
1.  From the R2 overview page, click **Manage R2 API Tokens** on the right.
2.  Click **Create API token**.
3.  Give the token a name (e.g., `memorials-worker-token`).
4.  Under **Permissions**, choose **Object Admin Read & Write**. This is important.
5.  Click **Create API token**.
6.  You will now see your token's details. 
    **⚠️ WARNING: This is the only time you will see the `Secret Access Key`. Copy the following three values and save them temporarily in a secure place:**
    *   **Access Key ID**
    *   **Secret Access Key**
    *   Your **Account ID** (found on the R2 overview page or in the token creation endpoint URL).

#### **Step 4: Add CORS Policy to R2 Bucket (CRITICAL for Uploads)**
For the browser to be allowed to upload files directly to your R2 bucket, you must configure a CORS policy.
1.  In the R2 section of your Cloudflare Dashboard, click on your bucket's name.
2.  Go to the **Settings** tab.
3.  Scroll down to **CORS Policy** and click **Add CORS policy**.
4.  Paste the following JSON into the editor, replacing any existing content.

    ```json
    [
      {
        "AllowedOrigins": [
          "*"
        ],
        "AllowedMethods": [
          "PUT",
          "GET"
        ],
        "AllowedHeaders": [
          "*"
        ],
        "MaxAgeSeconds": 3600
      }
    ]
    ```
5.  Click **Save**.
    *   **Security Note:** `AllowedOrigins: ["*"]` is for convenience. For production, you should replace `"*"` with your frontend's specific URL (e.g., `"https://your-domain.com"` or `"http://your-vps-ip:8002"`) to improve security.

#### **Step 5: Securely Configure the Worker**
Navigate to the `worker/` directory in your project on your local machine. Run the following commands, pasting your copied values when prompted. This securely stores your credentials so they are never in your code.
**Tip:** Paste your values carefully and press Enter. There should be no extra spaces.

```bash
# Set your R2 Access Key ID
wrangler secret put R2_ACCESS_KEY_ID

# Set your R2 Secret Access Key
wrangler secret put R2_SECRET_ACCESS_KEY

# Set your Cloudflare Account ID
wrangler secret put R2_ACCOUNT_ID

# Set the public URL of your R2 bucket (from Step 2)
wrangler secret put R2_PUBLIC_URL
```

#### **Step 6: Configure `wrangler.toml`**
1.  Open the `worker/wrangler.toml.txt` file (and rename it to `wrangler.toml` if you haven't already).
2.  **KV Namespace:** Find `[[kv_namespaces]]` and paste your KV Namespace ID from Part 1, Step 3.
3.  **R2 Bucket Binding:** Find `[[r2_buckets]]` and replace `pet-memorials-assets` with your actual R2 bucket name.
4.  **R2 Bucket Variable (CRITICAL):** Find the `[vars]` section. Replace `pet-memorials-assets` with your actual R2 bucket name. **This value must exactly match the `bucket_name` in the `[[r2_buckets]]` section above.**

#### **Step 7: Deploy the Worker**
While still inside the `worker/` directory on your local machine, run the deploy command:
```bash
wrangler deploy
```
After a successful deployment, Wrangler will give you a URL for your worker (e.g., `https://pet-memorials-api.<your-subdomain>.workers.dev`). **This is your API endpoint URL. Copy it.**

---

### **Part 3: Configure and Deploy the Frontend App**

(The steps for deploying the frontend remain the same as before).

#### **Step 1: Set the API URL in the Frontend**
1.  On your local machine, open the file `src/config.ts`.
2.  **Replace the placeholder `API_BASE_URL`** with your actual worker URL.
3.  Save the file, then commit and push your changes to GitHub.

#### **Step 2: Connect to Your VPS and Get the Code**
```bash
ssh your_username@your_vps_ip_address
cd /var/www/your-repo-name
git pull origin main
```

#### **Step 3: Install Dependencies and Build**
```bash
npm install
npm run build
```

#### **Step 4: Start/Restart the App with PM2**
```bash
# First time:
pm2 start npm --name "pet-memorials" -- run preview -- --port 8002

# Subsequent updates:
pm2 restart pet-memorials
```

#### **Step 5: Configure Firewall and PM2 Startup (First Time Only)**
```bash
sudo ufw allow 8002/tcp
pm2 startup
pm2 save
```

---

### **Troubleshooting Image Uploads**

If your image uploads are failing, it is almost always a configuration problem. Run the **Backend Configuration Check** tool on the "Create Memorial" page. If any item is red (✖), follow these steps carefully:

**1. Create a NEW R2 API Token**
   - Go to your Cloudflare R2 Dashboard -> **Manage R2 API Tokens**.
   - Click **Create API token**.
   - Permissions: **Object Admin Read & Write**.
   - **Carefully copy the new Access Key ID and Secret Access Key.** Old keys might be incorrect due to a copy-paste error.

**2. Re-enter ALL Secrets**
   - On your local machine, navigate to the `worker/` directory.
   - Run ALL of the following commands again, using the **new** token values and re-copying the values for Account ID and Public URL. It is critical to re-enter all of them to ensure nothing is stale.
   ```bash
   # From your R2 dashboard, copy your Account ID
   wrangler secret put R2_ACCOUNT_ID

   # From the NEW token you just created, copy the Access Key ID
   wrangler secret put R2_ACCESS_KEY_ID

   # From the NEW token, copy the Secret Access Key
   wrangler secret put R2_SECRET_ACCESS_KEY
   
   # From your R2 bucket's settings page, copy the Public URL (Part 2, Step 2)
   wrangler secret put R2_PUBLIC_URL
   ```

**3. Verify `wrangler.toml`**
   - Open your `worker/wrangler.toml` file.
   - Check that the `id` for `[[kv_namespaces]]` is correct.
   - **CRITICAL:** Check that the `bucket_name` under `[[r2_buckets]]` and the `R2_BUCKET_NAME` under `[vars]` are **identical** and match your R2 bucket name exactly.

**4. Verify CORS Policy**
   - Go to your R2 bucket's **Settings** tab.
   - Scroll to **CORS Policy**.
   - Make sure it **exactly** matches the JSON provided in Part 2, Step 4 of this guide. If you are unsure, delete the current policy and add it again.

**5. Redeploy the Worker**
   - After re-entering all secrets and verifying `wrangler.toml`, you **must** redeploy the worker.
   ```bash
   wrangler deploy
   ```

**6. Test Again**
   - Open your website and try to create a **new** memorial. Use the **Backend Configuration Check** tool again. All items should now be green (✔).
