"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase"; // Corectat calea relativă conform structurii de foldere

// 🎥 FUNCȚIE HELPER: Extrage ID-ul video-ului și generează link-ul corect pentru Embed
const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return null;
};

export default function CreateCoursePage() {
  const router = useRouter();
  
  // Datele generale ale cursului
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  
  // Lista de elemente (slide-uri) adăugate în puzzle
  const [elements, setElements] = useState([]);
  // Indexul elementului selectat în acest moment pentru editare
  const [selectedElementIndex, setSelectedElementIndex] = useState(null);
  const [loading, setLoading] = useState(false);

  // Funcție pentru adăugarea unui element nou în listă
  const handleAddElement = (type) => {
    let defaultContent = {};
    
    if (type === "lesson") {
      defaultContent = { body: "Scrie conținutul lecției aici...", videoUrl: "" };
    } else if (type === "exercise") {
      defaultContent = { instruction: "Cerința exercițiului...", placeholderCode: "// Cod inițial aici" };
    } else if (type === "quiz") {
      // 🌟 MODIFICAT: Opțiunile sunt acum obiecte cu text și explicație individuală
      defaultContent = {
        question: "Întrebare nouă?",
        options: [
          { text: "Varianta A", explanation: "" },
          { text: "Varianta B", explanation: "" },
          { text: "Varianta C", explanation: "" }
        ],
        correctAnswerIndex: 0
      };
    }

    const newElement = {
      id: crypto.randomUUID(), // ID temporar pentru frontend
      type: type,
      title: `Element nou (${type})`,
      content: defaultContent
    };

    setElements([...elements, newElement]);
    // Selectăm automat elementul nou creat ca să-l putem edita direct
    setSelectedElementIndex(elements.length);
  };

  // Actualizează titlul sau conținutul elementului selectat curent
  const updateSelectedElement = (updatedFields) => {
    if (selectedElementIndex === null) return;
    const updatedElements = [...elements];
    updatedElements[selectedElementIndex] = {
      ...updatedElements[selectedElementIndex],
      ...updatedFields
    };
    setElements(updatedElements);
  };

  // Salvarea întregului pachet în Supabase
  const handleSaveCourse = async () => {
    if (!courseTitle.trim()) {
      alert("Te rog introdu un titlu pentru curs.");
      return;
    }
    if (elements.length === 0) {
      alert("Adaugă cel puțin un element (lecție/exercițiu/quiz) în curs.");
      return;
    }

    try {
      setLoading(true);

      // 1. Luăm userul curent ca să știm cine creează cursul
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Trebuie să fii logat pentru a crea un curs!");
        return;
      }

      // 2. Inserăm cursul în tabela 'courses'
      const { data: courseData, error: courseError } = await supabase
        .from("courses")
        .insert([{ 
          title: courseTitle, 
          description: courseDescription,
          created_by: session.user.email 
        }])
        .select()
        .single();

      if (courseError) throw courseError;

      // 🧱 Alocăm automat rolul de PROFESOR pentru creatorul cursului
      const { error: enrollError } = await supabase
        .from("enrollments")
        .insert([{
          user_email: session.user.email,
          course_id: courseData.id,
          role: "teacher" 
        }]);

      if (enrollError) throw enrollError;

      // 3. Pregătim elementele pentru inserare în masă (Bulk Insert), adăugând order_index-ul lor
      const elementsToInsert = elements.map((elem, index) => ({
        course_id: courseData.id,
        type: elem.type,
        title: elem.title,
        content: elem.content, // Aici se salvează automat noua structură JSON a Quiz-ului cu tot cu explicații
        order_index: index + 1 
      }));

      // 4. Inserăm toate elementele deodată în 'course_elements'
      const { error: elementsError } = await supabase
        .from("course_elements")
        .insert(elementsToInsert);

      if (elementsError) throw elementsError;

      alert(`Cursul „${courseTitle}” a fost creat cu succes! Ești profesorul acestui curs.`);
      router.push("/"); 
    } catch (error) {
      console.error("Eroare la crearea cursului:", error);
      alert("Eroare la salvare: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const currentElement = selectedElementIndex !== null ? elements[selectedElementIndex] : null;

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans">
      {/* HEADER BAR */}
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-black">← Înapoi</button>
          <h1 className="text-lg font-bold text-gray-900">Constructor de Curs (NewGen Course)</h1>
        </div>
        <button 
          onClick={handleSaveCourse} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50"
        >
          {loading ? "Se salvează..." : "Publică Cursul"}
        </button>
      </header>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* DETALII GENERALE ȘI PANOU SLIDE-URI (STÂNGA) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Informații Curs</h3>
            <input 
              type="text" 
              placeholder="Titlu curs (ex: Introducere în JavaScript)" 
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-blue-500 bg-gray-50"
            />
            <textarea 
              placeholder="Descriere scurtă a cursului..." 
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-blue-500 bg-gray-50 h-20 resize-none"
            />
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Structură Curs ({elements.length})</h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {elements.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6 border border-dashed border-gray-200 rounded-xl">
                  Nu ai adăugat niciun element încă. Folosește butoanele de mai jos!
                </p>
              ) : (
                elements.map((elem, idx) => (
                  <div 
                    key={elem.id}
                    onClick={() => setSelectedElementIndex(idx)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                      selectedElementIndex === idx 
                        ? "border-blue-500 bg-blue-50/50 shadow-sm" 
                        : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <div className="truncate">
                      <span className="text-[10px] font-bold uppercase mr-2 px-2 py-0.5 rounded bg-white border text-gray-600 shadow-sm">
                        {idx + 1}. {elem.type}
                      </span>
                      <p className="text-sm font-semibold text-gray-800 truncate mt-1">{elem.title}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => handleAddElement("lesson")} className="flex flex-col items-center justify-center p-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 rounded-xl transition text-center">
                <span className="text-lg">📄</span>
                <span className="text-[11px] font-bold mt-1">Lecție</span>
              </button>
              <button onClick={() => handleAddElement("exercise")} className="flex flex-col items-center justify-center p-3 bg-purple-50 hover:bg-purple-100 border border-purple-100 text-purple-700 rounded-xl transition text-center">
                <span className="text-lg">💻</span>
                <span className="text-[11px] font-bold mt-1">Exercițiu</span>
              </button>
              <button onClick={() => handleAddElement("quiz")} className="flex flex-col items-center justify-center p-3 bg-green-50 hover:bg-green-100 border border-green-100 text-green-700 rounded-xl transition text-center">
                <span className="text-lg">❓</span>
                <span className="text-[11px] font-bold mt-1">Quiz</span>
              </button>
            </div>
          </div>
        </div>

        {/* SPATIUL DE EDITARE PENTRU ELEMENTUL SELECTAT */}
        <div className="lg:col-span-8">
          {currentElement ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              
              <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase text-blue-600 px-2.5 py-1 bg-blue-50 rounded-lg">
                    Configurare {currentElement.type}
                  </span>
                  <input 
                    type="text"
                    value={currentElement.title}
                    onChange={(e) => updateSelectedElement({ title: e.target.value })}
                    className="text-xl font-bold text-gray-900 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:outline-none w-full pt-1"
                    placeholder="Titlu element..."
                  />
                </div>
                <button 
                  onClick={() => {
                    const filtered = elements.filter((_, idx) => idx !== selectedElementIndex);
                    setElements(filtered);
                    setSelectedElementIndex(filtered.length > 0 ? 0 : null);
                  }}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition self-start sm:self-auto"
                >
                  Șterge element
                </button>
              </div>

              {/* RENDER LECȚIE */}
              {currentElement.type === "lesson" && (
                <div className="space-y-5">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase block">🎥 Videoclip Lecție (Opțional - Link YouTube)</label>
                    <input 
                      type="text"
                      value={currentElement.content.videoUrl || ""}
                      onChange={(e) => updateSelectedElement({ 
                        content: { ...currentElement.content, videoUrl: e.target.value } 
                      })}
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-blue-500 bg-white"
                      placeholder="Lipește link-ul (ex: https://www.youtube.com/watch?v=...)"
                    />
                  </div>

                  {currentElement.content.videoUrl && (
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider block">Preview Video Instant:</span>
                      {getYouTubeEmbedUrl(currentElement.content.videoUrl) ? (
                        <div className="aspect-video w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-black">
                          <iframe
                            className="w-full h-full"
                            src={getYouTubeEmbedUrl(currentElement.content.videoUrl)}
                            title="YouTube video player"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      ) : (
                        <p className="text-xs text-red-500 font-medium">⚠️ Link-ul introdus nu este un link valid de YouTube.</p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase block">Conținutul Text al Lecției</label>
                    <textarea
                      value={currentElement.content.body}
                      onChange={(e) => updateSelectedElement({ 
                        content: { ...currentElement.content, body: e.target.value } 
                      })}
                      className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:outline-blue-500 min-h-[250px] leading-relaxed bg-gray-50"
                      placeholder="Scrie explicațiile text aici..."
                    />
                  </div>
                </div>
              )}

              {/* RENDER EXERCIȚIU */}
              {currentElement.type === "exercise" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase">Cerință Exercițiu</label>
                    <input 
                      type="text"
                      value={currentElement.content.instruction}
                      onChange={(e) => updateSelectedElement({
                        content: { ...currentElement.content, instruction: e.target.value }
                      })}
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-blue-500 bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase">Cod Șablon / Inițial</label>
                    <textarea
                      value={currentElement.content.placeholderCode}
                      onChange={(e) => updateSelectedElement({ 
                        content: { ...currentElement.content, placeholderCode: e.target.value } 
                      })}
                      className="w-full p-4 border border-gray-200 rounded-xl text-sm focus:outline-blue-500 min-h-[150px] font-mono bg-gray-900 text-green-400"
                    />
                  </div>
                </div>
              )}

              {/* 🌟 RENDER QUIZ (MODIFICATĂ SECȚIUNEA PENTRU EXPLICATII) */}
              {currentElement.type === "quiz" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase">Întrebare</label>
                    <input 
                      type="text"
                      value={currentElement.content.question}
                      onChange={(e) => updateSelectedElement({
                        content: { ...currentElement.content, question: e.target.value }
                      })}
                      className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-blue-500 bg-gray-50"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-600 uppercase block">Opțiuni de Răspuns și Explicații</label>
                    
                    {currentElement.content.options.map((opt, oIdx) => (
                      <div key={oIdx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2 shadow-sm">
                        {/* Randul 1: Radio Button + Textul Opțiunii */}
                        <div className="flex items-center gap-2">
                          <input 
                            type="radio"
                            name={`correct-${currentElement.id}`}
                            checked={currentElement.content.correctAnswerIndex === oIdx}
                            onChange={() => updateSelectedElement({
                              content: { ...currentElement.content, correctAnswerIndex: oIdx }
                            })}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                          <input 
                            type="text"
                            value={opt.text || ""}
                            onChange={(e) => {
                              const newOpts = [...currentElement.content.options];
                              newOpts[oIdx] = { ...newOpts[oIdx], text: e.target.value };
                              updateSelectedElement({
                                content: { ...currentElement.content, options: newOpts }
                              });
                            }}
                            className="w-full p-2 border border-gray-200 rounded-xl text-xs font-semibold focus:outline-blue-500 bg-white"
                            placeholder={`Opțiunea ${oIdx + 1}`}
                          />
                        </div>
                        
                        {/* Randul 2 (Nou): Input pentru Explicație */}
                        <div className="pl-6">
                          <input 
                            type="text"
                            value={opt.explanation || ""}
                            onChange={(e) => {
                              const newOpts = [...currentElement.content.options];
                              newOpts[oIdx] = { ...newOpts[oIdx], explanation: e.target.value };
                              updateSelectedElement({
                                content: { ...currentElement.content, options: newOpts }
                              });
                            }}
                            className="w-full p-2 border border-gray-200 rounded-lg text-[11px] focus:outline-purple-400 bg-white text-gray-600 italic"
                            placeholder={`💡 Explicație dacă studentul alege această variantă... (opțional)`}
                          />
                        </div>
                      </div>
                    ))}
                    
                    <p className="text-[11px] text-gray-400 mt-1">* Bifează cercul din stânga pentru răspunsul corect.</p>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white p-16 text-center rounded-2xl border border-dashed border-gray-200 text-gray-400 flex flex-col items-center justify-center space-y-2 h-full min-h-[400px]">
              <span className="text-5xl">🛠️</span>
              <h3 className="font-bold text-gray-700 pt-2">Zona de lucru</h3>
              <p className="text-xs max-w-xs leading-relaxed">Adaugă elemente din meniul stâng sau selectează un slide existent ca să începi construirea conținutului.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}