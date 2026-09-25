export default function Card({
  children,
  className = "",
  padded = true,
}: {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-neutral-200 bg-white shadow-sm ${padded ? "p-5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}
