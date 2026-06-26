import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req) {
  const { messages } = await req.json();
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ 
    model: "gemini-pro",
    systemInstruction: "Ești un mentor de programare. Nu oferi codul complet, oferă indicii și ghidează studentul."
  });

  // 1. Filtrăm mesajele ca să ne asigurăm că încep cu 'user'
  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'ai' ? 'model' : 'user',
    parts: [{ text: m.text }],
  }));

  // 2. Eliminăm eventualele mesaje de tip 'model' care apar pe prima poziție
  const validHistory = [];
  let foundUser = false;
  for (const entry of history) {
    if (entry.role === 'user') foundUser = true;
    if (foundUser) validHistory.push(entry);
  }

  const chat = model.startChat({
    history: validHistory,
  });

  const result = await chat.sendMessage(messages[messages.length - 1].text);
  return Response.json({ text: result.response.text() });
}