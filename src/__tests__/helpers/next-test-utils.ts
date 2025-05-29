import { NextRequest } from 'next/server';

export const createNextRequest = (
  url: string | URL,
  init: RequestInit = {}
): NextRequest => {
  const reqUrl = typeof url === 'string' ? new URL(url) : url;
  // Remove 'signal' if it is null to satisfy Next.js RequestInit type
  const sanitizedInit = { ...init };
  if ('signal' in sanitizedInit && sanitizedInit.signal == null) {
    delete sanitizedInit.signal;
  }
  // Remove 'signal' if it is null to satisfy Next.js RequestInit type
  const { signal, ...restInit } = sanitizedInit;
  const nextInit = signal == null ? restInit : { ...restInit, signal };
  return new NextRequest(reqUrl, nextInit as import('next/dist/server/web/spec-extension/request').RequestInit);
};

export const createJsonRequest = async (
  method: string,
  url: string,
  body?: any
): Promise<NextRequest> => {
  return createNextRequest(new URL(url), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};

export const createFormDataRequest = (
  url: string | URL,
  formData: FormData
): NextRequest => {
  return createNextRequest(url, {
    method: 'POST',
    body: formData
  });
};

// Dynamic imports for route handlers
const importRouteHandler = async (path: string, method: string) => {
  const mod = await import(`../../app/api/${path}/route`);
  return mod[method];
};

// HTTP method helpers
export const GET = async (request: NextRequest, path = 'users') => {
  const handler = await importRouteHandler(path, 'GET');
  return handler(request);
};

export const POST = async (request: NextRequest, path = 'users') => {
  const handler = await importRouteHandler(path, 'POST');
  return handler(request);
};

export const PUT = async (request: NextRequest, path = 'users') => {
  const handler = await importRouteHandler(path, 'PUT');
  return handler(request);
};

export const DELETE = async (request: NextRequest, path = 'users') => {
  const handler = await importRouteHandler(path, 'DELETE');
  return handler(request);
};
