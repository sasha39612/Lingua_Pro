async function fetchGatewayHealth() {
  const base = process.env.API_GATEWAY_URL || 'http://api-gateway:8080/graphql';
  const healthUrl = base.replace(/\/graphql\/?$/, '/health');

  try {
    const resp = await fetch(healthUrl, { cache: 'no-store' });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function GatewayStatus() {
  const healthy = await fetchGatewayHealth();

  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-700">
      SSR gateway check: <strong>{healthy ? 'reachable' : 'unreachable'}</strong>
    </div>
  );
}
