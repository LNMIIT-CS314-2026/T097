export async function request(path, method = 'GET', body) {
  const response = await fetch('/api' + path, {
    method,
    credentials: 'same-origin',
    ...(method === 'GET'
      ? {}
      : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body ?? {}) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'The server could not complete this request.');
    error.status = response.status;
    if (response.status === 401 && path !== '/login') window.dispatchEvent(new Event('session-ended'));
    throw error;
  }
  return result;
}
