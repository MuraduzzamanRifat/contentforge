"use client";

import { Sparkles } from "lucide-react";
import { Topbar } from "@/components/shell/Topbar";
import { BoardSync } from "@/components/shell/BoardSync";
import { GenerateBoard } from "@/components/generate/GenerateBoard";
import { KpiStrip } from "@/components/sheet/KpiStrip";
import { Toolbar } from "@/components/sheet/Toolbar";
import { ContentSheet } from "@/components/sheet/ContentSheet";
import { PreviewPanel } from "@/components/sheet/PreviewPanel";
import { WorkflowBoard } from "@/components/workflow/WorkflowBoard";
import { ProductionBoard } from "@/components/production/ProductionBoard";
import { PublishBoard } from "@/components/publish/PublishBoard";
import { CalendarView } from "@/components/calendar/CalendarView";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { SettingsView } from "@/components/settings/SettingsView";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export default function Page() {
  const section = useStore((s) => s.section);
  const rowCount = useStore((s) => s.rows.length);
  const setSection = useStore((s) => s.setSection);

  return (
    // No left sidebar — nav lives in the Topbar so every board uses the full
    // page width. Single full-height column: Topbar + the active section.
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <BoardSync />
      <Topbar />

      <main className="flex flex-1 flex-col overflow-hidden">
        {section === "generate" && <GenerateBoard />}

        {section === "sheet" && (
          <>
            <KpiStrip />
            <Toolbar />
            {rowCount === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h3 className="mt-4 text-base font-semibold">The Sheet is empty</h3>
                <p className="mt-1 max-w-md text-[13px] text-muted-foreground">
                  Approved topics land here as Drafts, ready for the Workflow review.
                  Generate and approve topics to fill it.
                </p>
                <Button className="mt-5" onClick={() => setSection("generate")}>
                  <Sparkles className="h-4 w-4" /> Go to Generate
                </Button>
              </div>
            ) : (
              <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_400px]">
                <ContentSheet />
                <aside className="hidden border-l border-border bg-card/40 lg:block">
                  <PreviewPanel />
                </aside>
              </div>
            )}
          </>
        )}

        {section === "workflow"  && <WorkflowBoard />}
        {section === "production" && <ProductionBoard />}
        {section === "publish"   && <PublishBoard />}
        {section === "calendar"  && <CalendarView />}
        {section === "analytics" && <AnalyticsView />}
        {section === "settings"  && <SettingsView />}
      </main>
    </div>
  );
}
