/**
 * Import Pipeline Service — AIL Reliability Platform
 * 
 * Multi-stage validation pipeline for import data.
 * Stages: DECRYPT → SCHEMA_VALIDATE → INTEGRITY_SCAN → CONFLICT_DETECT → READY
 * 
 * Each stage produces diagnostics with pass/warn/fail status.
 * The pipeline is fail-fast: a critical failure in any stage aborts subsequent stages.
 */

import { decryptVaultData } from '../../utils/vaultCrypto';
import { validateExportSchema, migrateExportData, CURRENT_EXPORT_VERSION } from './schemaMigration.service';

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Pipeline processing stages */
export type ImportStage =
  | 'decrypt'
  | 'schema_validate'
  | 'integrity_scan'
  | 'conflict_detect'
  | 'ready'
  | 'error';

/** Status of a single diagnostic check */
export type DiagnosticStatus = 'pass' | 'warn' | 'fail';

/** A single diagnostic entry from a pipeline stage */
export interface ImportDiagnostic {
  /** Which pipeline stage produced this diagnostic */
  stage: ImportStage;
  /** Whether this check passed, warned, or failed */
  status: DiagnosticStatus;
  /** Human-readable summary of the diagnostic */
  message: string;
  /** Optional structured details for debugging */
  details?: Record<string, unknown>;
}

/** Summary of record counts found in each data domain */
export interface RecordSummary {
  problems: number;
  focusSessions: number;
  achievements: number;
  trackers: number;
  reminders: number;
  notifications: number;
  dailyActivity: number;
  chapters: number;
}

/** Final result of the import pipeline */
export interface ImportPipelineResult {
  /** Whether the import data is safe to apply */
  success: boolean;
  /** The validated and parsed data object (null if pipeline failed critically) */
  data: Record<string, unknown> | null;
  /** Ordered list of diagnostics from all pipeline stages */
  diagnostics: ImportDiagnostic[];
  /** Record counts across all data domains */
  summary: RecordSummary;
  /** Human-readable warning messages */
  warnings: string[];
  /** Overall integrity score from 0–100 */
  integrityScore: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Count items in an array-like value, returning 0 for non-arrays */
function safeArrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

/** Estimate JSON byte size of a value */
function estimateByteSize(value: unknown): number {
  try {
    return new Blob([JSON.stringify(value)]).size;
  } catch {
    return 0;
  }
}

// ─── Pipeline Stages ────────────────────────────────────────────────────────────

/**
 * Stage 1: DECRYPT
 * Detects format (vault-encrypted vs raw JSON) and decrypts if needed.
 */
function stageDecrypt(rawInput: string): {
  data: Record<string, unknown> | null;
  diagnostics: ImportDiagnostic[];
  failed: boolean;
} {
  const diagnostics: ImportDiagnostic[] = [];
  const trimmed = rawInput.trim();
  const isVaultFormat = trimmed.startsWith('MANI_VAULT_SECURE_V3:');

  try {
    const parsed = decryptVaultData(trimmed);

    if (!parsed || typeof parsed !== 'object') {
      diagnostics.push({
        stage: 'decrypt',
        status: 'fail',
        message: 'Decrypted content is not a valid object',
      });
      return { data: null, diagnostics, failed: true };
    }

    diagnostics.push({
      stage: 'decrypt',
      status: 'pass',
      message: isVaultFormat
        ? 'Vault-encrypted payload decrypted successfully'
        : 'Raw JSON parsed successfully (unencrypted format)',
      details: {
        format: isVaultFormat ? 'vault_v3' : 'raw_json',
        inputLength: rawInput.length,
      },
    });

    return { data: parsed as Record<string, unknown>, diagnostics, failed: false };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown decryption error';
    diagnostics.push({
      stage: 'decrypt',
      status: 'fail',
      message: `Decryption failed: ${errorMessage}`,
      details: { format: isVaultFormat ? 'vault_v3' : 'unknown' },
    });
    return { data: null, diagnostics, failed: true };
  }
}

/**
 * Stage 2: SCHEMA_VALIDATE
 * Checks for version field and validates required top-level keys.
 * Applies schema migration if needed.
 */
function stageSchemaValidate(data: Record<string, unknown>): {
  data: Record<string, unknown>;
  diagnostics: ImportDiagnostic[];
  failed: boolean;
} {
  const diagnostics: ImportDiagnostic[] = [];

  // Check version field
  if (data.version === undefined) {
    diagnostics.push({
      stage: 'schema_validate',
      status: 'warn',
      message: 'No version field detected — attempting migration from legacy format',
    });
  } else if (data.version !== CURRENT_EXPORT_VERSION) {
    diagnostics.push({
      stage: 'schema_validate',
      status: 'warn',
      message: `Version mismatch: found v${data.version}, expected v${CURRENT_EXPORT_VERSION}`,
    });
  }

  // Run migration (handles version patching)
  const migrationResult = migrateExportData(data);
  const migrated = migrationResult.data;

  if (migrationResult.changes.length > 0 && migrationResult.migratedFrom !== CURRENT_EXPORT_VERSION) {
    diagnostics.push({
      stage: 'schema_validate',
      status: 'warn',
      message: `Schema migrated from v${migrationResult.migratedFrom} to v${migrationResult.migratedTo}`,
      details: { changes: migrationResult.changes },
    });
  }

  // Validate against known schema
  const validation = validateExportSchema(migrated);

  if (validation.missingFields.length > 0) {
    const critical = ['book', 'problems', 'focusSessions'];
    const hasCriticalMissing = validation.missingFields.some(f => critical.includes(f));

    diagnostics.push({
      stage: 'schema_validate',
      status: hasCriticalMissing ? 'fail' : 'warn',
      message: `Missing fields: ${validation.missingFields.join(', ')}`,
      details: { missingFields: validation.missingFields },
    });

    if (hasCriticalMissing) {
      return { data: migrated, diagnostics, failed: true };
    }
  }

  if (validation.extraFields.length > 0) {
    diagnostics.push({
      stage: 'schema_validate',
      status: 'warn',
      message: `Extra fields detected: ${validation.extraFields.join(', ')}`,
      details: { extraFields: validation.extraFields },
    });
  }

  if (validation.valid) {
    diagnostics.push({
      stage: 'schema_validate',
      status: 'pass',
      message: 'All required schema fields present and validated',
    });
  }

  return { data: migrated, diagnostics, failed: false };
}

/**
 * Stage 3: INTEGRITY_SCAN
 * Counts records in each domain, computes total data size, and checks for corrupted entries.
 */
function stageIntegrityScan(data: Record<string, unknown>): {
  summary: RecordSummary;
  integrityScore: number;
  diagnostics: ImportDiagnostic[];
  warnings: string[];
  failed: boolean;
} {
  const diagnostics: ImportDiagnostic[] = [];
  const warnings: string[] = [];
  let corruptionCount = 0;
  let totalChecks = 0;

  // Count records
  const problems = safeArrayLength(data.problems);
  const focusSessions = safeArrayLength(data.focusSessions);
  const achievements = safeArrayLength(data.achievements);
  const trackers = safeArrayLength(data.trackers);
  const reminders = safeArrayLength(data.reminders);
  const notifications = safeArrayLength(data.notifications);
  const dailyActivity = safeArrayLength(data.dailyActivity);

  const book = data.book as Record<string, unknown> | undefined;
  const chapters = book && Array.isArray(book.chapters) ? book.chapters.length : 0;

  const summary: RecordSummary = {
    problems,
    focusSessions,
    achievements,
    trackers,
    reminders,
    notifications,
    dailyActivity,
    chapters,
  };

  // Check for corrupted problem entries (must have id and name)
  if (Array.isArray(data.problems)) {
    for (const p of data.problems as Record<string, unknown>[]) {
      totalChecks++;
      if (!p.id || !p.name) {
        corruptionCount++;
        warnings.push(`Problem entry missing id or name: ${JSON.stringify(p).slice(0, 80)}`);
      }
    }
  }

  // Check focus sessions (must have id and date)
  if (Array.isArray(data.focusSessions)) {
    for (const s of data.focusSessions as Record<string, unknown>[]) {
      totalChecks++;
      if (!s.id || !s.date) {
        corruptionCount++;
        warnings.push(`Focus session entry missing id or date`);
      }
    }
  }

  // Check trackers (must have id and title)
  if (Array.isArray(data.trackers)) {
    for (const t of data.trackers as Record<string, unknown>[]) {
      totalChecks++;
      if (!t.id || !t.title) {
        corruptionCount++;
        warnings.push(`Tracker entry missing id or title`);
      }
    }
  }

  // Check achievements (must have id)
  if (Array.isArray(data.achievements)) {
    for (const a of data.achievements as Record<string, unknown>[]) {
      totalChecks++;
      if (!a.id) {
        corruptionCount++;
        warnings.push(`Achievement entry missing id`);
      }
    }
  }

  // Check book chapters (must have id)
  if (book && Array.isArray(book.chapters)) {
    for (const ch of book.chapters as Record<string, unknown>[]) {
      totalChecks++;
      if (ch.id === undefined || ch.id === null) {
        corruptionCount++;
        warnings.push(`Book chapter missing id`);
      }
    }
  }

  // Compute integrity score
  const integrityScore = totalChecks === 0
    ? 100
    : Math.round(((totalChecks - corruptionCount) / totalChecks) * 100);

  // Estimate total data size
  const totalBytes = estimateByteSize(data);
  const totalKB = (totalBytes / 1024).toFixed(1);

  const countSummary = [
    `${problems} problems`,
    `${focusSessions} focus sessions`,
    `${chapters} chapters`,
    `${trackers} trackers`,
    `${achievements} achievements`,
    `${reminders} reminders`,
    `${notifications} notifications`,
    `${dailyActivity} daily activity entries`,
  ].join(', ');

  diagnostics.push({
    stage: 'integrity_scan',
    status: corruptionCount === 0 ? 'pass' : 'warn',
    message: corruptionCount === 0
      ? `All ${totalChecks} records passed integrity checks (${totalKB} KB)`
      : `${corruptionCount}/${totalChecks} records have integrity issues (${totalKB} KB)`,
    details: {
      counts: countSummary,
      totalBytes,
      corruptionCount,
      totalChecks,
    },
  });

  return {
    summary,
    integrityScore,
    diagnostics,
    warnings,
    failed: false,
  };
}

/**
 * Stage 4: CONFLICT_DETECT
 * Compares incoming XP/level with current store state to detect potential downgrades.
 */
function stageConflictDetect(
  data: Record<string, unknown>,
  currentState: { xp: number; level: number }
): {
  diagnostics: ImportDiagnostic[];
  warnings: string[];
} {
  const diagnostics: ImportDiagnostic[] = [];
  const warnings: string[] = [];

  // XP is stored at the store level, not in the export data directly.
  // We can infer from the problems/sessions count or check if xp/level are in the data.
  const incomingXp = typeof data.xp === 'number' ? data.xp : null;
  const incomingLevel = typeof data.level === 'number' ? data.level : null;

  if (incomingXp !== null && incomingLevel !== null) {
    if (incomingXp < currentState.xp) {
      const diff = currentState.xp - incomingXp;
      warnings.push(`Import would reduce XP by ${diff.toLocaleString()} (${currentState.xp.toLocaleString()} → ${incomingXp.toLocaleString()})`);
      diagnostics.push({
        stage: 'conflict_detect',
        status: 'warn',
        message: `XP downgrade detected: current ${currentState.xp.toLocaleString()} → import ${incomingXp.toLocaleString()} (−${diff.toLocaleString()})`,
        details: { currentXp: currentState.xp, incomingXp, diff },
      });
    }

    if (incomingLevel < currentState.level) {
      warnings.push(`Import would reduce level from ${currentState.level} to ${incomingLevel}`);
      diagnostics.push({
        stage: 'conflict_detect',
        status: 'warn',
        message: `Level downgrade detected: current Level ${currentState.level} → import Level ${incomingLevel}`,
        details: { currentLevel: currentState.level, incomingLevel },
      });
    }

    if (incomingXp >= currentState.xp && incomingLevel >= currentState.level) {
      diagnostics.push({
        stage: 'conflict_detect',
        status: 'pass',
        message: 'No XP or level downgrade detected',
        details: { currentXp: currentState.xp, incomingXp, currentLevel: currentState.level, incomingLevel },
      });
    }
  } else {
    // XP/Level not present in export data — not a conflict, just informational
    diagnostics.push({
      stage: 'conflict_detect',
      status: 'pass',
      message: 'Export data does not contain XP/level fields — no conflict to detect',
    });
  }

  return { diagnostics, warnings };
}

// ─── Main Pipeline ──────────────────────────────────────────────────────────────

/**
 * Runs the full import validation pipeline against raw input data.
 * 
 * Pipeline stages:
 * 1. **DECRYPT** — Detect format (vault vs raw JSON), decrypt if needed
 * 2. **SCHEMA_VALIDATE** — Check version and required top-level keys
 * 3. **INTEGRITY_SCAN** — Count records, compute data size, check for corruption
 * 4. **CONFLICT_DETECT** — Compare incoming XP/level with current store state
 * 5. **READY** — All checks passed, return validated data with diagnostic report
 * 
 * @param rawInput - Raw string input (vault-encrypted or raw JSON)
 * @param currentStoreState - Current XP and level from the app store
 * @returns Full pipeline result with diagnostics, summary, and integrity score
 */
export function runImportPipeline(
  rawInput: string,
  currentStoreState: { xp: number; level: number }
): ImportPipelineResult {
  const allDiagnostics: ImportDiagnostic[] = [];
  const allWarnings: string[] = [];
  const emptySummary: RecordSummary = {
    problems: 0,
    focusSessions: 0,
    achievements: 0,
    trackers: 0,
    reminders: 0,
    notifications: 0,
    dailyActivity: 0,
    chapters: 0,
  };

  // ── Stage 1: Decrypt ──
  const decryptResult = stageDecrypt(rawInput);
  allDiagnostics.push(...decryptResult.diagnostics);

  if (decryptResult.failed || !decryptResult.data) {
    allDiagnostics.push({
      stage: 'error',
      status: 'fail',
      message: 'Pipeline aborted at DECRYPT stage',
    });
    return {
      success: false,
      data: null,
      diagnostics: allDiagnostics,
      summary: emptySummary,
      warnings: allWarnings,
      integrityScore: 0,
    };
  }

  // ── Stage 2: Schema Validate ──
  const schemaResult = stageSchemaValidate(decryptResult.data);
  allDiagnostics.push(...schemaResult.diagnostics);

  if (schemaResult.failed) {
    allDiagnostics.push({
      stage: 'error',
      status: 'fail',
      message: 'Pipeline aborted at SCHEMA_VALIDATE stage — critical fields missing',
    });
    return {
      success: false,
      data: null,
      diagnostics: allDiagnostics,
      summary: emptySummary,
      warnings: allWarnings,
      integrityScore: 0,
    };
  }

  // ── Stage 3: Integrity Scan ──
  const integrityResult = stageIntegrityScan(schemaResult.data);
  allDiagnostics.push(...integrityResult.diagnostics);
  allWarnings.push(...integrityResult.warnings);

  // ── Stage 4: Conflict Detect ──
  const conflictResult = stageConflictDetect(schemaResult.data, currentStoreState);
  allDiagnostics.push(...conflictResult.diagnostics);
  allWarnings.push(...conflictResult.warnings);

  // ── Stage 5: Ready ──
  const hasFailures = allDiagnostics.some(d => d.status === 'fail');

  if (!hasFailures) {
    allDiagnostics.push({
      stage: 'ready',
      status: 'pass',
      message: 'All pipeline stages passed — data is ready for import',
    });
  }

  return {
    success: !hasFailures,
    data: hasFailures ? null : schemaResult.data,
    diagnostics: allDiagnostics,
    summary: integrityResult.summary,
    warnings: allWarnings,
    integrityScore: integrityResult.integrityScore,
  };
}
