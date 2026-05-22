// Configures Tailwind content scanning and the VoiceForge design tokens.
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16201d",
        moss: "#3f5f4d",
        mint: "#c9ead7",
        coral: "#f26f63",
        amber: "#f3bc51",
        cloud: "#f6f8f5"
      },
      boxShadow: {
        soft: "0 18px 60px rgba(22, 32, 29, 0.12)"
      }
    }
  },
  plugins: []
};
