"use client";

import { MoreHorizontal, Copy, Trash2, Sparkles, CheckCircle2, Calendar, MonitorPlay } from "lucide-react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown";
import type { Content } from "@/lib/types";
import { ANIMATION, CTA, NEVER_SAY, SOURCE_MAP } from "@/lib/project-config";
import { extractYouTubeId } from "@/lib/youtube-id";

export function RowActions({ row }: { row: Content }) {
  const { patch, duplicate, remove } = useStore();
  const sources = row.track ? SOURCE_MAP[row.track] : null;

  const generateScript = async () => {
    patch(row.id, { status: "DRAFT" });
    await new Promise((r) => setTimeout(r, 600));

    const trackOpener =
      row.track === "A" ? "Open on the chemistry hook with an accurate macro illustration."
      : row.track === "B" ? "Open on the historical artefact — date and place must be sourced."
      : row.track === "C" ? "Open inside the ritual — faceless silhouette with cited tools."
      : "Open with the verified price / counter-intuitive number — pattern-interrupt first.";

    patch(row.id, {
      script:
`ANIMATION DIRECTION
${ANIMATION.style}
${ANIMATION.rule}

FACT SOURCES
${sources?.sources.map((s) => `· ${s}`).join("\n") ?? "· match to the angle"}

SCRIPT
Hook (0:00–0:08): ${row.hook}
Cold-open (0:08–0:25): ${trackOpener}
Problem (0:25–0:55): Anchored in a sourced fact.
Proof (0:55–1:45): ${row.brief?.split("Visual style:")[0]?.trim() || "Three sourced examples."}
Synthesis (1:45–2:10): One repeatable sentence.
CTA (2:10–2:30): ${CTA.outroLine}

GUARDRAILS
${NEVER_SAY.map((n) => `✗ ${n.phrase}`).join("\n")}
`,
      description:
`${row.title}

${row.hook}

${CTA.descriptionBlock}`,
      aiCost: (row.aiCost || 0) + 0.041,
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" aria-label="Row actions">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Row {row.rowIndex + 1}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={generateScript}>
          <Sparkles className="mr-2 h-4 w-4" /> Generate (compliant)
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => patch(row.id, { status: "REVIEW" })}>
          <CheckCircle2 className="mr-2 h-4 w-4" /> Send to review
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => patch(row.id, { status: "APPROVED" })}>
          <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() =>
            patch(row.id, {
              status: "SCHEDULED",
              scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
            })
          }
        >
          <Calendar className="mr-2 h-4 w-4" /> Schedule +24h
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            const raw = prompt("Paste YouTube video ID or URL:");
            if (!raw) return;
            const id = extractYouTubeId(raw);
            if (!id) {
              alert("That doesn't look like a valid YouTube video ID or URL. Expected an 11-character ID like dQw4w9WgXcQ or a full youtube.com/watch?v=… URL.");
              return;
            }
            patch(row.id, {
              status: "PUBLISHED",
              publishedAt: new Date().toISOString(),
              youtubeId: id,
            });
          }}
        >
          <MonitorPlay className="mr-2 h-4 w-4" /> Mark published…
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => duplicate(row.id)}>
          <Copy className="mr-2 h-4 w-4" /> Duplicate
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => remove(row.id)} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
