// To address TypeScript errors when @cloudflare/workers-types is not available,
// we'll provide minimal type definitions for the Cloudflare environment.
// In a real-world project, you should `npm install -D @cloudflare/workers-types`
// and configure it in `tsconfig.json`.
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

interface R2Bucket {
  // R2 binding object does not directly expose bucketName to the code
}

interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
  passThroughOnException(): void;
}

import { S3Client, PutObjectCommand, DeleteObjectsCommand, DeleteObjectsCommandOutput } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GoogleGenAI } from "@google/genai";

export interface Env {
  // Bindings
  MEMORIALS_KV: KVNamespace;
  MEMORIALS_BUCKET: R2Bucket;

  // Secrets
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_PUBLIC_URL: string;
  GEMINI_API_KEY: string; // Secret for the Google Gemini API
  
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
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
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

    // --- Simple Router ---

    // POST /api/rewrite-tribute: Uses Gemini to rewrite user-provided text.
    if (request.method === "POST" && path === "/api/rewrite-tribute") {
        try {
            if (!env.GEMINI_API_KEY) {
                return new Response(JSON.stringify({ error: 'AI service is not configured on the server.' }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }});
            }
            const { text } = await request.json() as { text: string; };
            if (!text || typeof text !== 'string' || !text.trim()) {
                return new Response(JSON.stringify({ error: 'Text to rewrite is required.' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
            }
            
            const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
            const prompt = `Rewrite the following tribute for a beloved pet to make it more heartfelt and eloquent. Keep the original sentiment and key memories. Return only the rewritten text, without any additional commentary. Here is the original text:\n\n"${text}"`;
            
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: "You are a compassionate assistant helping someone write a beautiful memorial for their pet. You refine their words to be more poetic and touching while preserving the core message.",
                }
            });
        
            const rewrittenText = response.text.trim().replace(/^"|"$/g, '');
            return new Response(JSON.stringify({ rewrittenText }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

        } catch (e) {
            console.error("Gemini API call failed:", e);
            const errorDetails = e instanceof Error ? e.message : String(e);
            return new Response(JSON.stringify({ error: `AI service error: ${errorDetails}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
    }

    // POST /api/upload-url: Generates a secure URL for the frontend to upload a file directly to R2.
    if (request.method === "POST" && path === "/api/upload-url") {
      try {
        if (!env.R2_BUCKET_NAME) {
          throw new Error("Configuration error: R2_BUCKET_NAME is not set in wrangler.toml under [vars].");
        }
        
        const { filename, contentType } = await request.json() as { filename: string; contentType: string; };
        if (!filename || !contentType) {
          return new Response(JSON.stringify({ error: 'Filename and contentType are required' }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }});
        }
        
        const s3 = getR2Client(env);
        const fileExtension = filename.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const uniqueKey = `${crypto.randomUUID()}.${fileExtension}`;

        const signedUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: uniqueKey, ContentType: contentType }), { expiresIn: 360 });
        const publicBaseUrl = env.R2_PUBLIC_URL.endsWith('/') ? env.R2_PUBLIC_URL.slice(0, -1) : env.R2_PUBLIC_URL;
        const publicUrl = `${publicBaseUrl}/${uniqueKey}`;

        return new Response(JSON.stringify({ uploadUrl: signedUrl, publicUrl: publicUrl }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch(e) {
        console.error("Error generating upload URL:", e);
        const errorDetails = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ error: `Worker Error: ${errorDetails}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // POST /api/memorial: Creates a new memorial record in KV.
    if (request.method === "POST" && path === "/api/memorial") {
      try {
        const newMemorial: Memorial = await request.json();
        if (!newMemorial.slug || !newMemorial.petName) {
            return new Response(JSON.stringify({ error: 'Slug and Pet Name are required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        }
        const existing = await env.MEMORIALS_KV.get(newMemorial.slug);
        if (existing !== null) {
          return new Response(JSON.stringify({ error: `Slug "${newMemorial.slug}" already exists.` }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        await env.MEMORIALS_KV.put(newMemorial.slug, JSON.stringify(newMemorial));
        return new Response(JSON.stringify({ success: true, memorial: newMemorial }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: "Bad Request or Internal Error" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Routes for /api/memorial/:slug
    if (path.startsWith("/api/memorial/")) {
      const slug = path.substring("/api/memorial/".length);
      if (!slug) return new Response("Not Found", { status: 404 });

      // GET /api/memorial/:slug: Retrieves a memorial.
      if (request.method === "GET") {
        const memorialJson = await env.MEMORIALS_KV.get(slug);
        if (memorialJson === null) {
          return new Response(JSON.stringify({ error: "Memorial not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        return new Response(memorialJson, { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      // DELETE /api/memorial/:slug: Permanently deletes a memorial and its images.
      if (request.method === "DELETE") {
        console.log(`[Delete] Received request for slug: ${slug}`);
        try {
          const memorialJson = await env.MEMORIALS_KV.get(slug);

          if (!memorialJson) {
            console.log(`[Delete] Memorial ${slug} not found in KV. Nothing to delete.`);
            return new Response(null, { status: 204, headers: corsHeaders });
          }

          const memorial: Memorial = JSON.parse(memorialJson);
          
          if (memorial.images && memorial.images.length > 0) {
            console.log(`[Delete] Found ${memorial.images.length} images for slug ${slug}.`);
            const s3 = getR2Client(env);
            const objectKeys = memorial.images.map(imageUrl => {
                try {
                  return { Key: new URL(imageUrl).pathname.substring(1) };
                } catch { return null; }
            }).filter((obj): obj is { Key: string } => obj !== null && obj.Key !== '');
            
            if (objectKeys.length > 0) {
               console.log(`[Delete] Deleting R2 objects:`, JSON.stringify(objectKeys));
               const deleteResult: DeleteObjectsCommandOutput = await s3.send(new DeleteObjectsCommand({
                Bucket: env.R2_BUCKET_NAME,
                Delete: { Objects: objectKeys },
              }));
              console.log('[Delete] R2 deletion result:', JSON.stringify(deleteResult));
              if (deleteResult.Errors && deleteResult.Errors.length > 0) {
                  console.error(`[Delete] Errors deleting objects from R2 for slug ${slug}:`, deleteResult.Errors);
              }
            }
          } else {
               console.log(`[Delete] No images associated with slug ${slug}.`);
          }
          
          console.log(`[Delete] Deleting KV entry for slug: ${slug}`);
          await env.MEMORIALS_KV.delete(slug);
          console.log(`[Delete] Successfully deleted all data for slug: ${slug}`);

          return new Response(null, { status: 204, headers: corsHeaders });
        } catch (e) {
          const errorDetails = e instanceof Error ? e.message : String(e);
          console.error(`[Delete] Critical failure during deletion of slug ${slug}:`, errorDetails);
          return new Response(JSON.stringify({ error: "Failed to delete memorial from storage." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }

    return new Response("Not Found", { status: 404, headers: corsHeaders });
  },
};
