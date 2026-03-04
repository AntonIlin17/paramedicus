export default function LoadingDots() {
  return (
    <div className="inline-flex items-center gap-1">
      {[0, 1, 2].map((n) => (
        <span
          key={n}
          className="h-2 w-2 rounded-full bg-slate-500 animate-dotBounce"
          style={{ animationDelay: `${n * 0.15}s` }}
        />
      ))}
    </div>
  );
}
