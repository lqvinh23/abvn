export default function NewsPageHeader() {
  return (
    <section className="bg-(--muted) px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
          News and community updates
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
          The latest from A Better Vietnam.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-700">
          Follow ABVN’s social channels for news, activities, and community
          stories.
        </p>
      </div>
    </section>
  );
}
