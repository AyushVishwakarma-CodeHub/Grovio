import React from 'react';

/**
 * GrovioLogo — inline SVG brand logo
 * Layout: [Icon] [Grovio      ]
 *                [DELIVERED SMARTER]
 * The tagline aligns directly under the "G" of Grovio.
 *
 * Props:
 *   size        — icon height in px (default 36)
 *   showTagline — show "DELIVERED SMARTER" below wordmark (default false)
 *   className   — extra classes on wrapper
 */
const GrovioLogo = ({ size = 36, showTagline = false, className = '' }) => {
  const iconSize = size;
  const taglineFontSize = Math.max(7, Math.round(size * 0.24));

  return (
    <span className={`inline-flex items-center gap-2 select-none ${className}`}>

      {/* ── Left: Leaf + bolt icon ── */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 34 34"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        {/* Green circle background */}
        <circle cx="17" cy="17" r="17" fill="#22c55e" />
        {/* Inner glow */}
        <circle cx="17" cy="17" r="13" fill="#16a34a" opacity="0.35" />
        {/* Lightning bolt */}
        <path d="M19 8L12 18.5H16.5L14.5 26L22 15H17.5L19 8Z" fill="white" />
      </svg>

      {/* ── Right: Wordmark stacked above tagline ── */}
      <span className="inline-flex flex-col items-start leading-none">
        {/* Wordmark */}
        <span
          style={{
            fontFamily: "'Outfit', 'Inter', sans-serif",
            fontWeight: 800,
            fontSize: Math.round(size * 0.78),
            color: '#22c55e',
            lineHeight: 1,
            letterSpacing: '-0.5px',
          }}
        >
          Grovio
        </span>

        {/* Tagline — aligns under G */}
        {showTagline && (
          <span
            style={{
              fontSize: taglineFontSize,
              letterSpacing: '0.13em',
              marginTop: 2,
            }}
            className="text-gray-500 dark:text-dark-muted font-semibold uppercase"
          >
            Delivered Smarter
          </span>
        )}
      </span>
    </span>
  );
};

export default GrovioLogo;
