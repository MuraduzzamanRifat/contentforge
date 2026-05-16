"use client";

import { Topbar } from "@/components/shell/Topbar";
import { BoardSync } from "@/components/shell/BoardSync";
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
import { useStore } from "@/lib/store";

export default function Page() {
  const section = useStore((s) => s.section);

  return (
    // No left sidebar — nav lives in the Topbar so every board uses the full
    // page width. Single full-height column: Topbar + the active section.
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <BoardSync />
      <Topbar />

      <main className="flex flex-1 flex-col overflow-hidden">
        {section === "sheet" && (
          <>
            <KpiStrip />
            <Toolbar />
            <div className="grid flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1fr_400px]">
              <ContentSheet />
              <aside className="hidden border-l border-border bg-card/40 lg:block">
                <PreviewPanel />
              </aside>
            </div>
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
