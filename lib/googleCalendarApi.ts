const GOOGLE_CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

export interface GoogleApiError extends Error {
  code: 'GOOGLE_API_ERROR';
  status: number;
}

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: string;
  description?: string;
  status?: string;
}

interface GoogleCalendarListResponse {
  items?: Array<{
    id?: string;
    summary?: string;
    start?: { dateTime?: string; timeZone?: string };
    end?: { dateTime?: string; timeZone?: string };
    location?: string;
    description?: string;
    status?: string;
  }>;
}

function buildApiError(status: number, message: string): GoogleApiError {
  const error = new Error(message) as GoogleApiError;
  error.code = 'GOOGLE_API_ERROR';
  error.status = status;
  return error;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: { message?: string }; message?: string };
    return payload.error?.message ?? payload.message ?? `Google Calendar API request failed (${response.status})`;
  } catch {
    return `Google Calendar API request failed (${response.status})`;
  }
}

async function requestJson<T>(accessToken: string, url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw buildApiError(response.status, await parseErrorMessage(response));
  }

  return (await response.json()) as T;
}

export async function createCalendarEvent(
  accessToken: string,
  event: Omit<GoogleCalendarEvent, 'id'>,
): Promise<string> {
  const created = await requestJson<{ id?: string }>(accessToken, GOOGLE_CALENDAR_API_BASE, {
    method: 'POST',
    body: JSON.stringify(event),
  });

  if (!created.id) {
    throw buildApiError(500, 'Google Calendar did not return an event id.');
  }

  return created.id;
}

export async function updateCalendarEvent(
  accessToken: string,
  eventId: string,
  event: Partial<Omit<GoogleCalendarEvent, 'id'>>,
): Promise<void> {
  await requestJson<Record<string, unknown>>(accessToken, `${GOOGLE_CALENDAR_API_BASE}/${eventId}`, {
    method: 'PATCH',
    body: JSON.stringify(event),
  });
}

export async function deleteCalendarEvent(accessToken: string, eventId: string): Promise<void> {
  const response = await fetch(`${GOOGLE_CALENDAR_API_BASE}/${eventId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    throw buildApiError(response.status, await parseErrorMessage(response));
  }
}

export async function listCalendarEvents(
  accessToken: string,
  timeMin: string,
  timeMax: string,
): Promise<GoogleCalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    showDeleted: 'true',
  });

  const response = await requestJson<GoogleCalendarListResponse>(
    accessToken,
    `${GOOGLE_CALENDAR_API_BASE}?${params.toString()}`,
  );

  const items = response.items ?? [];
  return items
    .filter((item) => {
      if (!item.id) return false;
      if (item.status === 'cancelled') return true;
      return Boolean(item.summary && item.start?.dateTime && item.end?.dateTime);
    })
    .map((item) => ({
      id: item.id,
      summary: item.summary ?? '',
      start: {
        dateTime: item.start?.dateTime ?? '',
        timeZone: item.start?.timeZone ?? 'UTC',
      },
      end: {
        dateTime: item.end?.dateTime ?? item.start?.dateTime ?? '',
        timeZone: item.end?.timeZone ?? item.start?.timeZone ?? 'UTC',
      },
      location: item.location,
      description: item.description,
      status: item.status,
    }));
}
