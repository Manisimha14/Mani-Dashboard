import { supabase } from '../lib/supabase';

export interface GoogleFitData {
  steps: number;
  calories: number;
  activeMinutes: number;
}

export async function fetchTodayGoogleFitData(): Promise<GoogleFitData> {
  let token: string | undefined;

  try {
    const storedToken = localStorage.getItem('google_provider_token');
    const savedAtStr = localStorage.getItem('google_provider_token_saved_at');

    if (storedToken && savedAtStr) {
      const savedAt = parseInt(savedAtStr, 10);
      const isExpired = Date.now() - savedAt > 3600 * 1000;

      if (!isExpired) {
        token = storedToken;
      } else {
        console.warn('Persisted Google Fit token in localStorage has expired.');
        localStorage.removeItem('google_provider_token');
        localStorage.removeItem('google_provider_token_saved_at');
      }
    }

    if (!token) {
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.provider_token ?? undefined;
      if (token) {
        localStorage.setItem('google_provider_token', token);
        localStorage.setItem('google_provider_token_saved_at', Date.now().toString());
      }
    }

    console.log('Provider token retrieved:', token ? 'exists' : 'missing');
  } catch (err) {
    console.error('Could not retrieve provider token:', err);
  }

  if (!token) {
    throw new Error('Google Fit authorization token has expired or is missing. Please Sign Out of the dashboard (using the sidebar button) and Sign In with Google again to grant fitness permissions!');
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

  console.log('Google Fit API Request:', JSON.stringify(requestBody, null, 2));

  try {
    const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
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
    console.log('Google Fit API Response:', JSON.stringify(data, null, 2));
    
    let steps = 0;
    let calories = 0;
    let activeMinutes = 0;

    if (data.bucket?.[0]?.dataset) {
      for (const dataset of data.bucket[0].dataset) {
        const source = dataset.dataSourceId || '';
        const point = dataset.point?.[0];

        if (!point) continue;

        if (source.includes('step_count')) {
          steps = point.value?.[0]?.intVal ?? 0;
        }

        if (source.includes('calories')) {
          calories = Math.round(point.value?.[0]?.fpVal ?? 0);
        }

        if (source.includes('active_minutes')) {
          activeMinutes = point.value?.[0]?.intVal ?? 0;
        }
      }
    }

    return { steps, calories, activeMinutes };
  } catch (error) {
    console.error('Google Fit API call failed:', error);
    throw error;
  }
}
