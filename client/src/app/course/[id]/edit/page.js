"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function EditCoursePage({ params }) {
  const router = useRouter();
  
  // Unwrap params (recomandat în versiunile noi de Next.js)
  const { id: courseId } = React.use(params);

  // Stări pentru autorizare și încărcare
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);

  // Datele cursului
  const [courseTitle, setCourseTitle] = useState("");
  const [courseDescription, setCourseDescription] = useState("");
  const [elements, setElements] = useState([]);
  const [selectedElementIndex, setSelectedElementIndex] = useState(null);

// 1. Verificăm rolul (Admin global sau Profesorul cursului) și încărcăm datele
useEffect(() => {
  const checkAuthAndFetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert("Trebuie să fii logat!");
        router.push("/login");
        return;
      }

      const userEmail = session.user.email;

      // PASUL A: Verificăm mai întâi dacă utilizatorul este ADMIN GLOBAL în tabela 'profiles'
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("email", userEmail)
        .maybeSingle();

      let hasAccess = false;

      if (profile && profile.role === "admin") {
        // Dacă este admin, primește acces direct (bypass la înscrieri)
        hasAccess = true;
      } else {
        // PASUL B: Dacă NU este admin, verificăm dacă este profesorul înscris la acest curs
        const { data: enrollment, error: enrollError } = await supabase
          .from("enrollments")
          .select("role")
          .eq("course_id", courseId)
          .eq("user_email", userEmail)
          .single();

        if (enrollment && enrollment.role === "teacher") {
          hasAccess = true;
        }
      }

      // Dacă nu este nici Admin global, nici Profesorul cursului -> Îi blocăm accesul
      if (!hasAccess) {
        alert("Nu ai permisiunea de a edita sau șterge acest curs! Doar un administrator sau profesorul cursului o poate face.");
        router.push(`/course/${courseId}`);
        return;
      }

      setIsAuthorized(true);

      // Dacă are acces, încărcăm detaliile cursului
      const { data: course, error: courseError } = await supabase
        .from("courses")
        .select("title, description")
        .eq("id", courseId)
        .single();

      if (courseError) throw courseError;
      setCourseTitle(course.title);
      setCourseDescription(course.description);

      // Încărcăm elementele de tip puzzle
      const { data: courseElements, error: elementsError } = await supabase
        .from("course_elements")
        .select("id, type, title, content")
        .eq("course_id", courseId)
        .order("order_index", { ascending: true });

      if (elementsError) throw elementsError;
      setElements(courseElements || []);

    } catch (err) {
      console.error("Eroare la inițializare:", err);
      alert("A apărut o eroare la încărcarea datelor.");
    } finally {
      setCheckingAuth(false);
    }
  };

  checkAuthAndFetchData();
}, [courseId, router]);

  // Funcții pentru manipularea puzzle-ului (la fel ca la creare)
  const handleAddElement = (type) => {
    let defaultContent = {};
    if (type === "lesson") defaultContent = { body: "Conținut lecție nouă..." };
    else if (type === "exercise") defaultContent = { instruction: "Cerință nouă...", placeholderCode: "// Cod" };
    else if (type === "quiz") defaultContent = { question: "Întrebare?", options: ["A", "B"], correctAnswerIndex: 0 };

    const newElement = {
      id: crypto.randomUUID(),
      type: type,
      title: `Element nou (${type})`,
      content: defaultContent
    };

    setElements([...elements, newElement]);
    setSelectedElementIndex(elements.length);
  };

  const updateSelectedElement = (updatedFields) => {
    if (selectedElementIndex === null) return;
    const updatedElements = [...elements];
    updatedElements[selectedElementIndex] = {
      ...updatedElements[selectedElementIndex],
      ...updatedFields
    };
    setElements(updatedElements);
  };

  // 2. Salvarea modificărilor (Update curs + Re-sync elemente)
  const handleSaveChanges = async () => {
    if (!courseTitle.trim()) return alert("Titlul nu poate fi gol.");
    if (elements.length === 0) return alert("Cursul trebuie să aibă cel puțin un element.");

    try {
      setLoading(true);

      // A. Actualizăm informațiile generale ale cursului
      const { error: courseUpdateError } = await supabase
        .from("courses")
        .update({ title: courseTitle, description: courseDescription })
        .eq("id", courseId);

      if (courseUpdateError) throw courseUpdateError;

      // B. Ștergem elementele vechi ca să le putem pune curat pe cele noi
      const { error: deleteError } = await supabase
        .from("course_elements")
        .delete()
        .eq("course_id", courseId);

      if (deleteError) throw deleteError;

      // C. Pregătim elementele noi cu noul order_index
      const elementsToInsert = elements.map((elem, index) => ({
        course_id: courseId,
        type: elem.type,
        title: elem.title,
        content: elem.content,
        order_index: index + 1
      }));

      // D. Inserăm noile elemente în masă
      const { error: insertError } = await supabase
        .from("course_elements")
        .insert(elementsToInsert);

      if (insertError) throw insertError;

      alert("Cursul XGen a fost actualizat cu succes!");
      router.push(`/course/${courseId}`);

    } catch (err) {
      console.error("Eroare la salvare:", err);
      alert("Nu s-a putut salva modificările: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Funcția de Ștergere Curs complet
  const handleDeleteCourse = async () => {
    const confirmDelete = confirm(
      "⚠️ EȘTI SIGUR? Această acțiune va șterge definitiv cursul, toate lecțiile/exercițiile asociate și va dezînscrie toți studenții! Acțiunea este ireversibilă."
    );
    
    if (!confirmDelete) return;

    try {
      setLoading(true);

      // Pasul A: Curățăm elementele de tip puzzle ale cursului
      const { error: elementsError } = await supabase
        .from("course_elements")
        .delete()
        .eq("course_id", courseId);
      if (elementsError) throw elementsError;

      // Pasul B: Ștergem toate înscrierile legate de acest curs
      const { error: enrollError } = await supabase
        .from("enrollments")
        .delete()
        .eq("course_id", courseId);
      if (enrollError) throw enrollError;

      // Pasul C: Ștergem cursul propriu-zis
      const { error: courseError } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);
      if (courseError) throw courseError;

      alert("Cursul a fost șters cu succes de pe platformă!");
      router.push("/");

    } catch (err) {
      console.error("Eroare la ștergerea cursului:", err);
      alert("Nu s-a putut șterge cursul: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-black">
        <p className="text-sm font-semibold animate-pulse">Se verifică permisiunile profesorului...</p>
      </div>
    );
  }

  if (!isAuthorized) return null;

  const currentElement = selectedElementIndex !== null ? elements[selectedElementIndex] : null;

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans">
      {/* HEADER BAR */}
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-black">← Renunță</button>
          <h1 className="text-lg font-bold text-gray-900">Mode Editare: XGen Course</h1>
        </div>
        <button 
          onClick={handleSaveChanges} 
          disabled={loading}
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-sm transition disabled:opacity-50"
        >
          {loading ? "Se salvează..." : "Salvează Modificările"}
        </button>
      </header>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* PANEL STÂNGA */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Editează Informații</h3>
            <input 
              type="text" 
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-blue-500 bg-gray-50 font-semibold"
              placeholder="Titlu curs"
            />
            <textarea 
              value={courseDescription}
              onChange={(e) => setCourseDescription(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-blue-500 bg-gray-50 h-20 resize-none"
              placeholder="Descriere"
            />

            <button
            onClick={() => router.push(`/course/${courseId}/users`)}
            className="w-full mt-4 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
            👥 Gestionare Participanți & Roluri
            </button>
            {/* Butonul roșu de ștergere completă, vizibil mereu */}
            <button
              onClick={handleDeleteCourse}
              disabled={loading}
              className="w-full mt-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 py-2.5 rounded-xl text-xs font-bold transition disabled:opacity-50"
            >
              🗑️ Șterge Cursul Definitiv
            </button>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Modifică Structura ({elements.length})</h3>
            
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {elements.map((elem, idx) => (
                <div 
                  key={elem.id}
                  onClick={() => setSelectedElementIndex(idx)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition flex items-center justify-between ${
                    selectedElementIndex === idx ? "border-blue-500 bg-blue-50/50" : "border-gray-100 bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="truncate">
                    <span className="text-[10px] font-bold uppercase mr-2 px-2 py-0.5 rounded bg-white border text-gray-600">
                      {idx + 1}. {elem.type}
                    </span>
                    <p className="text-sm font-semibold text-gray-800 truncate mt-1">{elem.title}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
              <button onClick={() => handleAddElement("lesson")} className="flex flex-col items-center p-3 bg-blue-50 hover:bg-blue-100 border border-blue-100 text-blue-700 rounded-xl text-center">
                <span className="text-lg">📄</span> <span className="text-[11px] font-bold mt-1">Lecție</span>
              </button>
              <button onClick={() => handleAddElement("exercise")} className="flex flex-col items-center p-3 bg-purple-50 hover:bg-purple-100 border border-purple-100 text-purple-700 rounded-xl text-center">
                <span className="text-lg">💻</span> <span className="text-[11px] font-bold mt-1">Exercițiu</span>
              </button>
              <button onClick={() => handleAddElement("quiz")} className="flex flex-col items-center p-3 bg-green-50 hover:bg-green-100 border border-green-100 text-green-700 rounded-xl text-center">
                <span className="text-lg">❓</span> <span className="text-[11px] font-bold mt-1">Quiz</span>
              </button>
            </div>
          </div>
        </div>

        {/* PANEL SPAȚIU DE LUCRU (DREAPTA) */}
        <div className="lg:col-span-8">
          {currentElement ? (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-6">
              <div className="border-b border-gray-100 pb-4 flex justify-between items-center">
                <div className="space-y-1 w-full mr-4">
                  <span className="text-xs font-bold uppercase text-blue-600 px-2.5 py-1 bg-blue-50 rounded-lg">Editează {currentElement.type}</span>
                  <input 
                    type="text"
                    value={currentElement.title}
                    onChange={(e) => updateSelectedElement({ title: e.target.value })}
                    className="text-xl font-bold text-gray-900 border-b border-transparent focus:border-blue-500 focus:outline-none w-full pt-1"
                  />
                </div>
                <button 
                  onClick={() => {
                    const filtered = elements.filter((_, idx) => idx !== selectedElementIndex);
                    setElements(filtered);
                    setSelectedElementIndex(filtered.length > 0 ? 0 : null);
                  }}
                  className="text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl"
                >
                  Șterge Element
                </button>
              </div>

              {currentElement.type === "lesson" && (
                <div className="space-y-2">
                  <textarea
                    value={currentElement.content.body}
                    onChange={(e) => updateSelectedElement({ content: { ...currentElement.content, body: e.target.value } })}
                    className="w-full p-4 border border-gray-200 rounded-xl text-sm min-h-[300px] font-mono bg-gray-50"
                  />
                </div>
              )}

              {currentElement.type === "exercise" && (
                <div className="space-y-4">
                  <input 
                    type="text"
                    value={currentElement.content.instruction}
                    onChange={(e) => updateSelectedElement({ content: { ...currentElement.content, instruction: e.target.value } })}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-gray-50"
                    placeholder="Cerință"
                  />
                  <textarea
                    value={currentElement.content.placeholderCode}
                    onChange={(e) => updateSelectedElement({ content: { ...currentElement.content, placeholderCode: e.target.value } })}
                    className="w-full p-4 border border-gray-200 rounded-xl text-sm min-h-[150px] font-mono bg-gray-900 text-green-400"
                  />
                </div>
              )}

              {currentElement.type === "quiz" && (
                <div className="space-y-4">
                  <input 
                    type="text"
                    value={currentElement.content.question}
                    onChange={(e) => updateSelectedElement({ content: { ...currentElement.content, question: e.target.value } })}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm bg-gray-50"
                  />
                  <div className="space-y-2">
                    {currentElement.content.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input 
                          type="radio"
                          name={`edit-correct-${currentElement.id}`}
                          checked={currentElement.content.correctAnswerIndex === oIdx}
                          onChange={() => updateSelectedElement({ content: { ...currentElement.content, correctAnswerIndex: oIdx } })}
                        />
                        <input 
                          type="text"
                          value={opt}
                          onChange={(e) => {
                            const newOpts = [...currentElement.content.options];
                            newOpts[oIdx] = e.target.value;
                            updateSelectedElement({ content: { ...currentElement.content, options: newOpts } });
                          }}
                          className="w-full p-2 border border-gray-200 rounded-xl text-xs bg-gray-50"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white p-16 text-center rounded-2xl border border-dashed border-gray-200 text-gray-400 flex flex-col items-center justify-center h-full min-h-[400px]">
              <span className="text-5xl">📝</span>
              <h3 className="font-bold text-gray-700 pt-2">Mod de Editare</h3>
              <p className="text-xs max-w-xs leading-relaxed">Selectează un slide din stânga pentru a-i modifica conținutul sau ordinea în puzzle.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}