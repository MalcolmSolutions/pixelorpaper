import type { ArtworkKey } from "@/types/product";

// Original placeholder artworks, drawn on a 400×500 (4:5) canvas.
// Colours here are artwork colours, not UI tokens.

const WAVE_COLOURS = ["#9fb2bf", "#c7d3c0", "#d9a383"];

const artworks: Record<ArtworkKey, React.ReactNode> = {
  arches: (
    <>
      <rect width="400" height="500" fill="#f4efe6" />
      <circle cx="318" cy="112" r="34" fill="#d8a64a" />
      <path d="M60 460V260a140 140 0 0 1 280 0v200Z" fill="#c96f4a" />
      <path d="M100 460V280a100 100 0 0 1 200 0v180Z" fill="#d9a383" />
      <path d="M140 460V300a60 60 0 0 1 120 0v160Z" fill="#e8dcc8" />
    </>
  ),
  waves: (
    <>
      <rect width="400" height="500" fill="#eef0ee" />
      {Array.from({ length: 9 }, (_, i) => {
        const y = 110 + i * 32;
        return (
          <path
            key={i}
            d={`M30 ${y}Q72.5 ${y - 14} 115 ${y}T200 ${y}T285 ${y}T370 ${y}`}
            fill="none"
            stroke={WAVE_COLOURS[i % WAVE_COLOURS.length]}
            strokeWidth="7"
            strokeLinecap="round"
          />
        );
      })}
    </>
  ),
  orbs: (
    <>
      <rect width="400" height="500" fill="#f3ede3" />
      <g style={{ mixBlendMode: "multiply" }}>
        <circle cx="170" cy="210" r="110" fill="#e3b8a8" />
        <circle cx="250" cy="295" r="92" fill="#c7d3c0" />
        <circle cx="150" cy="345" r="52" fill="#d8a64a" />
      </g>
    </>
  ),
  "olive-branch": (
    <>
      <rect width="400" height="500" fill="#f4efe6" />
      <path
        d="M200 450C190 360 215 250 200 70"
        fill="none"
        stroke="#4f5d47"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {Array.from({ length: 8 }, (_, i) => {
        const y = 405 - i * 42;
        const side = i % 2 === 0 ? -1 : 1;
        const cx = 203 + side * 32;
        return (
          <ellipse
            key={i}
            cx={cx}
            cy={y}
            rx="34"
            ry="11"
            fill={i % 2 === 0 ? "#8a9466" : "#b7c4a9"}
            transform={`rotate(${side * -35} ${cx} ${y})`}
          />
        );
      })}
    </>
  ),
  "sun-hills": (
    <>
      <rect width="400" height="500" fill="#f6ead8" />
      <circle cx="200" cy="200" r="72" fill="#d8a64a" />
      <path d="M0 330Q120 260 240 320T400 300V500H0Z" fill="#c96f4a" />
      <path d="M0 382Q140 332 260 382T400 362V500H0Z" fill="#8a9466" />
      <path d="M0 432Q160 402 300 442T400 432V500H0Z" fill="#4f5d47" />
    </>
  ),
  mountains: (
    <>
      <rect width="400" height="500" fill="#e9ece8" />
      <circle cx="300" cy="105" r="20" fill="#d9a383" />
      <path
        d="M0 330L80 230L150 290L230 170L320 280L400 210V500H0Z"
        fill="#b7c4a9"
      />
      <rect y="350" width="400" height="34" fill="#ffffff" opacity="0.4" />
      <path
        d="M0 400L110 290L190 360L280 270L400 380V500H0Z"
        fill="#7d8a70"
      />
    </>
  ),
  blocks: (
    <>
      <rect width="400" height="500" fill="#f4efe6" />
      <rect x="60" y="70" width="190" height="230" fill="#c96f4a" />
      <rect x="170" y="200" width="170" height="200" fill="#2e2e2e" />
      <rect x="90" y="330" width="120" height="110" fill="#d8a64a" />
      <circle cx="300" cy="130" r="45" fill="#9fb2bf" />
    </>
  ),
  rings: (
    <>
      <rect width="400" height="500" fill="#f4efe6" />
      <circle cx="200" cy="300" r="150" fill="#2e2e2e" />
      <circle cx="200" cy="300" r="112" fill="#c96f4a" />
      <circle cx="200" cy="300" r="74" fill="#d8a64a" />
      <circle cx="200" cy="300" r="36" fill="#f4efe6" />
      <rect y="300" width="400" height="200" fill="#9fb2bf" />
      <rect y="300" width="400" height="6" fill="#f4efe6" />
    </>
  ),
  shapes: (
    <>
      <rect width="400" height="500" fill="#f3ede3" />
      <path
        d="M120 140C180 80 280 110 290 190C300 260 220 290 160 260C100 230 70 190 120 140Z"
        fill="#2e2e2e"
      />
      <path
        d="M210 290C280 270 340 330 320 390C300 450 220 450 190 400C165 360 170 305 210 290Z"
        fill="#c96f4a"
      />
      <circle cx="110" cy="375" r="34" fill="none" stroke="#2e2e2e" strokeWidth="3" />
      <path
        d="M80 450Q200 420 330 458"
        fill="none"
        stroke="#2e2e2e"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </>
  ),
};

export function Artwork({
  name,
  className,
}: {
  name: ArtworkKey;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 400 500"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      className={className}
    >
      {artworks[name]}
    </svg>
  );
}
