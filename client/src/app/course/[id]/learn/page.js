"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

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
  const unwrappedParams = React.use(params);
  const courseId = unwrappedParams.id;
  
  const [course, setCourse] = useState(null);
  const [elements, setElements] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [quizSelectedOption, setQuizSelectedOption] = useState(null);
  const [quizFeedback, setQuizFeedback] = useState(null);
  const [exerciseCode, setExerciseCode] = useState("");
  const [exerciseFeedback, setExerciseFeedback] = useState(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [savedAnswers, setSavedAnswers] = useState({});

  // 🤖 STATE PENTRU ASISTENTUL AI
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([
    { role: "ai", text: "Salut! Sunt asistentul tău AI. Ai nevoie de ajutor cu acest exercițiu sau vrei să îți explic ceva din lecție?" }
  ]);

  useEffect(() => {
    async function loadCourseAndElements() {
      try {
        setLoading(true);
        const { data: courseData, error: courseError } = await supabase
          .from("courses")
          .select("*")
          .eq("id", courseId)
          .maybeSingle();

        if (courseError) throw courseError;
        setCourse(courseData);
        const { data: elementsData, error: elementsError } = await supabase
          .from("course_elements")
          .select("*")
          .eq("course_id", courseId)
          .order("order_index", { ascending: true });

        if (elementsError) throw elementsError;
        setElements(elementsData || []);

        if (elementsData && elementsData[0]?.type === "exercise") {
          setExerciseCode(elementsData[0].content.placeholderCode || "");
        }
      } catch (err) {
        console.error("Eroare la încărcarea cursului:", err);
      } finally {
        setLoading(false);
      }
    }
    if (courseId) loadCourseAndElements();
  }, [courseId]);

  useEffect(() => {
    const currentElem = elements[currentStepIndex];
    if (!currentElem) return;

    const saved = savedAnswers[currentElem.id];

    if (currentElem.type === "exercise") {
      setExerciseCode(saved?.code ?? (currentElem.content.placeholderCode || ""));
      setExerciseFeedback(saved?.exerciseFeedback ?? null);
      setQuizSelectedOption(null);
      setQuizFeedback(null);
    } else if (currentElem.type === "quiz") {
      setQuizSelectedOption(saved?.quizOption ?? null);
      setQuizFeedback(saved?.quizFeedback ?? null);
      setExerciseCode("");
      setExerciseFeedback(null);
    } else {
      setQuizSelectedOption(null);
      setQuizFeedback(null);
      setExerciseCode("");
      setExerciseFeedback(null);
    }
  }, [currentStepIndex, elements]);

  const isStepCompleted = (idx) => {
    const elem = elements[idx];
    if (!elem) return false;
    if (elem.type === "lesson") return true; 

    const saved = savedAnswers[elem.id];
    
    if (elem.type === "quiz") {
      return quizFeedback === "corect" || saved?.quizFeedback === "corect";
    }
    
    if (elem.type === "exercise") {
      return exerciseFeedback?.isCorrect === true || saved?.exerciseFeedback?.isCorrect === true;
    }
    
    return false;
  };

  const handleSidebarStepClick = (targetIdx) => {
    if (targetIdx <= currentStepIndex) {
      setCurrentStepIndex(targetIdx);
      return;
    }
    
    for (let i = currentStepIndex; i < targetIdx; i++) {
      if (!isStepCompleted(i)) {
        alert("Trebuie să finalizezi corect exercițiile sau quiz-urile din urmă înainte de a trece mai departe!");
        return;
      }
    }
    setCurrentStepIndex(targetIdx);
  };

  const handleVerifyQuiz = () => {
    const currentElement = elements[currentStepIndex];
    if (quizSelectedOption === null) {
      alert("Te rog selectează o variantă de răspuns!");
      return;
    }

    const feedbackValue = parseInt(quizSelectedOption) === currentElement.content.correctAnswerIndex ? "corect" : "incorect";
    setQuizFeedback(feedbackValue);

    setSavedAnswers(prev => ({
      ...prev,
      [currentElement.id]: {
        ...prev[currentElement.id],
        quizOption: quizSelectedOption,
        quizFeedback: feedbackValue
      }
    }));
  };

  const handleVerifyExercise = async () => {
    if (!exerciseCode.trim()) {
      alert("Scrie codul înainte de a-l verifica!");
      return;
    }

    const currentElement = elements[currentStepIndex];
    setIsCompiling(true);
    setExerciseFeedback(null);

    try {
      const res = await fetch("/api/run-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_code: exerciseCode,
          language_id: currentElement.content.languageId || 71, 
        }),
      });

      const result = await res.json();
      let feedbackObj = { statusId: result.status?.id, text: "", isCorrect: false };

      if (result.status?.id === 3) {
        const actualOutput = (result.stdout || "").trim();
        const expectedOutputRaw = 
          currentElement.content.expectedOutput ?? 
          currentElement.content.expected_output ?? 
          currentElement.content.correct_output ?? 
          currentElement.content.output_asteptat;

        if (expectedOutputRaw !== undefined && expectedOutputRaw !== null) {
          const expectedOutput = String(expectedOutputRaw).trim();

          if (actualOutput === expectedOutput) {
            feedbackObj.text = result.stdout || "Codul a rulat cu succes și rezultatul este cel corect! 🎉";
            feedbackObj.isCorrect = true;
          } else {
            feedbackObj.text = `❌ Rezultat incorect!\n\nOutput-ul codului tău:\n"${actualOutput || "(fără afișare/print)"}"\n\nOutput-ul așteptat de exercițiu:\n"${expectedOutput}"`;
            feedbackObj.isCorrect = false;
          }
        } else {
          feedbackObj.text = "⚠️ Eroare Configurare Curs: Profesorul nu a definit un output așteptat (expectedOutput) în baza de date pentru acest exercițiu. Contactează administratorul.";
          feedbackObj.isCorrect = false;
        }
      } else if (result.status?.id === 6) {
        feedbackObj.text = `Eroare de compilare/sintaxă:\n${result.compile_output}`;
        feedbackObj.isCorrect = false;
      } else {
        feedbackObj.text = `Eroare la rulare (Runtime Error):\n${result.stderr || "Ceva nu a mers bine în timpul execuției."}`;
        feedbackObj.isCorrect = false;
      }

      setExerciseFeedback(feedbackObj);

      setSavedAnswers(prev => ({
        ...prev,
        [currentElement.id]: {
          ...prev[currentElement.id],
          code: exerciseCode,
          exerciseFeedback: feedbackObj
        }
      }));

    } catch (err) {
      console.error(err);
      setExerciseFeedback({ statusId: 0, text: "A apărut o eroare de conexiune cu serverul de compilare.", isCorrect: false });
    } finally {
      setIsCompiling(false);
    }
  };

const handleSendChatMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    
    const newMessages = [...chatMessages, { role: "user", text: chatInput }];
    setChatMessages(newMessages);
    setChatInput("");

    try {
          const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            messages: newMessages,
            courseId: courseId // Trimitem ID-ul cursului curent
          }),
        });

      const data = await response.json();
      setChatMessages(prev => [...prev, { role: "ai", text: data.text }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: "ai", text: "Eroare la conectarea cu AI-ul." }]);
    }
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

  const getSelectedOptionExplanation = () => {
    if (quizSelectedOption === null || !currentElement?.content?.options) return null;
    const selectedOpt = currentElement.content.options[parseInt(quizSelectedOption)];
    return selectedOpt && typeof selectedOpt === "object" ? selectedOpt.explanation : null;
  };

  const currentExplanation = getSelectedOptionExplanation();
  const isCurrentCompleted = isStepCompleted(currentStepIndex);

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans flex flex-col h-screen relative">
      
      {/* NAVBAR TOP */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shrink-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/")} className="text-xs font-bold text-gray-500 hover:text-black bg-gray-100 px-3 py-1.5 rounded-lg transition">
            ✕ Ieși din Curs
          </button>
          <div>
            <h1 className="text-sm font-bold text-gray-900 line-clamp-1">{course.title}</h1>
            <p className="text-[11px] text-gray-400">Mod învățare activă</p>
          </div>
        </div>
        <div className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-xl border border-blue-100">
          Pasul {elements.length > 0 ? currentStepIndex + 1 : 0} din {elements.length}
        </div>
      </header>

      {/* BODY LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SIDEBAR STÂNGA */}
        <aside className="w-80 bg-white border-r border-gray-200 overflow-y-auto hidden md:block p-4 space-y-3 z-10">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">Conținut Curs</h3>
          <div className="space-y-1">
            {elements.map((elem, idx) => {
              const active = currentStepIndex === idx;
              return (
                <button
                  key={elem.id}
                  onClick={() => handleSidebarStepClick(idx)}
                  className={`w-full p-3 rounded-xl text-left transition flex items-start gap-3 ${
                    active
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
              );
            })}
          </div>
        </aside>

        {/* SPATIUL CENTRAL */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 md:p-12 flex justify-center pb-24">
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

                  {/* RANDARE LECȚIE */}
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

                  {/* RANDARE EXERCIȚIU */}
                  {currentElement.type === "exercise" && (
                    <div className="space-y-4 pt-2">
                      <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl text-sm text-purple-900 font-medium">
                        <strong>Cerință:</strong> {currentElement.content.instruction}
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Editor de Cod</label>
                        <textarea
                          value={exerciseCode}
                          disabled={isCompiling}
                          onChange={(e) => {
                            const val = e.target.value;
                            setExerciseCode(val);
                            setExerciseFeedback(null);
                            setSavedAnswers(prev => ({
                              ...prev,
                              [currentElement.id]: { 
                                ...prev[currentElement.id], 
                                code: val,
                                exerciseFeedback: null 
                              }
                            }));
                          }}
                          className="w-full p-4 border border-gray-300 rounded-xl font-mono text-sm bg-gray-900 text-green-400 focus:outline-none min-h-[180px] disabled:opacity-75"
                        />
                      </div>
                      <button 
                        onClick={handleVerifyExercise}
                        disabled={isCompiling}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow-xs disabled:bg-purple-400 disabled:cursor-not-allowed"
                      >
                        {isCompiling ? "Se compilează și rulează..." : "Rulează și Verifică Codul"}
                      </button>
                      
                      {exerciseFeedback && (
                        <div className={`p-4 rounded-xl font-mono text-xs whitespace-pre-wrap border ${
                          exerciseFeedback.isCorrect 
                            ? "bg-gray-900 text-green-400 border-gray-800" 
                            : "bg-red-50 text-red-700 border-red-200" 
                        }`}>
                          <div className="font-bold mb-1 uppercase text-[10px] tracking-wider opacity-60">
                            {exerciseFeedback.isCorrect ? "🖥️ Ieșire Consolă (Stdout):" : "❌ Alertă Sistem / Rezultat:"}
                          </div>
                          {exerciseFeedback.text}
                        </div>
                      )}
                    </div>
                  )}

                  {/* RANDARE QUIZ */}
                  {currentElement.type === "quiz" && (
                    <div className="space-y-5 pt-2">
                      <p className="text-lg font-bold text-gray-800">{currentElement.content.question}</p>
                      
                      <div className="space-y-2">
                        {currentElement.content.options.map((option, oIdx) => {
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
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setQuizSelectedOption(val);
                                  setSavedAnswers(prev => ({
                                    ...prev,
                                    [currentElement.id]: { ...prev[currentElement.id], quizOption: val }
                                  }));
                                }}
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
                
                {/* ZONA DE NAVIGARE */}
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
                      onClick={() => {
                        if (isCurrentCompleted) {
                          setCurrentStepIndex(currentStepIndex + 1);
                        } else {
                          alert("Trebuie să rezolvi corect cerința (exercițiul sau quiz-ul) înainte de a trece la următorul pas!");
                        }
                      }}
                      className={`text-xs font-bold text-white px-5 py-2.5 rounded-xl transition shadow-xs ${
                        isCurrentCompleted 
                          ? "bg-blue-600 hover:bg-blue-700 cursor-pointer" 
                          : "bg-gray-400 cursor-not-allowed opacity-60"
                      }`}
                    >
                      Următorul Pas →
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        if (isCurrentCompleted) {
                          alert("Felicitări! Ai finalizat cu succes toate modulele acestui curs.");
                          router.push("/");
                        } else {
                          alert("Trebuie să rezolvi corect cerința curentă înainte de a finaliza cursul!");
                        }
                      }}
                      className={`text-xs font-bold text-white px-5 py-2.5 rounded-xl transition shadow-md ${
                        isCurrentCompleted 
                          ? "bg-green-600 hover:bg-green-700 shadow-green-100 cursor-pointer" 
                          : "bg-gray-400 cursor-not-allowed opacity-60"
                      }`}
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

      {/* 🤖 CHATBOT AI WIDGET (Plutitor dreapta-jos) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {/* Fereastra de Chat */}
        {isChatOpen && (
          <div className="mb-4 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden transition-all duration-300 ease-in-out origin-bottom-right" style={{ height: "500px", maxHeight: "75vh" }}>
            
            {/* Header Chat */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex justify-between items-center text-white shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <div>
                  <h3 className="font-bold text-sm leading-tight">Asistent AI</h3>
                  <p className="text-[10px] opacity-80">Gata să te ajute la cod</p>
                </div>
              </div>
              <button 
                onClick={() => setIsChatOpen(false)}
                className="text-white hover:text-blue-100 transition rounded-full p-1 hover:bg-white/20"
              >
                ✕
              </button>
            </div>

            {/* Zona de Mesaje */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] p-3 text-sm rounded-2xl shadow-sm ${
                    msg.role === "user" 
                      ? "bg-blue-600 text-white rounded-br-none" 
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input Chat */}
            <form onSubmit={handleSendChatMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2 items-center">
              <input 
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Întreabă AI-ul..."
                className="flex-1 p-2.5 bg-gray-100 border-transparent focus:border-blue-500 focus:bg-white focus:ring-0 rounded-xl text-sm transition outline-none"
              />
              <button 
                type="submit"
                disabled={!chatInput.trim()}
                className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </form>
          </div>
        )}

        {/* Butonul de Toggle */}
        <button
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`${
            isChatOpen ? "bg-gray-800 hover:bg-gray-900" : "bg-blue-600 hover:bg-blue-700"
          } text-white p-4 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center transform hover:scale-105`}
        >
          {isChatOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          )}
        </button>
      </div>

    </div>
  );
}