/**
 * Cloudflare for SaaS — Custom Hostnames integration
 *
 * Required env vars:
 *   CF_ZONE_ID       — Zone ID do seu domínio no Cloudflare
 *   CF_API_TOKEN     — API token com permissão Zone:Custom Hostnames:Edit
 */

const CF_API = "https://api.cloudflare.com/client/v4";

function getConfig() {
  const zoneId = process.env.CF_ZONE_ID?.trim();
  const apiToken = process.env.CF_API_TOKEN?.trim();
  return { zoneId, apiToken, enabled: !!(zoneId && apiToken) };
}

/**
 * Registers a custom hostname with Cloudflare for SaaS.
 * Returns the Cloudflare custom hostname ID (needed for deletion).
 * Returns null if CF is not configured or if the hostname already exists.
 */
export async function cfAddHostname(hostname: string): Promise<string | null> {
  const { zoneId, apiToken, enabled } = getConfig();
  if (!enabled) return null;

  const res = await fetch(`${CF_API}/zones/${zoneId}/custom_hostnames`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      hostname,
      ssl: {
        method: "http",
        type: "dv",
        settings: {
          min_tls_version: "1.2",
          http2: "on",
        },
      },
    }),
  });

  const data = await res.json();

  if (!data.success) {
    // Code 1406 = hostname already exists — treat as ok, fetch existing ID
    const alreadyExists = data.errors?.some((e: { code: number }) => e.code === 1406);
    if (alreadyExists) {
      return cfGetHostnameId(hostname);
    }
    console.error("[CF] Failed to add hostname:", hostname, data.errors);
    return null;
  }

  return data.result?.id ?? null;
}

/**
 * Fetches the Cloudflare custom hostname ID for an existing hostname.
 */
export async function cfGetHostnameId(hostname: string): Promise<string | null> {
  const { zoneId, apiToken, enabled } = getConfig();
  if (!enabled) return null;

  const res = await fetch(
    `${CF_API}/zones/${zoneId}/custom_hostnames?hostname=${encodeURIComponent(hostname)}`,
    { headers: { Authorization: `Bearer ${apiToken}` } }
  );
  const data = await res.json();
  return data.result?.[0]?.id ?? null;
}

/**
 * Removes a custom hostname from Cloudflare for SaaS by its ID.
 */
export async function cfRemoveHostname(hostnameId: string): Promise<void> {
  const { zoneId, apiToken, enabled } = getConfig();
  if (!enabled) return;

  const res = await fetch(`${CF_API}/zones/${zoneId}/custom_hostnames/${hostnameId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${apiToken}` },
  });

  if (!res.ok) {
    console.error("[CF] Failed to remove hostname ID:", hostnameId);
  }
}
