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
import { SOURCE_LABELS, STATUSES, STATUS_LABELS, WORK_MODE_LABELS, type Application, type Status } from "@/lib/types";
import { relativeDay, statusColor } from "@/lib/ui";
import { CompanyAvatar } from "@/components/company-avatar";

export function Board({ apps, staleIds, day }: { apps: Application[]; staleIds: string[]; day: string }) {
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
            day={day}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Column({
  status,
  apps,
  stale,
  day,
}: {
  status: Status;
  apps: Application[];
  stale: Set<string>;
  day: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <section
      ref={setNodeRef}
      className={`flex min-h-72 flex-col rounded-xl border p-2 transition-colors ${
        isOver ? "border-accent bg-accent/5" : "border-transparent bg-foreground/[0.03]"
      }`}
    >
      <h2 className="mb-2 flex items-center gap-2 px-1.5 pt-1 text-xs font-semibold uppercase tracking-wide text-muted">
        <span aria-hidden className="size-2 rounded-full" style={{ background: statusColor(status) }} />
        {STATUS_LABELS[status]}
        <span className="ml-auto rounded-full bg-foreground/5 px-1.5 tabular-nums">{apps.length}</span>
      </h2>
      <div className="flex flex-1 flex-col gap-2">
        {apps.map((app) => (
          <Card key={app.id} app={app} isStale={stale.has(app.id)} day={day} />
        ))}
        {apps.length === 0 && (
          <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-4 text-xs text-muted">
            Drop here
          </p>
        )}
      </div>
    </section>
  );
}

function Card({ app, isStale, day }: { app: Application; isStale: boolean; day: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: app.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const where = [app.work_mode && WORK_MODE_LABELS[app.work_mode], app.location].filter(Boolean).join(" · ");

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`card cursor-grab p-3 text-sm transition-shadow hover:shadow-lift active:cursor-grabbing ${
        isDragging ? "relative z-10 shadow-lift" : ""
      } ${isStale ? "border-warn/60" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <CompanyAvatar company={app.company} />
        <div className="min-w-0 flex-1">
          <Link
            href={`/applications/${app.id}`}
            className="block truncate font-medium hover:underline"
            draggable={false}
          >
            {app.company}
          </Link>
          <p className="line-clamp-2 text-muted">{app.role}</p>
        </div>
      </div>
      {where && <p className="mt-2 truncate text-xs text-muted">{where}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted">
        {app.applied_date && <span title={app.applied_date}>{relativeDay(app.applied_date, day)}</span>}
        {app.source && <span className="chip">{SOURCE_LABELS[app.source]}</span>}
        {app.needs_review && <span className="chip bg-accent/10 text-accent">review</span>}
        {isStale && <span className="chip bg-warn-bg text-warn">follow up</span>}
      </div>
    </div>
  );
}
