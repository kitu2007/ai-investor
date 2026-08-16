import type { QuickAnswer, QuickAnswerArtifact } from "./investment-os-types";

export type SavedChatMessage = {
  role: "user" | "assistant";
  content: string;
  quickAnswer?: QuickAnswerArtifact;
  pending?: boolean;
};

export function isAskShortcut(key: string, shiftKey: boolean): boolean {
  return key === "Enter" && !shiftKey;
}

export function restoreQuickAnswerHistory(answers: QuickAnswer[]): {
  messages: SavedChatMessage[];
  active: QuickAnswer | null;
} {
  const messages: SavedChatMessage[] = [];
  let active: QuickAnswer | null = null;
  const chronological = [...answers].sort(
    (left, right) => Date.parse(left.requested_at) - Date.parse(right.requested_at),
  );

  for (const answer of chronological) {
    messages.push({ role: "user", content: answer.question });
    if (["queued", "running"].includes(answer.status)) {
      if (!active) active = answer;
      messages.push({
        role: "assistant",
        content: "The research agent is looking that up…",
        pending: true,
      });
    } else if (answer.status === "completed" && answer.artifact) {
      messages.push({
        role: "assistant",
        content: answer.artifact.answer,
        quickAnswer: answer.artifact,
      });
    } else if (answer.status === "cancelled") {
      messages.push({ role: "assistant", content: "That question was cancelled." });
    } else {
      messages.push({
        role: "assistant",
        content: answer.error || "That question could not be answered.",
      });
    }
  }

  return { messages, active };
}
