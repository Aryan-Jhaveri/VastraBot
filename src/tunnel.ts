/**
 * Resolves the Cloudflare Quick Tunnel URL at runtime by polling the cloudflared
 * metrics API (GET /quicktunnel → { hostname: "xxx.trycloudflare.com" }).
 *
 * Returns undefined immediately if WEB_APP_URL or RENDER_EXTERNAL_URL is already
 * set (named tunnel / Render / manual override) — no polling occurs in those cases.
 *
 * Safe to call in all environments: if cloudflared is not running the fetch
 * attempts fail silently and the function returns undefined after the timeout.
 */

const METRICS_HOST = process.env.CLOUDFLARE_METRICS_HOST ?? 'cloudflared'
const METRICS_URL  = `http://${METRICS_HOST}:2000/quicktunnel`
const MAX_RETRIES  = 30   // 30 × 500 ms = 15 s max wait
const RETRY_DELAY  = 500  // ms between attempts

export async function resolveTunnelUrl(): Promise<string | undefined> {
  // Skip for permanent/managed URLs — Render sets RENDER_EXTERNAL_URL automatically;
  // named tunnels use CLOUDFLARE_TUNNEL_TOKEN and a fixed WEB_APP_URL in .env.
  // Do NOT skip for a stale Quick Tunnel URL (*.trycloudflare.com) in WEB_APP_URL —
  // that's exactly the case we need to overwrite.
  if (process.env.RENDER_EXTERNAL_URL) return undefined
  if (process.env.CLOUDFLARE_TUNNEL_TOKEN) return undefined
  if (process.env.WEB_APP_URL && !process.env.WEB_APP_URL.includes('trycloudflare.com')) return undefined

  console.log(`[tunnel] Polling ${METRICS_URL} for Quick Tunnel URL...`)

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const res  = await fetch(METRICS_URL, { signal: AbortSignal.timeout(2000) })
      const data = await res.json() as { hostname?: string }
      if (data.hostname) return `https://${data.hostname}`
    } catch {
      // cloudflared not ready yet — keep polling
    }
    await new Promise(r => setTimeout(r, RETRY_DELAY))
  }

  console.warn('[tunnel] Could not resolve Quick Tunnel URL within timeout — bot will start without web app URL')
  return undefined
}
