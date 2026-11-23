// node prof.js <segundos> → perfil de CPU de la página principal; imprime las funciones con más tiempo propio
const secs = Number(process.argv[2] || 15);
(async () => {
  const list = await (await fetch("http://localhost:9333/json")).json();
  const page = list.find((p) => p.type === "page" && /appassets/.test(p.url));
  const ws = new WebSocket(page.webSocketDebuggerUrl); let id = 0; const wait = {};
  const send = (method, params) => new Promise((ok) => { const i = ++id; wait[i] = ok; ws.send(JSON.stringify({ id: i, method, params })); });
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && wait[d.id]) { wait[d.id](d.result); delete wait[d.id]; } };
  await new Promise((ok) => (ws.onopen = ok));
  await send("Profiler.enable"); await send("Profiler.setSamplingInterval", { interval: 500 }); await send("Profiler.start");
  await new Promise((ok) => setTimeout(ok, secs * 1000));
  const { profile } = await send("Profiler.stop");
  const self = {}, byId = {}; profile.nodes.forEach((n) => (byId[n.id] = n));
  const dt = profile.timeDeltas; const counts = {};
  profile.samples.forEach((s, i) => { counts[s] = (counts[s] || 0) + (dt[i] || 0); });
  for (const [nid, us] of Object.entries(counts)) { const n = byId[nid]; const cf = n.callFrame; const key = (cf.functionName || "(anon)") + " " + (cf.url || "").split("/").slice(-2).join("/").split("?")[0] + ":" + cf.lineNumber; self[key] = (self[key] || 0) + us; }
  const total = Object.values(self).reduce((a, b) => a + b, 0);
  Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 22).forEach(([k, us]) => console.log(String(Math.round(us / 1000)).padStart(6) + " ms  " + (100 * us / total).toFixed(1).padStart(5) + "%  " + k));
  process.exit(0);
})();
