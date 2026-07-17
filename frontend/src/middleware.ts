import { NextResponse, type NextRequest } from 'next/server';

const protectedRoutes = [
  '/dashboard',
  '/farmers',
  '/yields',
  '/inputs',
  '/organizations',
  '/users',
  '/map',
  '/analytics',
  '/exports',
  '/audit',
  '/settings',
];

const publicOnlyRoutes = ['/login', '/forgot-password'];

const roleRestrictedRoutes: Record<string, string[]> = {
  '/users': ['SUPER_ADMIN', 'ADMIN'],
  '/audit': ['SUPER_ADMIN', 'ADMIN'],
  '/organizations': ['SUPER_ADMIN', 'ADMIN', 'VIEWER'],
  '/analytics': ['SUPER_ADMIN', 'ADMIN', 'NGO_PARTNER', 'VIEWER'],
  '/exports': ['SUPER_ADMIN', 'ADMIN', 'NGO_PARTNER', 'VIEWER'],
  '/map': ['SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER', 'VIEWER'],
  '/farmers': ['SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER', 'VIEWER'],
  '/yields': ['SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER', 'VIEWER'],
  '/inputs': ['SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER'],
  '/dashboard': [
    'SUPER_ADMIN',
    'ADMIN',
    'FIELD_AGENT',
    'NGO_PARTNER',
    'VIEWER',
  ],
  '/settings': ['SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER', 'VIEWER'],
};

const isProtectedRoute = (pathname: string): boolean =>
  protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

const isPublicOnlyRoute = (pathname: string): boolean =>
  publicOnlyRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

const getRouteRoles = (pathname: string): string[] | null => {
  for (const [route, roles] of Object.entries(roleRestrictedRoutes)) {
    if (pathname === route || pathname.startsWith(`${route}/`)) {
      return roles;
    }
  }
  return null;
};

const parseJwtPayload = (
  token: string,
): { userId: string; role: string; exp: number } | null => {
  try {
    const base64Payload = token.split('.')[1];
    if (!base64Payload) {
      return null;
    }
    return JSON.parse(Buffer.from(base64Payload, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
};

const isTokenExpired = (exp: number): boolean => Date.now() >= exp * 1000;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/icons') ||
    pathname.startsWith('/images')
  ) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('accessToken')?.value;

  let tokenPayload: {
    userId: string;
    role: string;
    exp: number;
  } | null = null;

  if (accessToken) {
    tokenPayload = parseJwtPayload(accessToken);
    if (tokenPayload && isTokenExpired(tokenPayload.exp)) {
      tokenPayload = null;
    }
  }

  const isAuthenticated = !!tokenPayload;
  const userRole = tokenPayload?.role;

  if (isPublicOnlyRoute(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (isProtectedRoute(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (userRole) {
      const allowedRoles = getRouteRoles(pathname);
      if (allowedRoles && !allowedRoles.includes(userRole)) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', tokenPayload?.userId || '');
    requestHeaders.set('x-user-role', userRole || '');

    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|images/).*)',
  ],
};
