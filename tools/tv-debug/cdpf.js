// node cdpf.js "<origen parcial>" "expr": evalúa en TODOS los contextos (iframes) cuyo origen contenga el texto
const [match, expr] = process.argv.slice(2);
(async () => {
  const list = await (await fetch("http://localhost:9333/json")).json();
  const page = list.find(p => p.type === "page" && /appassets/.test(p.url));
  const ws = new WebSocket(page.webSocketDebuggerUrl); let id = 1; const ctx = [], out = []; let pending = 0;
  const send = (method, params) => ws.send(JSON.stringify({ id: ++id, method, params }));
  ws.onopen = () => { ws.send(JSON.stringify({ id: 1, method: "Runtime.enable", params: {} })); setTimeout(() => {
    const c = ctx.filter(c => c.origin.includes(match) && !/appassets/.test(c.origin));
    if (!c.length) { console.log("sin contexto: " + [...new Set(ctx.map(x => x.origin))].join(" ")); process.exit(0); }
    pending = c.length; c.forEach(x => send("Runtime.evaluate", { expression: expr, contextId: x.id, returnByValue: true, awaitPromise: true, userGesture: true })); }, 900); };
  ws.onmessage = m => { const d = JSON.parse(m.data);
    if (d.method === "Runtime.executionContextCreated") ctx.push(d.params.context);
    else if (d.id > 1) { const r = d.result || {}; if (!r.result && !r.exceptionDetails) { if (--pending === 0) { console.log(JSON.stringify(out)); process.exit(0); } return; } const v = r.exceptionDetails ? null : r.result.value; if (v !== null && v !== undefined && v !== false) out.push(v); if (--pending === 0) { console.log(JSON.stringify(out)); process.exit(0); } } };
})();
