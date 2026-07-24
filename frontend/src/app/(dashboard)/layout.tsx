'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Wheat,
  Package,
  Building2,
  UserCog,
  Map,
  BarChart3,
  FileDown,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  LogOut,
  Leaf,
} from 'lucide-react';
import Link from 'next/link';

import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useSidebarState } from '@/hooks/useLocalStorage';
import { useScreenSize } from '@/hooks/useMediaQuery';
import { cn, getInitials } from '@/lib/utils';

const navItems = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER', 'VIEWER'],
  },
  {
    href: '/farmers',
    icon: Users,
    label: 'Farmers',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER', 'VIEWER'],
  },
  {
    href: '/yields',
    icon: Wheat,
    label: 'Yield Reports',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER', 'VIEWER'],
  },
  {
    href: '/inputs',
    icon: Package,
    label: 'Aid Distribution',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER'],
  },
  {
    href: '/organizations',
    icon: Building2,
    label: 'Organizations',
    roles: ['SUPER_ADMIN', 'ADMIN', 'VIEWER'],
  },
  {
    href: '/users',
    icon: UserCog,
    label: 'Users',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/map',
    icon: Map,
    label: 'Map',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER', 'VIEWER'],
  },
  {
    href: '/analytics',
    icon: BarChart3,
    label: 'Analytics',
    roles: ['SUPER_ADMIN', 'ADMIN', 'NGO_PARTNER', 'VIEWER'],
  },
  {
    href: '/exports',
    icon: FileDown,
    label: 'Exports',
    roles: ['SUPER_ADMIN', 'ADMIN', 'NGO_PARTNER', 'VIEWER'],
  },
  {
    href: '/audit',
    icon: ScrollText,
    label: 'Audit Logs',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/settings',
    icon: Settings,
    label: 'Settings',
    roles: ['SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER', 'VIEWER'],
  },
];

const roleColors: Record<string, string> = {
  SUPER_ADMIN: '#f87171',
  ADMIN: '#fbbf24',
  FIELD_AGENT: '#4ade80',
  NGO_PARTNER: '#60a5fa',
  VIEWER: '#a78bfa',
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const { toast } = useToast();
  const { isMobile } = useScreenSize();
  const [isCollapsed, setIsCollapsed] = useSidebarState();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { data: unreadCount = 0 } = useUnreadCount();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      toast.success('Logged out', 'You have been successfully logged out.');
    } catch {
      toast.error('Logout failed', 'Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const allowedNavItems = navItems.filter((item) =>
    item.roles.includes(user?.role || ''),
  );

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: '#060d18' }}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
            style={{ background: 'linear-gradient(135deg, #00ff88, #00d4ff)' }}
          >
            <Leaf size={24} color="#001a0e" />
          </div>
          <div className="flex items-center gap-2">
            <div
              className="h-2 w-2 animate-bounce rounded-full"
              style={{ background: '#00ff88', animationDelay: '0ms' }}
            />
            <div
              className="h-2 w-2 animate-bounce rounded-full"
              style={{ background: '#00d4ff', animationDelay: '150ms' }}
            />
            <div
              className="h-2 w-2 animate-bounce rounded-full"
              style={{ background: '#7b2fff', animationDelay: '300ms' }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const sidebarWidth = isCollapsed ? 72 : 240;

  return (
    <div className="flex min-h-screen" style={{ background: '#060d18' }}>
      <AnimatePresence>
        {isMobile && mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.6)' }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ width: isMobile ? 240 : sidebarWidth }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        className={cn(
          'fixed left-0 top-0 z-50 flex h-full flex-col',
          isMobile && !mobileOpen && '-translate-x-full',
          isMobile && mobileOpen && 'translate-x-0',
        )}
        style={{
          background: 'rgba(6, 13, 24, 0.98)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.06)',
          transition: isMobile ? 'transform 0.3s ease' : 'width 0.25s ease',
          width: isMobile ? 240 : sidebarWidth,
        }}
      >
        <div
          className="flex shrink-0 items-center justify-between p-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <AnimatePresence mode="wait">
            {(!isCollapsed || isMobile) && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2.5 overflow-hidden"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                  }}
                >
                  <Leaf size={16} color="#001a0e" />
                </div>
                <div className="overflow-hidden">
                  <p
                    className="truncate text-sm font-bold"
                    style={{ color: 'rgba(255,255,255,0.9)' }}
                  >
                    AgroEthiopia
                  </p>
                  <p
                    className="truncate text-xs"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    MIS v1.0
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isCollapsed && !isMobile && (
            <div
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
              }}
            >
              <Leaf size={16} color="#001a0e" />
            </div>
          )}

          {!isMobile && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="ml-auto rounded-lg p-1.5 transition-colors"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              {isCollapsed ? (
                <ChevronRight size={16} />
              ) : (
                <ChevronLeft size={16} />
              )}
            </button>
          )}

          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="rounded-lg p-1.5"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3">
          <div className="space-y-0.5">
            {allowedNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isCollapsed && !isMobile && 'justify-center px-2',
                  )}
                  style={{
                    background: isActive
                      ? 'rgba(0,255,136,0.1)'
                      : 'transparent',
                    color: isActive ? '#00ff88' : 'rgba(255,255,255,0.5)',
                    border: isActive
                      ? '1px solid rgba(0,255,136,0.2)'
                      : '1px solid transparent',
                  }}
                  title={isCollapsed && !isMobile ? item.label : undefined}
                >
                  <item.icon size={18} style={{ flexShrink: 0 }} />
                  <AnimatePresence mode="wait">
                    {(!isCollapsed || isMobile) && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </div>
        </nav>

        <div
          className="shrink-0 p-3"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div
            className={cn(
              'mb-2 flex items-center gap-3 rounded-xl p-2',
              isCollapsed && !isMobile && 'justify-center',
            )}
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
              style={{
                background: roleColors[user.role] || '#4ade80',
                color: '#001a0e',
              }}
            >
              {getInitials(user.name)}
            </div>
            <AnimatePresence mode="wait">
              {(!isCollapsed || isMobile) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1 overflow-hidden"
                >
                  <p
                    className="truncate text-xs font-semibold"
                    style={{ color: 'rgba(255,255,255,0.9)' }}
                  >
                    {user.name}
                  </p>
                  <p
                    className="truncate text-xs"
                    style={{ color: roleColors[user.role] || '#4ade80' }}
                  >
                    {user.role.replace('_', ' ')}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={cn(
              'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all duration-200',
              isCollapsed && !isMobile && 'justify-center px-2',
            )}
            style={{
              color: 'rgba(248,113,113,0.7)',
              background: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(248,113,113,0.08)';
              e.currentTarget.style.color = '#f87171';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(248,113,113,0.7)';
            }}
          >
            <LogOut size={14} />
            <AnimatePresence mode="wait">
              {(!isCollapsed || isMobile) && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {isLoggingOut ? 'Logging out...' : 'Logout'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>

      <div
        className="flex min-h-screen flex-1 flex-col transition-all duration-300"
        style={{ marginLeft: isMobile ? 0 : sidebarWidth }}
      >
        <header
          className="sticky top-0 z-30 flex shrink-0 items-center justify-between px-6 py-3"
          style={{
            background: 'rgba(6, 13, 24, 0.9)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            height: '60px',
          }}
        >
          {isMobile && (
            <button
              onClick={() => setMobileOpen(true)}
              className="mr-3 rounded-lg p-2"
              style={{
                color: 'rgba(255,255,255,0.6)',
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              <Menu size={18} />
            </button>
          )}

          <div className="flex-1">
            <h1
              className="text-sm font-semibold capitalize"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              {pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') ||
                'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/settings?tab=notifications"
              className="relative rounded-lg p-2 transition-colors"
              style={{
                color: 'rgba(255,255,255,0.5)',
                background: 'rgba(255,255,255,0.04)',
              }}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full font-bold"
                  style={{
                    background: '#f87171',
                    color: '#fff',
                    fontSize: '10px',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <Link
              href="/settings?tab=profile"
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
                style={{
                  background: roleColors[user.role] || '#4ade80',
                  color: '#001a0e',
                }}
              >
                {getInitials(user.name)}
              </div>
              <span
                className="hidden text-xs font-medium sm:block"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                {user.name.split(' ')[0]}
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-6">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
