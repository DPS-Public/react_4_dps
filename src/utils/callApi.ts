// Cache for permissions or global config to prevent repeated "checking permissions" states
let permissionsCache: any = null;

export function setCachedPermissions(permissions: any) {
  permissionsCache = permissions;
}

export function getCachedPermissions() {
  return permissionsCache;
}

export function clearPermissionsCache() {
  permissionsCache = null;
}

// Universal API call with token support
export async function callApiWithToken(
  url: string,
  data: any = {},
  method: 'POST' | 'GET' = 'POST'
) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fetchUrl = url.startsWith('http') ? url : `/api${url}`;

  const response = await fetch(fetchUrl, {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(data) : undefined,
  });

  let resData;
  try {
    resData = await response.json();
  } catch {
    resData = {};
  }
  return { status: response.status, ...resData };
}

// Universal API call without token (public endpoints)
export async function callApiPublic(
  url: string,
  data: any = {},
  method: 'POST' | 'GET' = 'POST'
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const fetchUrl = url.startsWith('http') ? url : `/api${url}`;
  const response = await fetch(fetchUrl, {
    method,
    headers,
    body: method === 'POST' ? JSON.stringify(data) : undefined,
  });
  let resData;
  try {
    resData = await response.json();
  } catch {
    resData = {};
  }
  return { status: response.status, ...resData };
}
