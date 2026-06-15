const techStack = [
  { name: "React 18", color: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
  { name: "Vite 5", color: "bg-purple-500/10 text-purple-400 border border-purple-500/20" },
  { name: "Tailwind CSS 3", color: "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" },
  { name: "Node.js + Express", color: "bg-green-500/10 text-green-400 border border-green-500/20" },
  { name: "ElevenLabs TTS", color: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20" },
  { name: "ONNX Runtime Web", color: "bg-orange-500/10 text-orange-400 border border-orange-500/20" },
  { name: "IndexedDB", color: "bg-pink-500/10 text-pink-400 border border-pink-500/20" },
  { name: "WebRTC", color: "bg-red-500/10 text-red-400 border border-red-500/20" },
];

const steps = [
  {
    number: "01",
    title: "Record Your Voice",
    description: "Record a short 10-second consent-based reference clip. VoiceForge sends it to ElevenLabs to create a unique voice profile stored locally in your browser.",
  },
  {
    number: "02",
    title: "Type What You Want to Say",
    description: "On the Compose or Call tab, type any phrase. VoiceForge converts it to speech using your cloned voice in real time.",
  },
  {
    number: "03",
    title: "Join Your Call Naturally",
    description: "Go Live to expose the lip-synced canvas stream. Use OBS Virtual Camera to route it into Zoom, Google Meet, or Microsoft Teams as your camera feed.",
  },
];

export default function About({ onNavigate }) {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-12 max-w-4xl mx-auto">

      <section className="mb-16 text-center">
        <h1 className="text-4xl font-bold mb-4">About VoiceForge</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          An open-source assistive communication platform that helps deaf and
          speech-impaired users participate naturally in video calls through
          AI-powered voice cloning, real-time text-to-speech, and lip-synced
          facial video output.
        </p>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-4">Why VoiceForge Exists</h2>
        <p className="text-muted-foreground leading-relaxed">
          Deaf and speech-impaired people on video calls are often pushed into
          chat boxes, delayed interpretation, or awkward turn-taking. VoiceForge
          explores a local-first interface where typed intent can become spoken
          audio and a synchronized visual feed, helping users participate in the
          same conversational channel as everyone else.
        </p>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-8">How It Works</h2>
        <div className="grid gap-6 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="
                rounded-xl border border-border bg-card p-6
                transition-all duration-300 ease-out
                hover:-translate-y-2
                hover:shadow-xl
                hover:border-primary
                hover:bg-accent/20
                cursor-pointer
              "
            >
              <span className="text-3xl font-bold text-primary opacity-40">{step.number}</span>
              <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-16">
        <h2 className="text-2xl font-semibold mb-6">Tech Stack</h2>
        <div className="flex flex-wrap gap-3">
          {techStack.map((tech) => (
            <span key={tech.name} className={`rounded-full px-4 py-1.5 text-sm font-medium ${tech.color}`}>
              {tech.name}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="text-2xl font-semibold mb-3">Open Source and Community</h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          VoiceForge is built in the open under the MIT license. Whether you are
          fixing a bug, suggesting a feature, or improving accessibility, all
          contributions are welcome.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a
            href="https://github.com/itzzavdhesh/VoiceForge"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Star on GitHub
          </a>
          <button
            onClick={() => onNavigate("contributors")}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium hover:bg-accent transition-colors"
          >
            Meet the Contributors
          </button>
        </div>
      </section>

    </div>
  );
}
