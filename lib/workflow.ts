/**
 * Pure workflow-pipeline logic for Stage 1 (Topic & Script).
 * Kept side-effect-free so it can be unit tested without React/Zustand.
 *
 * Column mapping onto the existing ContentStatus enum (no data migration):
 *   DRAFT     ← (DRAFT | IDEA) and not rejected
 *   IN_REVIEW ← REVIEW
 *   REJECTED  ← rejected flag set (status itself stays DRAFT)
 *   APPROVED  ← APPROVED and not productionLocked
 *   READY     ← APPROVED and productionLocked (locked for production)
 */

import type { Content, ReviewComment } from "./types";

export const WORKFLOW_COLUMNS = [
  "DRAFT",
  "IN_REVIEW",
  "REJECTED",
  "APPROVED",
  "READY",
] as const;

export type WorkflowColumn = (typeof WORKFLOW_COLUMNS)[number];

export const COLUMN_LABEL: Record<WorkflowColumn, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In Review",
  REJECTED: "Rejected",
  APPROVED: "Approved",
  READY: "Ready for Production",
};

export const COLUMN_STYLE: Record<WorkflowColumn, string> = {
  DRAFT: "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300",
  IN_REVIEW: "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
  REJECTED: "bg-red-100 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300",
  APPROVED: "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
  READY: "bg-violet-100 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300",
};

/** Which Kanban column a row belongs in. Returns null if it isn't in the Stage-1 pipeline. */
export function workflowColumn(c: Content): WorkflowColumn | null {
  if (c.rejected) return "REJECTED";
  if (c.status === "DRAFT" || c.status === "IDEA") return "DRAFT";
  if (c.status === "REVIEW") return "IN_REVIEW";
  if (c.status === "APPROVED") return c.productionLocked ? "READY" : "APPROVED";
  // SCHEDULED / PUBLISHING / PUBLISHED / FAILED have left Stage 1.
  return null;
}

export type WaitingOn = "me" | "client" | "nobody";

/**
 * Who the row is blocked on:
 *  - IN_REVIEW with the last comment from the operator (or no comments) → waiting on the CLIENT
 *  - IN_REVIEW with the last comment from the client                    → waiting on ME (operator)
 *  - REJECTED                                                            → waiting on ME (fix it)
 *  - DRAFT with no script                                                → waiting on ME (generate)
 *  - APPROVED / READY                                                    → nobody (unblocked)
 */
export function waitingOn(c: Content, comments: ReviewComment[] = []): WaitingOn {
  const col = workflowColumn(c);
  if (col === "REJECTED") return "me";
  if (col === "DRAFT") return c.script?.trim() ? "nobody" : "me";
  if (col === "IN_REVIEW") {
    const last = comments[comments.length - 1];
    if (!last) return "client";
    return last.role === "client" ? "me" : "client";
  }
  return "nobody"; // APPROVED, READY
}

export interface ColumnBuckets {
  DRAFT: Content[];
  IN_REVIEW: Content[];
  REJECTED: Content[];
  APPROVED: Content[];
  READY: Content[];
}

export function bucketByColumn(rows: Content[]): ColumnBuckets {
  const b: ColumnBuckets = { DRAFT: [], IN_REVIEW: [], REJECTED: [], APPROVED: [], READY: [] };
  for (const r of rows) {
    const col = workflowColumn(r);
    if (col) b[col].push(r);
  }
  return b;
}
