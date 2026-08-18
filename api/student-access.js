import crypto from "node:crypto";

const ORIGIN = "https://aetasham.github.io";
const URL = process.env.KV_REST_API_URL;
const TOKEN = process.env.KV_REST_API_TOKEN;

function headers(res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password");
  res.setHeader("Vary", "Origin");
}
function hash(v) { return crypto.createHash("sha256").update(v || "").digest("hex"); }
function code() { return "AW-" + crypto.randomBytes(4).toString("hex").toUpperCase(); }
async function redis(command) {
  if (!URL || !TOKEN) throw new Error("Student database is not configured in Vercel.");
  const r = await fetch(`${URL}/${command.map(encodeURIComponent).join("/")}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  const data = await r.json();
  if (!r.ok || data.error) throw new Error(data.error || "Database request failed");
  return data.result;
}
function adminOK(req) { return !!process.env.ADMIN_PANEL_PASSWORD && req.headers["x-admin-password"] === process.env.ADMIN_PANEL_PASSWORD; }

export default async function handler(req, res) {
  headers(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const action = body.action;

    if (action === "verify") {
      const c = String(body.code || "").trim().toUpperCase();
      if (!/^AW-[A-F0-9]{8}$/.test(c)) return res.status(401).json({ valid: false });
      const raw = await redis(["GET", `student:${c}`]);
      if (!raw) return res.status(401).json({ valid: false });
      const student = JSON.parse(raw);
      if (student.revoked) return res.status(401).json({ valid: false });
      return res.status(200).json({ valid: true, name: student.name });
    }

    if (!adminOK(req)) return res.status(401).json({ error: "Admin authentication failed." });

    if (action === "create") {
      const name = String(body.name || "").trim().slice(0, 50);
      if (!name) return res.status(400).json({ error: "Student name is required." });
      let c = code();
      while (await redis(["EXISTS", `student:${c}`])) c = code();
      const student = { name, createdAt: new Date().toISOString(), revoked: false };
      await redis(["SET", `student:${c}`, JSON.stringify(student)]);
      await redis(["SADD", "students:index", c]);
      return res.status(200).json({ code: c, name });
    }

    if (action === "list") {
      const codes = await redis(["SMEMBERS", "students:index"]);
      const students = [];
      for (const c of codes || []) {
        const raw = await redis(["GET", `student:${c}`]);
        if (raw) students.push({ code: c, ...JSON.parse(raw) });
      }
      students.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
      return res.status(200).json({ students });
    }

    if (action === "revoke") {
      const c = String(body.code || "").trim().toUpperCase();
      const raw = await redis(["GET", `student:${c}`]);
      if (!raw) return res.status(404).json({ error: "Student pass not found." });
      const student = JSON.parse(raw); student.revoked = true; student.revokedAt = new Date().toISOString();
      await redis(["SET", `student:${c}`, JSON.stringify(student)]);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
