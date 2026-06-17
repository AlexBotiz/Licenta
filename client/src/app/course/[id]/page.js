"use client";
import { useEffect, useState, use } from "react"; 
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function CourseDetails({ params }) {
  const unwrappedParams = use(params);
  const courseId = unwrappedParams.id;

  const [course, setCourse] = useState(null);
  const [elements, setElements] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isTeacher, setIsTeacher] = useState(false); // 🧱 STARE NOUĂ: Verificăm dacă e profesor
  const router = useRouter();

  useEffect(() => {
    async function fetchCourseData() {
      // 1. Verificăm dacă userul este logat
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      const email = session.user.email;

      // 2. Aducem detaliile cursului din tabela 'courses'
      const { data: courseData } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (courseData) setCourse(courseData);

      // 3. Verificăm înscrierea ȘI rolul utilizatorului în cadrul acestui curs
      const { data: enrollmentData } = await supabase
        .from('enrollments')
        .select('id, role') // Am adăugat 'role' în select
        .eq('user_email', email)
        .eq('course_id', courseId);

      if (enrollmentData && enrollmentData.length > 0) {
        setIsEnrolled(true);
        // Dacă rolul înregistrat este 'teacher', îi dăm drepturi de editare în interfață
        if (enrollmentData[0].role === "teacher") {
          setIsTeacher(true);
        }
      }

      // 4. Aducem elementele de puzzle legate de acest curs
      try {
        const { data: elementsData } = await supabase
          .from('course_elements')
          .select('*')
          .eq('course_id', courseId)
          .order('order_index', { ascending: true });
          
        if (elementsData) setElements(elementsData);
      } catch (error) {
        console.log("Tabela 'course_elements' nu a fost găsită sau e goală:", error);
      }

      setLoading(false);
    }

    if (courseId) {
      fetchCourseData();
    }
  }, [courseId, router]);

  const handleEnroll = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert("Sesiunea a expirat. Te rugăm să te loghezi din nou.");
      router.push("/login");
      return;
    }

    const { error } = await supabase
      .from('enrollments')
      .insert([
        { 
          user_email: session.user.email, 
          course_id: courseId,
          role: 'student' // Înscrierea standard de pe buton oferă rol de student
        }
      ]);

    if (!error) {
      setIsEnrolled(true);
      alert("Te-ai înscris cu succes la acest curs!");
    } else {
      console.error("Eroare Supabase:", error);
      alert("A apărut o problemă la înscriere.");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">Se încarcă detaliile cursului...</div>;
  }

  if (!course) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-red-500">Cursul nu a fost găsit.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-black">
      
      {/* HEADER SIMPLU */}
      <header className="p-6 flex justify-between items-center max-w-5xl mx-auto">
        <h1 className="text-xl font-bold text-blue-600 tracking-tight cursor-pointer" onClick={() => router.push('/')}>XGen Course</h1>
        <button 
          onClick={() => router.back()} 
          className="w-10 h-10 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-100 transition text-gray-600 font-bold"
        >
          ✕
        </button>
      </header>

      {/* CONTINUT PRINCIPAL */}
      <main className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 px-6 pb-20">
        
        {/* COLOANA STÂNGĂ: DETALII ȘI SYLLABUS */}
        <div className="md:col-span-2 space-y-8">
          
          {/* SECȚIUNEA HERO */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-wide">
              {isTeacher ? "Mod Management" : isEnrolled ? "Curs activ" : "Curs disponibil"}
            </span>
            <h2 className="text-3xl font-bold text-gray-900 mt-4 mb-2">{course.title}</h2>
            <p className="text-gray-600 leading-relaxed text-base mb-6">
              {course.description || "Învață fundamentele acestui curs și stăpânește conceptele cheie alături de asistentul nostru AI."}
            </p>
            
            <div className="flex items-center gap-4 text-sm text-gray-500 border-t border-gray-100 pt-6 mt-6">
              <div className="flex items-center gap-2">
                <span className="bg-gray-100 w-8 h-8 rounded-full flex items-center justify-center">👨‍🏫</span>
                <span>Creat de: <strong className="text-gray-900">{course.created_by || "Profesor / Admin"}</strong></span>
              </div>
              <span className="text-gray-300">|</span>
              <span>⏳ {elements.length > 0 ? `${elements.length * 45} minute estimate` : "0 minute"}</span>
            </div>
          </div>

          {/* CE VEI ÎNVĂȚA */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Ce vei învăța în acest curs</h3>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold">✓</span>
                <span>Înțelegerea conceptelor teoretice structurate pe capitole.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold">✓</span>
                <span>Rezolvarea de exerciții practice ghidate de un companion AI inteligent.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-500 font-bold">✓</span>
                <span>Evaluarea cunoștințelor prin chestionare grilă la final de secțiune.</span>
              </li>
            </ul>
          </div>

          {/* LISTA DE ELEMENTE MODULARE */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Programa cursului ({elements.length} module)</h3>
            
            {elements.length > 0 ? (
              <div className="space-y-3">
                {elements.map((elem, index) => (
                  <div key={elem.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="flex items-center gap-4">
                      <span className="text-gray-400 font-semibold text-sm">{index + 1}.</span>
                      <span className="text-base">
                        {elem.type === "lesson" && "📄"}
                        {elem.type === "exercise" && "💻"}
                        {elem.type === "quiz" && "❓"}
                      </span>
                      <span className="font-medium text-gray-800 text-sm">{elem.title}</span>
                    </div>
                    {!isEnrolled && !isTeacher && <span className="text-gray-400 text-xs bg-gray-200/60 px-2 py-1 rounded">🔒 Blocat</span>}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm text-center py-6 bg-gray-50 rounded-xl border border-dashed">
                Acest curs nu are încă module adăugate în baza de date.
              </p>
            )}
          </div>
        </div>

        {/* COLOANA DREAPTĂ: CARDUL DE ACTIUNE */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 sticky top-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-1">Gratuit</h3>
            <p className="text-gray-400 text-xs mb-6">Acces complet și asistență AI nelimitată.</p>
            
            {/* Buton principal dinamic Student / Profesor */}
            {!isEnrolled && !isTeacher ? (
              <button 
                onClick={handleEnroll}
                className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition shadow-sm"
              >
                Înscrie-te la curs
              </button>
            ) : (
              <button 
                onClick={() => router.push(`/course/${courseId}/learn`)}
                className="w-full bg-green-500 text-white font-bold py-3.5 rounded-xl hover:bg-green-600 transition shadow-sm"
              >
                {isTeacher ? "Vizualizează Cursul →" : "Continuă cursul →"}
              </button>
            )}

            {/* ⚙️ BUTONUL SECRET AFIȘAT DOAR PENTRU PROFESOR */}
            {isTeacher && (
              <button 
                onClick={() => router.push(`/course/${courseId}/edit`)}
                className="w-full mt-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-bold py-3 rounded-xl transition shadow-sm flex items-center justify-center gap-2"
              >
                🛠️ Editează Cursul
              </button>
            )}

            <div className="mt-6 pt-6 border-t border-gray-100 space-y-3 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Nivel:</span> <span className="font-semibold text-gray-900">Începător</span>
              </div>
              <div className="flex justify-between">
                <span>Structură:</span> <span className="font-semibold text-gray-900">Blocuri Puzzle</span>
              </div>
              <div className="flex justify-between">
                <span>Ghidaj AI:</span> <span className="font-semibold text-blue-600">Activ</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}