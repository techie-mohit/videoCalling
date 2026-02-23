import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthProvider";

const Register = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const result = await register(name, email, password);

    if (result.success) {
      navigate("/lobby");
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    /* Background: Deep Slate Blue (Visible color, not black) */
    <div className="min-h-screen flex items-center justify-center bg-[#1e293b] py-8 px-4 relative overflow-hidden">
      
      {/* Soft Luminous Glows for "Light" depth */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-500/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2"></div>

      <div className="w-full max-w-md z-10">
        {/* Main Card: Frosted Navy with high-transparency */}
        <div className="rounded-[2.5rem] border border-white/20 bg-[#334155]/60 p-8 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">

          <h1 className="mb-2 text-center text-3xl font-black text-white tracking-tight">
            Register
          </h1>

          {error && (
            <div className="mb-4 rounded-xl bg-red-400/20 border border-red-400/30 p-3 text-center text-sm font-bold text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="John Doe"
                className="w-full rounded-xl border border-white/10 bg-[#1e293b]/50 px-4 py-3 text-white placeholder-sky-200/20 outline-none transition-all focus:border-sky-400 focus:bg-[#1e293b] focus:ring-4 focus:ring-sky-400/10"
              />
            </div>

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
                className="w-full rounded-xl border border-white/10 bg-[#1e293b]/50 px-4 py-3 text-white placeholder-sky-200/20 outline-none transition-all focus:border-sky-400 focus:bg-[#1e293b] focus:ring-4 focus:ring-sky-400/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••"
                  className="w-full rounded-xl border border-white/10 bg-[#1e293b]/50 px-4 py-3 text-white placeholder-sky-200/20 outline-none transition-all focus:border-sky-400 focus:bg-[#1e293b] focus:ring-4 focus:ring-sky-400/10"
                />
              </div>
              <div>
                <label className="mb-1.5 ml-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">
                  Confirm
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••"
                  className="w-full rounded-xl border border-white/10 bg-[#1e293b]/50 px-4 py-3 text-white placeholder-sky-200/20 outline-none transition-all focus:border-sky-400 focus:bg-[#1e293b] focus:ring-4 focus:ring-sky-400/10"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 rounded-xl bg-gradient-to-r from-sky-400 to-blue-500 py-4 font-bold text-white shadow-xl shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Processing..." : "Create Account"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-sky-100/40">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-sky-300 hover:text-sky-200 transition-colors">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;