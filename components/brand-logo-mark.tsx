/** Navy tile, ice-teal outline shield + aperture. */
export function BrandLogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <rect width="64" height="64" rx="14" fill="#152033" />
      <path
        d="M32 12.5c6.2 0 11.8 2.1 15.4 4.4.7.4 1.1 1.2 1.1 2v14.6c0 7.6-5.3 14.4-14.8 18.8a3.6 3.6 0 0 1-3.4 0C21.8 47.9 16.5 41.1 16.5 33.5V18.9c0-.8.4-1.6 1.1-2 3.6-2.3 9.2-4.4 15.4-4.4Z"
        stroke="#3A9FBF"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="31" r="7.2" stroke="#3A9FBF" strokeWidth="2.4" />
      <circle cx="32" cy="31" r="2.6" fill="#3A9FBF" />
    </svg>
  );
}
