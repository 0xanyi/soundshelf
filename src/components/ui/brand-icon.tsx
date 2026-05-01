import type { SVGProps } from "react";

export function BrandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      {...props}
    >
      <path d="M4 12h2" />
      <path d="M9 7v10" />
      <path d="M14 4v16" />
      <path d="M19 9v6" />
    </svg>
  );
}
