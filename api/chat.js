import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ALLOWED_ORIGIN = "https://aetasham.github.io";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "AI service is not configured yet." });
  }

  try {
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) return res.status(400).json({ error: "Message is required." });
    if (message.length > 1200) return res.status(413).json({ error: "Message is too long." });

    const response = await client.responses.create({
      model: "gpt-5.6",
      instructions:
        "You are Aetasham AI, a friendly Class 12 Commerce study assistant. Help with Accountancy, Business Studies, Economics and Informatics Practices. Explain concepts clearly for school students, give definitions, meanings, formulas, full forms, examples and exam-focused points. Do not claim to be a human teacher. If a question is unrelated to study, politely redirect to studies.",
      input: message,
      max_output_tokens: 700
    });

    return res.status(200).json({ answer: response.output_text || "Sorry, I could not generate an answer." });
  } catch (error) {
    console.error("OpenAI request failed:", error);
    return res.status(500).json({ error: "AI service is temporarily unavailable." });
  }
}
