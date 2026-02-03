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
      navigate("/");
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 shadow-lg">
              <span className="text-3xl">🎥</span>
            </div>
          </div>

          <h1 className="mb-2 text-center text-3xl font-bold text-white">
            Welcome Back
          </h1>
          <p className="mb-8 text-center text-sm text-white/70">
            Sign in to start video calling
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/50 p-3 text-center text-sm text-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/90">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white placeholder-white/50 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/90">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                className="w-full rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white placeholder-white/50 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-400/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 py-3 font-semibold text-white shadow-lg transition hover:scale-105 hover:shadow-pink-500/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/70">
            Don't have an account?{" "}
            <Link to="/register" className="font-semibold text-pink-300 hover:text-pink-200 transition">
              Create one
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          Secure video calling platform 🔒
        </p>
      </div>
    </div>
  );
};

export default Login;
