import crypto from "node:crypto";
import { put, get, list } from "@vercel/blob";

const ORIGIN = "https://aetasham.github.io";
const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;

function headers(res) {
  res.setHeader("Access-Control-Allow-Origin", ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Admin-Password");
  res.setHeader("Vary", "Origin");
}

function code() {
  return "AW-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

function pathFor(c) {
  return `student-passes/${c}.json`;
}

async function readStudent(c) {
  if (!TOKEN) throw new Error("Student database is not configured in Vercel. Add BLOB_READ_WRITE_TOKEN.");
  const result = await get(pathFor(c), { access: "private", token: TOKEN });
  if (!result) return null;
  const text = await new Response(result.stream).text();
  return JSON.parse(text);
}

async function saveStudent(c, student) {
  if (!TOKEN) throw new Error("Student database is not configured in Vercel. Add BLOB_READ_WRITE_TOKEN.");
  await put(pathFor(c), JSON.stringify(student), {
    access: "private",
    token: TOKEN,
    addRandomSuffix: false,
    contentType: "application/json"
  });
}

async function listStudents() {
  if (!TOKEN) throw new Error("Student database is not configured in Vercel. Add BLOB_READ_WRITE_TOKEN.");

  const result = await list({ prefix: "student-passes/", token: TOKEN });
  const students = [];

  for (const blob of result.blobs || []) {
    const match = blob.pathname.match(/^student-passes\/(AW-[A-F0-9]{8})\.json$/i);
    if (!match) continue;

    const c = match[1].toUpperCase();
    try {
      const student = await readStudent(c);
      if (student) {
        students.push({
          code: c,
          name: student.name,
          createdAt: student.createdAt,
          revoked: !!student.revoked,
          revokedAt: student.revokedAt || null
        });
      }
    } catch (e) {
      console.error("Failed to read student pass", c, e);
    }
  }

  students.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  return students;
}

function adminOK(req) {
  return !!process.env.ADMIN_PANEL_PASSWORD &&
    req.headers["x-admin-password"] === process.env.ADMIN_PANEL_PASSWORD;
}

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
      const student = await readStudent(c);
      if (!student || student.revoked) return res.status(401).json({ valid: false });
      return res.status(200).json({ valid: true, name: student.name });
    }

    if (!adminOK(req)) return res.status(401).json({ error: "Admin authentication failed." });

    if (action === "create") {
      const name = String(body.name || "").trim().slice(0, 50);
      if (!name) return res.status(400).json({ error: "Student name is required." });
      let c = code();
      while (await readStudent(c)) c = code();
      const student = { name, createdAt: new Date().toISOString(), revoked: false };
      await saveStudent(c, student);
      return res.status(200).json({ code: c, name });
    }

    if (action === "list") {
      const students = await listStudents();
      return res.status(200).json({ students });
    }

    if (action === "revoke") {
      const c = String(body.code || "").trim().toUpperCase();
      const student = await readStudent(c);
      if (!student) return res.status(404).json({ error: "Student pass not found." });
      student.revoked = true;
      student.revokedAt = new Date().toISOString();
      await saveStudent(c, student);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: "Unknown action." });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message || "Server error" });
  }
}
