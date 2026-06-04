"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState({ username: "", role: "student", avatar_url: "" });
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState("student");
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function getProfileData() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }

      setUser(session.user);

      // 1. Încercăm să luăm profilul
      let { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("username, role, avatar_url")
        .eq("email", session.user.email)
        .maybeSingle();

      if (profileError) {
        console.error("Eroare la citirea profilului din DB:", profileError);
      }

      // Dacă profilul nu există, îl creăm în siguranță cu .upsert()
      if (!profile && !profileError) {
        const defaultName = session.user.email.split("@")[0];
        
        // .upsert() previne eroarea 23505 în cazul execuțiilor paralele din React StrictMode
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .upsert({ email: session.user.email, username: defaultName, role: "student" })
          .select()
          .maybeSingle();

        if (insertError) {
          console.error("Eroare critică la INSERAREA profilului nou:", insertError);
        } else {
          profile = newProfile;
        }
      }

      if (profile) {
        setProfileData(profile);
        setEditUsername(profile.username || "");
        setEditRole(profile.role || "student");
      }

      // 2. Tragem cursurile la care e înscris
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select(`id, courses ( id, title, description )`)
        .eq("user_email", session.user.email);

      if (enrollments) {
        const coursesArray = enrollments.filter(e => e.courses !== null).map(e => e.courses);
        setEnrolledCourses(coursesArray);
      }

      setLoading(false);
    }

    getProfileData();
  }, [router]);

  // Salvarea modificărilor în baza de date
  const handleSaveProfile = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({ username: editUsername, role: editRole })
      .eq("email", user.email);

    if (!error) {
      setProfileData({ ...profileData, username: editUsername, role: editRole });
      setIsEditing(false);
    } else {
      console.error("Eroare la salvare în DB:", error);
      alert("Eroare la salvarea profilului: " + error.message);
    }
  };

  // Upload poză de profil în Storage
  const handleAvatarUpload = async (event) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.email}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("email", user.email);

      if (updateError) throw updateError;

      setProfileData({ ...profileData, avatar_url: publicUrl });
    } catch (error) {
      console.error("Eroare la avatar:", error);
      alert("Eroare la încărcarea imaginii.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const getRoleBadgeStyle = (role) => {
    if (role === "admin") return "bg-red-50 text-red-600 border border-red-200";
    if (role === "profesor") return "bg-purple-50 text-purple-600 border border-purple-200";
    return "bg-blue-50 text-blue-600 border border-blue-200";
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-gray-500">Se încarcă profilul...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-black">
      {/* NAVBAR */}
      <nav className="bg-white border-b border-gray-100 p-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 onClick={() => router.push("/")} className="text-xl font-bold text-blue-600 tracking-tight cursor-pointer">
            LICENTA NAME
          </h1>
          <div className="flex items-center gap-6">
            <button onClick={() => router.push("/")} className="text-sm font-medium text-gray-600 hover:text-blue-600 transition">
              Acasă
            </button>
            <button onClick={handleLogout} className="text-sm font-medium text-red-500 hover:text-red-600 transition bg-red-50 px-3 py-1.5 rounded-lg">
              Deconectare
            </button>
          </div>
        </div>
      </nav>

      {/* CONTINUT PROFIL */}
      <main className="max-w-5xl mx-auto px-6 py-12 space-y-10">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-6 w-full md:w-auto">
            
            {/* AVATAR */}
            <div className="relative group w-20 h-20">
              {profileData.avatar_url ? (
                <img 
                  src={profileData.avatar_url} 
                  alt="Avatar" 
                  className="w-20 h-20 rounded-2xl object-cover shadow-md"
                />
              ) : (
                <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-md shadow-blue-100">
                  {profileData.username ? profileData.username[0].toUpperCase() : "U"}
                </div>
              )}
              
              <label className="absolute inset-0 bg-black/40 rounded-2xl flex items-center justify-center text-white text-[11px] font-medium opacity-0 group-hover:opacity-100 transition cursor-pointer text-center p-1">
                {uploading ? "Se urcă..." : "Schimbă"}
                <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
              </label>
            </div>
            
            {/* DATE UTILIZATOR */}
            <div className="text-center sm:text-left space-y-2 w-full sm:w-auto">
              {!isEditing ? (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
                    <h2 className="text-2xl font-bold text-gray-900">{profileData.username || "Utilizator"}</h2>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize self-center sm:self-auto ${getRoleBadgeStyle(profileData.role)}`}>
                      {profileData.role}
                    </span>
                  </div>
                  <p className="text-gray-500 font-medium text-sm">{user?.email}</p>
                </>
              ) : (
                <div className="flex flex-col gap-2 w-full sm:w-64">
                  <input 
                    type="text" 
                    value={editUsername} 
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="p-2 text-sm border border-gray-200 rounded-xl focus:outline-blue-500"
                    placeholder="Nume utilizator..."
                  />
                  <select 
                    value={editRole} 
                    onChange={(e) => setEditRole(e.target.value)}
                    className="p-2 text-sm border border-gray-200 rounded-xl focus:outline-blue-500 bg-white"
                  >
                    <option value="student">Student</option>
                    <option value="profesor">Profesor</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              )}
              <p className="text-xs text-gray-400">
                Cont creat la: {user?.created_at ? new Date(user.created_at).toLocaleDateString('ro-RO') : "Recent"}
              </p>
            </div>
          </div>

          {/* BUTOANE EDITARE */}
          <div className="w-full md:w-auto flex justify-center">
            {!isEditing ? (
              <button 
                onClick={() => setIsEditing(true)}
                className="text-xs font-bold bg-gray-50 border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-100 transition"
              >
                Editează profil
              </button>
            ) : (
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="text-xs font-bold bg-gray-100 text-gray-600 px-4 py-2 rounded-xl hover:bg-gray-200 transition"
                >
                  Anulează
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="text-xs font-bold bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
                >
                  Salvează
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CURSURI */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-gray-900 tracking-tight">
            Cursurile mele ({enrolledCourses.length})
          </h3>
          
          {enrolledCourses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {enrolledCourses.map((course) => (
                <div 
                  key={course.id}
                  onClick={() => router.push(`/course/${course.id}`)}
                  className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-100 transition cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold bg-green-50 text-green-600 px-2.5 py-1 rounded-full uppercase tracking-wider">
                      Înscris
                    </span>
                    <h4 className="text-lg font-bold text-gray-900 pt-1">{course.title}</h4>
                    <p className="text-gray-500 text-sm line-clamp-2 leading-relaxed">
                      {course.description || "Continuă studiul structurat și antrenamentul cu asistentul tău AI."}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-gray-50 flex justify-between items-center text-xs font-semibold text-blue-600">
                    <span>Deschide cursul</span>
                    <span>→</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-gray-200 space-y-4">
              <span className="text-4xl">📚</span>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">Nu ești înscris la niciun curs în acest moment.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}