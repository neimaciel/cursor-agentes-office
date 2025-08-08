"use client";
import { useEffect, useState } from 'react';
import { DndContext, useSensor, useSensors, PointerSensor, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Deal = { id: string; title: string; stage: 'novo'|'qualificado'|'proposta'|'ganho'; value: number };
const STAGES: Deal['stage'][] = ['novo','qualificado','proposta','ganho'];

function DealCard({ deal }: { deal: Deal }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: deal.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="rounded-xl p-3 border border-white/15 bg-white/60 dark:bg-white/10">
      <div className="font-medium">{deal.title}</div>
      <div className="text-xs opacity-60">R$ {deal.value}</div>
    </div>
  );
}

export function Kanban() {
  const [deals, setDeals] = useState<Deal[]>([]);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    (async () => {
      const res = await fetch('/api/deals');
      setDeals(await res.json());
    })();
  }, []);

  const grouped = STAGES.map((stage) => ({ stage, items: deals.filter((d) => d.stage === stage) }));

  async function persist(id: string, stage: Deal['stage']) {
    await fetch('/api/deals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, stage }) });
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const overStage = over.id as Deal['stage'];
    const deal = deals.find((d) => d.id === active.id);
    if (!deal || deal.stage === overStage) return;
    setDeals((prev) => prev.map((d) => (d.id === deal.id ? { ...d, stage: overStage } : d)));
    persist(deal.id, overStage);
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {grouped.map((col) => (
          <div key={col.stage} className="rounded-2xl p-3 border border-white/15 bg-white/40 dark:bg-white/5 min-h-[200px]">
            <h3 className="text-sm font-semibold mb-2 capitalize">{col.stage}</h3>
            <SortableContext items={col.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {col.items.map((d) => (
                  <DealCard key={d.id} deal={d} />
                ))}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
}

