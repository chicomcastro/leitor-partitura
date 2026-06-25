// The TapScore brand mark: abstract staff lines + a note head, evoking a shelf
// of sheet music. Rendered white by default to sit inside the red logo tile.
// See docs/adr/018-brand-identity.md and docs/adr/019-rename-to-tapscore.md.
export default function BrandMark({ size = 24, color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <g stroke={color} strokeWidth="1.6" strokeLinecap="round">
        <line x1="6" y1="7.5" x2="17" y2="7.5" />
        <line x1="6" y1="11" x2="17" y2="11" />
        <line x1="6" y1="14.5" x2="13.3" y2="14.5" />
        <line x1="6" y1="18" x2="17" y2="18" />
      </g>
      <circle cx="15.2" cy="14.5" r="2" fill={color} />
    </svg>
  )
}
