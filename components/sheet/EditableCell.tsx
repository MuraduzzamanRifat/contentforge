"use client";

import { useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  field: "title" | "hook" | "description";
  value: string;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}

export function EditableCell({ id, field, value, placeholder, multiline, className }: Props) {
  const patch = useStore((s) => s.patch);
  const [local, setLocal] = useState(value);
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => setLocal(value), [value]);

  const save = useDebouncedCallback((v: string) => {
    if (v === value) return;
    setSaving(true);
    patch(id, { [field]: v });
    setTimeout(() => setSaving(false), 250);
  }, 500);

  const baseClass = cn(
    "w-full bg-transparent outline-none rounded px-2 py-1 -mx-2 -my-1 transition",
    "focus:ring-2 focus:ring-primary/30 focus:bg-background",
    "placeholder:text-muted-foreground/50",
    saving && "ring-1 ring-emerald-300/50",
    className
  );

  if (multiline) {
    return (
      <textarea
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        className={cn(baseClass, "resize-none min-h-[2.25rem]")}
        rows={1}
        value={local}
        placeholder={placeholder}
        onChange={(e) => {
          setLocal(e.target.value);
          save(e.target.value);
          const t = e.currentTarget;
          t.style.height = "auto";
          t.style.height = `${t.scrollHeight}px`;
        }}
        onBlur={() => save.flush()}
      />
    );
  }

  return (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      className={baseClass}
      value={local}
      placeholder={placeholder}
      onChange={(e) => {
        setLocal(e.target.value);
        save(e.target.value);
      }}
      onBlur={() => save.flush()}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        }
      }}
    />
  );
}
