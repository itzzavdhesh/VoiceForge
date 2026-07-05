import { useEffect, useRef } from "react";

const waveBarCount = 12;

export default function VoiceForgeLanding({ onNavigate }) {
  const cardRefs = useRef([]);
  const waveRefs = useRef([]);

  useEffect(() => {
    // Give each bar its own independent random-height loop so the
    // waveform looks like it's actually "listening" instead of a
    // synced, repeating pattern.
    const timeouts = [];

    const animateBar = (bar) => {
      if (!bar) return;
      const nextHeight = Math.random() * 26 + 8; // 8px - 34px
      const nextDuration = Math.random() * 350 + 400; // 400ms - 750ms
      bar.style.transitionDuration = `${nextDuration}ms`;
      bar.style.height = `${nextHeight}px`;

      const timeoutId = setTimeout(() => animateBar(bar), nextDuration);
      timeouts.push(timeoutId);
    };

    waveRefs.current.forEach((bar) => {
      if (!bar) return;
      bar.style.transition = "height 0.5s cubic-bezier(0.45, 0, 0.55, 1)";
      // Stagger the first tick so bars don't all start their loop in lockstep
      const startDelay = Math.random() * 400;
      const timeoutId = setTimeout(() => animateBar(bar), startDelay);
      timeouts.push(timeoutId);
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.remove("opacity-0", "translate-y-8");
          entry.target.classList.add("opacity-100", "translate-y-0");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    cardRefs.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => {
      observer.disconnect();
      timeouts.forEach((id) => clearTimeout(id));
    };
  }, []);

  const setCardRef = (index) => (el) => {
    cardRefs.current[index] = el;
  };

  const setWaveRef = (index) => (el) => {
    waveRefs.current[index] = el;
  };

  return (
    <div className="w-full min-h-screen overflow-x-hidden bg-[#0A0A0A] text-[#e5e2e1] antialiased">
      

      <main>
        <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 text-center sm:px-6 lg:px-8">
          <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center gap-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#53e894]/30 bg-[#53e894]/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#53e894] sm:text-sm">
              <span className="material-symbols-outlined text-[18px]">verified</span>
              Privacy-first local synthesis
            </div>

            <h1 className="max-w-4xl text-4xl font-extrabold leading-tight tracking-[-0.03em] text-[#e5e2e1] sm:text-5xl lg:text-7xl">
              Break the Silence of the{" "}
              <span className="text-[#53e894]">Chat Box.</span>
            </h1>

            <p className="max-w-2xl text-base leading-7 text-[#bbcabc] sm:text-lg">
              Empowering the deaf and speech-impaired to lead conversations on
              video calls with their own voice. Real-time, expressive, and
              entirely local.
            </p>

            <div className="flex w-full flex-col items-stretch justify-center gap-4 pt-2 sm:w-auto sm:flex-row sm:items-center">
              <button onClick={() => onNavigate?.('onboarding')} className="min-h-[52px] rounded-xl bg-[#53e894] px-8 py-4 text-base font-bold text-black shadow-lg shadow-[#53e894]/20 transition duration-200 hover:scale-[1.02] hover:bg-[#69f7a7] active:scale-[0.98]">
                Claim Your Voice
              </button>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 items-end gap-1 opacity-60">
            {Array.from({ length: waveBarCount }).map((_, index) => (
              <span
                key={index}
                ref={setWaveRef(index)}
                className="block w-[3px] rounded-full bg-[#53e894]"
              />
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-6 border-b border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-bold tracking-tight text-[#e5e2e1] sm:text-4xl">
                Engineered for Inclusion
              </h2>
              <p className="mt-3 text-base leading-7 text-[#bbcabc]">
                We moved the technology out of the cloud and into your hands.
                Every interaction is designed to feel natural, immediate, and
                human.
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-12 md:auto-rows-fr md:[grid-template-areas:'feature_feature_feature_feature_feature_feature_feature_feature_control_control_control_control''presence_presence_presence_presence_presence_presence_presence_presence_presence_presence_presence_presence']">
            <article
              ref={setCardRef(0)}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-[rgba(22,22,22,0.8)] opacity-0 backdrop-blur-xl transition-all duration-700 translate-y-8 md:col-span-8"
            >
              <div className="relative h-72 md:h-full md:min-h-[430px]">
                <div className="absolute inset-0 bg-[#2a2a2a]/50">
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        "linear-gradient(#53e894 0.5px, transparent 0.5px), linear-gradient(90deg, #53e894 0.5px, transparent 0.5px)",
                      backgroundSize: "20px 20px",
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-[#53e894]/30 sm:text-7xl">
                      analytics
                    </span>
                  </div>
                </div>

                <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent p-6 sm:p-8">
                  <span className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#53e894]">
                    Active Participation
                  </span>
                  <h3 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
                    No more chat-box delays.
                  </h3>
                  <p className="max-w-2xl text-sm leading-6 text-[#bbcabc] sm:text-base sm:leading-7">
                    Our Predictive Text-to-Speech Engine anticipates your flow
                    with Zero-Cloud Processing, allowing you to interject in
                    fast-paced meetings with natural, immediate timing.
                  </p>
                </div>
              </div>
            </article>

            <aside
              ref={setCardRef(1)}
              className="rounded-2xl border border-white/10 bg-[rgba(22,22,22,0.8)] p-6 opacity-0 backdrop-blur-xl transition-all duration-700 translate-y-8 md:col-span-4 md:p-8"
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#ffb4a5]/10 text-[#ffb4a5]">
                <span className="material-symbols-outlined">security</span>
              </div>

              <h3 className="mb-4 text-2xl font-bold text-[#e5e2e1]">
                Total Control
              </h3>

              <p className="mb-6 text-sm leading-6 text-[#bbcabc] sm:text-base sm:leading-7">
                Your voice prints never leave your device. Bio-secure local
                storage and local encryption keep every word private.
              </p>

              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm text-[#e5e2e1]">
                  <span className="material-symbols-outlined text-[18px] text-[#53e894]">
                    check_circle
                  </span>
                  No Cloud Uploads
                </li>
                <li className="flex items-center gap-3 text-sm text-[#e5e2e1]">
                  <span className="material-symbols-outlined text-[18px] text-[#53e894]">
                    check_circle
                  </span>
                  Offline Processing
                </li>
              </ul>
            </aside>

            <article
              ref={setCardRef(2)}
              className="rounded-2xl border border-white/10 bg-[rgba(22,22,22,0.8)] p-6 opacity-0 backdrop-blur-xl transition-all duration-700 translate-y-8 md:col-span-12 md:flex md:items-center md:gap-8 md:p-8"
            >
              <div className="mb-6 text-center md:mb-0 md:w-1/3 md:text-left">
                <h3 className="mb-4 text-2xl font-bold text-[#e5e2e1]">
                  Natural Presence
                </h3>
                <p className="text-sm leading-6 text-[#bbcabc] sm:text-base sm:leading-7">
                  Cloned face and voice capabilities ensure your digital
                  representative carries your unique inflection, tone, and
                  warmth.
                </p>
              </div>

              <div className="flex gap-4 overflow-x-auto pb-2 md:w-2/3 md:pb-0">
                <div className="relative aspect-square min-w-[200px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      background:
                        "repeating-linear-gradient(45deg, transparent, transparent 10px, #53e894 10px, #53e894 11px)",
                    }}
                  />
                  <span className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl text-[#53e894]/20">
                    face
                  </span>
                </div>

                <div className="relative aspect-square min-w-[200px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      background:
                        "repeating-linear-gradient(-45deg, transparent, transparent 10px, #53e894 10px, #53e894 11px)",
                    }}
                  />
                  <span className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl text-[#53e894]/20">
                    equalizer
                  </span>
                </div>

                <div className="relative aspect-square min-w-[200px] overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  <div
                    className="absolute inset-0 opacity-10"
                    style={{
                      backgroundImage:
                        "radial-gradient(#53e894 0.5px, transparent 0.5px)",
                      backgroundSize: "10px 10px",
                    }}
                  />
                  <span className="material-symbols-outlined absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl text-[#53e894]/20">
                    groups
                  </span>
                </div>
              </div>
            </article>
          </div>
        </section>

        <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
          <div
            ref={setCardRef(3)}
            className="mx-auto max-w-4xl rounded-3xl border border-[#53e894]/20 bg-[rgba(22,22,22,0.8)] p-8 text-center opacity-0 backdrop-blur-xl transition-all duration-700 translate-y-8 sm:p-12"
          >
            <h2 className="mb-6 text-3xl font-bold tracking-tight text-[#e5e2e1] sm:text-4xl lg:text-5xl">
              Ready to lead the conversation?
            </h2>

            <p className="mx-auto mb-10 max-w-2xl text-base leading-7 text-[#bbcabc] sm:text-lg">
              Start your journey toward a more natural digital presence.
              Download VoiceForge today and reclaim your seat at the table.
            </p>

            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <button onClick={() => onNavigate?.('onboarding')} className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-xl bg-[#53e894] px-8 py-4 text-base font-bold text-black transition duration-200 hover:scale-[1.02] hover:bg-[#69f7a7] active:scale-[0.98]">
                Claim Your Voice
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>

              <button onClick={() => onNavigate?.('about')} className="min-h-[52px] rounded-xl bg-white/10 px-8 py-4 text-base font-semibold text-[#e5e2e1] transition duration-200 hover:bg-white/15 active:scale-[0.98]">
                Technical Specs
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-black/30 py-6" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@600;700;800&family=Inter:wght@400;500;600;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap');

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          font-family: 'Inter', sans-serif;
        }

        h1, h2, h3 {
          font-family: 'Hanken Grotesk', sans-serif;
        }

        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 24;
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>
    </div>
  );
}