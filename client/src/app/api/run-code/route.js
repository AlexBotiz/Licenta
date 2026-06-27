// Această rută API primește cod sursă și un ID de limbaj, îl trimite către Judge0 prin RapidAPI pentru a fi compilat și executat, și returnează rezultatele (stdout, stderr, compile_output și status) înapoi clientului.
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { source_code, language_id } = await request.json();
    const url = "https://judge0-ce.p.rapidapi.com/submissions?wait=true&fields=stdout,stderr,compile_output,status&base64_encoded=true";

    console.log("=== [DEBUG] TRIMITERE CĂTRE RAPIDAPI ===");
    console.log("Cheie folosită:", process.env.RAPIDAPI_KEY ? "Detectată (OK)" : "LIPSĂ ❌");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-rapidapi-key": process.env.RAPIDAPI_KEY || "",
        "x-rapidapi-host": "judge0-ce.p.rapidapi.com",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_code: Buffer.from(source_code).toString("base64"),
        language_id: language_id || 71,
      }),
    });

    const data = await response.json();
    console.log("=== [DEBUG] RĂSPUNS DIRECT JUDGE0 ===");
    console.log(data);
    console.log("=====================================");

    // Dacă RapidAPI dă o eroare de autentificare/abonament
    if (data.message) {
      return NextResponse.json({ 
        status: { id: 0 }, 
        stderr: `Eroare API Gateway: ${data.message}` 
      });
    }

    const stdout = data.stdout ? Buffer.from(data.stdout, "base64").toString("utf-8") : null;
    const stderr = data.stderr ? Buffer.from(data.stderr, "base64").toString("utf-8") : null;
    const compile_output = data.compile_output ? Buffer.from(data.compile_output, "base64").toString("utf-8") : null;
    
    return NextResponse.json({
      stdout,
      stderr,
      compile_output,
      status: data.status,
    });

  } catch (error) {
    console.error("Eroare server local:", error);
    return NextResponse.json({ error: "Eroare la procesarea codului." }, { status: 500 });
  }
}