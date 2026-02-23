import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate("/lobby");
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    /* Background: Deep Slate Blue (Matches Register) */
    <div className="min-h-screen flex items-center justify-center bg-[#1e293b] py-8 px-4 relative overflow-hidden">
      
      {/* Soft Luminous Glows to prevent complete darkness */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-sky-500/10 rounded-full blur-[120px] -translate-y-1/2 -translate-x-1/2"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px] translate-y-1/2 translate-x-1/2"></div>

      <div className="w-full max-w-md z-10">
        {/* Main Card: Frosted Navy Glass */}
        <div className="rounded-[2.5rem] border border-white/20 bg-[#334155]/60 p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">

          <h1 className="mb-2 text-center text-3xl font-black text-white tracking-tight">
            Login
          </h1>

          {error && (
            <div className="mb-4 rounded-xl bg-red-400/20 border border-red-400/30 p-3 text-center text-sm font-bold text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@sky.com"
                className="w-full rounded-xl border border-white/10 bg-[#1e293b]/50 px-4 py-3.5 text-white placeholder-sky-200/20 outline-none transition-all focus:border-sky-400 focus:bg-[#1e293b] focus:ring-4 focus:ring-sky-400/10"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 ml-1">
                <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
                  Password
                </label>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-[#1e293b]/50 px-4 py-3.5 text-white placeholder-sky-200/20 outline-none transition-all focus:border-sky-400 focus:bg-[#1e293b] focus:ring-4 focus:ring-sky-400/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 py-4 font-bold text-white shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Sign In"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-sky-100/40">
            Don't have an account?{" "}
            <Link to="/register" className="font-bold text-sky-300 hover:text-sky-200 transition-colors">
              Register
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;