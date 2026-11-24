async function request(path, { method = 'GET', body, role = 'management' } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Demo-Role': role,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}

export const api = {
  bootstrap: () => request('/bootstrap'),
  createInitiative: (body, role) => request('/initiatives', { method: 'POST', body, role }),
  updateInitiative: (id, body, role) => request(`/initiatives/${id}`, { method: 'PATCH', body, role }),
  updateProgress: (id, body, role) => request(`/initiatives/${id}/progress`, { method: 'POST', body, role }),
  updateMilestone: (id, body, role) => request(`/milestones/${id}`, { method: 'PATCH', body, role }),
  reset: () => request('/reset', { method: 'POST' }),
};
