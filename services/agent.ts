/**
 * Ask Archetype, the public agent (AI programme W3.1).
 *
 * Both calls go from the browser straight to the API, anonymously, never
 * through the `/api/proxy` route. The backend gives each requester a daily
 * quota keyed on the address the request came from, and through the proxy
 * every visitor would arrive from the Next server's one address.
 */

import { apiFetch } from '@/lib/api-fetch';
import type { AgentRun, AgentTools } from '@/types/agent';

/** A question the service would not take. `status` is 0 when it was never reached. */
export class AskError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string
  ) {
    super(detail || `Ask Archetype answered ${status}`);
    this.name = 'AskError';
  }
}

/** What the agent can do on this site, and why it cannot do the rest. */
export async function getAgentTools(): Promise<AgentTools> {
  const response = await apiFetch('/api/v1/agent/tools/', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load the agent's tools: ${response.status}`);
  }
  return response.json();
}

export async function askArchetype(question: string): Promise<AgentRun> {
  let response: Response;
  try {
    response = await apiFetch('/api/v1/agent/ask/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      cache: 'no-store',
    });
  } catch {
    throw new AskError(0, '');
  }
  if (!response.ok) {
    let detail = '';
    try {
      const body: unknown = await response.json();
      if (body && typeof body === 'object' && 'detail' in body && typeof body.detail === 'string') {
        detail = body.detail;
      }
    } catch {
      // A proxy's error page is HTML; the status is all there is.
    }
    throw new AskError(response.status, detail);
  }
  return response.json();
}
