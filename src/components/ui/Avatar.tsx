import { cn, initials } from '@/lib/utils';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
};

/** Colourful initials avatar — no image assets needed anywhere in the app. */
export function Avatar({
  name,
  color = '#2563eb',
  size = 'md',
  className,
}: {
  name: string;
  color?: string;
  size?: AvatarSize;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        SIZES[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {initials(name)}
    </span>
  );
}

/** Name + role/subtitle row used by tables and lists. */
export function PersonCell({
  name,
  subtitle,
  color,
  size = 'sm',
}: {
  name: string;
  subtitle?: string;
  color?: string;
  size?: AvatarSize;
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={name} color={color} size={size} />
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-800">{name}</p>
        {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
  );
}
