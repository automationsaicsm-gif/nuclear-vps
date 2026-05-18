import type { APIRoute } from 'astro';

const API_BASE = import.meta.env.API_URL || 'http://localhost:4000';

async function proxy(request: Request, params: Record<string, string | undefined>): Promise<Response> {
  const path = params.path ?? '';
  const origin = new URL(request.url);
  const targetUrl = `${API_BASE}/api/${path}${origin.search}`;

  const forwardHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lk = key.toLowerCase();
    // Strip hop-by-hop headers and accept-encoding (we want uncompressed body)
    if (!['host', 'connection', 'transfer-encoding', 'accept-encoding'].includes(lk)) {
      forwardHeaders.set(key, value);
    }
  }

  const hasBody = !['GET', 'HEAD'].includes(request.method);
  const body = hasBody ? await request.arrayBuffer() : undefined;

  const upstream = await fetch(targetUrl, {
    method: request.method,
    headers: forwardHeaders,
    body,
  });

  const resHeaders = new Headers();
  for (const [key, value] of upstream.headers.entries()) {
    const lk = key.toLowerCase();
    // Strip encoding/length headers since body is already decoded by Node fetch
    if (!['transfer-encoding', 'content-encoding', 'content-length'].includes(lk)) {
      resHeaders.set(key, value);
    }
  }

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers: resHeaders,
  });
}

export const GET: APIRoute = ({ request, params }) =>
  proxy(request, params as Record<string, string | undefined>);
export const POST: APIRoute = ({ request, params }) =>
  proxy(request, params as Record<string, string | undefined>);
export const PUT: APIRoute = ({ request, params }) =>
  proxy(request, params as Record<string, string | undefined>);
export const PATCH: APIRoute = ({ request, params }) =>
  proxy(request, params as Record<string, string | undefined>);
export const DELETE: APIRoute = ({ request, params }) =>
  proxy(request, params as Record<string, string | undefined>);
