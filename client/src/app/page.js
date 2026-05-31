"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkAuthAndFetchData() {
      // 1. Verificăm dacă există o sesiune activă (dacă userul este logat)
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // Dacă nu există sesiune, redirecționăm instant către login
        router.push("/login");
        return;
      }

      // 2. Dacă este logat, salvăm userul și aducem cursurile
      setUser(session.user);
      
      const { data } = await supabase.from('courses').select('*');
      if (data) setCourses(data);
      
      // 3. Oprim starea de încărcare pentru a afișa pagina
      setLoading(false);
    }

    checkAuthAndFetchData();
  }, [router]);

  // Funcție pentru delogare (foarte utilă pentru a putea testa fluxul de mai multe ori)
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Cât timp verificăm autentificarea, afișăm un ecran alb/de încărcare 
  // pentru a preveni acel "flash" în care userul vede pagina o secundă înainte de redirect
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">Se încarcă...</div>;
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* HEADER */}
      <header className="flex justify-between items-center p-4 border-b border-gray-100 px-8">
        <div className="flex items-center gap-8">
          <h1 className="text-xl font-bold text-blue-600 tracking-tight cursor-pointer">LICENTA NAME</h1>
          <button className="text-sm font-medium hover:text-blue-600 transition">Create course</button>
          <button className="text-sm font-medium hover:text-blue-600 transition">Browse all</button>
        </div>
        
        {/* ZONA BUTOANELOR DIN DREAPTA */}
        <div className="flex items-center gap-4">
          <button className="text-sm font-semibold bg-gray-100 text-black py-2 px-4 rounded-md transition hover:bg-gray-200">
            View Profile
          </button>
          <button 
            onClick={handleLogout} 
            className="text-sm font-semibold text-red-500 hover:text-red-700 transition ml-2"
          >
            Logout
          </button>
        </div>
      </header>

      {/* MAIN CONTENT - LISTA DE CURSURI + SEARCH BAR */}
      <main className="max-w-3xl mx-auto mt-20 px-4">
        <div className="relative mb-12">
          <input 
            type="text"
            placeholder="Search for a course..."
            className="w-full p-4 pl-12 rounded-full border border-gray-200 shadow-sm focus:shadow-md focus:outline-none transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <span className="absolute left-5 top-4.5 text-gray-400">🔍</span>
        </div>

        {/* LISTA DE CURSURI */}
        <div className="space-y-8">
          {filteredCourses.map((course) => (
            <div key={course.id} className="group cursor-pointer">
              <span className="text-xs text-gray-500 uppercase">Course</span>
              <h2 className="text-xl text-blue-800 font-medium group-hover:underline decoration-1">
                {course.title}
              </h2>
              <p className="text-gray-600 text-sm mt-1 leading-relaxed max-w-2xl">
                {course.description || "Learn the fundamentals of this course and master the key concepts with our AI companion."}
              </p>
              <div className="flex gap-3 mt-2">
                 <span className="text-xs bg-gray-100 px-2 py-1 rounded text-black">FREE</span>
                 <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded">Beginner</span>
              </div>
            </div>
          ))}
          
          {filteredCourses.length === 0 && (
            <p className="text-center text-gray-400 mt-10">Nu am găsit niciun curs care să se potrivească căutării tale.</p>
          )}
        </div>
      </main>
    </div>
  );
}