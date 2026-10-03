import { cn } from "@/lib/utils";

const SIZES = {
  sm: "text-[15px] sm:text-[17px]",
  md: "text-[28px] sm:text-[36px]",
  xl: "text-[clamp(44px,11vw,124px)]",
} as const;

/** GIWA in off-white, TRON in the optics red — the only brand mark. */
export function Wordmark({
  size = "sm",
  glitch = false,
  className,
}: {
  size?: keyof typeof SIZES;
  glitch?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("font-pixel inline-block leading-none select-none", SIZES[size], glitch && "wordmark-glitch", className)}
      aria-label="GIWATRON"
    >
      <span className="text-os-white">GIWA</span>
      <span className="text-os-red">TRON</span>
    </span>
  );
}
