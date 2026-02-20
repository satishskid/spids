import { useEffect } from "react";
import "./website.css";

function upsertMeta(attribute: "name" | "property", key: string, content: string): void {
  let tag = document.head.querySelector(`meta[${attribute}="${key}"]`) as HTMLMetaElement | null;
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export function SkidsWebsite() {
  useEffect(() => {
    document.title = "SKIDS | Child Growth Intelligence Platform";
    upsertMeta(
      "name",
      "description",
      "SKIDS is a B2B2C child growth platform connecting parents, schools, and clinics through screening, milestone intelligence, and continuous pediatric guidance."
    );
    upsertMeta("property", "og:title", "SKIDS | Child Growth Intelligence Platform");
    upsertMeta(
      "property",
      "og:description",
      "One platform for schools, clinics, and parents to improve child development outcomes with science-led screening and trusted guidance."
    );
  }, []);

  return (
    <main className="skids-site">
      <header className="site-nav">
        <a className="site-logo" href="/">
          SKIDS
        </a>
        <nav>
          <a href="#platform">Platform</a>
          <a href="#audiences">Who We Serve</a>
          <a href="#investors">Investors</a>
          <a href="/blog/">Insights</a>
        </nav>
        <div className="site-nav-actions">
          <a className="ghost-link" href="/parent">
            Open Parent App
          </a>
          <a className="primary-link" href="#contact">
            Request Demo
          </a>
        </div>
      </header>

      <section className="hero">
        <p className="hero-kicker">B2B2C Child Health Platform</p>
        <h1>One SKIDS for parents, schools, and clinics.</h1>
        <p className="hero-copy">
          We help families understand development early, help schools run structured screening programs, and help clinics
          convert observations into longitudinal pediatric records.
        </p>
        <div className="hero-ctas">
          <a className="primary-link" href="/parent">
            Start Parent Journey
          </a>
          <a className="ghost-link" href="/blog/">
            View Knowledge Library
          </a>
        </div>
      </section>

      <section className="section" id="platform">
        <h2>Platform Architecture</h2>
        <div className="grid three">
          <article className="tile">
            <h3>1. School Screening</h3>
            <p>
              Early identification workflows, class-level developmental views, and referral pathways that align schools
              with clinical follow-up.
            </p>
          </article>
          <article className="tile">
            <h3>2. Clinic Intelligence</h3>
            <p>
              Structured observations and report appends, so each encounter builds context instead of starting from
              scratch.
            </p>
          </article>
          <article className="tile">
            <h3>3. Parent Companion</h3>
            <p>
              Milestone wall, daily body-wonder nudges, and empathetic chat guidance. Not diagnostic, but always
              pediatric-safe.
            </p>
          </article>
        </div>
      </section>

      <section className="section soft" id="audiences">
        <h2>Who We Serve</h2>
        <div className="grid three">
          <article className="tile">
            <p className="tile-label">Parents</p>
            <h3>Confidence + continuity</h3>
            <p>
              Understand what matters at your child&apos;s age, ask questions anytime, and export a clean health summary for
              checkups.
            </p>
          </article>
          <article className="tile">
            <p className="tile-label">Schools</p>
            <h3>Screen at scale</h3>
            <p>
              Structured developmental checks with clear escalation logic, so schools can support children and families
              earlier.
            </p>
          </article>
          <article className="tile">
            <p className="tile-label">Clinics</p>
            <h3>See the full story</h3>
            <p>
              Parent observations + school context + clinic reports in one timeline to improve quality of pediatric
              decision-making.
            </p>
          </article>
        </div>
      </section>

      <section className="section">
        <h2>Trust, Safety, and Medical Positioning</h2>
        <div className="grid two">
          <article className="tile">
            <h3>Program positioning</h3>
            <ul>
              <li>Parent support and involvement program.</li>
              <li>Not a diagnostic or emergency care tool.</li>
              <li>Explicit escalation guidance for pediatric review.</li>
            </ul>
          </article>
          <article className="tile">
            <h3>Evidence posture</h3>
            <ul>
              <li>Milestone guidance aligned to CDC/AAP/IAP screening cadence.</li>
              <li>Citation-first responses with confidence/uncertainty tags.</li>
              <li>Passive longitudinal record for clinician encounters.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="section soft" id="investors">
        <h2>Investor View</h2>
        <div className="grid two">
          <article className="tile">
            <h3>B2B2C flywheel</h3>
            <p>
              School and clinic adoption drives parent engagement. Parent data improves encounter quality. Better
              outcomes strengthen institutional retention.
            </p>
          </article>
          <article className="tile">
            <h3>Defensibility</h3>
            <p>
              Pediatric protocol layer, cross-context child timeline, and AI quality controls designed for high-trust
              guidance at scale.
            </p>
          </article>
        </div>
      </section>

      <section className="section" id="contact">
        <h2>Launch Tracks</h2>
        <div className="grid two">
          <article className="tile">
            <h3>Track A: Parent App</h3>
            <p>Calm UI, reliable blog media, and trustworthy milestone + chat workflow for daily parent use.</p>
            <a className="primary-link inline" href="/parent">
              Open Parent App
            </a>
          </article>
          <article className="tile">
            <h3>Track B: Unified SKIDS Site</h3>
            <p>Single narrative for parents, schools, clinics, and investors with conversion-ready SEO architecture.</p>
            <a className="ghost-link inline" href="/blog/">
              Read SKIDS Insights
            </a>
          </article>
        </div>
      </section>
    </main>
  );
}

