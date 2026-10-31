/** A JSON `Response` for mocked `fetch` calls in tests. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/** A plain-text `Response`, for the error pages a proxy or gateway returns. */
export function textResponse(status: number, text: string): Response {
  return new Response(text, { status, headers: { 'content-type': 'text/plain' } });
}
