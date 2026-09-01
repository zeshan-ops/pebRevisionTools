/**
 * Sets `data-theme` on <html> before first paint, so an explicit choice
 * survives a reload without a flash of the wrong theme. Absent a stored
 * choice, no attribute is set and the `prefers-color-scheme` media query in
 * globals.css drives it — matching the "system" default described in
 * docs/design-system.md.
 */
const THEME_INIT = `
(function () {
  try {
    var stored = localStorage.getItem("peb-theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (e) {}
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />;
}
