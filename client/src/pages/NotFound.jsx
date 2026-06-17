import React from "react";
import { Home, AlertCircle } from "lucide-react";

export default function NotFound({ onBackHome }) {
  React.useEffect(() => {
    // Scroll to top when loading
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "instant",
    });
  }, []);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 animate-fade-in-up">
      <div className="max-w-md w-full text-center">
        {/* Branding Logo & Title */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <img
            src="/models/logo5.png"
            alt="VoiceForge Logo"
            className="h-10 w-10 object-contain sm:h-12 sm:w-12 transition-transform duration-500 hover:rotate-12"
          />
          <span className="text-xl font-bold tracking-normal text-ink dark:text-neutral-50 sm:text-2xl">
            VoiceForge
          </span>
        </div>

        {/* 404 Graphic Card */}
        <div className="bg-white dark:bg-surface border border-ink/10 dark:border-border rounded-2xl p-8 shadow-soft dark:shadow-soft-dk mb-8 relative overflow-hidden group">
          {/* Subtle background gradient glow on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-mint/10 to-coral/10 dark:from-glow/5 dark:to-coral/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative z-10 flex flex-col items-center">
            {/* Animated Alert Icon */}
            <div className="inline-flex p-3 rounded-full bg-coral/10 text-coral dark:bg-coral/20 dark:text-coral mb-4 animate-pulse">
              <AlertCircle size={40} />
            </div>

            {/* Error Code */}
            <h2 className="text-7xl sm:text-8xl font-black tracking-tight bg-gradient-to-r from-coral to-amber dark:from-coral dark:to-glow bg-clip-text text-transparent mb-2">
              404
            </h2>

            {/* Heading */}
            <h3 className="text-2xl font-bold text-ink dark:text-neutral-50 mb-3">
              Page Not Found
            </h3>

            {/* Friendly Message */}
            <p className="text-sm sm:text-base text-ink/70 dark:text-neutral-400 max-w-sm">
              We searched high and low, but we couldn't find the page you're looking for. It might have been moved or doesn't exist.
            </p>
          </div>
        </div>

        {/* Return Button */}
        <button
          onClick={() => {
            if (onBackHome) {
              onBackHome();
            } else {
              // Fallback default redirect to home
              window.history.pushState({}, "", "/");
            }
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-moss hover:bg-moss/90 text-white font-semibold px-6 py-3 transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss dark:bg-glow dark:hover:bg-glow/90 dark:text-black dark:focus-visible:ring-glow"
        >
          <Home size={18} />
          Go Back Home
        </button>
      </div>
    </div>
  );
}
