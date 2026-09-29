import { useId } from "react";
import "../brand.css";

export default function BrandLogo({ compact = false, className = "" }) {
  const backgroundFilter = `brand-background-${useId()}`;
  return (
    <svg
      className={`brand-logo ${compact ? "brand-logo-compact" : ""} ${className}`}
      viewBox={compact ? "56 218 102 102" : "24 218 176 151"}
      role="img"
      aria-label="Conversations for the Greater Good"
      focusable="false"
    >
      <defs>
        <filter id={backgroundFilter} colorInterpolationFilters="sRGB">
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -1 -1 -1 0 3"
          />
        </filter>
      </defs>
      <image
        href="/assets/brand-board.jpeg"
        width="662"
        height="427"
        filter={`url(#${backgroundFilter})`}
      />
    </svg>
  );
}
