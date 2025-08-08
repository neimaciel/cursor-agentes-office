import { AgentToggles } from '@/components/AgentToggles';
import { TopBar } from '@/components/TopBar';

export default function AgentsPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-slate-100 dark:from-black dark:to-slate-950">
      <TopBar />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <section className="rounded-3xl p-6 border border-white/15 bg-white/40 dark:bg-white/5 backdrop-blur-xl">
          <h1 className="text-2xl font-semibold mb-4">Agentes</h1>
          <AgentToggles />
        </section>
      </div>
    </main>
  );
}

