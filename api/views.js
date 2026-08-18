import { get, put } from "@vercel/blob";

const ORIGIN = "https://aetasham.github.io";
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const FILE = "analytics/views.json";

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password");
  res.setHeader("Vary", "Origin");
}

function todayIST() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

async function readStats() {
  if (!TOKEN) throw new Error("Student database is not configured in Vercel. Add BLOB_READ_WRITE_TOKEN.");
  const result = await get(FILE, { access: "private", token: TOKEN });
  if (!result) return { totalViews: 0, uniqueVisitors: [], daily: {} };
  return JSON.parse(await new Response(result.stream).text());
}

async function saveStats(stats) {
  await put(FILE, JSON.stringify(stats), {
    access: "private",
    token: TOKEN,
    addRandomSuffix: false,
    contentType: "application/json"
  });
}

function adminOK(req) {
  return !!process.env.ADMIN_PANEL_PASSWORD &&
    req.headers["x-admin-password"] === process.env.ADMIN_PANEL_PASSWORD;
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const action = body.action;

    if (action === "track") {
      const visitorId = String(body.visitorId || "").slice(0, 100);
      if (!visitorId) return res.status(400).json({ error: "visitorId is required" });

      const stats = await readStats();
      const day = todayIST();
      stats.totalViews = Number(stats.totalViews || 0) + 1;
      stats.daily = stats.daily || {};
      stats.daily[day] = Number(stats.daily[day] || 0) + 1;
      stats.uniqueVisitors = Array.isArray(stats.uniqueVisitors) ? stats.uniqueVisitors : [];

      if (!stats.uniqueVisitors.includes(visitorId)) {
        stats.uniqueVisitors.push(visitorId);
      }

      // Keep the private visitor list bounded.
      if (stats.uniqueVisitors.length > 10000) {
        stats.uniqueVisitors = stats.uniqueVisitors.slice(-10000);
      }

      await saveStats(stats);
      return res.status(200).json({ ok: true });
    }

    if (action === "stats") {
      if (!adminOK(req)) return res.status(401).json({ error: "Admin authentication failed." });
      const stats = await readStats();
      const day = todayIST();
      return res.status(200).json({
        totalViews: Number(stats.totalViews || 0),
        todayViews: Number((stats.daily || {})[day] || 0),
        uniqueVisitors: Array.isArray(stats.uniqueVisitors) ? stats.uniqueVisitors.length : 0
      });
    }

    return res.status(400).json({ error: "Unknown action." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
