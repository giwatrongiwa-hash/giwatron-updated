/**
 * Full-screen CRT atmosphere: scanlines, vignette, film noise, a slow
 * rolling interference band and a rare flicker. Pure CSS (no canvas, no
 * JS loop) so it stays cheap on mobile. Always on.
 */
export function CRTLayer() {
  return (
    <div aria-hidden="true">
      <div className="crt-noise" />
      <div className="crt-scanlines" />
      <div className="crt-vignette" />
      <div className="crt-rollbar" />
      <div className="crt-flicker" />
    </div>
  );
}
