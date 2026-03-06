import React from 'react';

/**
 * Stylized lobster silhouette SVG for Lobster Console background.
 * Designed to work at various sizes with low opacity for subtle branding.
 */
function LobsterIcon({ className = '', size = 120 }: { className?: string; size?: number }) {
  const s = size;
  return (
    <svg
      viewBox="0 0 120 80"
      width={s}
      height={s * (80 / 120)}
      className={className}
      aria-hidden
    >
      <g fill="currentColor">
        {/* Left claw */}
        <ellipse cx={22} cy={38} rx={16} ry={11} transform="rotate(-28 22 38)" />
        <ellipse cx={6} cy={34} rx={7} ry={9} transform="rotate(-22 6 34)" />
        {/* Right claw */}
        <ellipse cx={98} cy={38} rx={16} ry={11} transform="rotate(28 98 38)" />
        <ellipse cx={114} cy={34} rx={7} ry={9} transform="rotate(22 114 34)" />
        {/* Head / thorax */}
        <ellipse cx={60} cy={40} rx={24} ry={15} />
        {/* Abdomen / tail segments */}
        <ellipse cx={86} cy={40} rx={10} ry={8} />
        <ellipse cx={98} cy={40} rx={8} ry={7} />
        <ellipse cx={108} cy={40} rx={6} ry={6} />
        {/* Tail fan */}
        <path d="M 112 34 L 120 30 L 120 50 L 112 46 Z" />
        {/* Antennae (curved) */}
        <path d="M 46 26 Q 24 8 12 16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M 74 26 Q 96 8 108 16" stroke="currentColor" strokeWidth="2.2" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * Full-page lobster background for Lobster Console. Many lobsters at
 * stronger opacity (25–40%) so the background is clearly visible.
 */
const LOBSTER_PLACEMENTS: Array<{ left?: string; right?: string; top: string; size: number; opacity: string; rotate: string }> = [
  { left: '-5%', top: '5%', size: 220, opacity: '30', rotate: 'rotate-12' },
  { right: '-3%', top: '8%', size: 200, opacity: '35', rotate: '-rotate-8' },
  { left: '12%', top: '15%', size: 160, opacity: '28', rotate: '-rotate-15' },
  { right: '15%', top: '18%', size: 140, opacity: '30', rotate: 'rotate-6' },
  { left: '35%', top: '8%', size: 120, opacity: '25', rotate: 'rotate-45' },
  { right: '32%', top: '12%', size: 110, opacity: '28', rotate: '-rotate-30' },
  { left: '55%', top: '5%', size: 150, opacity: '30', rotate: '-rotate-12' },
  { right: '55%', top: '14%', size: 100, opacity: '25', rotate: 'rotate-20' },
  { left: '78%', top: '10%', size: 130, opacity: '32', rotate: 'rotate-[-5deg]' },
  { left: '-2%', top: '28%', size: 200, opacity: '35', rotate: '-rotate-20' },
  { right: '-4%', top: '32%', size: 180, opacity: '30', rotate: 'rotate-15' },
  { left: '8%', top: '38%', size: 140, opacity: '28', rotate: 'rotate-[-10deg]' },
  { right: '8%', top: '35%', size: 160, opacity: '32', rotate: '-rotate-6' },
  { left: '28%', top: '30%', size: 95, opacity: '25', rotate: 'rotate-35' },
  { right: '28%', top: '42%', size: 105, opacity: '27', rotate: '-rotate-25' },
  { left: '48%', top: '25%', size: 115, opacity: '26', rotate: 'rotate-12' },
  { right: '48%', top: '38%', size: 90, opacity: '25', rotate: '-rotate-18' },
  { left: '68%', top: '32%', size: 125, opacity: '30', rotate: 'rotate-[-15deg]' },
  { right: '68%', top: '28%', size: 110, opacity: '28', rotate: 'rotate-8' },
  { left: '88%', top: '35%', size: 145, opacity: '32', rotate: '-rotate-10' },
  { left: '-3%', top: '52%', size: 190, opacity: '35', rotate: 'rotate-[-8deg]' },
  { right: '-2%', top: '55%', size: 170, opacity: '30', rotate: 'rotate-12' },
  { left: '10%', top: '58%', size: 135, opacity: '28', rotate: '-rotate-22' },
  { right: '12%', top: '62%', size: 120, opacity: '30', rotate: 'rotate-6' },
  { left: '32%', top: '52%', size: 100, opacity: '26', rotate: 'rotate-40' },
  { right: '30%', top: '58%', size: 95, opacity: '25', rotate: '-rotate-35' },
  { left: '52%', top: '48%', size: 130, opacity: '28', rotate: 'rotate-[-12deg]' },
  { right: '50%', top: '54%', size: 105, opacity: '27', rotate: '-rotate-8' },
  { left: '72%', top: '50%', size: 115, opacity: '29', rotate: 'rotate-18' },
  { right: '70%', top: '58%', size: 140, opacity: '31', rotate: '-rotate-14' },
  { left: '92%', top: '52%', size: 155, opacity: '33', rotate: 'rotate-[-6deg]' },
  { left: '-4%', top: '72%', size: 210, opacity: '35', rotate: '-rotate-15' },
  { right: '-3%', top: '75%', size: 185, opacity: '32', rotate: 'rotate-10' },
  { left: '6%', top: '78%', size: 150, opacity: '30', rotate: 'rotate-[-20deg]' },
  { right: '6%', top: '82%', size: 135, opacity: '28', rotate: '-rotate-8' },
  { left: '26%', top: '72%', size: 110, opacity: '27', rotate: 'rotate-30' },
  { right: '26%', top: '78%', size: 100, opacity: '26', rotate: '-rotate-28' },
  { left: '46%', top: '70%', size: 125, opacity: '29', rotate: 'rotate-[-10deg]' },
  { right: '44%', top: '76%', size: 115, opacity: '28', rotate: 'rotate-15' },
  { left: '66%', top: '72%', size: 140, opacity: '31', rotate: '-rotate-12' },
  { right: '64%', top: '80%', size: 120, opacity: '28', rotate: 'rotate-[-18deg]' },
  { left: '86%', top: '75%', size: 165, opacity: '33', rotate: 'rotate-6' },
  { left: '18%', top: '92%', size: 130, opacity: '30', rotate: '-rotate-25' },
  { right: '20%', top: '90%', size: 145, opacity: '32', rotate: 'rotate-8' },
  { left: '58%', top: '88%', size: 110, opacity: '27', rotate: 'rotate-[-15deg]' },
  { right: '55%', top: '92%', size: 125, opacity: '29', rotate: '-rotate-10' },
];

export function LobsterBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {LOBSTER_PLACEMENTS.map((p, i) => (
        <div
          key={i}
          className={`absolute ${p.rotate}`}
          style={{
            left: p.left,
            right: p.right,
            top: p.top,
            color: `rgb(249 115 69 / ${p.opacity}%)`,
          }}
        >
          <LobsterIcon size={p.size} />
        </div>
      ))}
    </div>
  );
}

export default LobsterBackground;
