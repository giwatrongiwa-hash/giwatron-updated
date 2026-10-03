import { Wordmark } from "./Wordmark";
import { X_HANDLE, X_URL } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-10">
      <div className="os-divider" />
      <div className="mx-auto max-w-6xl px-5 sm:px-8 py-14 flex flex-col gap-10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Wordmark size="md" />
          <p className="mt-4 flex items-center gap-2 text-[12px] tracking-[0.18em] text-os-light">
            <span className="os-dot" /> SYSTEM ONLINE
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a href={X_URL} target="_blank" rel="noopener noreferrer" className="os-btn os-btn-sm">
            @{X_HANDLE}
          </a>
          <a href="#top" className="os-btn os-btn-sm">
            ↑ TOP
          </a>
        </div>
      </div>
    </footer>
  );
}
