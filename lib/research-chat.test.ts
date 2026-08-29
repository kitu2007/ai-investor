import { describe, expect, it } from "vitest";

import type { QuickAnswer, QuickAnswerArtifact } from "./investment-os-types";
import { isAskShortcut, restoreQuickAnswerHistory } from "./research-chat";

function quickAnswer(overrides: Partial<QuickAnswer> = {}): QuickAnswer {
  return {
    id: "answer-1",
    ticker: "DEMO",
    company_name: "Demo Company",
    question: "What changed?",
    status: "completed",
    runner: "codex_local",
    artifact: {
      schema_version: "1.0",
      ticker: "DEMO",
      question: "What changed?",
      generated_at: "2026-08-16T09:00:00Z",
      as_of: "2026-08-16",
      answer: "Revenue accelerated.",
      claims: [],
      limitations: [],
      sources: [],
      disclaimer: "Research only.",
    },
    artifact_path: null,
    markdown_path: null,
    error: null,
    requested_at: "2026-08-16T08:00:00Z",
    started_at: "2026-08-16T08:00:01Z",
    completed_at: "2026-08-16T09:00:00Z",
    ...overrides,
  };
}

describe("question submission", () => {
  it("uses Enter for Ask and preserves Shift+Enter for a new line", () => {
    expect(isAskShortcut("Enter", false)).toBe(true);
    expect(isAskShortcut("Enter", true)).toBe(false);
    expect(isAskShortcut("a", false)).toBe(false);
  });
});

describe("saved quick-answer history", () => {
  it("restores questions and cited answers in chronological order", () => {
    const older = quickAnswer();
    const newerArtifact = {
      ...older.artifact,
      question: "What is the risk?",
      answer: "Customer concentration.",
    } as QuickAnswerArtifact;
    const newer = quickAnswer({
      id: "answer-2",
      question: "What is the risk?",
      artifact: newerArtifact,
      requested_at: "2026-08-16T10:00:00Z",
    });

    const restored = restoreQuickAnswerHistory([newer, older]);

    expect(restored.active).toBeNull();
    expect(restored.messages.map((message) => message.content)).toEqual([
      "What changed?",
      "Revenue accelerated.",
      "What is the risk?",
      "Customer concentration.",
    ]);
    expect(restored.messages[1].quickAnswer).toBe(older.artifact);
  });

  it("resumes one queued answer with a pending message", () => {
    const queued = quickAnswer({
      id: "queued-1",
      status: "queued",
      artifact: null,
      started_at: null,
      completed_at: null,
    });

    const restored = restoreQuickAnswerHistory([queued]);

    expect(restored.active?.id).toBe("queued-1");
    expect(restored.messages[1].pending).toBe(true);
  });
});
