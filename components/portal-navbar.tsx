'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getInitials } from '@/lib/format';
import { useAuth, useLogout } from '@/lib/hooks/use-auth';
import type { ReminderNotification } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Bell, LogOut, PawPrint, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavLinkItem {
  label: string;
  href: string;
}

interface PortalNavbarProps {
  portalTag?: string;
  navItems: NavLinkItem[];
}

export function PortalNavbar({ portalTag, navItems }: PortalNavbarProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { data: user } = useAuth();
  const logout = useLogout();

  const { data: notifications = [] } = useQuery<ReminderNotification[]>({
    queryKey: ['notifications', user?.user_id],
    queryFn: async () => {
      const res = await api.get<ReminderNotification[]>('/notifications');
      return res.data;
    },
    enabled: !!user,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId?: number) => {
      await api.patch('/notifications', notificationId ? { notification_id: notificationId } : {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <header className="no-print bg-white/95 backdrop-blur-md border-b border-slate-200 px-[clamp(0.75rem,3vw,1.5rem)] py-[clamp(0.5rem,1.5vh,0.75rem)] flex items-center justify-between sticky top-0 z-30 w-full max-w-[100vw]">
        <div className="flex items-center gap-5">
          <Link
            href="/"
            className="text-lg md:text-xl font-bold text-emerald-600 tracking-tight flex items-center gap-1.5"
          >
            <span aria-hidden="true">🐾</span>
            <span>Petta</span>
          </Link>

          {portalTag && (
            <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              {portalTag}
            </span>
          )}

          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-slate-600">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== '/' &&
                  item.href !== '/overview' &&
                  pathname.startsWith(item.href + '/'));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'transition-colors hover:text-emerald-600',
                    active && 'text-emerald-600 font-semibold'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          {user && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="relative p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer"
                    aria-label="Reminders and Notifications"
                  >
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-[min(20rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] p-0 overflow-hidden bg-white/95 backdrop-blur-md shadow-xl border-slate-200"
                >
                  <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <span className="text-xs font-bold text-slate-900">
                      Reminders &amp; Alerts ({unreadCount} unread)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => markReadMutation.mutate(undefined)}
                        className="text-[11px] font-semibold text-emerald-600 hover:underline cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[min(18rem,45dvh)] overflow-y-auto divide-y divide-slate-100 bg-white">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-slate-500 text-center">
                        No active reminders right now.
                      </p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.notification_id}
                          onClick={() => !n.is_read && markReadMutation.mutate(n.notification_id)}
                          className={cn(
                            'p-3 text-xs space-y-1 cursor-pointer hover:bg-slate-50',
                            !n.is_read && 'bg-emerald-50/40'
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">{n.title}</span>
                            {!n.is_read && (
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-slate-600 leading-relaxed">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200/70 transition-colors cursor-pointer"
                  >
                    <span className="text-xs font-medium text-slate-700 hidden sm:inline">
                      {user.full_name}
                      {user.clinic_name ? ` • ${user.clinic_name}` : ''}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[11px]">
                      {getInitials(user.full_name)}
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  align="end"
                  className="w-[min(16rem,calc(100vw-1.5rem))] max-w-[calc(100vw-1.5rem)] p-3 space-y-3 bg-white/95 backdrop-blur-md shadow-xl border-slate-200"
                >
                  <div className="border-b border-slate-100 pb-2">
                    <p className="text-xs font-bold text-slate-900">{user.full_name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Role: {user.role}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => logout.mutate()}
                  >
                    <LogOut className="h-3.5 w-3.5 mr-1.5" /> Sign Out / Switch Account
                  </Button>
                </PopoverContent>
              </Popover>
            </>
          )}

          {!user && (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button size="sm" variant="outline">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      <nav className="no-print md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 flex items-center justify-around py-[clamp(0.375rem,1vh,0.625rem)] px-1 w-full max-w-[100vw] shadow-lg">
        {navItems.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/' &&
              item.href !== '/overview' &&
              pathname.startsWith(item.href + '/'));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-0.5 text-[11px] font-medium px-2 py-1 rounded-md',
                active ? 'text-emerald-600 font-bold' : 'text-slate-500'
              )}
            >
              {portalTag ? <Shield className="h-4 w-4" /> : <PawPrint className="h-4 w-4" />}
              <span className="truncate max-w-[74px]">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
