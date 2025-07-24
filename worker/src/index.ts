// To address TypeScript errors when @cloudflare/workers-types is not available,
// we'll provide minimal type definitions for the Cloudflare environment.
// In a real-world project, you should `npm install -D @cloudflare/workers-types`
// and configure it in `tsconfig.json`.
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface R2Bucket {
  // R2 binding object does not directly expose bucketName to the code
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface Env {
  // Bindings
  MEMORIALS_KV: KVNamespace;
  MEMORIALS_BUCKET: R2Bucket;

  // Secrets
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_PUBLIC_URL: string;
  
  // Environment Variables (from wrangler.toml `[vars]`)
  R2_BUCKET_NAME: string;
}

interface Memorial {
  slug: string;
  petName: string;
  shortMessage: string;
  memorialContent: string;
  images: string[]; // Now an array of public image URLs
  createdAt: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const getR2Client = (env: Env) => {
  return new S3Client({
    region: "auto",
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
  });
};


export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // --- Endpoint: POST /api/upload-url ---
    // Generates a secure, short-lived URL for the frontend to upload a file directly to R2.
    if (request.method === "POST" && path === "/api/upload-url") {
      try {
        // CRITICAL CHECK: Ensure the bucket name variable from wrangler.toml is present.
        if (!env.R2_BUCKET_NAME) {
          throw new Error("Configuration error: R2_BUCKET_NAME is not set in wrangler.toml under [vars].");
        }
        
        const { filename, contentType } = await request.json() as { filename: string; contentType: string; };

        if (!filename || !contentType) {
          return new Response(JSON.stringify({ error: 'Filename and contentType are required' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
        }
        
        const s3 = getR2Client(env);

        const generateId = () =>
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? (crypto as Crypto).randomUUID()
            : Math.random().toString(36).substring(2, 10);

        // IMPORTANT: Sanitize the filename to handle special characters, spaces, etc.,
        // by URL-encoding it. This ensures the generated public URL is valid and
        // the object key in R2 is safe.
        const safeFilename = encodeURIComponent(filename);
        const uniqueKey = `${generateId()}-${safeFilename}`;

        const signedUrl = await getSignedUrl(
          s3,
          new PutObjectCommand({
            Bucket: env.R2_BUCKET_NAME, // This now reads the variable from wrangler.toml
            Key: uniqueKey,
            ContentType: contentType,
          }),
          { expiresIn: 360 } // URL is valid for 6 minutes
        );

        // Ensure the public URL doesn't have a trailing slash to avoid double slashes.
        const publicBaseUrl = env.R2_PUBLIC_URL.endsWith('/')
          ? env.R2_PUBLIC_URL.slice(0, -1)
          : env.R2_PUBLIC_URL;

        // The public URL where the image will be accessible after upload
        const publicUrl = `${publicBaseUrl}/${uniqueKey}`;

        return new Response(JSON.stringify({ uploadUrl: signedUrl, publicUrl: publicUrl }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch(e) {
        console.error("Error generating upload URL:", e);
        const errorDetails = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
        const finalMessage = `Failed to create upload URL. This is likely a configuration issue. Check your R2 secrets AND ensure 'R2_BUCKET_NAME' is set in your worker's wrangler.toml file. Worker error: ${errorDetails}`;
        return new Response(JSON.stringify({ error: finalMessage }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }


    // --- Endpoint: GET /api/memorial/:slug ---
    // Fetches a single memorial by its slug.
    const getMatch = path.match(/^\/api\/memorial\/([a-zA-Z0-9-]+)$/);
    if (request.method === "GET" && getMatch) {
      const slug = getMatch[1];
        const memorialJson = await env.MEMORIALS_KV.get(slug);
        if (memorialJson === null) {
          return new Response(JSON.stringify({ error: "Memorial not found" }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(memorialJson, {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    // --- Endpoint: POST /api/memorial ---
    // Creates a new memorial. The `images` array now contains R2 URLs.
    if (request.method === "POST" && path === "/api/memorial") {
      try {
        const newMemorial: Memorial = await request.json();

        if (!newMemorial.slug || !newMemorial.petName) {
            return new Response(JSON.stringify({ error: 'Slug and Pet Name are required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        }

        const existing = await env.MEMORIALS_KV.get(newMemorial.slug);
        if (existing !== null) {
          return new Response(JSON.stringify({ error: `Slug "${newMemorial.slug}" already exists.` }), {
            status: 409,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await env.MEMORIALS_KV.put(newMemorial.slug, JSON.stringify(newMemorial));

        return new Response(JSON.stringify({ success: true, memorial: newMemorial }), {
          status: 201,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (e) {
        return new Response(JSON.stringify({ error: "Bad Request or Internal Error" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
