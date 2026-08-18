const ALLOWED_ORIGIN = "https://aetasham.github.io";

const answers = [
  { keys: ["current ratio", "cr ratio"], answer: "Current Ratio = Current Assets ÷ Current Liabilities. A commonly used textbook benchmark is 2:1, but the suitable ratio depends on the business." },
  { keys: ["quick ratio", "liquid ratio", "acid test"], answer: "Quick Ratio = Quick Assets ÷ Current Liabilities. Quick Assets generally exclude inventory and prepaid expenses. The commonly cited textbook benchmark is 1:1." },
  { keys: ["working capital"], answer: "Working Capital = Current Assets − Current Liabilities. It shows the short-term funds available for day-to-day business operations." },
  { keys: ["accounting equation", "accounting eq"], answer: "Accounting Equation: Assets = Capital + Liabilities. Every business transaction keeps this equation balanced." },
  { keys: ["depreciation"], answer: "Depreciation is the systematic reduction in the recorded value of a depreciable asset over its useful life because of use, time, or obsolescence." },
  { keys: ["goodwill"], answer: "Goodwill is an intangible asset representing the value of a business's reputation and other advantages that help it earn higher profits than expected." },
  { keys: ["partnership"], answer: "Partnership is an agreement between persons who agree to carry on a business and share its profits, subject to the applicable partnership law and their agreement." },
  { keys: ["sole proprietorship", "sole trader"], answer: "Sole proprietorship is a business owned and controlled by one person. The owner generally bears the business risk and receives the profits." },
  { keys: ["management", "what is management"], answer: "Management is the process of getting things done effectively and efficiently through and with people to achieve organisational goals." },
  { keys: ["planning"], answer: "Planning means deciding in advance what is to be done, how it is to be done, when it is to be done, and by whom it is to be done." },
  { keys: ["organising"], answer: "Organising is the process of identifying and grouping work, assigning duties, establishing relationships, and arranging resources to achieve objectives." },
  { keys: ["staffing"], answer: "Staffing is concerned with obtaining, developing, and maintaining the right people for different jobs in an organisation." },
  { keys: ["directing"], answer: "Directing involves guiding, instructing, motivating, and leading employees so that organisational objectives are achieved." },
  { keys: ["controlling"], answer: "Controlling is the process of comparing actual performance with planned standards, finding deviations, and taking corrective action." },
  { keys: ["marketing", "marketing management"], answer: "Marketing is the process of identifying customer needs and creating, communicating, delivering, and exchanging offerings that provide value to customers." },
  { keys: ["4ps", "4 ps", "marketing mix"], answer: "The traditional 4 Ps of the marketing mix are Product, Price, Place, and Promotion." },
  { keys: ["national income"], answer: "National income is the monetary value of the final goods and services produced by the normal residents of a country during an accounting year, depending on the specific measure used." },
  { keys: ["gdp", "gross domestic product"], answer: "GDP stands for Gross Domestic Product. It measures the monetary value of final goods and services produced within a country's domestic territory during a given period." },
  { keys: ["inflation"], answer: "Inflation is a sustained rise in the general price level of goods and services, which reduces the purchasing power of money." },
  { keys: ["demand"], answer: "Demand refers to the quantity of a commodity that consumers are willing and able to buy at different prices during a given period, other things remaining constant." },
  { keys: ["supply"], answer: "Supply refers to the quantity of a commodity that sellers are willing and able to offer for sale at different prices during a given period, other things remaining constant." },
  { keys: ["sql", "structured query language"], answer: "SQL stands for Structured Query Language. It is used to create, retrieve, update, and manage data in relational databases." },
  { keys: ["pandas"], answer: "Pandas is a Python library commonly used for data manipulation and analysis. Its important structures include Series and DataFrame." },
  { keys: ["full form of cpu"], answer: "CPU stands for Central Processing Unit." },
  { keys: ["full form of ip"], answer: "In Class 12 Informatics Practices, IP commonly stands for Informatics Practices." }
];

function answerQuestion(question) {
  const q = question.toLowerCase().replace(/[^a-z0-9+ ]/g, " ").replace(/\s+/g, " ").trim();
  if (!q) return "Please type a Class 12 Commerce question.";
  for (const item of answers) {
    if (item.keys.some(key => q.includes(key))) return item.answer;
  }
  if (/hello|hi|hey|namaste/.test(q)) return "👋 Hi! I’m Aetasham AI. Ask me about Accountancy, Business Studies, Economics, or Informatics Practices.";
  if (/help|what can you do|topics/.test(q)) return "I can answer basic Class 12 Commerce questions on ratios, accounting, management, marketing, economics, SQL, Pandas, and common full forms. Try: ‘What is current ratio?’";
  return "I’m currently in Offline Study Mode, so I can answer basic Class 12 Commerce questions from my built-in study guide. Try asking about Current Ratio, Working Capital, GDP, Inflation, Management, Marketing Mix, SQL, or Pandas.";
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Vary", "Origin");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message) return res.status(400).json({ error: "Message is required." });
  if (message.length > 1200) return res.status(413).json({ error: "Message is too long." });

  return res.status(200).json({
    answer: answerQuestion(message),
    mode: "offline"
  });
}
