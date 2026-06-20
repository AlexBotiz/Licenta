"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase"; // ⚠️ Verifică dacă această cale către instanța ta de Supabase este corectă

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" }); // type poate fi 'success' sau 'error'

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    // 1. Validări de bază direct în client
    if (!password || !confirmPassword) {
      setStatus({ type: "error", message: "Te rugăm să completezi ambele câmpuri." });
      return;
    }

    if (password !== confirmPassword) {
      setStatus({ type: "error", message: "Parolele introduse nu coincid!" });
      return;
    }

    if (password.length < 6) {
      setStatus({ type: "error", message: "Parola trebuie să aibă cel puțin 6 caractere pentru securitate." });
      return;
    }

    try {
      setLoading(true);
      setStatus({ type: "", message: "" });

      // 2. Trimitem noua parolă către Supabase Auth
      // Deoarece utilizatorul a venit de pe link-ul de e-mail, Supabase are deja sesiunea de resetare activă în fundal
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      // 3. Succes!
      setStatus({ 
        type: "success", 
        message: "🎉 Parola a fost actualizată cu succes! Te redirecționăm la pagina de login..." 
      });

      // Redirecționăm utilizatorul după 3 secunde ca să apuce să vadă mesajul de succes
      setTimeout(() => {
        router.push("/login");
      }, 3000);

    } catch (err) {
      console.error("Eroare la resetarea parolei:", err);
      setStatus({ 
        type: "error", 
        message: err.message || "A apărut o eroare neașteptată. Încearcă din nou." 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 text-black font-sans">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        
        {/* HEADER */}
        <div className="text-center space-y-2">
          <span className="text-3xl">🔒</span>
          <h1 className="text-xl font-bold text-gray-900">Setează o parolă nouă</h1>
          <p className="text-xs text-gray-400 max-w-xs mx-auto">
            Alege o parolă sigură pe care să o folosești de acum înainte pentru a te autentifica în contul tău NewGen.
          </p>
        </div>

        {/* FORMULAR */}
        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Noua Parolă</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-blue-500 bg-gray-50 font-medium text-gray-800"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Confirmă Noua Parolă</label>
            <input 
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-blue-500 bg-gray-50 font-medium text-gray-800"
              placeholder="••••••••"
              disabled={loading}
            />
          </div>

          {/* AFIȘARE FEEDBACK (SUCCES / EROARE) */}
          {status.message && (
            <div className={`p-3 text-xs rounded-xl font-semibold border ${
              status.type === "success" 
                ? "bg-green-50 border-green-200 text-green-800" 
                : "bg-red-50 border-red-200 text-red-800"
            }`}>
              {status.type === "success" ? "✅ " : "❌ "}
              {status.message}
            </div>
          )}

          {/* BUTTON */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Se salvează noua parolă..." : "Actualizează Parola"}
          </button>
        </form>

      </div>
    </div>
  );
}