"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase"; // Verifică dacă calea e corectă

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true); // Schimbă între Login și Register
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError(null);

    if (isLogin) {
      // LOGICĂ PENTRU LOGIN
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        router.push("/"); // Dacă e logat cu succes, îl trimitem pe pagina principală
      }
    } else {
      // LOGICĂ PENTRU REGISTER
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        setError(error.message);
      } else {
        // La înregistrare, Supabase vrea implicit să confirmi emailul, 
        // dar pentru dev e suficient să zici că a mers sau să dezactivezi confirmarea
        alert("Cont creat! Acum te poți loga (sau verifică emailul).");
        setIsLogin(true); // Îl mutăm pe fereastra de login
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-96 border border-gray-100">
        <h2 className="text-2xl font-bold text-blue-600 mb-6 text-center">
          {isLogin ? "Autentificare" : "Creează cont"}
        </h2>
        
        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
        
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Parolă</label>
            <input
              type="password"
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition"
          >
            {isLogin ? "Intră în cont" : "Înregistrează-te"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)} 
            className="text-sm text-blue-600 hover:underline"
          >
            {isLogin ? "Nu ai cont? Creează unul" : "Ai deja cont? Loghează-te"}
          </button>
        </div>
      </div>
    </div>
  );
}