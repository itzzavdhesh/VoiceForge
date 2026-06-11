import React from "react";

const REPO = "itzzavdhesh/VoiceForge";

export default function Contributors() {
  const [contributors, setContributors] = React.useState([]);
  const [status, setStatus] = React.useState("loading");

  React.useEffect(() => {
    const controller = new AbortController();
    async function fetchContributors() {
      try {
        const res = await fetch(
          `https://api.github.com/repos/${REPO}/contributors?per_page=100`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("Failed to fetch");
        const data = await res.json();
        if (controller.signal.aborted) return;
        setContributors(data.filter((c) => c.type !== "Bot"));
        setStatus("success");
      } catch (err) {
        if (err.name === "AbortError") return;
        setStatus("error");
      }
    }
    fetchContributors();
    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6">
      <section className="rounded-lg bg-black p-6 text-white shadow-soft dark:border dark:border-border dark:bg-surface dark:shadow-soft-dk">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-mint">
          Open Source
        </p>
        <h2 className="mt-1 text-2xl font-bold">Contributors</h2>
        <p className="mt-1 text-sm text-neutral-400">
          Everyone who has contributed to VoiceForge on GitHub.
        </p>
      </section>

      {status === "loading" && (
        <p role="status" aria-live="polite" className="text-center text-sm text-neutral-500">
          Loading contributors…
        </p>
      )}

      {status === "error" && (
        <p role="alert" className="text-center text-sm text-red-500">
          Failed to load contributors. Please try again later.
        </p>
      )}

      {status === "success" && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {contributors.map((contributor) => (
            <a
              key={contributor.id}
              href={contributor.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-2 rounded-lg border border-ink/10 bg-white p-4 text-center transition hover:border-moss hover:shadow-md dark:border-border dark:bg-surface dark:hover:border-glow"
            >
              <img
                src={contributor.avatar_url}
                alt={contributor.login}
                className="h-16 w-16 rounded-full object-cover"
              />
              <span className="text-sm font-semibold text-ink dark:text-neutral-100">
                {contributor.login}
              </span>
              <span className="text-xs text-neutral-500">
                {contributor.contributions} commit{contributor.contributions !== 1 ? "s" : ""}
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
