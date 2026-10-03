/**
 * The robot database.
 *
 * This is the single source of truth for every GIWATRON unit shown on the
 * site (hero + database section). To add a unit later:
 *   1. drop the artwork in /public/nft/ (e.g. giwatron-002.webp)
 *   2. append one object to ROBOT_UNITS below.
 * The database section switches from the single "feature record" layout to
 * a grid automatically once there is more than one unit.
 *
 * Fields are system-style display labels, not on-chain metadata — nothing
 * here claims a token ID, contract, owner or supply.
 */

export type UnitStatus = "ACTIVE" | "DORMANT" | "SEALED";

export type RobotUnit = {
  /** Display number, e.g. 1 -> "#001". */
  number: number;
  /** Path under /public. */
  image: string;
  /** Width/height of the source artwork in px (square). */
  size: number;
  model: string;
  status: UnitStatus;
  type: string;
  system: string;
  /**
   * Optic (eye) centers as a fraction of the artwork, used to place the red
   * glow overlay precisely. Omit for units without glowing optics.
   */
  optics?: Array<{ x: number; y: number }>;
};

export const ROBOT_UNITS: RobotUnit[] = [
  {
    number: 1,
    image: "/nft/giwatron-001.webp",
    size: 1280,
    model: "GIWATRON-001",
    status: "ACTIVE",
    type: "UNKNOWN",
    system: "ONLINE",
    // Sampled from the artwork's red pixel clusters (1280px source).
    optics: [
      { x: 0.414, y: 0.387 },
      { x: 0.586, y: 0.387 },
    ],
  },
];

export function formatUnitNumber(n: number): string {
  return `#${String(n).padStart(3, "0")}`;
}
