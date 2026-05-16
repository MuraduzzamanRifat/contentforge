import { describe, it, expect } from "vitest";
import {
  workflowColumn, waitingOn, bucketByColumn, WORKFLOW_COLUMNS, COLUMN_LABEL,
} from "../workflow";
import type { Content, ReviewComment } from "../types";

function row(p: Partial<Content>): Content {
  return {
    id: "r", rowIndex: 0, status: "DRAFT", title: "T", hook: "",
    script: "", description: "", tags: [], aiCost: 0,
    createdAt: "", updatedAt: "",
    ...p,
  } as Content;
}

function comment(p: Partial<ReviewComment>): ReviewComment {
  return {
    id: "c", contentId: "r", role: "operator", lang: "en", body: "x",
    createdAt: "", ...p,
  } as ReviewComment;
}

describe("workflowColumn", () => {
  it("maps DRAFT and IDEA to DRAFT", () => {
    expect(workflowColumn(row({ status: "DRAFT" }))).toBe("DRAFT");
    expect(workflowColumn(row({ status: "IDEA" }))).toBe("DRAFT");
  });

  it("rejected flag wins over status", () => {
    expect(workflowColumn(row({ status: "DRAFT", rejected: true }))).toBe("REJECTED");
    expect(workflowColumn(row({ status: "REVIEW", rejected: true }))).toBe("REJECTED");
  });

  it("REVIEW → IN_REVIEW", () => {
    expect(workflowColumn(row({ status: "REVIEW" }))).toBe("IN_REVIEW");
  });

  it("APPROVED splits on productionLocked", () => {
    expect(workflowColumn(row({ status: "APPROVED" }))).toBe("APPROVED");
    expect(workflowColumn(row({ status: "APPROVED", productionLocked: true }))).toBe("READY");
  });

  it("post-Stage-1 statuses return null", () => {
    expect(workflowColumn(row({ status: "PUBLISHED" }))).toBeNull();
    expect(workflowColumn(row({ status: "SCHEDULED" }))).toBeNull();
    expect(workflowColumn(row({ status: "PUBLISHING" }))).toBeNull();
    expect(workflowColumn(row({ status: "FAILED" }))).toBeNull();
  });
});

describe("waitingOn", () => {
  it("DRAFT with no script → on me (generate it)", () => {
    expect(waitingOn(row({ status: "DRAFT", script: "" }))).toBe("me");
  });

  it("DRAFT with a script → nobody", () => {
    expect(waitingOn(row({ status: "DRAFT", script: "full script here" }))).toBe("nobody");
  });

  it("REJECTED → on me (fix it)", () => {
    expect(waitingOn(row({ status: "DRAFT", rejected: true }))).toBe("me");
  });

  it("IN_REVIEW with no comments → on client", () => {
    expect(waitingOn(row({ status: "REVIEW" }), [])).toBe("client");
  });

  it("IN_REVIEW, last comment from operator → on client", () => {
    const c = [comment({ role: "operator" })];
    expect(waitingOn(row({ status: "REVIEW" }), c)).toBe("client");
  });

  it("IN_REVIEW, last comment from client → on me", () => {
    const c = [comment({ role: "operator" }), comment({ role: "client" })];
    expect(waitingOn(row({ status: "REVIEW" }), c)).toBe("me");
  });

  it("APPROVED / READY → nobody", () => {
    expect(waitingOn(row({ status: "APPROVED" }))).toBe("nobody");
    expect(waitingOn(row({ status: "APPROVED", productionLocked: true }))).toBe("nobody");
  });
});

describe("bucketByColumn", () => {
  it("distributes rows into the five columns and drops post-Stage-1", () => {
    const rows = [
      row({ id: "1", status: "DRAFT" }),
      row({ id: "2", status: "IDEA" }),
      row({ id: "3", status: "REVIEW" }),
      row({ id: "4", status: "DRAFT", rejected: true }),
      row({ id: "5", status: "APPROVED" }),
      row({ id: "6", status: "APPROVED", productionLocked: true }),
      row({ id: "7", status: "PUBLISHED" }), // dropped
    ];
    const b = bucketByColumn(rows);
    expect(b.DRAFT.map((r) => r.id)).toEqual(["1", "2"]);
    expect(b.IN_REVIEW.map((r) => r.id)).toEqual(["3"]);
    expect(b.REJECTED.map((r) => r.id)).toEqual(["4"]);
    expect(b.APPROVED.map((r) => r.id)).toEqual(["5"]);
    expect(b.READY.map((r) => r.id)).toEqual(["6"]);
    const total = Object.values(b).reduce((n, arr) => n + arr.length, 0);
    expect(total).toBe(6); // #7 excluded
  });
});

describe("constants", () => {
  it("has 5 columns each with a label", () => {
    expect(WORKFLOW_COLUMNS).toHaveLength(5);
    for (const c of WORKFLOW_COLUMNS) expect(COLUMN_LABEL[c]).toBeTruthy();
  });
});
