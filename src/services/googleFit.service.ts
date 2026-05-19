import { supabase } from '../lib/supabase';

export interface GoogleFitData {
  steps: number;
  calories: number;
  activeMinutes: number;
}

async function refreshFitToken(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('refresh-google-fit', {
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (error || !data?.access_token) {
      console.error('Edge function token refresh failed:', error);
      return null;
    }

    localStorage.setItem('google_fit_provider_token', data.access_token);
    return data.access_token;
  } catch (e) {
    console.error('Failed to call refresh-google-fit:', e);
    return null;
  }
}

export async function fetchTodayGoogleFitData(): Promise<GoogleFitData> {
  const { data: { session } } = await supabase.auth.getSession();
  let token = session?.provider_token ?? undefined;

  if (token) {
    localStorage.setItem('google_fit_provider_token', token);
  } else {
    token = localStorage.getItem('google_fit_provider_token') ?? undefined;
  }

  if (!token) {
    throw new Error('Google Fit access is unavailable for this session. Sign in with Google again and grant fitness scopes.');
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startTimeMillis = startOfToday.getTime();
  const endTimeMillis = Date.now();

  const requestBody = {
    aggregateBy: [
      {
        dataTypeName: 'com.google.step_count.delta'
      },
      {
        dataTypeName: 'com.google.calories.expended'
      },
      {
        dataTypeName: 'com.google.active_minutes'
      }
    ],
    bucketByTime: { durationMillis: 86400000 },
    startTimeMillis,
    endTimeMillis
  };

  const makeRequest = async (accessToken: string) => {
    return fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
  };

  try {
    let response = await makeRequest(token);

    if (response.status === 401 || response.status === 403) {
      console.warn('Google Fit token expired. Attempting secure serverless token refresh...');
      const newToken = await refreshFitToken();
      if (newToken) {
        token = newToken;
        response = await makeRequest(token);
      }
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('google_fit_provider_token');
      }
      let errorText = '';
      try {
        const errorJson = await response.json();
        errorText = errorJson?.error?.message || JSON.stringify(errorJson);
      } catch {
        errorText = await response.text();
      }
      throw new Error(`Fit API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    let steps = 0;
    let calories = 0;
    let activeMinutes = 0;

    if (data.bucket?.[0]?.dataset) {
      for (const dataset of data.bucket[0].dataset) {
        const source = dataset.dataSourceId || '';
        const point = dataset.point?.[0];

        if (!point) continue;

        if (source.includes('step_count')) {
          steps = point.value?.[0]?.intVal ?? Math.round(point.value?.[0]?.fpVal ?? 0);
        }

        if (source.includes('calories')) {
          calories = Math.round(point.value?.[0]?.fpVal ?? point.value?.[0]?.intVal ?? 0);
        }

        if (source.includes('active_minutes')) {
          activeMinutes = point.value?.[0]?.intVal ?? Math.round(point.value?.[0]?.fpVal ?? 0);
        }
      }
    }

    return { steps, calories, activeMinutes };
  } catch (error) {
    console.error('Google Fit API call failed:', error);
    throw error;
  }
}
