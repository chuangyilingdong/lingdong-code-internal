import { cn } from "@/components/lib/utils.js";

export function ZCodeAboutLogo({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="256"
      height="256"
      viewBox="0 0 1024 1024"
      fill="none"
      className={cn("shrink-0 text-current", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="1024" height="1024" rx="224" fill="currentColor" />
      <path d="M393 300L220 512L393 724" stroke="white" strokeWidth="92" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M631 300L804 512L631 724" stroke="white" strokeWidth="92" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M584 232L440 792" stroke="#A3E635" strokeWidth="72" strokeLinecap="round" />
    </svg>
  );
}

export function ZCodeWordmarkLogo({ className }: { className?: string }) {
  return (
    <svg
      width="244"
      height="54"
      viewBox="0 0 244 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0 text-current", className)}
      aria-hidden="true"
      focusable="false"
    >
      <text
        x="0"
        y="42"
        fill="currentColor"
        fontFamily="Inter, 'PingFang SC', 'Microsoft YaHei', sans-serif"
        fontSize="42"
        fontWeight="650"
        letterSpacing="-1"
      >
        灵动Code
      </text>
    </svg>
  );
}
