import Image from 'next/image';
import Link from 'next/link';
import type { ProgramContent, SchoolProfileContent, SectionContent } from '@/data/defaults';
import { HeroMotion } from '@/components/motion/HeroMotion';

/** A typographic opening with an editorial index, not a darkened stock backdrop.
 * CMS-authored headline lines remain intact. Program images are existing assets,
 * explicitly labelled when they are illustrations rather than school photographs. */
export function Hero({ profile, section, programs }: {
  profile: SchoolProfileContent;
  section: SectionContent;
  programs: ProgramContent[];
}) {
  const authored = section.title.split('\n').filter(line => line.trim().length > 0);
  const lines = authored.length ? authored : profile.heroLines;
  const featured = programs.slice(0, 2);

  return (
    <section className="hero-editorial" aria-labelledby="judul-hero" data-hero-root>
      <div className="shell-wide hero-editorial__inner">
        <div className="hero-editorial__masthead" data-hero="kicker">
          <p className="label">{section.eyebrow}</p>
          <span className="label hero-editorial__edition">Belajar / Berkarya / Berkembang</span>
        </div>
        <div className="hero-editorial__composition">
          <div className="hero-editorial__copy">
            <p className="label hero-editorial__school">{profile.schoolName}</p>
            <h1 id="judul-hero" className="hero-editorial__title display" data-hero="title">
              <span className="sr-only">{profile.schoolName} — {lines.join(' ')}</span>
              <span aria-hidden="true">
                {lines.map((line, index) => (
                  <span key={`${index}-${line}`} className={index > 0 ? 'hero-editorial__line hero-editorial__line--soft' : 'hero-editorial__line'} data-hero-line>{line}</span>
                ))}
              </span>
            </h1>
          </div>
          {featured.length > 0 ? (
            <div className="hero-editorial__index" data-hero="media">
              <div className="hero-editorial__index-heading label"><span>Jelajahi bidangmu</span><span aria-hidden="true">↗</span></div>
              {featured.map((program, index) => (
                <Link key={program.id} href={`/program-keahlian/${program.slug}`} className="hero-program">
                  <span className="hero-program__image">
                    <Image src={program.image || '/images/program-placeholder.svg'} alt="" fill priority={index === 0} sizes="(max-width: 767px) 40vw, 24vw" className="object-cover" />
                    {program.image.startsWith('/images/') ? <span className="hero-program__note label">Ilustrasi program</span> : null}
                  </span>
                  <span className="hero-program__caption"><span className="label">0{index + 1}</span><span>{program.name}</span><span aria-hidden="true">↗</span></span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
        <div className="hero-editorial__bottom">
          <p data-hero="action">{profile.tagline}</p>
          <div className="hero-editorial__actions" data-hero="action">
            <Link href={section.ctaHref || '/program-keahlian'} className="btn btn--paper">
              {section.ctaLabel || 'Lihat Program Keahlian'}<span className="btn__arrow" aria-hidden="true">→</span>
            </Link>
            <Link href="/tentang" className="link-line">Tentang Kami <span aria-hidden="true">↗</span></Link>
          </div>
          <a href="#program-keahlian" className="hero-editorial__scroll label" data-hero="indicator">Jelajahi <span aria-hidden="true">↓</span></a>
        </div>
      </div>
      <HeroMotion />
    </section>
  );
}
