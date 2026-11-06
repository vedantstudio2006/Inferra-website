// Order of pages. Next/Previous follow this list and wrap around.
export const pages = [
  { path: "/", label: "Home" },
  { path: "/department", label: "Department" },
  { path: "/team", label: "Team" },
  { path: "/about", label: "About" },
];

// Returns null for pages outside the list (like /recruitment).
export function getNeighbors(pathname) {
  const i = pages.findIndex((p) => p.path === pathname);
  if (i === -1) return null;
  return {
    prev: pages[(i - 1 + pages.length) % pages.length],
    next: pages[(i + 1) % pages.length],
  };
}
