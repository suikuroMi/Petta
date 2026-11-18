import { Badge } from '@/components/ui/badge';
import type { AppointmentStatus } from '@/types';

const STATUS_CONFIG: Record<
  AppointmentStatus,
  { label: string; className: string }
> = {
  Pending: {
    label: 'PENDING APPROVAL',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  Confirmed: {
    label: 'CONFIRMED',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  'Checked-In': {
    label: 'CHECKED-IN',
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  'In-Consultation': {
    label: 'IN-CONSULTATION',
    className: 'bg-violet-50 text-violet-700 border-violet-200',
  },
  Completed: {
    label: 'COMPLETED',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  Cancelled: {
    label: 'CANCELLED',
    className: 'bg-red-50 text-red-700 border-red-200',
  },
};

export function AppointmentStatusBadge({ status }: { status: AppointmentStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.Pending;
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-bold tracking-wide uppercase ${cfg.className}`}
    >
      {cfg.label}
    </Badge>
  );
}
