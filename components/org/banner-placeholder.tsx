export function BannerPlaceholder() {
  return (
    <div
      className="relative h-40 overflow-hidden sm:h-52"
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 960 320"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id="banner-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(var(--muted))" />
            <stop offset="55%" stopColor="hsl(var(--accent))" />
            <stop offset="100%" stopColor="hsl(var(--primary) / 0.28)" />
          </linearGradient>
        </defs>
        <rect width="960" height="320" fill="url(#banner-fill)" />
        <g stroke="hsl(var(--border))" strokeWidth="1" opacity="0.7">
          {Array.from({ length: 12 }, (_, i) => (
            <line key={`v-${i}`} x1={80 * (i + 1)} y1="0" x2={80 * (i + 1)} y2="320" />
          ))}
          {Array.from({ length: 5 }, (_, i) => (
            <line key={`h-${i}`} x1="0" y1={56 * (i + 1)} x2="960" y2={56 * (i + 1)} />
          ))}
        </g>
        <rect
          x="72"
          y="48"
          width="320"
          height="200"
          rx="14"
          fill="hsl(var(--card) / 0.72)"
          stroke="hsl(var(--border))"
        />
        <circle cx="92" cy="68" r="5" fill="hsl(var(--border))" />
        <circle cx="110" cy="68" r="5" fill="hsl(var(--border))" />
        <circle cx="128" cy="68" r="5" fill="hsl(var(--border))" />
        <rect x="92" y="92" width="280" height="8" rx="4" fill="hsl(var(--primary) / 0.35)" />
        <rect x="92" y="118" width="220" height="6" rx="3" fill="hsl(var(--muted-foreground) / 0.18)" />
        <rect x="92" y="140" width="248" height="6" rx="3" fill="hsl(var(--muted-foreground) / 0.14)" />
        <rect x="92" y="162" width="188" height="6" rx="3" fill="hsl(var(--muted-foreground) / 0.12)" />
        <rect x="92" y="196" width="96" height="28" rx="8" fill="hsl(var(--primary) / 0.45)" />
      </svg>
    </div>
  );
}
