
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
  editKey: string; // The secret key
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Edit-Key",
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
      // Respond to CORS preflight requests.
      // Using a 204 status code is a common and robust practice.
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    // --- Simple Router ---

    // The AI rewrite endpoint is handled by the dedicated proxy server.

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
        if (!newMemorial.slug || !newMemorial.petName || !newMemorial.editKey) {
            return new Response(JSON.stringify({ error: 'Slug, Pet Name, and Edit Key are required.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }});
        }
        const existing = await env.MEMORIALS_KV.get(newMemorial.slug);
        if (existing !== null) {
          return new Response(JSON.stringify({ error: `Slug "${newMemorial.slug}" already exists.` }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        // Store the complete object including the editKey
        await env.MEMORIALS_KV.put(newMemorial.slug, JSON.stringify(newMemorial));
        return new Response(JSON.stringify({ success: true, slug: newMemorial.slug }), { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        // SECURITY: Omit editKey before sending to client
        const memorial: Partial<Memorial> = JSON.parse(memorialJson);
        delete memorial.editKey;
        return new Response(JSON.stringify(memorial), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      // PUT /api/memorial/:slug: Updates an existing memorial.
      if (request.method === "PUT") {
          const editKey = request.headers.get('X-Edit-Key');
          if (!editKey) {
              return new Response(JSON.stringify({ error: 'Authentication required. Edit key missing.' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }

          try {
              const memorialJson = await env.MEMORIALS_KV.get(slug);
              if (!memorialJson) {
                  return new Response(JSON.stringify({ error: 'Memorial not found.' }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
              }

              const storedMemorial: Memorial = JSON.parse(memorialJson);
              if (storedMemorial.editKey !== editKey) {
                  return new Response(JSON.stringify({ error: 'Forbidden. Invalid edit key.' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
              }
              
              const updateData: Partial<Memorial> = await request.json();

              const updatedMemorial: Memorial = {
                  ...storedMemorial,
                  petName: updateData.petName ?? storedMemorial.petName,
                  shortMessage: updateData.shortMessage ?? storedMemorial.shortMessage,
                  memorialContent: updateData.memorialContent ?? storedMemorial.memorialContent,
                  images: updateData.images ?? storedMemorial.images,
              };

              await env.MEMORIALS_KV.put(slug, JSON.stringify(updatedMemorial));

              const publicMemorialData = { ...updatedMemorial };
              delete (publicMemorialData as Partial<Memorial>).editKey;

              return new Response(JSON.stringify(publicMemorialData), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

          } catch (e) {
              const errorDetails = e instanceof Error ? e.message : String(e);
              console.error(`[Update] Critical failure during update of slug ${slug}:`, errorDetails);
              return new Response(JSON.stringify({ error: "Failed to update memorial." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
      }

      // DELETE /api/memorial/:slug: Permanently deletes a memorial and its images.
      if (request.method === "DELETE") {
        const editKey = request.headers.get('X-Edit-Key');
        if (!editKey) {
          return new Response(JSON.stringify({ error: 'Authentication required. Edit key missing.' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }

        try {
          const memorialJson = await env.MEMORIALS_KV.get(slug);

          if (!memorialJson) {
            return new Response(null, { status: 204, headers: corsHeaders });
          }

          const memorial: Memorial = JSON.parse(memorialJson);
          
          // SECURITY: Check if the provided key matches the stored key
          if (memorial.editKey !== editKey) {
            return new Response(JSON.stringify({ error: 'Forbidden. Invalid edit key.' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          
          // If keys match, proceed with deletion
          if (memorial.images && memorial.images.length > 0) {
            const s3 = getR2Client(env);
            const objectKeys = memorial.images.map(imageUrl => {
                try {
                  return { Key: new URL(imageUrl).pathname.substring(1) };
                } catch { return null; }
            }).filter((obj): obj is { Key: string } => obj !== null && obj.Key !== '');
            
            if (objectKeys.length > 0) {
               const deleteResult: DeleteObjectsCommandOutput = await s3.send(new DeleteObjectsCommand({
                Bucket: env.R2_BUCKET_NAME,
                Delete: { Objects: objectKeys },
              }));
              if (deleteResult.Errors && deleteResult.Errors.length > 0) {
                  console.error(`[Delete] Errors deleting objects from R2 for slug ${slug}:`, deleteResult.Errors);
              }
            }
          }
          
          await env.MEMORIALS_KV.delete(slug);
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
