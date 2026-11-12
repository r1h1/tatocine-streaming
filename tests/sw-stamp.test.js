/** El Service Worker sirve CSS/JS desde su caché versionada: si el contenido cambió y no se actualizó la VERSION, los usuarios verían código viejo. */
const { execFileSync } = require("node:child_process"), path = require("node:path");
try { process.stdout.write(execFileSync(process.execPath, [path.join(__dirname, "..", "tools", "stamp.js"), "--check"]).toString()); }
catch (e) { process.stderr.write((e.stderr || e.stdout || e.message).toString()); process.exit(1); }
