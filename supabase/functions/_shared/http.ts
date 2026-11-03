export class HttpError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function jsonResponse(
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...headers,
    },
  })
}

export function corsHeaders(request: Request): Record<string, string> {
  const allowedOrigin = Deno.env.get('APP_ORIGIN') ?? '*'
  const requestOrigin = request.headers.get('Origin')

  return {
    'Access-Control-Allow-Origin':
      allowedOrigin === '*' || requestOrigin === allowedOrigin
        ? allowedOrigin
        : allowedOrigin,
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    Vary: 'Origin',
  }
}

export function handleOptions(request: Request): Response {
  return new Response('ok', { headers: corsHeaders(request) })
}
