"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function TagsCell({ id, tags }: { id: string; tags: string[] }) {
  const patch = useStore((s) => s.patch);
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const v = raw.trim().toLowerCase();
    if (!v || tags.includes(v)) return;
    patch(id, { tags: [...tags, v] });
    setDraft("");
  };

  const remove = (t: string) => patch(id, { tags: tags.filter((x) => x !== t) });

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((t) => (
        <span
          key={t}
          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
        >
          {t}
          <button onClick={() => remove(t)} className="opacity-50 hover:opacity-100">
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add(draft);
          } else if (e.key === "Backspace" && !draft && tags.length) {
            remove(tags[tags.length - 1]);
          }
        }}
        onBlur={() => draft && add(draft)}
        placeholder={tags.length ? "+" : "add tag"}
        className={cn(
          "min-w-[3rem] flex-1 bg-transparent text-xs outline-none",
          "placeholder:text-muted-foreground/50"
        )}
      />
    </div>
  );
}
