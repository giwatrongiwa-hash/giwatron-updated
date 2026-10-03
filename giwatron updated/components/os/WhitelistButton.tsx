import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The primary call to action: an animated "marching pixels" border, a
 * blinking chevron, and a glitch on hover. Always routes to /whitelist.
 */
export function WhitelistButton({
  label = "JOIN WHITELIST",
  size = "md",
  className,
}: {
  label?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  return (
    <Link href="/whitelist" className={cn("cta-btn", size === "lg" && "cta-btn-lg", className)}>
      <span className="cta-btn-chevron" aria-hidden="true">
        &gt;&gt;
      </span>
      <span>{label}</span>
      <span className="cta-btn-cursor" aria-hidden="true" />
    </Link>
  );
}
