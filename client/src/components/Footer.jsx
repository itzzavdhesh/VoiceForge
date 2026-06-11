import React from 'react';

const Footer = ({ onNavigate, tabs }) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mx-auto max-w-7xl px-3 pb-6 pt-2 sm:px-4">
      {/* The Styled Black Box */}
      <div className="w-full bg-black text-white border border-ink/20 rounded-xl px-5 py-6 flex flex-col gap-6 shadow-md dark:bg-surface dark:border-border md:px-8 md:py-8 md:gap-8">

        {/* Top Section: 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-10 w-full">

          {/* Column 1: Brand */}
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl md:text-2xl font-extrabold tracking-wider text-white">
                VoiceForge
              </h2>
              <p className="text-xs text-neutral-400 mt-1 tracking-wide font-normal">
                AI-powered voice for everyone.
              </p>
            </div>
            <p className="text-sm text-neutral-400 leading-relaxed">
              Browser-based assistive communication platform helping deaf and speech-impaired users participate naturally in video calls.
            </p>
            {/* Social Icons */}
            <div className="flex items-center gap-4 mt-1">
              {/* GitHub */}
              <a
                href="https://github.com/itzzavdhesh/VoiceForge"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="text-neutral-400 hover:text-white transition-colors duration-150"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.48 0-.236-.009-.866-.014-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              </a>
              {/* Twitter/X — replace href with actual link when available */}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className="text-neutral-400 hover:text-white transition-colors duration-150"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L2.25 2.25h6.897l4.265 5.638L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
                </svg>
              </a>
              {/* LinkedIn — replace href with actual link when available */}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="text-neutral-400 hover:text-white transition-colors duration-150"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              {/* Discord — replace href with actual link when available */}
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Discord"
                className="text-neutral-400 hover:text-white transition-colors duration-150"
              >
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-white tracking-widest uppercase">
              Quick Links
            </h3>
            <nav className="flex flex-col gap-2 text-sm text-neutral-400">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onNavigate?.(tab.id)}
                  className="text-left capitalize hover:text-white transition-colors duration-150 bg-transparent border-none cursor-pointer p-0"
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Column 3: Resources */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-white tracking-widest uppercase">
              Resources
            </h3>
            <nav className="flex flex-col gap-2 text-sm text-neutral-400">
              <a
                href="https://github.com/itzzavdhesh/VoiceForge/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors duration-150"
              >
                Contributing Guide
              </a>
              <a
                href="https://github.com/itzzavdhesh/VoiceForge/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors duration-150"
              >
                Report a Bug
              </a>
              {/* /privacy and /terms routes to be implemented in a follow-up */}
              <a href="#" className="hover:text-white transition-colors duration-150">
                Privacy Policy
              </a>
              <a href="#" className="hover:text-white transition-colors duration-150">
                Terms of Service
              </a>
            </nav>
          </div>

        </div>

        {/* Divider */}
        <div className="w-full h-px bg-neutral-800/60 dark:bg-border/40" />

        {/* Bottom Bar */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between gap-2 text-xs text-neutral-400 font-medium tracking-wide">
          <span>© {currentYear} VoiceForge. All rights reserved.</span>
          <span className="px-3 py-1 rounded-full border border-neutral-700 text-neutral-400 text-xs">
            ♿ Built for accessibility
          </span>
        </div>

      </div>
    </footer>
  );
};

export default Footer;