import Image from "next/image";

export default function TeacherPageHeader() {
  return (
    <section className="bg-(--muted) px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-9 md:grid-cols-[1fr_0.8fr] md:gap-14">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-(--primary)">
            Our teachers
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            A global community, one lesson at a time.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-700">
            Volunteer teachers share their time and experience with learners in
            Vietnam. Meet members of our international teaching community.
          </p>
        </div>
        <div className="relative min-h-64 overflow-hidden rounded-3xl sm:min-h-80">
          <Image
            src="/images/volunteer-team.jpg"
            alt="Volunteer teachers collaborating"
            fill
            priority
            sizes="(max-width: 768px) 100vw, 40vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
