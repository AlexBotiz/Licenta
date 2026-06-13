"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function BrowseCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndFetch() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }

      // Luăm TOATE cursurile din baza de date
      const { data } = await supabase.from('courses').select('*');
      if (data) setCourses(data);
      setLoading(false);
    }
    checkAuthAndFetch();
  }, [router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">Se încarcă catalogul...</div>;
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* HEADER MINI - pentru navigare înapoi */}
      <header className="flex justify-between items-center p-4 border-b border-gray-100 px-8 sticky top-0 bg-white z-50">
        <div className="flex items-center gap-8">
          <h1  
            className="text-xl font-bold text-blue-600 tracking-tight"
          >
            XGen Course
          </h1>
          <span className="text-sm font-medium text-gray-500">/ Toate cursurile</span>
        </div>
        <button 
          onClick={() => router.push("/")} 
          className="text-sm font-semibold text-gray-600 hover:text-black transition"
        >
          Înapoi la căutare
        </button>
      </header>

      {/* LISTA COMPLETĂ DE CURSURI - SCROLLABILĂ */}
      <main className="max-w-4xl mx-auto mt-12 px-6 pb-20">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">Toate cursurile disponibile</h2>
          <p className="text-gray-500 text-sm mt-1">Explorează întreaga noastră librărie de cursuri și alege ce vrei să înveți.</p>
        </div>

        <div className="space-y-8 border-l-2 border-gray-100 pl-6">
          {courses.map((course) => (
            <div 
              key={course.id} 
              onClick={() => router.push(`/course/${course.id}`)} // Te va trimite pe pagina cursului
              className="group cursor-pointer p-4 rounded-xl hover:bg-gray-50 transition-all duration-200"
            >
              <span className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Course</span>
              <h3 className="text-xl text-blue-800 font-medium group-hover:underline decoration-1 mt-1">
                {course.title}
              </h3>
              <p className="text-gray-600 text-sm mt-2 leading-relaxed max-w-3xl">
                {course.description || "Learn the fundamentals of this course and master the key concepts with our AI companion."}
              </p>
              <div className="flex gap-3 mt-3">
                 <span className="text-xs bg-gray-100 px-2.5 py-1 rounded font-medium text-gray-700">FREE</span>
                 <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded font-medium">Beginner</span>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}