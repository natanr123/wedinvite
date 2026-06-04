const PALETTE = [
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-emerald-100 text-emerald-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
  'bg-fuchsia-100 text-fuchsia-700',
];

const SIZES = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-10 w-10 text-sm',
};

function hashName(name: string): number {
  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return Math.abs(hash);
}

/** Initials avatar with a deterministic pastel color per name. */
export default function Avatar({
  name,
  size = 'md',
}: {
  name: string;
  size?: keyof typeof SIZES;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const color = PALETTE[hashName(name) % PALETTE.length];

  return (
    <span
      aria-hidden
      className={`${SIZES[size]} ${color} inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold`}
    >
      {initials || '?'}
    </span>
  );
}
