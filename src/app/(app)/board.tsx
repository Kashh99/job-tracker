"use client";

import Link from "next/link";
import { startTransition, useOptimistic } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { moveApplication } from "@/app/actions";
import { SOURCE_LABELS, STATUSES, STATUS_LABELS, type Application, type Status } from "@/lib/types";

export function Board({ apps, staleIds }: { apps: Application[]; staleIds: string[] }) {
  const [optimisticApps, moveOptimistic] = useOptimistic(
    apps,
    (state, move: { id: string; status: Status }) =>
      state.map((a) => (a.id === move.id ? { ...a, status: move.status } : a)),
  );
  // Small drag threshold so a click on a card still opens it.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const stale = new Set(staleIds);

  function onDragEnd({ active, over }: DragEndEvent) {
    if (!over) return;
    const status = over.id as Status;
    const app = optimisticApps.find((a) => a.id === active.id);
    if (!app || app.status === status) return;
    startTransition(async () => {
      moveOptimistic({ id: app.id, status });
      await moveApplication(app.id, status);
    });
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid grid-flow-col auto-cols-[minmax(15rem,1fr)] gap-3 overflow-x-auto pb-2">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            apps={optimisticApps.filter((a) => a.status === status)}
            stale={stale}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Column({ status, apps, stale }: { status: Status; apps: Application[]; stale: Set<string> }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-64 flex-col rounded-lg border p-2 transition-colors ${
        isOver ? "border-accent bg-accent/5" : "border-border bg-background"
      }`}
    >
      <h2 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {STATUS_LABELS[status]}
        <span className="tabular-nums">{apps.length}</span>
      </h2>
      <div className="flex flex-col gap-2">
        {apps.map((app) => (
          <Card key={app.id} app={app} isStale={stale.has(app.id)} />
        ))}
      </div>
    </section>
  );
}

function Card({ app, isStale }: { app: Application; isStale: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: app.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`card cursor-grab p-2.5 text-sm active:cursor-grabbing ${
        isDragging ? "relative z-10 shadow-lg" : ""
      } ${isStale ? "border-warn/60" : ""}`}
    >
      <Link href={`/applications/${app.id}`} className="font-medium hover:underline" draggable={false}>
        {app.company}
      </Link>
      <p className="text-muted">{app.role}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs text-muted">
        {app.applied_date && <span>{app.applied_date}</span>}
        {app.source && <span>· {SOURCE_LABELS[app.source]}</span>}
        {isStale && <span className="rounded bg-warn-bg px-1 text-warn">follow up</span>}
      </div>
    </div>
  );
}
