import { AwsClient } from "aws4fetch";

const MAX_SIZE = 500 * 1024 * 1024;
const TYPE_OK = /^(image\/[\w.+-]+|video\/[\w.+-]+|application\/pdf)$/;
const ITEM_OK = /^[a-z0-9]{6,40}$/i;
const KEY_OK = /^[a-z0-9]{6,40}\/AST-[A-F0-9]{8}(\.[a-z0-9]{1,6})?$/i;

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...cors,
    },
  });
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function isAllowedOrigin(origin, env) {
  return (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(origin);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (!isAllowedOrigin(origin, env)) {
      return new Response("Forbidden", { status: 403 });
    }

    const cors = corsHeaders(origin);
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }
    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Body JSON tidak valid" }, 400, cors);
    }

    try {
      const r2 = new AwsClient({
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
        service: "s3",
        region: "auto",
      });
      const baseUrl = `https://${env.ACCOUNT_ID}.r2.cloudflarestorage.com/${env.BUCKET}`;

      const presign = async (method, key, expires, contentType = "") => {
        const url = new URL(`${baseUrl}/${key}`);
        url.searchParams.set("X-Amz-Expires", String(expires));
        const headers = contentType
          ? { "Content-Type": contentType }
          : undefined;
        const signed = await r2.sign(new Request(url, { method, headers }), {
          aws: { signQuery: true },
        });
        return signed.url;
      };

      const path = new URL(request.url).pathname;
      if (path === "/sign-upload") {
        const { itemId, filename = "", type, size } = body;
        if (typeof itemId !== "string" || !ITEM_OK.test(itemId)) {
          return json({ error: "itemId tidak valid" }, 400, cors);
        }
        if (typeof type !== "string" || !TYPE_OK.test(type)) {
          return json({ error: "Tipe file tidak diizinkan" }, 400, cors);
        }
        if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_SIZE) {
          return json(
            { error: "Ukuran file melebihi batas 500 MB" },
            400,
            cors,
          );
        }

        const ext =
          typeof filename === "string"
            ? (filename.match(/\.[a-z0-9]{1,6}$/i) || [""])[0].toLowerCase()
            : "";
        const code = `AST-${crypto.randomUUID().slice(0, 8).toUpperCase()}${ext}`;
        const key = `${itemId}/${code}`;
        const uploadUrl = await presign("PUT", key, 900, type);
        return json({ key, code, uploadUrl }, 200, cors);
      }

      if (path === "/sign-download") {
        if (typeof body.key !== "string" || !KEY_OK.test(body.key)) {
          return json({ error: "key tidak valid" }, 400, cors);
        }
        const url = await presign("GET", body.key, 3600);
        return json({ url, expiresIn: 3600 }, 200, cors);
      }

      if (path === "/delete") {
        if (typeof body.key !== "string" || !KEY_OK.test(body.key)) {
          return json({ error: "key tidak valid" }, 400, cors);
        }
        const response = await r2.fetch(`${baseUrl}/${body.key}`, {
          method: "DELETE",
        });
        if (!response.ok && response.status !== 404) {
          return json({ error: "Gagal menghapus file dari R2" }, 502, cors);
        }
        return json({ ok: true }, 200, cors);
      }

      return json({ error: "Not found" }, 404, cors);
    } catch (error) {
      console.error("R2 signer error:", error);
      return json(
        { error: "Layanan Cloudflare Storage sementara tidak tersedia" },
        500,
        cors,
      );
    }
  },
};
