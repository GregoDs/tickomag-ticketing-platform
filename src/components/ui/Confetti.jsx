import "./Confetti.css";

const pieces = Array.from({ length: 30 }, (_, index) => ({
  id: index,
  x: `${(index * 37) % 100}%`,
  delay: `${(index % 10) * 0.08}s`,
  duration: `${2.6 + (index % 6) * 0.18}s`,
  drift: `${((index * 23) % 90) - 45}px`,
  color: ["#e9ff70", "#ff4138", "#f5f4ef", "#7c5cff"][index % 4],
}));

function Confetti() {
  return (
    <div className="success-confetti" aria-hidden="true">
      {pieces.map((piece) => <i key={piece.id} style={{ "--x": piece.x, "--delay": piece.delay, "--duration": piece.duration, "--drift": piece.drift, "--confetti-color": piece.color }} />)}
    </div>
  );
}

export default Confetti;
