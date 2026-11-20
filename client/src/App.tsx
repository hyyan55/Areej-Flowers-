import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { FIELDS } from "./fields";
import { STRINGS, type Lang } from "./i18n";
import { getPreset, type PresetId } from "./presets";
import { formatDate, PostCard, SocialLinks, type Post } from "./shared";
import { Admin } from "./Admin";
import { aboutImg, heroImg } from "./assets/images";


type View =
  | { name: "home" }
  | { name: "about" }
  | { name: "archive"; section: "writings" | "education" | "journal" }
  | { name: "article"; slug: string }
  | { name: "contact" }
  | { name: "admin" };

type Appearance = "light" | "dark";

const PAGE_SIZE = 9;

/* ---------------- Hash routing ----------------
   The app used to navigate by internal state only, so a direct link such as
   /contact always opened the homepage. These helpers keep the URL in sync
   with the current view (hash form, e.g. #/contact) and read it back on
   load, so direct links, refreshes, sharing and the back button all open
   the right page. Plain paths (/contact) are accepted too and normalised
   to the hash form on first load.
   A Supabase password-recovery fragment (#access_token=...&type=recovery)
   is never treated as a route: it opens the admin view so the reset form
   shows, and the URL is never rewritten while it is present. */

function viewToHash(v: View): string {
  switch (v.name) {
    case "home":
      return "#/";
    case "about":
      return "#/about";
    case "archive":
      return v.section === "education" ? "#/educational" : `#/${v.section}`;
    case "article":
      return `#/article/${encodeURIComponent(v.slug)}`;
    case "contact":
      return "#/contact";
    case "admin":
      return "#/admin";
  }
}

function isRecoveryHash(hash: string): boolean {
  return hash.includes("access_token=") || hash.includes("type=recovery");
}

function viewFromLocation(): View | null {
  const hash = window.location.hash;
  if (isRecoveryHash(hash)) return { name: "admin" };
  const raw = hash.startsWith("#") ? hash.slice(1) : "";
  const path = raw || window.location.pathname;
  const parts = path
    .split("/")
    .filter(Boolean)
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return p;
      }
    });
  if (parts.length === 0) return { name: "home" };
  const [first, second] = parts;
  switch (first) {
    case "about":
      return { name: "about" };
    case "writings":
      return { name: "archive", section: "writings" };
    case "education":
    case "educational":
      return { name: "archive", section: "education" };
    case "journal":
      return { name: "archive", section: "journal" };
    case "article":
      return second ? { name: "article", slug: second } : null;
    case "contact":
      return { name: "contact" };
    case "admin":
      return { name: "admin" };
    default:
      return null;
  }
}

function sameView(a: View, b: View): boolean {
  return viewToHash(a) === viewToHash(b);
}

export function App() {
  const site = useQuery({ queryKey: ["site"], queryFn: () => api.getSite({}) });
  const bootRef = useRef(false);
  useEffect(() => {
    if (!bootRef.current) {
      bootRef.current = true;
      void api.bootstrap({}).catch(() => undefined);
    }
  }, []);

  const settings = site.data?.settings;
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("areej-lang");
    return saved === "en" || saved === "ar" ? saved : "ar";
  });
  const [appearance, setAppearance] = useState<Appearance>(() => {
    const saved = localStorage.getItem("areej-appearance");
    return saved === "dark" || saved === "light" ? saved : "light";
  });
  const [langInit, setLangInit] = useState(false);
  useEffect(() => {
    if (settings && !langInit) {
      setLangInit(true);
      const saved = localStorage.getItem("areej-lang");
      if (!saved) setLang(settings.default_language === "en" ? "en" : "ar");
      const savedApp = localStorage.getItem("areej-appearance");
      if (!savedApp) setAppearance(settings.appearance_default === "dark" ? "dark" : "light");
    }
  }, [settings, langInit]);

  const [view, setView] = useState<View>(() => viewFromLocation() ?? { name: "home" });
  const viewRef = useRef(view);
  const [menuOpen, setMenuOpen] = useState(false);
  // Design Studio live preview (not saved)
  const [preview, setPreview] = useState<{
    preset: PresetId;
    primary: string | null;
    secondary: string | null;
    bg: string | null;
    accentBlue: string | null;
    gray: string | null;
  } | null>(null);

  const t = STRINGS[lang];
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    localStorage.setItem("areej-lang", lang);
    document.title =
      view.name === "admin"
        ? `${t.admin} — ${settings?.site_name ?? "Areej Flowers"}`
        : (settings?.seo_title || settings?.site_name || "Areej Flowers");
  }, [lang, view.name, settings, t.admin]);

  useEffect(() => {
    localStorage.setItem("areej-appearance", appearance);
  }, [appearance]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setMenuOpen(false);
  }, [view]);

  const presetId = preview?.preset ?? ((settings?.theme_preset as PresetId) || "lavender");
  const preset = getPreset(presetId);
  const vars = useMemo(() => {
    const baseVars = { ...(appearance === "dark" ? preset.dark : preset.light) } as Record<string, string>;
    const primary = preview ? preview.primary : settings?.custom_primary;
    const secondary = preview ? preview.secondary : settings?.custom_secondary;
    const bg = preview ? preview.bg : settings?.custom_bg;
    const accentBlue = preview ? preview.accentBlue : settings?.custom_accent_blue;
    const gray = preview ? preview.gray : settings?.custom_gray;
    if (primary) baseVars["--accent"] = primary;
    if (secondary) baseVars["--accent2"] = secondary;
    if (bg) baseVars["--bg"] = bg;
    if (accentBlue) baseVars["--accent3"] = accentBlue;
    if (gray) baseVars["--neutral"] = gray;
    return baseVars;
  }, [preset, appearance, settings, preview]);

  useEffect(() => {
    if (settings?.favicon_url) {
      let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = settings.favicon_url;
    }
  }, [settings?.favicon_url]);

  // Every view change goes through `go`, which also writes the URL so the
  // page is shareable, refreshable and reachable by direct link.
  const go = (v: View) => {
    if (sameView(v, viewRef.current)) return;
    viewRef.current = v;
    setView(v);
    const h = viewToHash(v);
    if (window.location.hash !== h) window.history.pushState(null, "", h);
  };
  const nav = (v: View) => go(v);
  const openPost = (slug: string) => go({ name: "article", slug });

  // First load: a plain path such as /contact is rewritten to its hash
  // form (#/contact) so a refresh keeps the same page. Recovery fragments
  // are never touched.
  useEffect(() => {
    const hash = window.location.hash;
    if (isRecoveryHash(hash)) return;
    if (!hash && window.location.pathname !== "/") {
      window.history.replaceState(null, "", viewToHash(viewRef.current));
    }
  }, []);

  // Back/forward buttons and manual URL edits.
  useEffect(() => {
    const onRoute = () => {
      const v = viewFromLocation();
      if (v && !sameView(v, viewRef.current)) {
        viewRef.current = v;
        setView(v);
      }
    };
    window.addEventListener("hashchange", onRoute);
    window.addEventListener("popstate", onRoute);
    return () => {
      window.removeEventListener("hashchange", onRoute);
      window.removeEventListener("popstate", onRoute);
    };
  }, []);

  const headerIdentity = settings?.header_identity ?? "text";
  const headerImg =
    headerIdentity === "logo" ? settings?.logo_url : headerIdentity === "photo" ? settings?.photo_url : null;

  const navItems: { label: string; v: View; active: boolean }[] = [
    { label: t.home, v: { name: "home" }, active: view.name === "home" },
    { label: t.writings, v: { name: "archive", section: "writings" }, active: view.name === "archive" && view.section === "writings" },
    { label: t.education, v: { name: "archive", section: "education" }, active: view.name === "archive" && view.section === "education" },
    { label: t.journal, v: { name: "archive", section: "journal" }, active: view.name === "archive" && view.section === "journal" },
    { label: t.about, v: { name: "about" }, active: view.name === "about" },
    { label: t.contact, v: { name: "contact" }, active: view.name === "contact" },
  ];

  if (site.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F8F3FA" }}>
        <p className="text-lg font-bold" style={{ color: "#79509B" }}>Areej Flowers…</p>
      </div>
    );
  }
  if (site.error || !site.data || !settings) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#F8F3FA" }}>
        <p>{t.loadError}</p>
      </div>
    );
  }

  const { profile, categories } = site.data;

  return (
    <div
      className="app-root"
      data-preset={presetId}
      dir={dir}
      lang={lang}
      style={vars as React.CSSProperties}
    >
      <header
        className="site-header sticky top-0 z-40 pt-safe"
        style={{ background: "var(--header-bg)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-3 py-2.5">
          <button
            type="button"
            onClick={() => nav({ name: "home" })}
            className="flex items-center gap-2.5 p-0 shrink-0"
            aria-label={settings.site_name}
            style={{ minHeight: 0 }}
          >
            {headerImg ? (
              <img
                src={headerImg}
                alt={settings.site_name}
                className={headerIdentity === "photo" ? "w-10 h-10 rounded-full object-cover" : "h-10 w-auto object-contain"}
              />
            ) : null}
            <span className="font-display text-xl font-extrabold" style={{ color: "var(--accent)" }}>
              {settings.site_name}
            </span>
          </button>
          <nav className="hidden lg:flex items-center gap-5 mx-auto" aria-label="Main">
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => nav(item.v)}
                className={`nav-link ${item.active ? "nav-link-active" : ""}`}
                style={{ minHeight: 0 }}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-1.5 ms-auto lg:ms-0">
            <button
              type="button"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="btn-ghost px-3 py-1.5 text-sm"
              aria-label="Language / اللغة"
            >
              {t.language}
            </button>
            <button
              type="button"
              onClick={() => setAppearance(appearance === "dark" ? "light" : "dark")}
              className="btn-ghost px-3 py-1.5 text-sm"
              aria-label={appearance === "dark" ? t.lightMode : t.darkMode}
            >
              {appearance === "dark" ? "☀" : "☾"}
            </button>
            <button
              type="button"
              className="btn-ghost px-3 py-1.5 text-sm lg:hidden"
              aria-label={menuOpen ? t.close : t.menu}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>
        {menuOpen ? (
          <nav className="lg:hidden slide-down px-4 pb-4 flex flex-col gap-1" aria-label="Mobile" style={{ background: "var(--header-bg)" }}>
            {navItems.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => nav(item.v)}
                className={`text-start px-3 py-2.5 rounded-lg font-semibold ${item.active ? "" : "dim"}`}
                style={item.active ? { background: "var(--surface2)", color: "var(--accent)" } : undefined}
              >
                {item.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => nav({ name: "admin" })}
              className="text-start px-3 py-2.5 rounded-lg font-semibold dim"
            >
              {t.admin}
            </button>
          </nav>
        ) : null}
      </header>

      <main>
        {view.name === "home" && (
          <HomePage
            t={t}
            lang={lang}
            settings={settings}
            profile={profile}
            onOpen={openPost}
            onNav={nav}
          />
        )}
        {view.name === "about" && <AboutPage t={t} lang={lang} settings={settings} profile={profile} />}
        {view.name === "archive" && (
          <ArchivePage
            key={view.section}
            t={t}
            lang={lang}
            section={view.section}
            categories={categories}
            onOpen={openPost}
          />
        )}
        {view.name === "article" && (
          <ArticlePage t={t} lang={lang} slug={view.slug} onOpen={openPost} onNav={nav} />
        )}
        {view.name === "contact" && <ContactPage t={t} settings={settings} />}
        {view.name === "admin" && (
          <Admin
            t={t}
            lang={lang}
            site={site.data}
            appearance={appearance}
            onAppearanceChange={setAppearance}
            preview={preview}
            onPreviewChange={setPreview}
            onExit={() => nav({ name: "home" })}
          />
        )}
      </main>

      {view.name !== "admin" && (
        <footer className="site-footer mt-0" style={{ background: "var(--footer-bg)", color: "var(--footer-text)" }}>
          <div className="max-w-6xl mx-auto px-4 py-10 grid gap-8 md:grid-cols-3">
            <div>
              <p className="font-display text-2xl font-extrabold">{settings.site_name}</p>
              <p className="mt-2 text-sm opacity-85 leading-relaxed">
                {lang === "ar" ? settings.tagline_ar : settings.tagline_en}
              </p>
              <SocialLinks links={settings.social_links} t={t} className="mt-4" />
            </div>
            <nav className="flex flex-col gap-2 text-sm" aria-label="Footer">
              {navItems.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => nav(item.v)}
                  className="text-start p-0 opacity-90 hover:opacity-100"
                  style={{ minHeight: 0, color: "inherit" }}
                >
                  {item.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => nav({ name: "admin" })}
                className="text-start p-0 opacity-70"
                style={{ minHeight: 0, color: "inherit" }}
              >
                {t.admin}
              </button>
            </nav>
            <div className="text-sm leading-relaxed opacity-90">
              <p className="font-bold">{profile.full_name_ar}</p>
              <p>{profile.profession}</p>
              <p>{profile.city}</p>
              {settings.contact_email ? <p dir="ltr" className="text-end md:text-start">{settings.contact_email}</p> : null}
            </div>
          </div>
          <div className="border-t border-white/15">
            <p className="max-w-6xl mx-auto px-4 py-4 text-xs opacity-75">
              {settings.footer_text || `${settings.site_name} — ${lang === "ar" ? settings.tagline_ar : settings.tagline_en}`}{" "}
              · © {new Date().getFullYear()} {t.footerRights}
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}

/* ---------------- Home ---------------- */

function HomePage({
  t, lang, settings, profile, onOpen, onNav,
}: {
  t: (typeof STRINGS)["ar"];
  lang: Lang;
  settings: ApiSettings;
  profile: ApiProfile;
  onOpen: (slug: string) => void;
  onNav: (v: View) => void;
}) {
  const featured = useQuery({
    queryKey: ["posts", "featured"],
    queryFn: () => api.listPosts({ featured_only: true, limit: 1 }),
  });
  const latest = useQuery({
    queryKey: ["posts", "latest"],
    queryFn: () => api.listPosts({ limit: 6 }),
  });
  const edu = useQuery({
    queryKey: ["posts", "education", 3],
    queryFn: () => api.listPosts({ section: "education", limit: 3 }),
  });
  const writings = useQuery({
    queryKey: ["posts", "writings", 3],
    queryFn: () => api.listPosts({ section: "writings", limit: 3 }),
  });
  const featuredPost: Post | undefined = featured.data?.posts[0];
  const photoUrl = settings.photo_url;

  return (
    <div>
      {/* Hero */}
      <section className="hero-rule">
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-8 items-center" style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)" }}>
          <div className="fade-up">
            <h1 className="font-display font-extrabold leading-tight" style={{ fontSize: "clamp(2.4rem, 7vw, 4rem)", color: "var(--accent)" }}>
              {settings.site_name}
            </h1>
            <p className="font-display text-2xl md:text-3xl font-bold mt-3 leading-relaxed">
              {lang === "ar" ? settings.tagline_ar : settings.tagline_en}
            </p>
            <p className="dim mt-4 leading-loose max-w-md">{t.heroIntro}</p>
            <div className="flex flex-wrap gap-3 mt-6">
              <button type="button" className="btn-primary px-6 py-3" onClick={() => onNav({ name: "archive", section: "writings" })}>
                {t.discoverWritings}
              </button>
              <button type="button" className="btn-ghost px-6 py-3" onClick={() => onNav({ name: "about" })}>
                {t.meetAreej}
              </button>
            </div>
            <SocialLinks links={settings.social_links} t={t} className="mt-6" />
          </div>
          <div className="fade-up fade-up-1">
            {photoUrl ? (
              <img src={photoUrl} alt={profile.full_name_ar} className="w-full max-h-[480px] object-cover" style={{ borderRadius: "var(--radius)", boxShadow: "var(--shadow)" }} />
            ) : (
              <img src={heroImg} alt="" className="w-full max-h-[480px] object-cover" style={{ borderRadius: "var(--radius)", boxShadow: "var(--shadow)" }} />
            )}
          </div>
        </div>
      </section>

      {/* Featured */}
      {featuredPost ? (
        <section className="max-w-6xl mx-auto px-4" style={{ paddingBottom: "var(--space-section)" }}>
          <h2 className="font-display text-2xl font-extrabold mb-5" style={{ color: "var(--accent)" }}>{t.featured}</h2>
          <article className="card overflow-hidden md:grid md:grid-cols-2 fade-up">
            {featuredPost.cover_url ? (
              <img src={featuredPost.cover_url} alt={featuredPost.title} className="w-full h-64 md:h-full object-cover" />
            ) : (
              <img src={aboutImg} alt="" className="w-full h-64 md:h-full object-cover" />
            )}
            <div className="p-6 md:p-8 flex flex-col gap-3">
              <div className="flex flex-wrap gap-2 text-xs dim">
                {featuredPost.category_name ? <span className="font-bold" style={{ color: "var(--accent)" }}>{featuredPost.category_name}</span> : null}
                {featuredPost.is_sample ? <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: "var(--accent2)", color: "#49305F" }}>{t.sampleBadge}</span> : null}
                <span>{formatDate(featuredPost.published_at, lang)}</span>
                <span>· {featuredPost.reading_minutes} {t.minRead}</span>
              </div>
              <h3 className="font-display text-2xl md:text-3xl font-extrabold leading-snug">{featuredPost.title}</h3>
              <p className="dim leading-loose">{featuredPost.excerpt}</p>
              <div className="mt-auto pt-3">
                <button type="button" className="btn-primary px-5 py-2.5" onClick={() => onOpen(featuredPost.slug)}>
                  {t.readArticle}
                </button>
              </div>
            </div>
          </article>
        </section>
      ) : null}

      {/* Latest */}
      <section className="surface2" style={{ background: "var(--surface2)" }}>
        <div className="max-w-6xl mx-auto px-4" style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)" }}>
          <div className="flex items-end justify-between mb-6">
            <h2 className="font-display text-2xl font-extrabold" style={{ color: "var(--accent)" }}>{t.latest}</h2>
            <button type="button" className="font-bold text-sm p-0" style={{ color: "var(--accent)", minHeight: 0 }} onClick={() => onNav({ name: "archive", section: "writings" })}>
              {t.viewAll}
            </button>
          </div>
          {latest.isPending ? <p className="dim">{t.loading}</p> : latest.data && latest.data.posts.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {latest.data.posts.map((p) => (
                <PostCard key={p.id} post={p} t={t} lang={lang} onOpen={onOpen} />
              ))}
            </div>
          ) : (
            <p className="dim">{t.noPosts}</p>
          )}
        </div>
      </section>

      {/* Education */}
      {edu.data && edu.data.posts.length > 0 ? (
        <section className="max-w-6xl mx-auto px-4" style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)" }}>
          <div className="flex items-end justify-between mb-1">
            <h2 className="font-display text-2xl font-extrabold" style={{ color: "var(--accent3)" }}>{t.eduSection}</h2>
            <button type="button" className="font-bold text-sm p-0" style={{ color: "var(--accent3)", minHeight: 0 }} onClick={() => onNav({ name: "archive", section: "education" })}>
              {t.viewAll}
            </button>
          </div>
          <p className="dim mb-6">{t.eduSectionSub}</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {edu.data.posts.map((p) => (
              <PostCard key={p.id} post={p} t={t} lang={lang} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Philosophy */}
      {profile.philosophy ? (
        <section style={{ background: "var(--accent)" }}>
          <div className="max-w-4xl mx-auto px-4 text-center" style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)", color: "var(--accent-ink)" }}>
            <p className="text-sm font-bold tracking-wide opacity-80">{t.philosophyTitle}</p>
            <blockquote className="font-display text-2xl md:text-3xl font-bold leading-relaxed mt-4">
              «{profile.philosophy}»
            </blockquote>
            <p className="mt-4 font-bold opacity-90">{lang === "en" && profile.full_name_en ? profile.full_name_en : profile.full_name_ar}</p>
          </div>
        </section>
      ) : null}

      {/* Writings */}
      {writings.data && writings.data.posts.length > 0 ? (
        <section className="max-w-6xl mx-auto px-4" style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)" }}>
          <div className="flex items-end justify-between mb-1">
            <h2 className="font-display text-2xl font-extrabold" style={{ color: "var(--accent)" }}>{t.writingsSection}</h2>
            <button type="button" className="font-bold text-sm p-0" style={{ color: "var(--accent)", minHeight: 0 }} onClick={() => onNav({ name: "archive", section: "writings" })}>
              {t.viewAll}
            </button>
          </div>
          <p className="dim mb-6">{t.writingsSectionSub}</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {writings.data.posts.map((p) => (
              <PostCard key={p.id} post={p} t={t} lang={lang} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ) : null}

      {/* About preview */}
      <section style={{ background: "var(--surface2)" }}>
        <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-8 items-center" style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)" }}>
          <img src={photoUrl ?? aboutImg} alt={profile.full_name_ar} className="w-full max-h-96 object-cover" style={{ borderRadius: "var(--radius)", boxShadow: "var(--shadow)" }} loading="lazy" />
          <div>
            <h2 className="font-display text-2xl font-extrabold" style={{ color: "var(--accent)" }}>{t.aboutPreview}</h2>
            <p className="font-display text-xl font-bold mt-3">{lang === "en" && profile.full_name_en ? profile.full_name_en : profile.full_name_ar}</p>
            <p className="dim mt-1">{profile.academic_level} — {profile.university}</p>
            <p className="mt-3 leading-loose">{profile.bio}</p>
            <button type="button" className="btn-primary px-5 py-2.5 mt-5" onClick={() => onNav({ name: "about" })}>
              {t.meetAreej}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

type ApiSettings = import("./shared").Settings;
type ApiProfile = import("./shared").Profile;
type ApiCategory = import("./shared").Category;

/* ---------------- About ---------------- */

function AboutPage({ t, lang, settings, profile }: { t: (typeof STRINGS)["ar"]; lang: Lang; settings: ApiSettings; profile: ApiProfile }) {
  const name = lang === "en" && profile.full_name_en ? profile.full_name_en : profile.full_name_ar;
  const facts: { label: string; value: string }[] = [
    { label: t.university, value: profile.university },
    { label: t.academicLevel, value: profile.academic_level },
    { label: t.city, value: profile.city },
    { label: t.profession, value: profile.profession },
  ].filter((f) => f.value.trim());
  return (
    <div className="max-w-4xl mx-auto px-4" style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)" }}>
      <h1 className="font-display text-4xl font-extrabold fade-up" style={{ color: "var(--accent)" }}>{t.aboutTitle}</h1>
      <div className="grid md:grid-cols-[280px_1fr] gap-8 mt-8 items-start">
        <img
          src={settings.photo_url ?? aboutImg}
          alt={name}
          className="w-full max-h-[420px] object-cover fade-up"
          style={{ borderRadius: "var(--radius)", boxShadow: "var(--shadow)" }}
        />
        <div className="fade-up fade-up-1">
          <h2 className="font-display text-3xl font-extrabold">{name}</h2>
          {profile.bio ? <p className="mt-4 leading-loose text-lg">{profile.bio}</p> : null}
          <dl className="mt-6 grid gap-3">
            {facts.map((f) => (
              <div key={f.label} className="flex flex-wrap gap-2 border-b bordered pb-2" style={{ borderColor: "var(--border)" }}>
                <dt className="font-bold" style={{ color: "var(--accent)" }}>{f.label}:</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
          <SocialLinks links={settings.social_links} t={t} className="mt-6" />
        </div>
      </div>
      {profile.academic_journey ? (
        <section className="mt-12 fade-up">
          <h3 className="font-display text-2xl font-extrabold mb-3" style={{ color: "var(--accent)" }}>{t.academicJourney}</h3>
          <p className="leading-loose whitespace-pre-line">{profile.academic_journey}</p>
        </section>
      ) : null}
      {profile.writing_interests ? (
        <section className="mt-10 fade-up">
          <h3 className="font-display text-2xl font-extrabold mb-3" style={{ color: "var(--accent)" }}>{t.writingInterests}</h3>
          <p className="leading-loose whitespace-pre-line">{profile.writing_interests}</p>
        </section>
      ) : null}
      {profile.education_interests ? (
        <section className="mt-10 fade-up">
          <h3 className="font-display text-2xl font-extrabold mb-3" style={{ color: "var(--accent)" }}>{t.educationInterests}</h3>
          <p className="leading-loose whitespace-pre-line">{profile.education_interests}</p>
        </section>
      ) : null}
      {profile.philosophy ? (
        <section className="mt-12 card p-6 md:p-8 text-center fade-up">
          <p className="text-sm font-bold dim">{t.philosophyTitle}</p>
          <blockquote className="font-display text-2xl font-bold leading-relaxed mt-3">«{profile.philosophy}»</blockquote>
        </section>
      ) : null}
    </div>
  );
}

/* ---------------- Archive ---------------- */

function ArchivePage({
  t, lang, section, categories, onOpen,
}: {
  t: (typeof STRINGS)["ar"];
  lang: Lang;
  section: "writings" | "education" | "journal";
  categories: ApiCategory[];
  onOpen: (slug: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(id);
  }, [search]);
  useEffect(() => setVisible(PAGE_SIZE), [debounced, categoryId, section]);

  const query = useQuery({
    queryKey: ["posts", "archive", section, categoryId, debounced],
    queryFn: () =>
      api.listPosts({
        section,
        category_id: categoryId ?? undefined,
        search: debounced || undefined,
        limit: 60,
      }),
  });
  const sectionCats = categories.filter((c) => c.section === section || c.section === "general");
  const title = section === "writings" ? t.writings : section === "education" ? t.education : t.journal;
  const intro = section === "writings" ? t.writingsIntro : section === "education" ? t.educationIntro : t.journalIntro;
  const posts = query.data?.posts ?? [];
  const shown = posts.slice(0, visible);

  return (
    <div className="max-w-6xl mx-auto px-4" style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)" }}>
      <h1 className="font-display text-4xl font-extrabold fade-up" style={{ color: "var(--accent)" }}>{title}</h1>
      <p className="dim mt-3 max-w-2xl leading-loose fade-up">{intro}</p>
      <div className="mt-8 flex flex-col gap-4">
        <div className="max-w-md w-full">
          <label htmlFor="archive-search" className="label">{t.searchLabel}</label>
          <input
            id="archive-search"
            className="input"
            {...FIELDS.listPosts.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
          />
        </div>
        {sectionCats.length > 0 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label={t.category}>
            <button
              type="button"
              className={`chip px-4 py-2 text-sm ${categoryId === null ? "chip-active" : ""}`}
              onClick={() => setCategoryId(null)}
            >
              {t.allCategories}
            </button>
            {sectionCats.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip px-4 py-2 text-sm ${categoryId === c.id ? "chip-active" : ""}`}
                onClick={() => setCategoryId(c.id)}
              >
                {c.name}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <div className="mt-8">
        {query.isPending ? (
          <p className="dim">{t.loading}</p>
        ) : posts.length === 0 ? (
          <p className="dim">{debounced || categoryId ? t.noResults : t.noPosts}</p>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((p) => (
                <PostCard key={p.id} post={p} t={t} lang={lang} onOpen={onOpen} />
              ))}
            </div>
            {visible < posts.length ? (
              <div className="text-center mt-10">
                <button type="button" className="btn-ghost px-8 py-3" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                  {t.loadMore}
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Article ---------------- */

function ArticlePage({
  t, lang, slug, onOpen, onNav,
}: {
  t: (typeof STRINGS)["ar"];
  lang: Lang;
  slug: string;
  onOpen: (slug: string) => void;
  onNav: (v: View) => void;
}) {
  const query = useQuery({ queryKey: ["post", slug], queryFn: () => api.getPost({ slug }) });
  const [shared, setShared] = useState(false);
  const post = query.data?.post;

  useEffect(() => {
    if (post) document.title = post.seo_title || post.title;
  }, [post]);

  if (query.isPending) return <p className="dim text-center py-20">{t.loading}</p>;
  if (!post) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <p className="text-lg">{t.notFound}</p>
        <button type="button" className="btn-primary px-5 py-2.5 mt-5" onClick={() => onNav({ name: "home" })}>
          {t.home}
        </button>
      </div>
    );
  }
  const sectionLabel = post.section === "writings" ? t.writings : post.section === "education" ? t.education : t.journal;

  const doShare = async () => {
    const shareData = { title: post.title, text: post.excerpt || post.title };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        /* dismissed */
      }
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(`${post.title} — ${post.excerpt}`);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4" style={{ paddingTop: "calc(var(--space-section) * 0.7)", paddingBottom: "var(--space-section)" }}>
      <button
        type="button"
        className="font-bold text-sm p-0 dim"
        style={{ minHeight: 0 }}
        onClick={() => onNav({ name: "archive", section: post.section as "writings" | "education" | "journal" })}
      >
        {t.backTo} {sectionLabel}
      </button>
      <article className="mt-6 fade-up">
        <div className="flex flex-wrap items-center gap-2 text-sm dim">
          {post.category_name ? (
            <span
              className="px-2.5 py-0.5 rounded-full font-bold"
              style={
                post.section === "education"
                  ? { background: "var(--accent3-soft)", color: "var(--accent3)" }
                  : { background: "var(--surface2)", color: "var(--accent)" }
              }
            >
              {post.category_name}
            </span>
          ) : null}
          {post.is_sample ? (
            <span className="px-2.5 py-0.5 rounded-full font-bold" style={{ background: "var(--accent2)", color: "#49305F" }}>
              {t.sampleBadge}
            </span>
          ) : null}
          <span>{formatDate(post.published_at, lang)}</span>
          <span>· {post.reading_minutes} {t.minRead}</span>
        </div>
        <h1 className="font-display text-3xl md:text-[2.6rem] font-extrabold leading-snug mt-4">{post.title}</h1>
        {post.author_name ? (
          <p className="dim mt-3">
            {t.by} <span className="font-bold" style={{ color: "var(--accent)" }}>{post.author_name}</span>
          </p>
        ) : null}
        {post.cover_url ? (
          <img src={post.cover_url} alt={post.title} className="w-full max-h-[420px] object-cover mt-6" style={{ borderRadius: "var(--radius)", boxShadow: "var(--shadow)" }} />
        ) : null}
        <div className="prose-areej mt-8" dangerouslySetInnerHTML={{ __html: post.content }} />
        <div className="mt-10 pt-6 flex items-center gap-3" style={{ borderTop: "1px solid var(--border)" }}>
          <button type="button" className="btn-ghost px-5 py-2" onClick={doShare}>
            {shared ? t.copied : t.share}
          </button>
        </div>
      </article>
      {query.data && query.data.related.length > 0 ? (
        <section className="mt-14">
          <h2 className="font-display text-2xl font-extrabold mb-5" style={{ color: "var(--accent)" }}>{t.related}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.related.map((p) => (
              <PostCard key={p.id} post={p} t={t} lang={lang} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* ---------------- Contact ---------------- */

function ContactPage({ t, settings }: { t: (typeof STRINGS)["ar"]; settings: ApiSettings }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => await api.submitMessage({ name, subject, body, website }),
    onSuccess: () => {
      setSent(true);
      setName(""); setSubject(""); setBody("");
      void queryClient.invalidateQueries();
    },
    onError: (e) =>
      setError(e instanceof Error && e.message.includes("RATE_LIMIT") ? t.tooManyMessages : t.messageError),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError(t.nameRequired);
    if (subject.trim().length < 2) return setError(t.subjectRequired);
    if (body.trim().length < 5) return setError(t.messageShort);
    mutation.mutate();
  };

  return (
    <div className="max-w-2xl mx-auto px-4" style={{ paddingTop: "var(--space-section)", paddingBottom: "var(--space-section)" }}>
      <h1 className="font-display text-4xl font-extrabold fade-up" style={{ color: "var(--accent)" }}>{t.contactTitle}</h1>
      <p className="dim mt-3 leading-loose fade-up">{t.contactIntro}</p>
      <SocialLinks links={settings.social_links} t={t} className="mt-5" />
      {sent ? (
        <div className="card p-6 mt-8 text-center fade-in" role="status">
          <p className="font-bold text-lg" style={{ color: "var(--accent)" }}>{t.messageSent}</p>
        </div>
      ) : (
        <form onSubmit={submit} className="card p-6 mt-8 grid gap-4 fade-up" noValidate>
          <div>
            <label htmlFor="c-name" className="label">{t.yourName} *</label>
            <input id="c-name" className="input" {...FIELDS.submitMessage.name} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="c-subject" className="label">{t.subject} *</label>
            <input id="c-subject" className="input" {...FIELDS.submitMessage.subject} value={subject} onChange={(e) => setSubject(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="c-body" className="label">{t.message} *</label>
            <textarea id="c-body" className="input" rows={6} {...FIELDS.submitMessage.body} value={body} onChange={(e) => setBody(e.target.value)} required />
          </div>
          {/* Honeypot: hidden from people, filled only by bots; the server discards those submissions. */}
          <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}>
            <label htmlFor="c-website">Website</label>
            <input
              id="c-website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              {...FIELDS.submitMessage.website}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>
          {error ? <p className="text-sm font-bold" style={{ color: "#B3261E" }} role="alert">{error}</p> : null}
          <button type="submit" className="btn-primary px-6 py-3" disabled={mutation.isPending}>
            {mutation.isPending ? t.sending : t.send}
          </button>
        </form>
      )}
    </div>
  );
}
