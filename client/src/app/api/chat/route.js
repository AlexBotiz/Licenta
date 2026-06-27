// Această rută API primește un mesaj de la client, preia prompt-ul sistemului și lecțiile cursului din Supabase, construiește un context și trimite totul către Ollama pentru a genera un răspuns bazat pe AI. Răspunsul este apoi returnat clientului.
import { createClient } from '@supabase/supabase-js';

// Inițializează clientul aici, folosind variabilele de mediu
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  const { messages, courseId } = await req.json();
  const userMessage = messages[messages.length - 1].text;

  // Luăm prompt-ul sistemului ȘI toate lecțiile cursului
  const { data: course, error } = await supabase
    .from('courses')
    .select('ai_system_prompt')
    .eq('id', courseId)
    .single();

  const { data: elements } = await supabase
    .from('course_elements')
    .select('title, content')
    .eq('course_id', courseId)
    .order('order_index', { ascending: true });

  // Construim contextul din lecții
  const context = elements
    .map(el => `Titlu: ${el.title}\nConținut: ${el.content.body || el.content.instruction || ""}`)
    .join("\n---\n");

  const systemInstruction = course?.ai_system_prompt || "Ești un mentor de programare.";

  // Trimiterea către Ollama cu tot contextul cursului
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: "llama3",
      prompt: `
        INSTRUCȚIUNI: ${systemInstruction}
        
        CONȚINUTUL CURSULUI (Folosește aceste informații pentru a răspunde):
        ${context}
        
        ÎNTREBAREA STUDENTULUI: ${userMessage}
      `,
      stream: false
    })
  });

  const data = await response.json();
  return Response.json({ text: data.response });
}