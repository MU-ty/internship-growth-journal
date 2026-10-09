import { NextResponse } from 'next/server';

// Protect all data mutations as well as authentication endpoints. SameSite
// alone does not protect against another website on a sibling subdomain.
export function proxy(request: Request) {
  if (
    !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
    request.headers.get('origin') !== new URL(request.url).origin
  ) {
    return Response.json(
      { error: '请求来源无效，请在收获簿内操作' },
      {
        status: 403,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
export const config = { matcher: ['/api/:path*'] };
