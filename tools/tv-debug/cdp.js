const expr = process.argv[2];
(async () => {
  const list = await (await fetch("http://localhost:9333/json")).json();
  const page = list.find(p => p.type === "page" && /appassets/.test(p.url));
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: "Runtime.evaluate", params: { expression: expr, returnByValue: true, awaitPromise: true } }));
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id === 1) { const r = d.result; console.log(JSON.stringify(r.exceptionDetails ? r.exceptionDetails.exception.description : (r.result.value ?? r.result))); ws.close(); process.exit(0); } };
})();
