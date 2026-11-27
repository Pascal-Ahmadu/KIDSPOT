/** Shown while an admin page loads: the shape of a typical page with a soft shimmer. */
export default function AdminLoading() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading">
      <div className="skeleton h-5 w-72 max-w-full" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-[118px]" />
        ))}
      </div>
      <div className="rounded-[8px] border border-line bg-card p-5">
        <div className="skeleton mb-5 h-5 w-48" />
        <div className="grid gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-9" />
          ))}
        </div>
      </div>
    </div>
  );
}
