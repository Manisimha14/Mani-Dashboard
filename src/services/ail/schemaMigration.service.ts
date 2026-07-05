/**
 * Schema Migration Service — AIL Reliability Platform
 * 
 * Manages export data versioning and schema migrations.
 * Currently supports version 1. Structured for easy extension
 * when v2+ schemas are introduced.
 */

/** Current export schema version */
export const CURRENT_EXPORT_VERSION = 1;

/** Required top-level keys in the v1 export schema */
const V1_REQUIRED_KEYS: readonly string[] = [
  'version',
  'exportDate',
  'book',
  'problems',
  'focusSessions',
  'achievements',
  'readingStreak',
  'codingStreak',
  'focusStreak',
  'pomodoroSettings',
  'userSettings',
  'dailyActivity',
  'trackers',
  'reminders',
  'notifications',
  'reminderSettings',
  'launcher',
  'deletedReports',
] as const;

/** All known v1 keys (required + optional) */
const V1_ALL_KNOWN_KEYS = new Set<string>(V1_REQUIRED_KEYS);

/** Result of a schema migration operation */
export interface MigrationResult {
  /** The (potentially migrated) data object */
  data: Record<string, unknown>;
  /** The version the data was migrated from */
  migratedFrom: number;
  /** The version the data was migrated to */
  migratedTo: number;
  /** Human-readable list of changes applied during migration */
  changes: string[];
}

/** Result of a schema validation check */
export interface SchemaValidationResult {
  /** Whether the data conforms to the expected v1 schema */
  valid: boolean;
  /** Required fields that are missing from the data */
  missingFields: string[];
  /** Fields present in the data that are not part of the known schema */
  extraFields: string[];
}

/**
 * Migrates export data from older schema versions to the current version.
 * 
 * Currently only version 1 exists, so this is a validated passthrough.
 * Future migrations (e.g. v1→v2) should be added as sequential
 * transformation steps in the migration chain.
 * 
 * @param data - Raw parsed export data object
 * @returns Migration result with the (potentially transformed) data and change log
 */
export function migrateExportData(data: Record<string, unknown>): MigrationResult {
  const version = typeof data.version === 'number' ? data.version : 0;
  const changes: string[] = [];

  // Clone to avoid mutating the original
  let migrated = { ...data };

  if (version === 0) {
    // No version field — treat as legacy pre-v1 data
    migrated.version = CURRENT_EXPORT_VERSION;
    changes.push('Added missing version field (assumed pre-v1 legacy data)');
  }

  // Future: v1 → v2 migration would go here
  // if (migrated.version === 1) {
  //   migrated = migrateV1ToV2(migrated);
  //   changes.push('Migrated from v1 to v2: ...');
  // }

  // Ensure exportDate exists
  if (!migrated.exportDate) {
    migrated.exportDate = new Date().toISOString();
    changes.push('Added missing exportDate field');
  }

  if (changes.length === 0) {
    changes.push('No migration needed — data is already at current version');
  }

  return {
    data: migrated,
    migratedFrom: version,
    migratedTo: CURRENT_EXPORT_VERSION,
    changes,
  };
}

/**
 * Validates export data against the known v1 schema shape.
 * 
 * Checks for required fields and identifies any unexpected extra fields.
 * Does not perform deep structural validation — use the import pipeline
 * integrity scan for that.
 * 
 * @param data - Parsed export data object to validate
 * @returns Validation result with missing and extra field lists
 */
export function validateExportSchema(data: Record<string, unknown>): SchemaValidationResult {
  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      missingFields: [...V1_REQUIRED_KEYS],
      extraFields: [],
    };
  }

  const dataKeys = new Set(Object.keys(data));

  const missingFields = V1_REQUIRED_KEYS.filter(key => !dataKeys.has(key));
  const extraFields = [...dataKeys].filter(key => !V1_ALL_KNOWN_KEYS.has(key));

  return {
    valid: missingFields.length === 0,
    missingFields,
    extraFields,
  };
}
