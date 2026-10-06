// Íconos de posición de la Grieta (dibujo propio, al estilo de los del cliente): la parte llena es el carril
const ROLE_PATHS = {
  TOP: { on: "M3 3h15l-4 4H7v7l-4 4z", off: "M10 10h11v11H10z" },
  JUNGLE: { on: "M7.5 3c-.6 5.2.9 9.4 4.5 15 3.6-5.6 5.1-9.8 4.5-15-1.3 3.7-2.7 6.3-4.5 8.4C10.2 9.3 8.8 6.7 7.5 3zM4 7.5c.8 3 2.2 5.8 4.4 8.3-.4-2.6-1.8-5.4-4.4-8.3zM20 7.5c-2.6 2.9-4 5.7-4.4 8.3 2.2-2.5 3.6-5.3 4.4-8.3z", off: "" },
  MIDDLE: { on: "M16.5 3H21v4.5L7.5 21H3v-4.5z", off: "M3 3h8.5L3 11.5zM21 21h-8.5l8.5-8.5z" },
  BOTTOM: { on: "M21 21H6l4-4h7v-7l4-4z", off: "M3 3h11v11H3z" },
  UTILITY: { on: "M12 8.5l2.6 2.6L12 20l-2.6-8.9zM2 7.5h6.2l2 2.7-3 2.3H4.6zM22 7.5h-6.2l-2 2.7 3 2.3h2.6zM9.6 3h4.8L12 6.2z", off: "" },
};

export default function RoleIcon({ role, size = 18 }) {
  const p = ROLE_PATHS[role];
  if (!p) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="role-icon">
      {p.off && <path d={p.off} fill="currentColor" opacity=".28" />}
      <path d={p.on} fill="currentColor" />
    </svg>
  );
}
