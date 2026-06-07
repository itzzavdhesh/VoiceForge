import { Github, Instagram, Facebook } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-ink/10 py-4">
      <div className="flex justify-center gap-4">
        <a
          href="https://github.com/project"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          <Github size={20} />
        </a>

        <a
          href="https://instagram.com/project"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
        >
          <Instagram size={20} />
        </a>

        <a
          href="https://facebook.com/project"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Facebook"
        >
          <Facebook size={20} />
        </a>
      </div>
    </footer>
  );
}