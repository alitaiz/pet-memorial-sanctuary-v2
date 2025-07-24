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

### **Part 1.5: Setting up Cloudflare R2 for Image Storage**

R2 is where the actual image files will be stored. This is a crucial step.

#### **Step 1: Create an R2 Bucket**
1.  In your Cloudflare Dashboard, go to **R2**.
2.  Click **Create bucket**.
3.  Enter a unique bucket name (e.g., `pet-memorials-assets`). **This name must be globally unique.**
4.  Choose a location (or leave as "Automatic").
5.  Click **Create bucket**.
6.  Once created, click on your new bucket's name. On the settings page, find the **Public URL** (e.g., `https://pub-xxxxxxxx.r2.dev`). **Copy this Public URL.**

#### **Step 2: Create an R2 API Token**
We need to give our Worker permission to manage the R2 bucket.
1.  From the R2 overview page, click **Manage R2 API Tokens** on the right.
2.  Click **Create API token**.
3.  Give the token a name (e.g., `memorials-worker-token`).
4.  Under **Permissions**, choose **Object Admin Read & Write**. This is important.
5.  Click **Create API token**.
6.  You will now see your token's details. **This is the only time you will see the `Secret Access Key`**. Copy the following three values and save them temporarily in a secure place:
    *   **Access Key ID**
    *   **Secret Access Key**
    *   Your **Account ID** (found on the R2 overview page or in the token creation endpoint URL).

#### **Step 3: Securely Configure the Worker**
Navigate to the `worker/` directory in your project on your local machine. Run the following commands, pasting your copied values when prompted. This securely stores your credentials so they are never in your code.

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

#### **Step 4: Configure `wrangler.toml`**
1.  Open the `worker/wrangler.toml` file.
2.  **KV Namespace:** Find `[[kv_namespaces]]`, uncomment it, and paste your KV Namespace ID from Part 1, Step 3.
3.  **R2 Bucket:** Find `[[r2_buckets]]`, uncomment it, and replace `pet-memorials-assets` with your actual R2 bucket name from Step 1 of this section.

#### **Step 5: Deploy the Worker**
While still inside the `worker/` directory on your local machine, run the deploy command:
```bash
wrangler deploy
```
After a successful deployment, Wrangler will give you a URL for your worker (e.g., `https://pet-memorials-api.<your-subdomain>.workers.dev`). **This is your API endpoint URL. Copy it.**

---

### **Part 2: Configure and Deploy the Frontend App**

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

### **Congratulations!**
Your application is now using a professional-grade architecture for handling image uploads.
