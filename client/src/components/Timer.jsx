import { useState, useEffect } from "react";

export default function Timer({ endsAt }) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) clearInterval(interval);
    }, 250);

    return () => clearInterval(interval);
  }, [endsAt]);

  const isUrgent = secondsLeft <= 10;
  const isCritical = secondsLeft <= 5;

  return (
    <div
      className={`timer ${isUrgent ? "urgent" : ""} ${isCritical ? "critical" : ""}`}
    >
      <span className="timer-icon">⏱️</span>
      <span className="timer-value">{secondsLeft}s</span>
    </div>
  );
}
