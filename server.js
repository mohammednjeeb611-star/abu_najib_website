import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "ChangeMe-123!";
const WHATSAPP_NUMBER = (process.env.WHATSAPP_NUMBER || "").replace(/\D/g, "");
const sessions = new Map();

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(LEADS_FILE)) fs.writeFileSync(LEADS_FILE, "[]", "utf8");

function send(res, status, body, type = "application/json; charset=utf-8", extra = {}) {
  res.writeHead(status, { "Content-Type": type, "X-Content-Type-Options": "nosniff", "X-Frame-Options": "DENY", "Referrer-Policy": "strict-origin-when-cross-origin", ...extra });
  res.end(typeof body === "string" ? body : JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => { data += chunk; if (data.length > 100000) { reject(new Error("حجم الطلب كبير")); req.destroy(); } });
    req.on("end", () => {
      try { resolve(JSON.parse(data || "{}")); } catch { reject(new Error("بيانات غير صالحة")); }
    });
    req.on("error", reject);
  });
}
function readLeads() {
  try { return JSON.parse(fs.readFileSync(LEADS_FILE, "utf8")); } catch { return []; }
}
function saveLeads(leads) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), "utf8");
}
function getSession(req) {
  const cookie = req.headers.cookie || "";
  const token = cookie.split(";").map(x => x.trim()).find(x => x.startsWith("abunajib_session="))?.split("=")[1];
  return token && sessions.has(token) ? token : null;
}
function safeText(v, max = 500) { return String(v ?? "").trim().slice(0, max); }

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (req.method === "GET" && url.pathname === "/api/config") {
    return send(res, 200, { whatsappNumber: WHATSAPP_NUMBER });
  }
  if (req.method === "POST" && url.pathname === "/api/leads") {
    try {
      const body = await readBody(req);
      const name = safeText(body.name, 100);
      const phone = safeText(body.phone, 40);
      const service = safeText(body.service, 100);
      const details = safeText(body.details, 2000);
      if (!name || !phone || !service) return send(res, 400, { error: "يرجى إدخال الاسم ورقم التواصل ونوع الخدمة." });
      const leads = readLeads();
      const lead = { id: crypto.randomUUID(), name, phone, service, details, createdAt: new Date().toISOString(), status: "جديد" };
      leads.unshift(lead);
      saveLeads(leads);
      return send(res, 201, { ok: true, lead, whatsappNumber: WHATSAPP_NUMBER });
    } catch (e) { return send(res, 400, { error: e.message || "تعذر حفظ الطلب." }); }
  }
  if (req.method === "POST" && url.pathname === "/api/admin/login") {
    try {
      const body = await readBody(req);
      const supplied = safeText(body.password, 200);
      const a = Buffer.from(supplied), b = Buffer.from(ADMIN_PASSWORD);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return send(res, 401, { error: "كلمة المرور غير صحيحة." });
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, Date.now());
      return send(res, 200, { ok: true }, "application/json; charset=utf-8", { "Set-Cookie": `abunajib_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800` });
    } catch { return send(res, 400, { error: "تعذر تسجيل الدخول." }); }
  }
  if (req.method === "POST" && url.pathname === "/api/admin/logout") {
    const token = getSession(req); if (token) sessions.delete(token);
    return send(res, 200, { ok: true }, "application/json; charset=utf-8", { "Set-Cookie": "abunajib_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0" });
  }
  if (url.pathname.startsWith("/api/admin/")) {
    if (!getSession(req)) return send(res, 401, { error: "يلزم تسجيل الدخول." });
    if (req.method === "GET" && url.pathname === "/api/admin/leads") return send(res, 200, readLeads());
    if (req.method === "PATCH" && url.pathname.startsWith("/api/admin/leads/")) {
      try {
        const id = decodeURIComponent(url.pathname.split("/").pop());
        const body = await readBody(req);
        const leads = readLeads();
        const lead = leads.find(x => x.id === id);
        if (!lead) return send(res, 404, { error: "الطلب غير موجود." });
        lead.status = safeText(body.status, 40) || lead.status;
        saveLeads(leads);
        return send(res, 200, lead);
      } catch { return send(res, 400, { error: "تعذر تحديث الطلب." }); }
    }
    if (req.method === "DELETE" && url.pathname.startsWith("/api/admin/leads/")) {
      const id = decodeURIComponent(url.pathname.split("/").pop());
      const leads = readLeads().filter(x => x.id !== id);
      saveLeads(leads);
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: "المسار غير موجود." });
  }
  let requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname.slice(1));
  const full = path.resolve(PUBLIC, requested);
  if (!full.startsWith(path.resolve(PUBLIC) + path.sep)) return send(res, 403, "Forbidden", "text/plain; charset=utf-8");
  fs.readFile(full, (err, data) => {
    if (err) return send(res, 404, "الصفحة غير موجودة", "text/plain; charset=utf-8");
    const ext = path.extname(full);
    const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml" };
    send(res, 200, data, types[ext] || "application/octet-stream");
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`موقع أبو نجيب يعمل على http://localhost:${PORT}`);
  console.log("لوحة الإدارة: http://localhost:" + PORT + "/admin.html");
  if (ADMIN_PASSWORD === "ChangeMe-123!") console.log("تنبيه: غيّر كلمة مرور الإدارة قبل نشر الموقع على الإنترنت.");
});