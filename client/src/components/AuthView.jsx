import React, { useState } from "react";
import { User, Lock, Loader2, KeyRound } from "lucide-react";
import { setTokens } from "../utils/auth.js";

export default function AuthView({ onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const trimmedUsername = username.trim();
    if (!trimmedUsername || !password) {
      setError("Username and password are required.");
      setLoading(false);
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername, password })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      setTokens(data.accessToken, data.refreshToken);
      onAuthSuccess();
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-white/20 bg-white/40 p-8 shadow-2xl backdrop-blur-xl dark:border-border/30 dark:bg-surface/30">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-mint/20 text-moss dark:bg-glow/20 dark:text-glow">
            <KeyRound className="h-6 w-6" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-ink dark:text-neutral-50">
            {isLogin ? "Sign in to VoiceForge" : "Create your account"}
          </h2>
          <p className="mt-2 text-sm text-ink/65 dark:text-white/65">
            {isLogin ? "Or " : "Already have an account? "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setUsername("");
                setPassword("");
                setConfirmPassword("");
              }}
              className="font-medium text-moss hover:underline dark:text-glow focus:outline-none"
            >
              {isLogin ? "register a new account" : "sign in here"}
            </button>
          </p>
        </div>

        {/* Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          
          {error && (
            <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4 rounded-md shadow-sm">
            {/* Username Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink/40 dark:text-white/40">
                <User className="h-5 w-5" />
              </span>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="block w-full rounded-lg border border-ink/15 bg-white/80 py-3 pl-10 pr-3 text-ink transition hover:border-moss focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 dark:border-border dark:bg-black/60 dark:text-neutral-100 dark:hover:border-glow dark:focus:border-glow dark:focus:ring-glow/20"
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink/40 dark:text-white/40">
                <Lock className="h-5 w-5" />
              </span>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="block w-full rounded-lg border border-ink/15 bg-white/80 py-3 pl-10 pr-3 text-ink transition hover:border-moss focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 dark:border-border dark:bg-black/60 dark:text-neutral-100 dark:hover:border-glow dark:focus:border-glow dark:focus:ring-glow/20"
              />
            </div>

            {/* Confirm Password Input (only for Registration) */}
            {!isLogin && (
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ink/40 dark:text-white/40">
                  <Lock className="h-5 w-5" />
                </span>
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm Password"
                  className="block w-full rounded-lg border border-ink/15 bg-white/80 py-3 pl-10 pr-3 text-ink transition hover:border-moss focus:border-moss focus:outline-none focus:ring-2 focus:ring-moss/20 dark:border-border dark:bg-black/60 dark:text-neutral-100 dark:hover:border-glow dark:focus:border-glow dark:focus:ring-glow/20"
                />
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg border border-transparent bg-black px-4 py-3 text-sm font-semibold text-white transition hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-moss focus:ring-offset-2 disabled:opacity-50 dark:bg-glow dark:text-black dark:hover:bg-glow/90 dark:focus:ring-glow"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : isLogin ? (
                "Sign In"
              ) : (
                "Sign Up"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
