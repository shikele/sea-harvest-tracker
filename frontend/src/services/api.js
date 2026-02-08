const API_BASE = '/api';

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }
  return data.data;
}

async function postJson(url) {
  const response = await fetch(url, { method: 'POST' });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }
  return data.data;
}

export async function getBeaches() {
  return fetchJson(`${API_BASE}/beaches`);
}

export async function getBeach(id) {
  return fetchJson(`${API_BASE}/beaches/${id}`);
}

export async function getBeachesSummary() {
  return fetchJson(`${API_BASE}/beaches/summary`);
}

export async function getTideStations() {
  return fetchJson(`${API_BASE}/tides/stations`);
}

export async function getTides(stationId, days = 7) {
  return fetchJson(`${API_BASE}/tides/${stationId}?days=${days}`);
}

export async function getHarvestWindows() {
  return fetchJson(`${API_BASE}/harvest-windows`);
}

export async function getHarvestCalendar(days = 7, includeAll = true, startDate = null) {
  let url = `${API_BASE}/harvest-windows/calendar?days=${days}&includeAll=${includeAll}`;
  if (startDate) {
    url += `&startDate=${startDate}`;
  }
  return fetchJson(url);
}

export async function refreshData() {
  return postJson(`${API_BASE}/refresh`);
}

// Comments API
export async function getAllComments() {
  return fetchJson(`${API_BASE}/comments`);
}

export async function getComments(beachId) {
  return fetchJson(`${API_BASE}/comments/${beachId}`);
}

export async function postComment(beachId, formData) {
  const response = await fetch(`${API_BASE}/comments/${beachId}`, {
    method: 'POST',
    body: formData
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `API error: ${response.status}`);
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }
  return data.data;
}

export async function deleteComment(beachId, commentId, author) {
  const response = await fetch(`${API_BASE}/comments/${beachId}/${commentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `API error: ${response.status}`);
  }
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Unknown error');
  }
  return data.data;
}

export default {
  getBeaches,
  getBeach,
  getBeachesSummary,
  getTideStations,
  getTides,
  getHarvestWindows,
  getHarvestCalendar,
  refreshData,
  getAllComments,
  getComments,
  postComment,
  deleteComment
};
