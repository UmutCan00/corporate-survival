export default function ChaosMeter({ value }) {
  const clampedValue = Math.max(0, Math.min(100, value));

  const getLabel = () => {
    if (clampedValue < 20) return "Calm Day";
    if (clampedValue < 40) return "Mild Tension";
    if (clampedValue < 60) return "Corporate Chaos";
    if (clampedValue < 80) return "Full Meltdown";
    return "Total Anarchy";
  };

  const getColor = () => {
    if (clampedValue < 20) return "#22c55e";
    if (clampedValue < 40) return "#84cc16";
    if (clampedValue < 60) return "#eab308";
    if (clampedValue < 80) return "#f97316";
    return "#ef4444";
  };

  return (
    <div className="chaos-meter">
      <div className="chaos-label">
        <span>🌡️ Chaos Meter</span>
        <span className="chaos-value" style={{ color: getColor() }}>
          {clampedValue}/100 – {getLabel()}
        </span>
      </div>
      <div className="chaos-bar-bg">
        <div
          className="chaos-bar-fill"
          style={{
            width: `${clampedValue}%`,
            backgroundColor: getColor(),
          }}
        />
      </div>
    </div>
  );
}
