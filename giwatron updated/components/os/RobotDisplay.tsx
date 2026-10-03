import Image from "next/image";
import { cn } from "@/lib/utils";
import { formatUnitNumber, type RobotUnit } from "@/lib/units";

type Mode =
  /** Hero: scan-in reveal, eyes ignite, periodic glitch. Starts when `active`. */
  | "boot"
  /** Gallery/cards: shown immediately, eyes glow, glitch only on hover. */
  | "static";

/**
 * Renders a unit's artwork inside a small "CRT screen": the real image at
 * native pixel crispness, plus decorative layers (scanlines, optics glow,
 * RGB-split glitch slices). All effect layers sit on top of an unmodified
 * copy of the artwork, so the NFT itself is never altered.
 */
export function RobotDisplay({
  unit,
  mode = "static",
  active = true,
  priority = false,
  sizes = "(max-width: 768px) 90vw, 560px",
  className,
}: {
  unit: RobotUnit;
  mode?: Mode;
  active?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  const alt = `GIWATRON ${formatUnitNumber(unit.number)}`;
  const isBoot = mode === "boot";

  return (
    <div className={cn("robot-screen unit-image aspect-square w-full", className)}>
      <Image
        src={unit.image}
        alt={alt}
        fill
        unoptimized
        priority={priority}
        sizes={sizes}
        className={isBoot ? "robot-reveal" : undefined}
        data-active={isBoot ? active : undefined}
        draggable={false}
      />

      {/* RGB-split glitch copies (decorative). */}
      <Image
        src={unit.image}
        alt=""
        aria-hidden="true"
        fill
        unoptimized
        sizes={sizes}
        className="robot-glitch is-red"
        data-active={isBoot ? active : undefined}
        draggable={false}
      />
      <Image
        src={unit.image}
        alt=""
        aria-hidden="true"
        fill
        unoptimized
        sizes={sizes}
        className="robot-glitch is-cyan is-b"
        data-active={isBoot ? active : undefined}
        draggable={false}
      />

      {unit.optics?.map((eye, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn("robot-eye", !isBoot && "is-static")}
          style={{ left: `${eye.x * 100}%`, top: `${eye.y * 100}%` }}
          data-active={isBoot ? active : undefined}
        />
      ))}

      {isBoot && <span aria-hidden="true" className="robot-scanbar" data-active={active} />}
    </div>
  );
}
