import {
  COUNCIL_AGENTS,
  MINIMUM_COUNCIL_AGENTS,
  type CouncilAgentName,
} from "@/lib/investment-os-types";

const STORAGE_KEY = "investment-os.council.agents";

/**
 * Remembered council agent selection, exposed as an external store so the panel
 * can read it with useSyncExternalStore. That keeps server and client renders
 * identical during hydration and avoids setting state from an effect.
 *
 * This is a local UI preference only: it never leaves the browser and is never
 * sent anywhere except as the explicit `agents` list on a council request.
 */
let listeners: Array<() => void> = [];
// Used when localStorage is unavailable (private mode, blocked storage) so the
// checkboxes still respond for the current session.
let memoryValue: string | null = null;
let storageUsable = true;

function notify(): void {
  for (const listener of listeners) listener();
}

export function subscribeSelectedAgents(listener: () => void): () => void {
  listeners.push(listener);
  // Keep multiple open tabs in agreement.
  window.addEventListener("storage", listener);
  return () => {
    listeners = listeners.filter((item) => item !== listener);
    window.removeEventListener("storage", listener);
  };
}

/** Returns the raw stored string; a primitive so repeat calls compare equal. */
export function selectedAgentsSnapshot(): string | null {
  if (!storageUsable) return memoryValue;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    storageUsable = false;
    return memoryValue;
  }
}

/** No preference exists during server rendering, so everything starts selected. */
export function selectedAgentsServerSnapshot(): string | null {
  return null;
}

export function writeSelectedAgents(agents: CouncilAgentName[]): void {
  memoryValue = JSON.stringify(agents);
  if (storageUsable) {
    try {
      window.localStorage.setItem(STORAGE_KEY, memoryValue);
    } catch {
      storageUsable = false;
    }
  }
  notify();
}

/**
 * Turn a stored value into a selection the backend will accept: canonical order,
 * no unknown agents, and never fewer than the minimum.
 */
export function parseSelectedAgents(raw: string | null): CouncilAgentName[] {
  if (!raw) return COUNCIL_AGENTS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return COUNCIL_AGENTS;
  }
  if (!Array.isArray(parsed)) return COUNCIL_AGENTS;

  const selected = COUNCIL_AGENTS.filter((agent) => parsed.includes(agent));
  return selected.length >= MINIMUM_COUNCIL_AGENTS ? selected : COUNCIL_AGENTS;
}
