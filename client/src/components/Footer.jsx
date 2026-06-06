import React from 'react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full mx-auto max-w-7xl px-4 pb-6 pt-2">
      
      {/* The Styled Black Box */}
      <div className="w-full bg-black text-white border border-ink/20 rounded-xl px-8 py-6 flex flex-col gap-6 shadow-md dark:bg-surface dark:border-border">
        
        {/* Top Section: Splitting branding and links to opposite edges */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between w-full gap-6">
          
          {/* Left Side: VoiceForge Branding */}
          <div className="text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-extrabold tracking-wider text-white">
              VoiceForge
            </h2>
            <p className="text-xs text-neutral-400 mt-1 tracking-wide font-normal">
              Built for accessibility.
            </p>
          </div>

          {/* Right Side: Clean, Right-Aligned Link Stack */}
          <nav className="flex flex-col items-center md:items-end gap-2.5 text-sm md:text-right">
            <a 
              href="https://github.com/itzzavdhesh/VoiceForge.git" // Replace with actual repository link
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-neutral-300 hover:text-glow transition-colors duration-150 flex items-center gap-1.5"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.48 0-.236-.009-.866-.014-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              GitHub
            </a>
            
          </nav>
        </div>

        {/* Divider Line to separate content cleanly */}
        <div className="w-full h-px bg-neutral-800/60 dark:bg-border/40" />

        {/* Bottom Section: Centered Copyright Row (Always the very last line) */}
        <div className="w-full text-center text-xs text-neutral-400 font-medium tracking-wide">
          © {currentYear} VoiceForge. All rights reserved.
        </div>

      </div>
    </footer>
  );
};

export default Footer;

