/**
 * AIL — Natural Language Command Parser
 *
 * Converts shorthand text typed in the Command Palette into structured
 * `NLPAction` objects that downstream consumers can execute immediately.
 *
 * Supported grammar:
 *   water|w <ml>           → log water
 *   sleep|s <hours>        → log sleep
 *   focus|f <min> [task]   → start focus session (with optional task name)
 *   ate|cal|calories <kcal>→ log calories
 *   walk|steps <count>     → log steps
 *   workout|gym <min>      → log workout
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** Action types the NLP parser can recognise. */
export type NLPActionType = 'water' | 'sleep' | 'focus' | 'calories' | 'steps' | 'workout';

/** Structured result of a successfully parsed natural-language command. */
export interface NLPAction {
  /** Which domain this action targets. */
  type: NLPActionType;
  /** Numeric value extracted from the command (amount, duration, count …). */
  value: number;
  /** Human-readable label describing the action, e.g. "Log 500ml Water". */
  label: string;
  /** Optional task name, currently only used for `focus` commands. */
  taskName?: string;
}

/** Descriptor shown in the hint/autocomplete UI. */
export interface CommandHint {
  prefix: string;
  example: string;
  description: string;
}

// ─── Internal pattern table ───────────────────────────────────────────────────

interface PatternDef {
  /** All prefix aliases that trigger this action (lower-cased). */
  prefixes: string[];
  type: NLPActionType;
  /** Build a human label from the parsed numeric value. */
  label: (v: number) => string;
  /** Whether the remainder after <value> should be captured as `taskName`. */
  captureTask?: boolean;
  /** Minimum acceptable value (inclusive). */
  min?: number;
  /** Maximum acceptable value (inclusive). */
  max?: number;
}

const PATTERNS: PatternDef[] = [
  {
    prefixes: ['water', 'w'],
    type: 'water',
    label: (v) => `Log ${v}ml Water 💧`,
    min: 1,
    max: 10_000,
  },
  {
    prefixes: ['sleep', 's'],
    type: 'sleep',
    label: (v) => `Log ${v}h Sleep 🌙`,
    min: 0.5,
    max: 24,
  },
  {
    prefixes: ['focus', 'f'],
    type: 'focus',
    label: (v) => `Start ${v}min Focus 🌲`,
    captureTask: true,
    min: 1,
    max: 480,
  },
  {
    prefixes: ['ate', 'cal', 'calories'],
    type: 'calories',
    label: (v) => `Log ${v} kcal 🍽️`,
    min: 1,
    max: 20_000,
  },
  {
    prefixes: ['walk', 'steps'],
    type: 'steps',
    label: (v) => `Log ${v.toLocaleString()} Steps 🚶`,
    min: 1,
    max: 200_000,
  },
  {
    prefixes: ['workout', 'gym'],
    type: 'workout',
    label: (v) => `Log ${v}min Workout 💪`,
    min: 1,
    max: 600,
  },
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Attempt to parse a raw user input string into an `NLPAction`.
 *
 * @param input — trimmed input from the Command Palette search box.
 * @returns A structured action if the input matched a known pattern, otherwise `null`.
 */
export function parseCommand(input: string): NLPAction | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Split into tokens: first token is the prefix, second is numeric value,
  // and anything beyond that is an optional task name.
  const tokens = trimmed.split(/\s+/);
  if (tokens.length < 2) return null;

  const prefix = tokens[0].toLowerCase();
  const rawValue = tokens[1];

  // Value must be a positive number
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value <= 0) return null;

  for (const pattern of PATTERNS) {
    if (!pattern.prefixes.includes(prefix)) continue;

    // Range guard
    if (pattern.min !== undefined && value < pattern.min) return null;
    if (pattern.max !== undefined && value > pattern.max) return null;

    const action: NLPAction = {
      type: pattern.type,
      value,
      label: pattern.label(value),
    };

    // Capture everything after `<prefix> <value>` as the task name
    if (pattern.captureTask && tokens.length > 2) {
      action.taskName = tokens.slice(2).join(' ');
      action.label = `Start ${value}min Focus — "${action.taskName}" 🌲`;
    }

    return action;
  }

  return null;
}

/**
 * Returns a static list of command hints to display in the palette footer
 * when the search box is empty.
 */
export function getCommandHints(): CommandHint[] {
  return [
    { prefix: 'water / w',      example: 'water 500',        description: 'Log water intake in ml' },
    { prefix: 'sleep / s',      example: 'sleep 8',          description: 'Log sleep hours' },
    { prefix: 'focus / f',      example: 'focus 25 reading',  description: 'Start a focus session' },
    { prefix: 'ate / cal',      example: 'cal 400',          description: 'Log calorie intake' },
    { prefix: 'walk / steps',   example: 'steps 6000',       description: 'Log step count' },
    { prefix: 'workout / gym',  example: 'gym 30',           description: 'Log workout minutes' },
  ];
}
