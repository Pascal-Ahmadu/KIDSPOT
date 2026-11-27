/** Shown while a shop page loads: a product grid outline with a soft shimmer. */
export default function StoreLoading() {
  return (
    <div className="container-x py-12" aria-busy="true" aria-label="Loading">
      <div className="skeleton mx-auto h-8 w-64 max-w-full" />
      <div className="skeleton mx-auto mt-4 h-4 w-80 max-w-full" />
      <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="grid gap-3">
            <div className="skeleton aspect-[336/397] rounded-none" />
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-4 w-1/3" />
          </div>
        ))}
      </div>
    </div>
  );
}
