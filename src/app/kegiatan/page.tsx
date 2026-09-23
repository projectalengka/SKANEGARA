import type { Metadata } from 'next';
import Image from 'next/image';
import { getEvents, getGallery, getSections } from '@/lib/content';
import { PageHero, EmptyState } from '@/components/ui/PageHero';
import { formatDateId, toDateTimeAttribute } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Kegiatan',
  description:
    'Kegiatan dan agenda SMK Jayanegara Mojokerto: pembelajaran, workshop, praktik, dan aktivitas siswa.',
  alternates: { canonical: '/kegiatan' },
};

export const revalidate = 300;

export default async function EventsPage() {
  const [events, photos, sections] = await Promise.all([
    getEvents(),
    getGallery({ limit: 4 }),
    getSections(),
  ]);
  const section = sections.experience;

  // `Date.now()` is deliberate here rather than a lint oversight.
  //
  // This is a Server Component, so there is no re-render and no hydration to
  // disagree with — the clock is read once per request and the HTML is final.
  // The lint rule exists to catch impure calls inside *rendering* that happens
  // on both server and client, where two clocks can disagree. That is not this.
  //
  // "Upcoming vs past" also has to be resolved against the moment of the
  // request. Computing it once at build time would freeze it, so an event would
  // sit under "Akan Datang" forever. `revalidate = 300` above bounds how stale
  // the split can get.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const upcoming = events
    .filter((event) => new Date(event.date).getTime() >= now)
    // `getEvents()` orders by date *descending*, which is right for an archive
    // but wrong for an agenda: "Akan Datang" must read soonest-first, or the
    // next event someone can actually attend is buried under the ones after it.
    // The past list keeps the descending order, which is what a history wants.
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = events.filter((event) => new Date(event.date).getTime() < now);

  return (
    <>
      <PageHero
        index="03"
        eyebrow={section?.eyebrow ?? 'Kegiatan'}
        title={'Hari-hari\ndi sekolah.'}
        standfirst={section?.body}
      />

      {/*
        The photography band comes first and the dated agenda second. That order
        is deliberate: most schools have no events recorded, and leading with an
        empty agenda would make the page look abandoned. The photographs are
        what a visitor actually wants to see.
      */}
      <section className="section-y">
        <div className="shell-wide">
          <ul className="grid gap-6 md:grid-cols-12 md:gap-8">
            {photos.map((photo, index) => {
              const span =
                index % 3 === 0 ? 'md:col-span-7' : index % 3 === 1 ? 'md:col-span-5' : 'md:col-span-12';
              const offset = index % 2 === 1 ? 'md:pt-16' : '';
              const ratio = index % 3 === 2 ? 'aspect-21/9' : index % 3 === 0 ? 'aspect-3/2' : 'aspect-4/5';

              return (
                <li key={photo.id} className={`${span} ${offset}`}>
                  <figure>
                    <div className={`relative ${ratio} overflow-hidden`} data-image-reveal>
                      <Image
                        src={photo.image}
                        alt={photo.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 55vw"
                        className="object-cover"
                      />
                    </div>
                    <figcaption className="label mt-4 text-[var(--color-text-muted)]">
                      {photo.category} — {photo.title}
                    </figcaption>
                  </figure>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <section className="border-t border-[var(--color-line)] section-y">
        <div className="shell-wide">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-3">
              <p className="label text-[var(--color-accent)]">Agenda</p>
            </div>
            <div className="lg:col-span-9">
              <h2 className="display text-[length:var(--step-6)] leading-[0.92]">
                Agenda
                <br />
                <em>sekolah.</em>
              </h2>
            </div>
          </div>

          <div className="mt-14">
            {events.length === 0 ? (
              <EmptyState
                title="Belum ada kegiatan."
                body="Agenda yang Anda tambahkan melalui Dasbor akan muncul di bagian ini."
              />
            ) : (
              <>
                {upcoming.length > 0 ? (
                  <div className="mb-16">
                    <h3 className="label border-b border-[var(--color-line)] pb-4 text-[var(--color-accent)]">
                      Akan Datang
                    </h3>
                    <EventList events={upcoming} />
                  </div>
                ) : null}

                {past.length > 0 ? (
                  <div>
                    <h3 className="label border-b border-[var(--color-line)] pb-4 text-[var(--color-text-muted)]">
                      Sudah Berlalu
                    </h3>
                    <EventList events={past} muted />
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

/**
 * A dated row.
 *
 * The date is set at display scale in its own column rather than as a small
 * label above the title. A date is the primary fact about an event, and setting
 * it small treats it as metadata — which is exactly how an agenda ends up
 * unreadable.
 */
function EventList({
  events,
  muted = false,
}: {
  events: Awaited<ReturnType<typeof getEvents>>;
  muted?: boolean;
}) {
  return (
    <ul className="mt-2">
      {events.map((event) => (
        <li key={event.id} className="border-b border-[var(--color-line)]">
          <div className="grid gap-4 py-7 sm:grid-cols-12 sm:gap-8">
            <div className="sm:col-span-3">
              <time
                dateTime={toDateTimeAttribute(event.date)}
                className={`display block text-[length:var(--step-4)] leading-none ${muted ? 'text-[var(--color-text-muted)]' : ''}`}
              >
                {formatDateId(event.date)}
              </time>
            </div>

            <div className="sm:col-span-7">
              <h4 className={`display text-[length:var(--step-3)] leading-tight ${muted ? 'text-[var(--color-text-muted)]' : ''}`}>
                {event.title}
              </h4>
              {event.description ? (
                <p className="mt-3 text-[var(--color-text-muted)]">{event.description}</p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              {event.location ? (
                <p className="label text-[var(--color-text-muted)]">{event.location}</p>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
