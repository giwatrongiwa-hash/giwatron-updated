"use client";

import { useCallback, useState } from "react";
import { SectionShell } from "./SectionShell";
import { UnitRecord } from "./UnitRecord";
import { UnitViewer } from "./UnitViewer";
import { ROBOT_UNITS, type RobotUnit } from "@/lib/units";

export function UnitDatabase() {
  const [openUnit, setOpenUnit] = useState<RobotUnit | null>(null);
  const close = useCallback(() => setOpenUnit(null), []);
  const single = ROBOT_UNITS.length === 1;

  return (
    <SectionShell id="database" command="ls /units" title="Database">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-[12px] tracking-[0.14em]">
        <span className="text-os-gray">
          UNITS ON RECORD: <span className="text-os-white">{String(ROBOT_UNITS.length).padStart(3, "0")}</span>
        </span>
        <span className="text-os-gray hidden sm:inline">click a unit to open its file</span>
      </div>

      {single ? (
        <UnitRecord unit={ROBOT_UNITS[0]} variant="feature" onOpen={setOpenUnit} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {ROBOT_UNITS.map((unit) => (
            <UnitRecord key={unit.number} unit={unit} variant="compact" onOpen={setOpenUnit} />
          ))}
        </div>
      )}

      <UnitViewer unit={openUnit} onClose={close} />
    </SectionShell>
  );
}
