import { supabase } from '../lib/supabase';

export interface GoogleFitData {
  steps: number;
  calories: number;
  activeMinutes: number;
}

export type GoogleFitSyncErrorCode = 'auth' | 'csp' | 'network' | 'api' | 'unknown';

export interface GoogleFitSyncFeedback {
  code: GoogleFitSyncErrorCode;
  message: string;
  canReconnect: boolean;
  canTroubleshoot: boolean;
}

export class GoogleFitSyncError extends Error {
  code: GoogleFitSyncErrorCode;

  constructor(code: GoogleFitSyncErrorCode, message: string) {
    super(message);
    this.name = 'GoogleFitSyncError';
    this.code = code;
  }
}

function classifyGoogleFitError(message: string): GoogleFitSyncErrorCode {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('content security policy') ||
    normalized.includes('site security policy') ||
    normalized.includes(' csp') ||
    normalized.startsWith('csp')
  ) {
    return 'csp';
  }

  if (
    normalized.includes('unauthorized') ||
    normalized.includes('refresh token') ||
    normalized.includes('google identity not found') ||
    normalized.includes('google fit access is unavailable') ||
    normalized.includes('grant fitness scopes') ||
    normalized.includes('sign in with google')
  ) {
    return 'auth';
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('network') ||
    normalized.includes('load failed')
  ) {
    return 'network';
  }

  if (normalized.includes('fit api') || normalized.includes('google fit')) {
    return 'api';
  }

  return 'unknown';
}

export function getGoogleFitSyncFeedback(error: unknown): GoogleFitSyncFeedback {
  const message = error instanceof Error ? error.message : 'Google Fit sync failed for an unknown reason.';
  const code = error instanceof GoogleFitSyncError ? error.code : classifyGoogleFitError(message);

  switch (code) {
    case 'auth':
      return {
        code,
        message: 'Google Fit authorization is unavailable or expired. No health data was synced.',
        canReconnect: true,
        canTroubleshoot: false,
      };
    case 'csp':
      return {
        code,
        message: 'The browser blocked the Google Fit request due to site security policy (CSP). No health data was synced.',
        canReconnect: false,
        canTroubleshoot: true,
      };
    case 'network':
      return {
        code,
        message: 'The sync request could not reach the server or Google Fit. No health data was synced.',
        canReconnect: false,
        canTroubleshoot: true,
      };
    case 'api':
      return {
        code,
        message: 'Google Fit returned an error while syncing today\'s data. No health data was synced.',
        canReconnect: false,
        canTroubleshoot: true,
      };
    default:
      return {
        code,
        message: 'Google Fit sync failed. No health data was synced.',
        canReconnect: false,
        canTroubleshoot: true,
      };
  }
}

export async function fetchTodayGoogleFitData(): Promise<GoogleFitData> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new GoogleFitSyncError('auth', 'Google Fit access is unavailable for this session. Sign in with Google again and grant fitness scopes.');
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startTimeMillis = startOfToday.getTime();
  const endTimeMillis = Date.now();

  try {
    const { data, error } = await supabase.functions.invoke('sync-google-fit', {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
      body: {
        startTimeMillis,
        endTimeMillis,
      },
    });

    if (error) {
      throw new GoogleFitSyncError(classifyGoogleFitError(error.message), error.message);
    }

    if (data?.error) {
      throw new GoogleFitSyncError(classifyGoogleFitError(data.error), data.error);
    }

    if (
      typeof data?.steps !== 'number' ||
      typeof data?.calories !== 'number' ||
      typeof data?.activeMinutes !== 'number'
    ) {
      throw new GoogleFitSyncError('api', 'Google Fit sync returned an incomplete payload.');
    }

    return {
      steps: data.steps,
      calories: data.calories,
      activeMinutes: data.activeMinutes,
    };
  } catch (error) {
    console.error('Google Fit API call failed:', error);
    if (error instanceof GoogleFitSyncError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : 'Google Fit sync failed for an unknown reason.';
    throw new GoogleFitSyncError(classifyGoogleFitError(message), message);
  }
}
