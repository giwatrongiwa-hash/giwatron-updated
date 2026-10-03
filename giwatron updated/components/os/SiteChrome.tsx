import { CRTLayer } from "./CRTLayer";
import { PixelField } from "./PixelField";
import { NavBar } from "./NavBar";
import { Footer } from "./Footer";

/** Shared frame for every page: pixel background, CRT overlay, nav and footer. */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PixelField />
      <CRTLayer />
      <NavBar />
      {children}
      <Footer />
    </>
  );
}
