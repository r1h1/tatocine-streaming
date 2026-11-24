// node net.js <segundos>: registra los dominios que pide la página de la APK (incluidos los iframes) durante N segundos
const secs = +(process.argv[2] || 30);
(async () => {
  const list = await (await fetch("http://localhost:9333/json")).json();
  const page = list.find(p => p.type === "page" && /appassets/.test(p.url));
  const ws = new WebSocket(page.webSocketDebuggerUrl); const seen = new Map();
  ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Network.enable", params: {} }));
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.method === "Network.requestWillBeSent") { const u = d.params.request.url; try { const h = new URL(u).hostname; const a = seen.get(h) || []; if (a.length < 2) a.push((d.params.type || "") + " " + u.slice(0, 100)); seen.set(h, a); } catch (e) { } } };
  setTimeout(() => { for (const [h, a] of seen) console.log(h + "\n   " + a.join("\n   ")); process.exit(0); }, secs * 1000);
})();
