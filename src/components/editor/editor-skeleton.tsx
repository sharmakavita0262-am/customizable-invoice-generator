/** Placeholder shown while an invoice loads from the server. */
export function EditorSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading invoice"
      className="mx-auto max-w-[1440px] animate-pulse px-4 py-6 sm:px-6 lg:px-8"
    >
      <div className="mb-8 h-12 w-56 rounded-lg bg-ink/5" />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        <div className="space-y-5">
          {[0, 1, 2].map((index) => (
            <div key={index} className="h-48 rounded-2xl border border-line bg-surface" />
          ))}
        </div>
        <div className="hidden aspect-[8.5/11] rounded-sm bg-white shadow-sheet lg:block" />
      </div>
    </div>
  );
}
