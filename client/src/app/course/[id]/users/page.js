"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function CourseUsersPage({ params }) {
  const router = useRouter();
  const { id: courseId } = React.use(params);

  // Stări pentru autorizare și încărcare
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);

  // Datele cursului și ale participanților
  const [courseTitle, setCourseTitle] = useState("");
  const [participants, setParticipants] = useState([]);

  // 1. Verificăm drepturile (doar Admin global sau Profesorul cursului au voie aici)
  useEffect(() => {
    const verifyAccessAndFetchUsers = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          alert("Trebuie să fii logat!");
          router.push("/login");
          return;
        }

        const userEmail = session.user.email;

        // Verificăm dacă este ADMIN GLOBAL
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("email", userEmail)
          .maybeSingle();

        let hasAccess = false;
        if (profile && profile.role === "admin") {
          hasAccess = true;
        } else {
          // Verificăm dacă este profesorul înscris la curs
          const { data: enrollment } = await supabase
            .from("enrollments")
            .select("role")
            .eq("course_id", courseId)
            .eq("user_email", userEmail)
            .single();

          if (enrollment && enrollment.role === "teacher") {
            hasAccess = true;
          }
        }

        if (!hasAccess) {
          alert("Nu ai permisiunea de a gestiona utilizatorii acestui curs!");
          router.push(`/course/${courseId}`);
          return;
        }

        setIsAuthorized(true);

        // Preluăm titlul cursului pentru context în interfață
        const { data: course } = await supabase
          .from("courses")
          .select("title")
          .eq("id", courseId)
          .single();
        if (course) setCourseTitle(course.title);

        // Încărcăm lista de participanți
        await fetchParticipants();

      } catch (err) {
        console.error("Eroare la inițializare panou utilizatori:", err);
      } finally {
        setCheckingAuth(false);
      }
    };

    verifyAccessAndFetchUsers();
  }, [courseId, router]);

  // Funcție dedicată pentru a citi/reîmprospăta lista din DB
  const fetchParticipants = async () => {
    const { data: enrollments, error } = await supabase
      .from("enrollments")
      .select("id, user_email, role")
      .eq("course_id", courseId);

    if (!error && enrollments) {
      setParticipants(enrollments);
    }
  };

  // 2. Schimbă rolul (Student ⇄ Profesor/Asistent)
  const handleToggleRole = async (enrollmentId, currentRole) => {
    try {
      setLoadingAction(true);
      const nextRole = currentRole === "student" ? "teacher" : "student";

      const { error } = await supabase
        .from("enrollments")
        .update({ role: nextRole })
        .eq("id", enrollmentId);

      if (error) throw error;
      
      // Reîncărcăm datele local ca să vedem modificarea instant
      await fetchParticipants();
    } catch (err) {
      alert("Nu s-a putut schimba rolul: " + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  // 3. Elimină (Dezînscrie) un utilizator din curs
  const handleKickUser = async (enrollmentId, email) => {
    const confirmKick = confirm(`Sigur vrei să elimini utilizatorul ${email} din acest curs? Va pierde tot progresul.`);
    if (!confirmKick) return;

    try {
      setLoadingAction(true);
      const { error } = await supabase
        .from("enrollments")
        .delete()
        .eq("id", enrollmentId);

      if (error) throw error;
      await fetchParticipants();
    } catch (err) {
      alert("Nu s-a putut elimina utilizatorul: " + err.message);
    } finally {
      setLoadingAction(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-black">
        <p className="text-sm font-semibold animate-pulse">Se încarcă lista de membri...</p>
      </div>
    );
  }

  if (!isAuthorized) return null;

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans">
      {/* NAVBAR TOP */}
      <header className="bg-white border-b border-gray-200 p-4 sticky top-0 z-10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(`/course/${courseId}/edit`)} className="text-sm text-gray-500 hover:text-black">
            ← Înapoi la Editare Curs
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-900">Gestiune Participanți</h1>
            <p className="text-xs text-gray-500 font-medium truncate max-w-md">Curs: {courseTitle}</p>
          </div>
        </div>
      </header>

      {/* CONȚINUT PANOU */}
      <main className="max-w-4xl mx-auto p-6 mt-4 space-y-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Utilizatori Înscriși</h2>
              <p className="text-xs text-gray-500 font-medium">Lista completă a conturilor care pot accesa sau edita această structură.</p>
            </div>
            <span className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
              {participants.length} Total
            </span>
          </div>

          {participants.length > 0 ? (
            <div className="divide-y divide-gray-100 overflow-hidden">
              {participants.map((person) => (
                <div key={person.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0">
                  
                  {/* Info Utilizator */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center text-sm font-bold text-gray-700 border border-gray-200 uppercase">
                      {person.user_email[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{person.user_email}</p>
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5 uppercase tracking-wider ${
                        person.role === "teacher" 
                          ? "bg-purple-50 text-purple-700 border border-purple-100" 
                          : "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}>
                        {person.role === "teacher" ? "👨‍🏫 Profesor / Asistent" : "🎓 Student"}
                      </span>
                    </div>
                  </div>

                  {/* Butoane Acțiuni */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleToggleRole(person.id, person.role)}
                      disabled={loadingAction}
                      className={`text-xs font-bold px-3 py-2 rounded-xl border transition disabled:opacity-50 ${
                        person.role === "teacher"
                          ? "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                          : "bg-purple-600 text-white border-transparent hover:bg-purple-700"
                      }`}
                    >
                      {person.role === "teacher" ? "Fă-l Student" : "Promovează în Profesor"}
                    </button>
                    
                    <button
                      onClick={() => handleKickUser(person.id, person.user_email)}
                      disabled={loadingAction}
                      className="p-2 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100/70 rounded-xl transition disabled:opacity-50 text-xs font-bold"
                      title="Elimină din curs"
                    >
                      ❌ Elimină
                    </button>
                  </div>

                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 space-y-2">
              <span className="text-3xl">👥</span>
              <p className="text-sm font-medium">Momentan nu s-a înscris niciun utilizator la acest curs.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}