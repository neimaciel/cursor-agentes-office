import { TopBar } from "@/components/TopBar";
import { AgentToggles } from "@/components/AgentToggles";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-slate-100 dark:from-black dark:to-slate-950">
      <TopBar />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6">
          <section className="rounded-3xl p-6 border border-white/15 bg-white/40 dark:bg-white/5 backdrop-blur-xl">
            <h2 className="text-xl font-semibold mb-3">Agentes</h2>
            <AgentToggles />
          </section>
        </div>
      </div>
    </main>
  );
}
