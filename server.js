const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const APPOINTMENTS_FILE = path.join(DATA_DIR, "appointments.json");
const PORT = Number(process.env.PORT) || 3000;
const ADMIN_TOKEN = process.env.DIFFERENZA_ADMIN_TOKEN || crypto.randomBytes(18).toString("hex");
const rateBuckets = new Map();

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(APPOINTMENTS_FILE)) fs.writeFileSync(APPOINTMENTS_FILE, "[]\n", "utf8");

const mimeTypes = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml" };
const sendJson = (res, status, data) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
  res.end(JSON.stringify(data));
};
const securityHeaders = (res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
};
const clean = (value, max = 200) => String(value || "").trim().replace(/[<>]/g, "").slice(0, max);
const readAppointments = () => JSON.parse(fs.readFileSync(APPOINTMENTS_FILE, "utf8"));
const writeAppointments = (items) => fs.writeFileSync(APPOINTMENTS_FILE, `${JSON.stringify(items, null, 2)}\n`, "utf8");
const isAdmin = (req) => {
  const supplied = String(req.headers["x-admin-token"] || "");
  if (supplied.length !== ADMIN_TOKEN.length) return false;
  return crypto.timingSafeEqual(Buffer.from(supplied), Buffer.from(ADMIN_TOKEN));
};
const rateLimited = (req) => {
  const ip = req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const recent = (rateBuckets.get(ip) || []).filter((time) => now - time < 60_000);
  recent.push(now);
  rateBuckets.set(ip, recent);
  return recent.length > 20;
};
const body = (req) => new Promise((resolve, reject) => {
  let data = "";
  req.on("data", (chunk) => {
    data += chunk;
    if (data.length > 25_000) reject(new Error("Payload muito grande"));
  });
  req.on("end", () => {
    try { resolve(JSON.parse(data || "{}")); } catch { reject(new Error("JSON inválido")); }
  });
});

const handleApi = async (req, res, url) => {
  if (rateLimited(req)) return sendJson(res, 429, { error: "Muitas tentativas. Aguarde um minuto." });
  if (req.method === "GET" && url.pathname === "/api/health") return sendJson(res, 200, { status: "ok", service: "Differenza API" });
  if (req.method === "POST" && url.pathname === "/api/appointments") {
    try {
      const input = await body(req);
      const required = ["name", "phone", "service", "unit", "date", "period"];
      if (required.some((field) => !clean(input[field]))) return sendJson(res, 400, { error: "Preencha todos os campos obrigatórios." });
      if (!/^[\d\s()+-]{10,20}$/.test(input.phone)) return sendJson(res, 400, { error: "Informe um WhatsApp válido." });
      const requestedDate = new Date(`${input.date}T12:00:00`);
      if (Number.isNaN(requestedDate.getTime()) || requestedDate < new Date().setHours(0, 0, 0, 0)) return sendJson(res, 400, { error: "Escolha uma data futura válida." });
      const items = readAppointments();
      const protocol = `DFZ-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      items.unshift({
        id: crypto.randomUUID(), protocol, name: clean(input.name, 80), phone: clean(input.phone, 20),
        service: clean(input.service, 100), unit: clean(input.unit, 60), date: clean(input.date, 10),
        period: clean(input.period, 30), notes: clean(input.notes, 500), status: "Pendente", createdAt: new Date().toISOString()
      });
      writeAppointments(items);
      return sendJson(res, 201, { success: true, protocol });
    } catch (error) { return sendJson(res, 400, { error: error.message }); }
  }
  if (req.method === "GET" && url.pathname === "/api/appointments") {
    if (!isAdmin(req)) return sendJson(res, 401, { error: "Acesso não autorizado." });
    return sendJson(res, 200, readAppointments());
  }
  const statusMatch = url.pathname.match(/^\/api\/appointments\/([a-f0-9-]+)$/);
  if (req.method === "PATCH" && statusMatch) {
    if (!isAdmin(req)) return sendJson(res, 401, { error: "Acesso não autorizado." });
    try {
      const input = await body(req);
      const allowed = ["Pendente", "Confirmado", "Concluído", "Cancelado"];
      if (!allowed.includes(input.status)) return sendJson(res, 400, { error: "Status inválido." });
      const items = readAppointments();
      const item = items.find((entry) => entry.id === statusMatch[1]);
      if (!item) return sendJson(res, 404, { error: "Agendamento não encontrado." });
      item.status = input.status;
      item.updatedAt = new Date().toISOString();
      writeAppointments(items);
      return sendJson(res, 200, item);
    } catch (error) { return sendJson(res, 400, { error: error.message }); }
  }
  return sendJson(res, 404, { error: "Rota não encontrada." });
};

const server = http.createServer(async (req, res) => {
  securityHeaders(res);
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);
  const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const filePath = path.resolve(ROOT, requested);
  if (!filePath.startsWith(`${ROOT}${path.sep}`) && filePath !== path.join(ROOT, "index.html")) return sendJson(res, 403, { error: "Acesso negado." });
  fs.stat(filePath, (error, stat) => {
    if (error || !stat.isFile() || filePath.includes(`${path.sep}data${path.sep}`) || path.basename(filePath).startsWith(".")) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      return res.end("Página não encontrada");
    }
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream", "Cache-Control": filePath.endsWith(".html") ? "no-cache" : "public, max-age=86400" });
    fs.createReadStream(filePath).pipe(res);
  });
});

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Differenza disponível em http://localhost:${PORT}`);
    console.log(`Token administrativo: ${ADMIN_TOKEN}`);
  });
}

module.exports = { server, ADMIN_TOKEN, APPOINTMENTS_FILE };
