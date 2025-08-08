"use client";
import { useState } from 'react';

type Props = { onCreated?: () => void };

export function ClientDrawer({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', tags: '' });
  const [loading, setLoading] = useState(false);

  async function createClient() {
    setLoading(true);
    const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      setForm({ name: '', email: '', phone: '', tags: '' });
      onCreated?.();
    }
  }

  return (
    <div>
      <button onClick={() => setOpen(true)} className="px-3 py-2 rounded-lg bg-blue-600 text-white">Nova ficha</button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-neutral-900 border-l border-white/10 p-6 overflow-auto backdrop-blur-xl">
            <h3 className="text-lg font-semibold mb-4">Nova ficha de cliente</h3>
            <div className="space-y-3">
              {['name','email','phone','tags'].map((k) => (
                <div key={k}>
                  <label className="block text-sm mb-1 capitalize" htmlFor={k}>{k}</label>
                  <input id={k} value={(form as any)[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} className="w-full rounded-lg border border-white/15 bg-white/60 dark:bg-white/10 px-3 py-2" />
                </div>
              ))}
              <div className="flex gap-2">
                <button disabled={loading} onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg border">Cancelar</button>
                <button disabled={loading} onClick={createClient} className="px-3 py-2 rounded-lg bg-blue-600 text-white">{loading ? 'Salvando…' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

