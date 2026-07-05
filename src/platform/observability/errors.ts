/**
 * Standardised AIP Telemetry Error Hierarchy Taxonomy.
 */

export class AIPError extends Error {
  public code: string;
  public details?: any;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.code = code;
    this.details = details;
    this.name = new.target.name;
    // Set prototype explicitly for typescript extends Error safety
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class DomainError extends AIPError {
  constructor(code: string, message: string, details?: any) {
    super(code, message, details);
  }
}

export class ValidationError extends AIPError {
  constructor(code: string, message: string, details?: any) {
    super(code, message, details);
  }
}

export class ProjectionError extends AIPError {
  constructor(code: string, message: string, details?: any) {
    super(code, message, details);
  }
}

export class StorageError extends AIPError {
  constructor(code: string, message: string, details?: any) {
    super(code, message, details);
  }
}

export class SyncError extends AIPError {
  constructor(code: string, message: string, details?: any) {
    super(code, message, details);
  }
}
