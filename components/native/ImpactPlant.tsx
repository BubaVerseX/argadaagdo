// A small plant that grows with every Lunch Box collected: the stem gets
// taller and one more leaf appears per box (up to 10). It grows in once when
// the profile opens and then sways gently; with "Reduce motion" it is still
// (app/native.css).

const MAX_LEAVES = 10;

function leafPath(length: number) {
  const l = length;
  return `M0 0 C${l * 0.3} ${-l * 0.62} ${l * 0.78} ${-l * 0.72} ${l} ${-l * 0.55} C${l * 0.72} ${-l * 0.1} ${l * 0.36} ${l * 0.08} 0 0Z`;
}

export default function ImpactPlant({ boxes, size = 64 }: { boxes: number; size?: number }) {
  const count = Math.max(0, Math.floor(boxes));
  const leaves = Math.min(count, MAX_LEAVES);
  const groundY = 66;
  const stemHeight = count === 0 ? 0 : 16 + Math.min(count, 20) * 2;
  const topY = groundY - stemHeight;

  return (
    <svg
      viewBox="0 0 64 72"
      width={size}
      height={(size * 72) / 64}
      aria-hidden="true"
      className="impact-plant shrink-0 overflow-visible"
    >
      <ellipse cx="32" cy={groundY + 1} rx="17" ry="3" fill="#0f3a32" opacity="0.08" />
      {count === 0 ? (
        <ellipse cx="32" cy={groundY - 2} rx="4" ry="3" fill="#d9a84e" className="impact-leaf" />
      ) : (
        <g className="impact-sway">
          <path
            d={`M32 ${groundY} C31 ${groundY - stemHeight * 0.4} 33.5 ${groundY - stemHeight * 0.7} 32 ${topY}`}
            pathLength={1}
            stroke="#5fa46d"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            className="impact-stem"
          />
          {Array.from({ length: leaves }, (_, index) => {
            const y = groundY - (stemHeight * (index + 1)) / (leaves + 1);
            const right = index % 2 === 0;
            const length = 9 + Math.min(count, 20) * 0.25 - index * 0.25;
            return (
              <g key={index} transform={`translate(32 ${y}) scale(${right ? 1 : -1} 1)`}>
                <path
                  d={leafPath(length)}
                  fill={index % 3 === 2 ? "#b8dcc0" : "#8fc79c"}
                  className="impact-leaf"
                  style={{ animationDelay: `${450 + index * 90}ms` }}
                />
              </g>
            );
          })}
          {/* CSS transforms replace an SVG transform attribute, so the
              rotation sits on the group, not on the animated leaf. */}
          <g transform={`translate(32 ${topY}) rotate(-70)`}>
            <path
              d={leafPath(8)}
              fill="#5fa46d"
              className="impact-leaf"
              style={{ animationDelay: `${450 + leaves * 90}ms` }}
            />
          </g>
        </g>
      )}
    </svg>
  );
}
