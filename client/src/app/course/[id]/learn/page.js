"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

// 🎥 FUNCȚIE HELPER: Extrage ID-ul video-ului și generează link-ul corect pentru Embed în player
const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
};

export default function CoursePlayerPage({ params }) {
  const router = useRouter();
  
  // Rezolvare eroare Next.js 15+: despachetarea params ca Promise
  const unwrappedParams = React.use(params);
  const courseId = unwrappedParams.id;

  const [course, setCourse] = useState(null);
  const [elements, setElements] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Stări pentru interacțiunea studentului cu exercițiile și quiz-urile
  const [quizSelectedOption, setQuizSelectedOption] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState(null); // 'corect' sau 'incorect'
  const [exerciseCode, setExerciseCode] = useState("");
  const [exerciseFeedback, setExerciseFeedback] = useState(null);

  useEffect(() => {
    async function loadCourseAndElements() {
      try {
        setLoading(true);

        // 1. Luăm datele generale ale cursului
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .maybeSingle();

        if (courseError) throw courseError;
        setCourse(courseData);

        // 2. Luăm toate elementele (slide-urile) în ordinea corectă (order_index)
        const { data: elementsData, error: elementsError } = await supabase
          .from("course_elements")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true });

        if (elementsError) throw elementsError;
        setElements(elementsData || []);

        // Inițializăm codul pentru exercițiu dacă primul element e exercițiu
        if (elementsData && elementsData[0]?.type === "exercise") {
          setExerciseCode(elementsData[0].content.placeholderCode || "");
        }

      } catch (err) {
        console.error("Eroare la încărcarea cursului:", err);
      } finally {
        loading && setLoading(false);
      }
    }

    if (courseId) {
      loadCourseAndElements();
    }
  }, [courseId]);

  // Resetăm feedback-ul când studentul schimbă slide-ul
  useEffect(() => {
    setQuizSelectedOption(null);
    setQuizFeedback(null);
    setExerciseFeedback(null);
    
    if (elements[currentStepIndex]?.type === "exercise") {
      setExerciseCode(elements[currentStepIndex].content.placeholderCode || "");
    }
  }, [currentStepIndex, elements]);

  // Validare Quiz
  const handleVerifyQuiz = () => {
    const currentElement = elements[currentStepIndex];
    if (quizSelectedOption === null) {
      alert("Te rog selectează o variantă de răspuns!");
      return;
    }

    if (parseInt(quizSelectedOption) === currentElement.content.correctAnswerIndex) {
      setQuizFeedback("corect");
    } else {
      setQuizFeedback("incorect");
    }
  };

  // Validare Exercițiu (Simulare pentru licență)
  const handleVerifyExercise = () => {
    if (!exerciseCode.trim()) {
      alert("Scrie codul înainte de a-l verifica!");
      return;
    }
    setExerciseFeedback("Codul a fost trimis cu succes! Compilarea a rulat fără erori.");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">Se încarcă interfața de studiu...</div>;
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-black space-y-4">
        <p className="text-gray-500 font-medium">Cursul căutat nu a fost găsit sau a fost șters.</p>
        <button onClick={() => router.push("/")} className="text-sm bg-blue-600 text-white px-4 py-2 rounded-xl font-bold">Înapoi pe prima pagină</button>
      </div>
    );
  }

  const currentElement = elements[currentStepIndex];

  // Helper pentru a extrage explicația opțiunii selectate în mod sigur
  const getSelectedOptionExplanation = () => {
    if (quizSelectedOption === null || !currentElement?.content?.options) return null;
    const selectedOpt = currentElement.content.options[parseInt(quizSelectedOption)];
    return selectedOpt && typeof selectedOpt === "object" ? selectedOpt.explanation : null;
  };

  const currentExplanation = getSelectedOptionExplanation();

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans flex flex-col h-screen">
      
      {/* NAVBAR TOP */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/")} className="text-xs font-bold text-gray-500 hover:text-black bg-gray-100 px-3 py-1.5 rounded-lg transition">
            ✕ Ieși din Curs
          </button>
          <div>
            <h1 className="text-sm font-bold text-gray-900 line-clamp-1">{course.title}</h1>
            <p className="text-[11px] text-gray-400">Mod învățare activ</p>
          </div>
        </div>
        <div className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl border border-blue-100">
          Pasul {elements.length > 0 ? currentStepIndex + 1 : 0} din {elements.length}
        </div>
      </header>

      {/* BODY LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR STÂNGA */}
        <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto hidden md:block p-4 space-y-3">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Conținut Curs</h3>
          <div className="space-y-1">
            {elements.map((elem, idx) => (
              <button
                key={elem.id}
                onClick={() => setCurrentStepIndex(idx)}
                className={`w-full p-3 rounded-xl text-left transition flex items-start gap-3 ${
                  currentStepIndex === idx
                    ? "bg-blue-600 text-white shadow-md shadow-blue-100"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                <span className="text-base">
                  {elem.type === "lesson" && "📄"}
                  {elem.type === "exercise" && "💻"}
                  {elem.type === "quiz" && "❓"}
                </span>
                <div className="truncate">
                  <p className="text-xs font-bold opacity-80 uppercase text-[10px]">Pasul {idx + 1}</p>
                  <p className="text-sm font-bold truncate">{elem.title}</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* SPATIUL CENTRAL */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-12 flex justify-center">
          <div className="max-w-3xl w-full">
            
            {elements.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-gray-200 space-y-2 shadow-2xs">
                <span className="text-4xl">🚧</span>
                <h2 className="text-lg font-bold text-gray-800">Curs în construcție</h2>
                <p className="text-sm text-gray-400">Acest curs nu are încă slide-uri sau lecții adăugate de profesor.</p>
              </div>
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6 min-h-[450px] flex flex-col justify-between">
                
                <div className="space-y-4 flex-1">
                  <div className="border-b border-gray-100 pb-4">
                    <span className="text-[10px] font-bold uppercase bg-gray-100 px-2.5 py-1 rounded-md text-gray-600 border border-gray-200">
                      {currentElement.type}
                    </span>
                    <h2 className="text-2xl font-bold text-gray-900 mt-2">{currentElement.title}</h2>
                  </div>

                  {/* 1. RANDARE LECȚIE */}
                  {currentElement.type === "lesson" && (
                    <div className="space-y-6 pt-2">
                      {currentElement.content.videoUrl && getYouTubeEmbedUrl(currentElement.content.videoUrl) && (
                        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-gray-200 shadow-md bg-black">
                          <iframe
                            className="w-full h-full"
                            src={getYouTubeEmbedUrl(currentElement.content.videoUrl)}
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      )}
                      <div className="text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
                        {currentElement.content.body}
                      </div>
                    </div>
                  )}

                  {/* 2. RANDARE EXERCIȚIU */}
                  {currentElement.type === "exercise" && (
                    <div className="space-y-4 pt-2">
                      <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl text-sm text-purple-900 font-medium">
                        <strong>Cerință:</strong> {currentElement.content.instruction}
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Editor de Cod</label>
                        <textarea
                          value={exerciseCode}
                          onChange={(e) => setExerciseCode(e.target.value)}
                          className="w-full p-4 border border-gray-300 rounded-xl font-mono text-sm bg-gray-900 text-green-400 focus:outline-none min-h-[180px]"
                        />
                      </div>
                      <button 
                        onClick={handleVerifyExercise}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
                      >
                        Rulează și Verifică Codul
                      </button>
                      
                      {exerciseFeedback && (
                        <div className="p-3 bg-green-50 border border-green-200 text-green-800 text-xs rounded-xl font-medium">
                          ✅ {exerciseFeedback}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 3. ❓ RANDARE QUIZ (MODIFICATĂ) */}
                  {currentElement.type === "quiz" && (
                    <div className="space-y-5 pt-2">
                      <p className="text-lg font-bold text-gray-800">{currentElement.content.question}</p>
                      
                      <div className="space-y-2">
                        {currentElement.content.options.map((option, oIdx) => {
                          // Suportă ambele cazuri: noua structură {text} sau cea veche string simplu
                          const optionText = typeof option === "object" ? option.text : option;
                          
                          return (
                            <label 
                              key={oIdx}
                              className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition ${
                                quizSelectedOption === String(oIdx)
                                  ? "border-blue-500 bg-blue-50/40"
                                  : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                              }`}
                            >
                              <input 
                                type="radio" 
                                name="quiz-options" 
                                value={oIdx}
                                checked={quizSelectedOption === String(oIdx)}
                                onChange={(e) => setQuizSelectedOption(e.target.value)}
                                className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm font-semibold text-gray-800">{optionText}</span>
                            </label>
                          );
                        })}
                      </div>

                      <button 
                        onClick={handleVerifyQuiz}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
                      >
                        Trimite Răspunsul
                      </button>

                      {/* FEEDBACK CU INJECTARE DE EXPLICAȚIE DINAMICĂ */}
                      {quizFeedback === "corect" && (
                        <div className="p-4 bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl font-bold flex flex-col gap-1.5 shadow-xs">
                          <div className="flex items-center gap-2">
                            <span>🎉</span> Excelent! Răspunsul tău este corect.
                          </div>
                          {currentExplanation && (
                            <div className="text-xs font-normal text-green-700 border-t border-green-200/60 pt-2 mt-1 italic">
                              <strong>Explicație:</strong> {currentExplanation}
                            </div>
                          )}
                        </div>
                      )}

                      {quizFeedback === "incorect" && (
                        <div className="p-4 bg-red-50 border border-red-200 text-red-800 text-sm rounded-xl font-bold flex flex-col gap-1.5 shadow-xs">
                          <div className="flex items-center gap-2">
                            <span>❌</span> Răspuns greșit. Mai încearcă o dată!
                          </div>
                          {currentExplanation && (
                            <div className="text-xs font-normal text-red-700 border-t border-red-200/60 pt-2 mt-1 italic">
                              <strong>De ce ai greșit:</strong> {currentExplanation}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* ZONA DE NAVIGARE (JOSUL CARDULUI) */}
                <div className="border-t border-gray-100 pt-6 mt-8 flex justify-between items-center shrink-0">
                  <button
                    disabled={currentStepIndex === 0}
                    onClick={() => setCurrentStepIndex(currentStepIndex - 1)}
                    className="text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 px-4 py-2.5 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    ← Înapoi
                  </button>

                  {currentStepIndex < elements.length - 1 ? (
                    <button
                      onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                      className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-xl transition shadow-xs"
                    >
                      Următorul Pas →
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        alert("Felicitări! Ai finalizat cu succes toate modulele acestui curs.");
                        router.push("/");
                      }}
                      className="text-xs font-bold text-white bg-green-600 hover:bg-green-700 px-5 py-2.5 rounded-xl transition shadow-md shadow-green-100"
                    >
                      🏆 Finalizează Cursul
                    </button>
                  )}
                </div>

              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}