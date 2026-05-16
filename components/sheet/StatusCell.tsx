"use client";

import { useStore } from "@/lib/store";
import { STATUSES, STATUS_STYLES, type ContentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { ChevronDown } from "lucide-react";

export function StatusCell({ id, status }: { id: string; status: ContentStatus }) {
  const patch = useStore((s) => s.patch);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition hover:brightness-95",
            STATUS_STYLES[status]
          )}
        >
          {status}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {STATUSES.map((s) => (
          <DropdownMenuItem
            key={s}
            onSelect={() => patch(id, { status: s })}
            className="flex items-center justify-between gap-3"
          >
            <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset", STATUS_STYLES[s])}>
              {s}
            </span>
            {s === status && <span className="text-xs text-muted-foreground">current</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
