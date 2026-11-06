// Order of pages. Next/Previous follow this list and wrap around,
// so Home -> Next = Department, Home -> Previous = About.
export const pages = [
  { path: "/", label: "Home" },
  { path: "/department", label: "Department" },
  { path: "/team", label: "Team" },
  { path: "/about", label: "About" },
];

export function getNeighbors(pathname) {
  const i = Math.max(0, pages.findIndex((p) => p.path === pathname));
  return {
    prev: pages[(i - 1 + pages.length) % pages.length],
    next: pages[(i + 1) % pages.length],
  };
}
