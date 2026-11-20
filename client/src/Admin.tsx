import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ADMIN_USERNAME, api } from "./api";
import { FIELDS } from "./fields";
import { SOCIAL_PLATFORMS, type Dict, type Lang } from "./i18n";
import { PRESETS, type PresetId } from "./presets";
import {
buildDailySeries,
formatDate,
formatDateTime,
uploadImageFile,
type MediaItem,
type Post,
type SiteData,
} from "./shared";


export interface DesignPreview {
  preset: PresetId;
  primary: string | null;
  secondary: string | null;
  bg: string | null;
  accentBlue: string | null;
  gray: string | null;
}

type Tab =
  | "overview" | "stats" | "posts" | "categories" | "about" | "media"
  | "branding" | "design" | "settings" | "messages" | "seo" | "security";

const TOKEN_KEY = "areej-admin-token";

export function Admin({
  t, lang, site, appearance, onAppearanceChange, preview, onPreviewChange, onExit,
}: {
  t: Dict;
  lang: Lang;
  site: SiteData;
  appearance: "light" | "dark";
  onAppearanceChange: (a: "light" | "dark") => void;
  preview: DesignPreview | null;
  onPreviewChange: (p: DesignPreview | null) => void;
  onExit: () => void;
}) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY));
  const [tab, setTab] = useState<Tab>("overview");
  const status = useQuery({ queryKey: ["admin-status"], queryFn: () => api.adminStatus({}) });
  const overview = useQuery({
    queryKey: ["overview", token ?? ""],
    queryFn: () => api.getAdminOverview({ token: token ?? "" }),
    enabled: !!token,
  });
  const unreadCount = overview.data?.unread_count ?? 0;
  const unreadBadge =
    unreadCount > 0 ? (
      <span
        className="ms-1.5 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-xs font-bold align-middle"
        style={{ background: "var(--accent3)", color: "#FFFFFF" }}
        aria-label={`${unreadCount} ${t.unread}`}
      >
        {unreadCount}
      </span>
    ) : null;

  if (!token) {
    return (
      <LoginCard
        t={t}
        configured={status.data?.configured ?? false}
        loading={status.isPending}
        onToken={(tok) => {
          sessionStorage.setItem(TOKEN_KEY, tok);
          setToken(tok);
        }}
      />
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: t.overview },
    { id: "stats", label: t.visitorStats },
    { id: "posts", label: t.postsMgmt },
    { id: "categories", label: t.categoriesMgmt },
    { id: "about", label: t.aboutMgmt },
    { id: "media", label: t.mediaLibrary },
    { id: "branding", label: t.branding },
    { id: "design", label: t.designStudio },
    { id: "settings", label: t.siteSettings },
    { id: "messages", label: t.messages },
    { id: "seo", label: t.seoSettings },
    { id: "security", label: t.security },
  ];

  const logout = async () => {
    try {
      await api.logoutAdmin({ token });
    } catch {
      /* ignore */
    }
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10">
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <h1 className="font-display text-3xl font-extrabold" style={{ color: "var(--accent)" }}>
          {t.admin}
        </h1>
        <span className="dim text-sm">{site.settings.site_name}</span>
        <div className="ms-auto flex gap-2">
          <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={onExit}>
            {t.home}
          </button>
          <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={() => void logout()}>
            {t.logout}
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6 lg:hidden" role="tablist" aria-label={t.admin}>
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            role="tab"
            aria-selected={tab === tb.id}
            className={`chip px-4 py-2 text-sm whitespace-nowrap ${tab === tb.id ? "chip-active" : ""}`}
            onClick={() => setTab(tb.id)}
          >
            {tb.label}
            {tb.id === "messages" ? unreadBadge : null}
          </button>
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-[220px_1fr] lg:gap-8 items-start">
        <nav className="hidden lg:flex flex-col gap-1 sticky top-24" aria-label={t.admin}>
          {tabs.map((tb) => (
            <button
              key={tb.id}
              type="button"
              className="text-start px-4 py-2.5 rounded-lg font-semibold"
              style={
                tab === tb.id
                  ? { background: "var(--surface2)", color: "var(--accent)" }
                  : { color: "var(--dim)" }
              }
              onClick={() => setTab(tb.id)}
            >
              {tb.label}
              {tb.id === "messages" ? unreadBadge : null}
            </button>
          ))}
        </nav>
        <div className="min-w-0">
          {tab === "overview" && (
            <OverviewTab t={t} lang={lang} token={token} onNewPost={() => setTab("posts")} onGo={setTab} />
          )}
          {tab === "stats" && <StatsTab t={t} token={token} />}
          {tab === "posts" && <PostsTab t={t} lang={lang} token={token} site={site} />}
          {tab === "categories" && <CategoriesTab t={t} token={token} site={site} />}
          {tab === "about" && <AboutTab t={t} token={token} site={site} />}
          {tab === "media" && <MediaTab t={t} token={token} />}
          {tab === "branding" && <BrandingTab t={t} token={token} site={site} />}
          {tab === "design" && (
            <DesignTab
              t={t}
              lang={lang}
              token={token}
              site={site}
              appearance={appearance}
              onAppearanceChange={onAppearanceChange}
              preview={preview}
              onPreviewChange={onPreviewChange}
            />
          )}
          {tab === "settings" && <SettingsTab t={t} token={token} site={site} />}
          {tab === "messages" && <MessagesTab t={t} lang={lang} token={token} />}
          {tab === "seo" && <SeoTab t={t} token={token} site={site} />}
          {tab === "security" && <SecurityTab t={t} token={token} onLogout={() => void logout()} />}
        </div>
      </div>
    </div>
  );
}

/* ---------------- login ---------------- */

function LoginCard({
  t, configured, loading, onToken,
}: {
  t: Dict;
  configured: boolean;
  loading: boolean;
  onToken: (token: string) => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  useEffect(() => {
    const stop = api.onPasswordRecovery(() => setRecovery(true));
    api.isRecoverySession().then((yes) => {
      if (yes) setRecovery(true);
    });
    return stop;
  }, []);
  const mutation = useMutation({
    mutationFn: async () =>
      configured ? await api.loginAdmin({ pin }) : await api.setupAdminPin({ pin }),
    onSuccess: (data) => onToken(data.token),
    onError: (e) => setError(e instanceof Error ? e.message : t.pinWrong),
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!configured && pin.length < 6) return setError(t.pinShort);
    if (!pin) return setError(t.pinWrong);
    mutation.mutate();
  };
  const recoveryMutation = useMutation({
    mutationFn: async () => await api.setNewPassword({ password: newPassword }),
    onSuccess: () => {
      setRecovery(false);
      setNewPassword("");
      setNotice(t.pinChanged);
    },
    onError: (e) => setError(e instanceof Error ? e.message : t.saveError),
  });
  const submitRecovery = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) return setError(t.pinShort);
    recoveryMutation.mutate();
  };
  const forgotPassword = async () => {
    setError("");
    setNotice("");
    try {
      await api.requestPasswordReset();
      setNotice(t.passwordResetSent);
    } catch {
      setError(t.saveError);
    }
  };
  if (recovery) {
    return (
      <div className="max-w-md mx-auto px-4 py-16">
        <form onSubmit={submitRecovery} className="card p-6 md:p-8 grid gap-4 fade-up">
          <h1 className="font-display text-2xl font-extrabold" style={{ color: "var(--accent)" }}>
            {t.setNewPassword}
          </h1>
          <p className="dim text-sm leading-relaxed">{t.setNewPasswordText}</p>
          <div>
            <label htmlFor="admin-new-password" className="label">{t.newPin}</label>
            <input
              id="admin-new-password"
              type="password"
              className="input"
              name="new_password"
              required
              minLength={6}
              maxLength={64}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              dir="ltr"
            />
          </div>
          {error ? <p className="text-sm font-bold" style={{ color: "#B3261E" }} role="alert">{error}</p> : null}
          <button type="submit" className="btn-primary px-6 py-3" disabled={recoveryMutation.isPending}>
            {t.save}
          </button>
          <button type="button" className="btn-ghost px-6 py-2" onClick={() => setRecovery(false)}>
            {t.cancel}
          </button>
        </form>
      </div>
    );
  }
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <form onSubmit={submit} className="card p-6 md:p-8 grid gap-4 fade-up">
        <h1 className="font-display text-2xl font-extrabold" style={{ color: "var(--accent)" }}>
          {configured ? t.adminLogin : t.adminPinSetup}
        </h1>
        <p className="dim text-sm leading-relaxed">{configured ? t.adminPinText : t.adminPinSetupText}</p>
        <div>
          <label htmlFor="admin-username" className="label">{t.username}</label>
          <input
            id="admin-username"
            type="text"
            className="input"
            name="username"
            value={ADMIN_USERNAME}
            disabled
            autoComplete="username"
            dir="ltr"
          />
        </div>
        <div>
          <label htmlFor="admin-pin" className="label">{t.adminPin}</label>
          <input
            id="admin-pin"
            type="password"
            className="input"
            {...FIELDS.loginAdmin.pin}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoComplete="current-password"
            dir="ltr"
          />
        </div>
        {configured ? (
          <button type="button" className="text-sm font-bold self-start" style={{ color: "var(--accent)" }} onClick={forgotPassword}>
            {t.forgotPassword}
          </button>
        ) : null}
        {notice ? <p className="text-sm font-bold" style={{ color: "var(--accent)" }} role="status">{notice}</p> : null}
        {error ? <p className="text-sm font-bold" style={{ color: "#B3261E" }} role="alert">{error}</p> : null}
        <button type="submit" className="btn-primary px-6 py-3" disabled={loading || mutation.isPending}>
          {configured ? t.login : t.adminPinSetup}
        </button>
      </form>
    </div>
  );
}

/* ---------------- shared bits ---------------- */

function Notice({ ok, text }: { ok: boolean; text: string }) {
  if (!text) return null;
  return (
    <p
      className="text-sm font-bold px-4 py-2.5 rounded-lg fade-in"
      style={{
        background: ok ? "var(--surface2)" : "#FDECEA",
        color: ok ? "var(--accent)" : "#B3261E",
      }}
      role="status"
    >
      {text}
    </p>
  );
}

function settingsPayload(site: SiteData) {
  const s = site.settings;
  return {
    site_name: s.site_name,
    site_description: s.site_description,
    tagline_ar: s.tagline_ar,
    tagline_en: s.tagline_en,
    theme_preset: s.theme_preset,
    custom_primary: s.custom_primary,
    custom_secondary: s.custom_secondary,
    custom_bg: s.custom_bg,
    custom_accent_blue: s.custom_accent_blue,
    custom_gray: s.custom_gray,
    appearance_default: (s.appearance_default === "dark" ? "dark" : "light") as "light" | "dark",
    default_language: (s.default_language === "en" ? "en" : "ar") as "ar" | "en",
    header_identity: (["logo", "photo", "text"].includes(s.header_identity)
      ? s.header_identity
      : "text") as "logo" | "photo" | "text",
    logo_media_id: s.logo_media_id,
    photo_media_id: s.photo_media_id,
    favicon_media_id: s.favicon_media_id,
    footer_text: s.footer_text,
    contact_email: s.contact_email,
    social_links: s.social_links,
    seo_title: s.seo_title,
    seo_description: s.seo_description,
  };
}

function MediaPicker({
  t, token, kind, onPick, label,
}: {
  t: Dict;
  token: string;
  kind: "logo" | "photo" | "cover" | "content" | "favicon" | "general";
  onPick: (item: MediaItem) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const queryClient = useQueryClient();
  const media = useQuery({
    queryKey: ["media", token],
    queryFn: () => api.listMedia({ token }),
    enabled: open,
  });
  const upload = useMutation({
    mutationFn: async (file: File) => await uploadImageFile(token, file, kind),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["media", token] });
      void queryClient.invalidateQueries({ queryKey: ["site"] });
      onPick({
        id: data.media.id,
        url: data.media.url,
        filename: data.media.filename,
        mime: data.media.mime,
        size: data.media.size,
        kind: data.media.kind,
        used_as: [],
        created_at: data.media.created_at,
      });
      setOpen(false);
    },
    onError: () => setUploadErr(t.uploadError),
  });
  return (
    <div>
      <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={() => setOpen(!open)} aria-expanded={open}>
        {label}
      </button>
      {open ? (
        <div className="card p-4 mt-3 slide-down">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <label className="btn-primary px-4 py-2 text-sm cursor-pointer inline-flex items-center">
              {upload.isPending ? t.uploading : t.upload}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                aria-label={t.upload}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload.mutate(f);
                  e.target.value = "";
                }}
              />
            </label>
            {uploadErr ? <span className="text-sm font-bold" style={{ color: "#B3261E" }}>{uploadErr}</span> : null}
          </div>
          {media.isPending ? (
            <p className="dim text-sm">{t.loading}</p>
          ) : media.data && media.data.items.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto">
              {media.data.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="p-0 rounded-lg overflow-hidden border bordered"
                  style={{ borderColor: "var(--border)", minHeight: 0 }}
                  onClick={() => {
                    onPick(item);
                    setOpen(false);
                  }}
                  aria-label={item.filename}
                >
                  <img src={item.url} alt={item.filename} className="w-full h-20 object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : (
            <p className="dim text-sm">{t.noMedia}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- overview ---------------- */

function OverviewTab({
  t, lang, token, onNewPost, onGo,
}: {
  t: Dict;
  lang: Lang;
  token: string;
  onNewPost: () => void;
  onGo: (tab: Tab) => void;
}) {
  const q = useQuery({ queryKey: ["overview", token], queryFn: () => api.getAdminOverview({ token }) });
  if (q.isPending) return <p className="dim">{t.loading}</p>;
  if (!q.data) return <p className="dim">{t.loadError}</p>;
  const d = q.data;
  const stats = [
    { label: t.publishedCount, value: d.published_count },
    { label: t.draftCount, value: d.draft_count },
    { label: t.categoryCount, value: d.category_count },
    { label: `${t.messageCount} (${d.unread_count} ${t.unread})`, value: d.message_count },
  ];
  return (
    <div className="grid gap-6 fade-up">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className="font-display text-3xl font-extrabold" style={{ color: "var(--accent)" }}>{s.value}</p>
            <p className="dim text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="font-bold w-full">{t.quickActions}</span>
        <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={onNewPost}>{t.newPost}</button>
        <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={() => onGo("design")}>{t.designStudio}</button>
        <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={() => onGo("messages")}>{t.messages}</button>
        <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={() => onGo("branding")}>{t.branding}</button>
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <div className="card p-5">
          <h3 className="font-display text-lg font-extrabold mb-3">{t.recentPosts}</h3>
          {d.recent_posts.length === 0 ? <p className="dim text-sm">{t.noPosts}</p> : (
            <ul className="grid gap-2.5">
              {d.recent_posts.map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="font-semibold grow truncate">{p.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "var(--surface2)", color: "var(--accent)" }}>
                    {p.status === "published" ? t.publishedBadge : t.draftBadge}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h3 className="font-display text-lg font-extrabold mb-3">{t.recentMessages}</h3>
          {d.recent_messages.length === 0 ? <p className="dim text-sm">{t.noMessages}</p> : (
            <ul className="grid gap-2.5">
              {d.recent_messages.map((m) => (
                <li key={m.id} className="text-sm flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${m.is_read ? "opacity-30" : ""}`} style={{ background: "var(--accent2)" }} />
                  <span className="font-semibold">{m.name}</span>
                  <span className="dim truncate">{m.subject}</span>
                  <span className="dim text-xs ms-auto shrink-0">{formatDate(m.created_at, lang)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- visitor statistics ---------------- */

// The RPC/relation does not exist until the migration in
// supabase/migrations/20261120160000_visitor_stats.sql is applied —
// show a setup hint instead of a generic error in that case.
function isStatsNotSetupError(e: unknown): boolean {
  const code = (e as { code?: unknown } | null)?.code;
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return (
    code === "PGRST202" ||
    /could not find the function/i.test(msg) ||
    /relation .*visits.* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg)
  );
}

function StatsTab({ t, token }: { t: Dict; token: string }) {
  const q = useQuery({
    queryKey: ["visitor-stats", token],
    queryFn: () => api.getVisitorStats({ token }),
    enabled: !!token,
    refetchInterval: 60_000,
  });

  if (q.isPending) return <p className="dim">{t.loading}</p>;
  if (q.isError) {
    return (
      <div className="grid gap-6">
        <div className="card p-5">
          <h2 className="font-display text-xl font-extrabold mb-2">{t.visitorStats}</h2>
          <p className="dim text-sm">{isStatsNotSetupError(q.error) ? t.visitorsNotSetup : t.loadError}</p>
          <button type="button" className="btn-ghost px-4 py-2 text-sm mt-4" onClick={() => void q.refetch()}>
            {t.visitorsRefresh}
          </button>
        </div>
      </div>
    );
  }

  const d = q.data;
  const stats = [
    { label: t.visitorsTotal, value: d.total },
    { label: t.visitorsToday, value: d.today },
    { label: t.visitorsLast7, value: d.last7 },
    { label: t.visitorsLast30, value: d.last30 },
  ];
  const days = buildDailySeries(d.daily ?? []);
  const max = Math.max(1, ...days.map((x) => x.count));
  const hasData = days.some((x) => x.count > 0);

  return (
    <div className="grid gap-6 fade-up">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-extrabold">{t.visitorStats}</h2>
        <button type="button" className="btn-ghost px-4 py-2 text-sm ms-auto" onClick={() => void q.refetch()}>
          {t.visitorsRefresh}
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className="font-display text-3xl font-extrabold" style={{ color: "var(--accent)" }}>{s.value}</p>
            <p className="dim text-sm mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="card p-5">
        <h3 className="font-display text-lg font-extrabold mb-4">{t.visitorsDaily}</h3>
        {!hasData ? (
          <p className="dim text-sm">{t.visitorsNoData}</p>
        ) : (
          <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-x-[3px] h-40 items-end" role="img" aria-label={t.visitorsDaily}>
            {days.map((day) => (
              <div
                key={day.date}
                className="flex flex-col items-center justify-end h-full min-w-0"
                title={`${day.date}: ${day.count}`}
              >
                <span className="text-[11px] leading-none font-bold mb-1" style={{ color: "var(--accent)" }}>
                  {day.count > 0 ? day.count : ""}
                </span>
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${day.count === 0 ? 1.5 : Math.max(5, (day.count / max) * 100)}%`,
                    background: "var(--accent)",
                    opacity: day.count === 0 ? 0.15 : 0.85,
                  }}
                />
                <span className="dim text-[10px] leading-none mt-1">
                  {new Date(`${day.date}T00:00:00Z`).getUTCDate()}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="dim text-sm mt-4">{t.visitorsNote}</p>
      </div>
    </div>
  );
}

/* ---------------- posts ---------------- */

function RichTextEditor({
  t, lang, initial, editorKey,
}: {
  t: Dict;
  lang: Lang;
  initial: string;
  editorKey: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initial;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorKey]);
  const exec = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    ref.current?.focus();
  };
  const btn = "btn-ghost px-2.5 py-1 text-sm";
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2" role="toolbar" aria-label={t.content}>
        <button type="button" className={btn} onClick={() => exec("bold")} aria-label={t.bold}><strong>B</strong></button>
        <button type="button" className={btn} onClick={() => exec("italic")} aria-label={t.italic}><em>I</em></button>
        <button type="button" className={btn} onClick={() => exec("formatBlock", "h2")} aria-label={t.heading}>H2</button>
        <button type="button" className={btn} onClick={() => exec("formatBlock", "blockquote")} aria-label={t.quote}>❝</button>
        <button type="button" className={btn} onClick={() => exec("insertUnorderedList")} aria-label={t.list}>☰</button>
        <button type="button" className={btn} onClick={() => exec("justifyRight")} aria-label={t.alignRight}>⇥</button>
        <button type="button" className={btn} onClick={() => exec("justifyCenter")} aria-label={t.alignCenter}>≡</button>
        <button type="button" className={btn} onClick={() => exec("justifyLeft")} aria-label={t.alignLeft}>⇤</button>
        <button type="button" className={btn} onClick={() => setLinkOpen(!linkOpen)} aria-label={t.link}>🔗</button>
      </div>
      {linkOpen ? (
        <div className="flex gap-2 mb-2">
          <input
            className="input"
            dir="ltr"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://…"
            aria-label={t.linkUrl}
          />
          <button
            type="button"
            className="btn-primary px-4 py-2 text-sm shrink-0"
            onClick={() => {
              if (linkUrl.trim()) exec("createLink", linkUrl.trim());
              setLinkOpen(false);
              setLinkUrl("");
            }}
          >
            {t.insertLink}
          </button>
        </div>
      ) : null}
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        dir={lang === "ar" ? "rtl" : "ltr"}
        className="input prose-areej min-h-56"
        data-placeholder={t.editorPlaceholder}
        aria-label={t.content}
      />
    </div>
  );
}

function PostsTab({ t, lang, token, site }: { t: Dict; lang: Lang; token: string; site: SiteData }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "draft" | "published">("");
  const [editing, setEditing] = useState<Post | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Post | null>(null);
  const [notice, setNotice] = useState({ ok: true, text: "" });

  const posts = useQuery({
    queryKey: ["admin-posts", token, search, statusFilter],
    queryFn: () =>
      api.listAdminPosts({
        token,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  });

  const del = useMutation({
    mutationFn: async (id: number) => await api.deletePost({ token, id }),
    onSuccess: () => {
      setConfirmDelete(null);
      setNotice({ ok: true, text: t.saved });
      void queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["site"] });
    },
    onError: (e) => setNotice({ ok: false, text: e instanceof Error ? e.message : t.saveError }),
  });

  if (editing) {
    return (
      <PostEditor
        t={t}
        lang={lang}
        token={token}
        site={site}
        post={editing === "new" ? null : editing}
        onDone={(msg) => {
          setEditing(null);
          if (msg) setNotice({ ok: true, text: msg });
          void queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="grid gap-4 fade-up">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => setEditing("new")}>
          + {t.newPost}
        </button>
        <div className="grow max-w-xs">
          <input
            className="input"
            {...FIELDS.listAdminPosts.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.search}
            aria-label={t.searchLabel}
          />
        </div>
        <select
          className="input w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | "draft" | "published")}
          aria-label={t.status}
        >
          <option value="">{t.status}: {t.allCategories}</option>
          <option value="published">{t.publishedBadge}</option>
          <option value="draft">{t.draftBadge}</option>
        </select>
      </div>
      <Notice ok={notice.ok} text={notice.text} />
      {posts.isPending ? <p className="dim">{t.loading}</p> : posts.data && posts.data.posts.length > 0 ? (
        <div className="grid gap-3">
          {posts.data.posts.map((p) => (
            <div key={p.id} className="card p-4 flex flex-wrap items-center gap-3">
              {p.cover_url ? <img src={p.cover_url} alt="" className="w-14 h-14 rounded-lg object-cover" /> : null}
              <div className="grow min-w-40">
                <p className="font-bold leading-snug">{p.title}</p>
                <p className="dim text-xs mt-1">
                  {p.section === "writings" ? t.writings : p.section === "education" ? t.education : t.journal}
                  {p.category_name ? ` · ${p.category_name}` : ""} · {formatDate(p.published_at ?? p.created_at, lang)}
                  {p.is_sample ? ` · ${t.sampleBadge}` : ""}
                </p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-bold"
                style={{
                  background: p.status === "published" ? "var(--accent)" : "var(--surface2)",
                  color: p.status === "published" ? "var(--accent-ink)" : "var(--accent)",
                }}
              >
                {p.status === "published" ? t.publishedBadge : t.draftBadge}
              </span>
              {p.featured ? <span className="text-xs font-bold" style={{ color: "var(--accent)" }}>★</span> : null}
              <div className="flex gap-2">
                <button type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => setEditing(p)}>{t.edit}</button>
                <button
                  type="button"
                  className="btn-ghost px-3 py-1.5 text-sm"
                  style={{ color: "#B3261E" }}
                  onClick={() => setConfirmDelete(p)}
                >
                  {t.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="dim">{t.noPosts}</p>
      )}
      {confirmDelete ? (
        <div className="card p-5 fade-in" role="alertdialog" aria-label={t.confirmDelete}>
          <p className="font-bold">{t.deletePostConfirm}</p>
          <p className="dim text-sm mt-1">{confirmDelete.title}</p>
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              className="px-4 py-2 rounded-lg font-bold text-sm text-white"
              style={{ background: "#B3261E" }}
              onClick={() => del.mutate(confirmDelete.id)}
              disabled={del.isPending}
            >
              {t.confirmDelete}
            </button>
            <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={() => setConfirmDelete(null)}>
              {t.cancel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PostEditor({
  t, lang, token, site, post, onDone, onCancel,
}: {
  t: Dict;
  lang: Lang;
  token: string;
  site: SiteData;
  post: Post | null;
  onDone: (msg?: string) => void;
  onCancel: () => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [section, setSection] = useState<"writings" | "education" | "journal">(post?.section as "writings" | "education" | "journal" ?? "writings");
  const [categoryId, setCategoryId] = useState<number | null>(post?.category_id ?? null);
  const [featured, setFeatured] = useState(post?.featured ?? false);
  const [authorName, setAuthorName] = useState(post?.author_name || site.profile.full_name_ar);
  const [publishDate, setPublishDate] = useState(
    post?.published_at ? post.published_at.slice(0, 10) : "",
  );
  const [seoTitle, setSeoTitle] = useState(post?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(post?.seo_description ?? "");
  const [coverId, setCoverId] = useState<number | null>(post?.cover_media_id ?? null);
  const [coverUrl, setCoverUrl] = useState<string | null>(post?.cover_url ?? null);
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: async (status: "draft" | "published") => {
      const contentEl = editorRef.current?.querySelector<HTMLElement>("[contenteditable]");
      const content = contentEl?.innerHTML ?? post?.content ?? "";
      return await api.savePost({
        token,
        id: post?.id,
        title: title.trim(),
        slug: slug.trim(),
        excerpt,
        content,
        cover_media_id: coverId,
        category_id: categoryId,
        section,
        status,
        featured,
        author_name: authorName,
        published_at: publishDate ? new Date(`${publishDate}T12:00:00`).toISOString() : null,
        seo_title: seoTitle,
        seo_description: seoDescription,
      });
    },
    onSuccess: () => onDone(t.saved),
    onError: (e) => setError(e instanceof Error ? e.message : t.saveError),
  });

  const submitStatus = (status: "draft" | "published") => {
    setError("");
    if (!title.trim()) {
      setError(t.title + " *");
      return;
    }
    save.mutate(status);
  };

  return (
    <div className="grid gap-4 fade-up">
      <h2 className="font-display text-2xl font-extrabold" style={{ color: "var(--accent)" }}>
        {post ? t.editPost : t.newPost}
      </h2>
      <div className="card p-5 grid gap-4">
        <div>
          <label htmlFor="pe-title" className="label">{t.title} *</label>
          <input id="pe-title" className="input" {...FIELDS.savePost.title} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pe-slug" className="label">{t.slug}</label>
            <input id="pe-slug" className="input" dir="ltr" {...FIELDS.savePost.slug} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="my-post" />
          </div>
          <div>
            <label htmlFor="pe-author" className="label">{t.authorName}</label>
            <input id="pe-author" className="input" {...FIELDS.savePost.author_name} value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
          </div>
        </div>
        <div>
          <label htmlFor="pe-excerpt" className="label">{t.excerpt}</label>
          <textarea id="pe-excerpt" className="input" rows={2} {...FIELDS.savePost.excerpt} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        </div>
        <div>
          <span className="label">{t.content}</span>
          <div ref={editorRef}>
            <RichTextEditor t={t} lang={lang} initial={post?.content ?? ""} editorKey={String(post?.id ?? "new")} />
          </div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="pe-section" className="label">{t.section}</label>
            <select id="pe-section" className="input" value={section} onChange={(e) => setSection(e.target.value as typeof section)}>
              <option value="writings">{t.writings}</option>
              <option value="education">{t.education}</option>
              <option value="journal">{t.journal}</option>
            </select>
          </div>
          <div>
            <label htmlFor="pe-category" className="label">{t.category}</label>
            <select
              id="pe-category"
              className="input"
              value={categoryId ?? ""}
              onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t.noCategory}</option>
              {site.categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pe-date" className="label">{t.publishDate}</label>
            <input id="pe-date" {...FIELDS.savePost.published_at} type="date" className="input" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
          </div>
        </div>
        <div>
          <span className="label">{t.coverImage}</span>
          <div className="flex flex-wrap items-center gap-3">
            {coverUrl ? <img src={coverUrl} alt="" className="w-24 h-16 rounded-lg object-cover" /> : null}
            <MediaPicker
              t={t}
              token={token}
              kind="cover"
              label={coverUrl ? t.selectCover : t.upload}
              onPick={(item) => {
                setCoverId(item.id);
                setCoverUrl(item.url);
              }}
            />
            {coverUrl ? (
              <button
                type="button"
                className="btn-ghost px-3 py-1.5 text-sm"
                onClick={() => {
                  setCoverId(null);
                  setCoverUrl(null);
                }}
              >
                {t.remove}
              </button>
            ) : null}
          </div>
        </div>
        <label className="flex items-center gap-2 font-semibold cursor-pointer py-1">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="w-5 h-5" />
          {t.featuredPost}
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="pe-seo-title" className="label">{t.seoTitle}</label>
            <input id="pe-seo-title" className="input" {...FIELDS.savePost.seo_title} value={seoTitle} onChange={(e) => setSeoTitle(e.target.value)} />
          </div>
          <div>
            <label htmlFor="pe-seo-desc" className="label">{t.seoDescription}</label>
            <input id="pe-seo-desc" className="input" {...FIELDS.savePost.seo_description} value={seoDescription} onChange={(e) => setSeoDescription(e.target.value)} />
          </div>
        </div>
        {post ? (
          <p className="dim text-sm">
            {t.status}: {post.status === "published" ? t.publishedBadge : t.draftBadge}
          </p>
        ) : null}
        {error ? <p className="text-sm font-bold" style={{ color: "#B3261E" }} role="alert">{error}</p> : null}
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" className="btn-primary px-5 py-2.5" onClick={() => submitStatus("published")} disabled={save.isPending}>
            {t.publish}
          </button>
          <button type="button" className="btn-ghost px-5 py-2.5" onClick={() => submitStatus("draft")} disabled={save.isPending}>
            {post?.status === "published" ? t.unpublish + " / " + t.saveDraft : t.saveDraft}
          </button>
          <button type="button" className="btn-ghost px-5 py-2.5" onClick={onCancel}>
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- categories ---------------- */

function CategoriesTab({ t, token, site }: { t: Dict; token: string; site: SiteData }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [section, setSection] = useState<"writings" | "education" | "journal" | "general">("general");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<{ id: number; name: string; count: number } | null>(null);
  const [notice, setNotice] = useState({ ok: true, text: "" });

  const adminPosts = useQuery({
    queryKey: ["admin-posts", token, "", ""],
    queryFn: () => api.listAdminPosts({ token }),
  });
  const counts = new Map<number, number>();
  for (const p of adminPosts.data?.posts ?? []) {
    if (p.category_id) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
  }

  const save = useMutation({
    mutationFn: async () =>
      await api.saveCategory({ token, id: editingId ?? undefined, name: name.trim(), description, section }),
    onSuccess: () => {
      setName(""); setDescription(""); setSection("general"); setEditingId(null);
      setNotice({ ok: true, text: t.saved });
      void queryClient.invalidateQueries({ queryKey: ["site"] });
    },
    onError: (e) => setNotice({ ok: false, text: e instanceof Error ? e.message : t.saveError }),
  });
  const del = useMutation({
    mutationFn: async (args: { id: number; force: boolean }) => await api.deleteCategory({ token, ...args }),
    onSuccess: () => {
      setConfirm(null);
      setNotice({ ok: true, text: t.saved });
      void queryClient.invalidateQueries({ queryKey: ["site"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-posts"] });
    },
    onError: (e) => setNotice({ ok: false, text: e instanceof Error ? e.message : t.saveError }),
  });

  return (
    <div className="grid gap-5 fade-up">
      <form
        className="card p-5 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) {
            setNotice({ ok: false, text: t.categoryName + " *" });
            return;
          }
          save.mutate();
        }}
      >
        <h3 className="font-display text-lg font-extrabold">{editingId ? t.edit : t.newCategory}</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="cat-name" className="label">{t.categoryName} *</label>
            <input id="cat-name" className="input" {...FIELDS.saveCategory.name} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label htmlFor="cat-section" className="label">{t.section}</label>
            <select id="cat-section" className="input" value={section} onChange={(e) => setSection(e.target.value as typeof section)}>
              <option value="general">—</option>
              <option value="writings">{t.writings}</option>
              <option value="education">{t.education}</option>
              <option value="journal">{t.journal}</option>
            </select>
          </div>
        </div>
        <div>
          <label htmlFor="cat-desc" className="label">{t.description}</label>
          <input id="cat-desc" className="input" {...FIELDS.saveCategory.description} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="btn-primary px-5 py-2.5" disabled={save.isPending}>{t.save}</button>
          {editingId ? (
            <button
              type="button"
              className="btn-ghost px-5 py-2.5"
              onClick={() => {
                setEditingId(null); setName(""); setDescription(""); setSection("general");
              }}
            >
              {t.cancel}
            </button>
          ) : null}
        </div>
      </form>
      <Notice ok={notice.ok} text={notice.text} />
      <div className="grid gap-3">
        {site.categories.map((c) => (
          <div key={c.id} className="card p-4 flex flex-wrap items-center gap-3">
            <div className="grow min-w-40">
              <p className="font-bold">{c.name}</p>
              <p className="dim text-xs mt-0.5">
                {c.description} · {counts.get(c.id) ?? 0} {t.postsMgmt}
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost px-3 py-1.5 text-sm"
              onClick={() => {
                setEditingId(c.id); setName(c.name); setDescription(c.description);
                setSection(c.section as typeof section);
              }}
            >
              {t.edit}
            </button>
            <button
              type="button"
              className="btn-ghost px-3 py-1.5 text-sm"
              style={{ color: "#B3261E" }}
              onClick={() => setConfirm({ id: c.id, name: c.name, count: counts.get(c.id) ?? 0 })}
            >
              {t.delete}
            </button>
          </div>
        ))}
      </div>
      {confirm ? (
        <div className="card p-5 fade-in" role="alertdialog" aria-label={t.confirmDelete}>
          <p className="font-bold">{t.deleteCategoryConfirm}</p>
          <p className="dim text-sm mt-1">{confirm.name}</p>
          {confirm.count > 0 ? <p className="text-sm mt-2 font-bold" style={{ color: "#B3261E" }}>{t.categoryInUse}</p> : null}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              className="px-4 py-2 rounded-lg font-bold text-sm text-white"
              style={{ background: "#B3261E" }}
              onClick={() => del.mutate({ id: confirm.id, force: confirm.count > 0 })}
              disabled={del.isPending}
            >
              {t.confirmDelete}
            </button>
            <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={() => setConfirm(null)}>{t.cancel}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- about admin ---------------- */

function AboutTab({ t, token, site }: { t: Dict; token: string; site: SiteData }) {
  const queryClient = useQueryClient();
  const p = site.profile;
  const [form, setForm] = useState({
    full_name_ar: p.full_name_ar, full_name_en: p.full_name_en, bio: p.bio, city: p.city,
    university: p.university, academic_level: p.academic_level, profession: p.profession,
    philosophy: p.philosophy, academic_journey: p.academic_journey,
    writing_interests: p.writing_interests, education_interests: p.education_interests,
  });
  const [notice, setNotice] = useState({ ok: true, text: "" });
  const save = useMutation({
    mutationFn: async () => await api.saveProfile({ token, ...form }),
    onSuccess: () => {
      setNotice({ ok: true, text: t.saved });
      void queryClient.invalidateQueries({ queryKey: ["site"] });
    },
    onError: (e) => setNotice({ ok: false, text: e instanceof Error ? e.message : t.saveError }),
  });
  const savePhoto = useMutation({
    mutationFn: async (mediaId: number | null) =>
      await api.saveSettings({ token, ...settingsPayload(site), photo_media_id: mediaId }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["site"] }),
  });
  const field = (key: keyof typeof form, label: string, rows = 1, _max = 2000) => (
    <div key={key}>
      <label htmlFor={`about-${key}`} className="label">{label}</label>
      {rows > 1 ? (
        <textarea id={`about-${key}`} className="input" rows={rows} {...FIELDS.saveProfile[key]} value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      ) : (
        <input id={`about-${key}`} className="input" {...FIELDS.saveProfile[key]} value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
      )}
    </div>
  );
  return (
    <div className="grid gap-5 fade-up">
      <div className="card p-5">
        <span className="label">{t.personalPhoto}</span>
        <div className="flex flex-wrap items-center gap-3">
          {site.settings.photo_url ? (
            <img src={site.settings.photo_url} alt="" className="w-20 h-20 rounded-full object-cover" />
          ) : null}
          <MediaPicker t={t} token={token} kind="photo" label={t.upload} onPick={(item) => savePhoto.mutate(item.id)} />
          {site.settings.photo_media_id ? (
            <button type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => savePhoto.mutate(null)}>
              {t.remove}
            </button>
          ) : null}
        </div>
      </div>
      <form
        className="card p-5 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          {field("full_name_ar", t.fullNameAr, 1, 120)}
          {field("full_name_en", t.fullNameEn, 1, 120)}
          {field("city", t.city, 1, 120)}
          {field("university", t.university, 1, 160)}
          {field("academic_level", t.academicLevel, 1, 160)}
          {field("profession", t.profession, 1, 300)}
        </div>
        {field("bio", t.bio, 4)}
        {field("philosophy", t.philosophy, 3, 1000)}
        {field("academic_journey", t.academicJourney, 4, 3000)}
        {field("writing_interests", t.writingInterests, 3)}
        {field("education_interests", t.educationInterests, 3)}
        <Notice ok={notice.ok} text={notice.text} />
        <div>
          <button type="submit" className="btn-primary px-6 py-2.5" disabled={save.isPending}>{t.save}</button>
        </div>
      </form>
    </div>
  );
}

/* ---------------- media ---------------- */

function MediaTab({ t, token }: { t: Dict; token: string }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState({ ok: true, text: "" });
  const [confirm, setConfirm] = useState<MediaItem | null>(null);
  const media = useQuery({ queryKey: ["media", token], queryFn: () => api.listMedia({ token }) });
  const upload = useMutation({
    mutationFn: async (file: File) => await uploadImageFile(token, file, "general"),
    onSuccess: () => {
      setNotice({ ok: true, text: t.saved });
      void queryClient.invalidateQueries({ queryKey: ["media", token] });
    },
    onError: () => setNotice({ ok: false, text: t.uploadError }),
  });
  const del = useMutation({
    mutationFn: async (args: { id: number; force: boolean }) => await api.deleteMedia({ token, ...args }),
    onSuccess: () => {
      setConfirm(null);
      void queryClient.invalidateQueries({ queryKey: ["media", token] });
      void queryClient.invalidateQueries({ queryKey: ["site"] });
    },
    onError: (e) => setNotice({ ok: false, text: e instanceof Error ? e.message : t.saveError }),
  });
  const kindLabel = (k: string) =>
    k === "logo" ? t.logo : k === "photo" ? t.personalPhoto : k === "cover" ? t.coverImage : k === "favicon" ? t.favicon : k;
  return (
    <div className="grid gap-4 fade-up">
      <div className="flex flex-wrap items-center gap-3">
        <label className="btn-primary px-4 py-2 text-sm cursor-pointer inline-flex items-center">
          {upload.isPending ? t.uploading : t.upload}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            aria-label={t.upload}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <Notice ok={notice.ok} text={notice.text} />
      {media.isPending ? <p className="dim">{t.loading}</p> : media.data && media.data.items.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {media.data.items.map((item) => (
            <div key={item.id} className="card overflow-hidden">
              <img src={item.url} alt={item.filename} className="w-full h-32 object-cover" loading="lazy" />
              <div className="p-3 grid gap-1">
                <p className="text-xs font-bold truncate" dir="ltr">{item.filename}</p>
                <p className="dim text-xs">
                  {kindLabel(item.kind)} · {Math.max(1, Math.round(item.size / 1024))} KB
                </p>
                {item.used_as.length > 0 ? (
                  <p className="text-xs font-bold" style={{ color: "var(--accent)" }}>
                    {t.mediaInUse}: {item.used_as.map(kindLabel).join("، ")}
                  </p>
                ) : null}
                <button
                  type="button"
                  className="btn-ghost px-3 py-1.5 text-xs mt-1"
                  style={{ color: "#B3261E" }}
                  onClick={() => setConfirm(item)}
                >
                  {t.delete}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="dim">{t.noMedia}</p>
      )}
      {confirm ? (
        <div className="card p-5 fade-in" role="alertdialog" aria-label={t.confirmDelete}>
          <p className="font-bold">{t.confirmDelete}</p>
          <p className="dim text-sm mt-1" dir="ltr">{confirm.filename}</p>
          {confirm.used_as.length > 0 ? (
            <p className="text-sm mt-2 font-bold" style={{ color: "#B3261E" }}>{t.deleteMediaConfirm}</p>
          ) : null}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              className="px-4 py-2 rounded-lg font-bold text-sm text-white"
              style={{ background: "#B3261E" }}
              onClick={() => del.mutate({ id: confirm.id, force: confirm.used_as.length > 0 })}
              disabled={del.isPending}
            >
              {t.confirmDelete}
            </button>
            <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={() => setConfirm(null)}>{t.cancel}</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ---------------- branding ---------------- */

function BrandingTab({ t, token, site }: { t: Dict; token: string; site: SiteData }) {
  const queryClient = useQueryClient();
  const s = site.settings;
  const [logoId, setLogoId] = useState<number | null>(s.logo_media_id);
  const [logoUrl, setLogoUrl] = useState<string | null>(s.logo_url);
  const [photoId, setPhotoId] = useState<number | null>(s.photo_media_id);
  const [photoUrl, setPhotoUrl] = useState<string | null>(s.photo_url);
  const [faviconId, setFaviconId] = useState<number | null>(s.favicon_media_id);
  const [faviconUrl, setFaviconUrl] = useState<string | null>(s.favicon_url);
  const [identity, setIdentity] = useState<"logo" | "photo" | "text">(
    (["logo", "photo", "text"].includes(s.header_identity) ? s.header_identity : "text") as "logo" | "photo" | "text",
  );
  const [notice, setNotice] = useState({ ok: true, text: "" });
  const save = useMutation({
    mutationFn: async () =>
      await api.saveSettings({
        token,
        ...settingsPayload(site),
        logo_media_id: logoId,
        photo_media_id: photoId,
        favicon_media_id: faviconId,
        header_identity: identity,
      }),
    onSuccess: () => {
      setNotice({ ok: true, text: t.saved });
      void queryClient.invalidateQueries({ queryKey: ["site"] });
    },
    onError: (e) => setNotice({ ok: false, text: e instanceof Error ? e.message : t.saveError }),
  });

  const slot = (
    label: string,
    url: string | null,
    kind: "logo" | "photo" | "favicon",
    set: (id: number | null, url: string | null) => void,
    round = false,
  ) => (
    <div className="card p-5">
      <span className="label">{label}</span>
      <div className="flex flex-wrap items-center gap-3 mt-1">
        {url ? (
          <img src={url} alt={label} className={round ? "w-20 h-20 rounded-full object-cover" : "h-20 w-auto max-w-40 object-contain"} />
        ) : (
          <span className="dim text-sm">—</span>
        )}
        <MediaPicker t={t} token={token} kind={kind} label={url ? t.edit : t.upload} onPick={(item) => set(item.id, item.url)} />
        {url ? (
          <button type="button" className="btn-ghost px-3 py-1.5 text-sm" onClick={() => set(null, null)}>
            {t.remove}
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="grid gap-4 fade-up">
      {slot(t.logo, logoUrl, "logo", (id, url) => { setLogoId(id); setLogoUrl(url); })}
      {slot(t.personalPhoto, photoUrl, "photo", (id, url) => { setPhotoId(id); setPhotoUrl(url); }, true)}
      {slot(t.favicon, faviconUrl, "favicon", (id, url) => { setFaviconId(id); setFaviconUrl(url); })}
      <div className="card p-5">
        <span className="label">{t.headerShows}</span>
        <div className="flex flex-wrap gap-2 mt-1" role="radiogroup" aria-label={t.headerShows}>
          {(
            [
              { id: "text", label: t.headerText },
              { id: "logo", label: t.headerLogo },
              { id: "photo", label: t.headerPhoto },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={identity === opt.id}
              className={`chip px-4 py-2 text-sm ${identity === opt.id ? "chip-active" : ""}`}
              onClick={() => setIdentity(opt.id)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-lg flex items-center gap-3" style={{ background: "var(--header-bg)", border: "1px solid var(--border)" }}>
          <span className="text-xs dim">{t.preview}:</span>
          {identity === "logo" && logoUrl ? <img src={logoUrl} alt="" className="h-9 w-auto object-contain" /> : null}
          {identity === "photo" && photoUrl ? <img src={photoUrl} alt="" className="w-9 h-9 rounded-full object-cover" /> : null}
          <span className="font-display font-extrabold" style={{ color: "var(--accent)" }}>{s.site_name}</span>
        </div>
      </div>
      <Notice ok={notice.ok} text={notice.text} />
      <div>
        <button type="button" className="btn-primary px-6 py-2.5" onClick={() => save.mutate()} disabled={save.isPending}>
          {t.save}
        </button>
      </div>
    </div>
  );
}

/* ---------------- design studio ---------------- */

function DesignTab({
  t, lang, token, site, appearance, onAppearanceChange, preview, onPreviewChange,
}: {
  t: Dict;
  lang: Lang;
  token: string;
  site: SiteData;
  appearance: "light" | "dark";
  onAppearanceChange: (a: "light" | "dark") => void;
  preview: DesignPreview | null;
  onPreviewChange: (p: DesignPreview | null) => void;
}) {
  const queryClient = useQueryClient();
  const s = site.settings;
  const [selected, setSelected] = useState<PresetId>((s.theme_preset as PresetId) || "lavender");
  const [primary, setPrimary] = useState<string>(s.custom_primary ?? "#79509B");
  const [secondary, setSecondary] = useState<string>(s.custom_secondary ?? "#E7A8CB");
  const [bg, setBg] = useState<string>(s.custom_bg ?? "#F8F3FA");
  const [accentBlue, setAccentBlue] = useState<string>(s.custom_accent_blue ?? "#668FC2");
  const [gray, setGray] = useState<string>(s.custom_gray ?? "#85858F");
  const [useCustom, setUseCustom] = useState<boolean>(
    !!(s.custom_primary || s.custom_secondary || s.custom_bg || s.custom_accent_blue || s.custom_gray),
  );
  const [notice, setNotice] = useState({ ok: true, text: "" });

  const currentPreview = (): DesignPreview => ({
    preset: selected,
    primary: useCustom ? primary : null,
    secondary: useCustom ? secondary : null,
    bg: useCustom ? bg : null,
    accentBlue: useCustom ? accentBlue : null,
    gray: useCustom ? gray : null,
  });

  const save = useMutation({
    mutationFn: async (design: DesignPreview) =>
      await api.saveSettings({
        token,
        ...settingsPayload(site),
        theme_preset: design.preset,
        custom_primary: design.primary,
        custom_secondary: design.secondary,
        custom_bg: design.bg,
        custom_accent_blue: design.accentBlue,
        custom_gray: design.gray,
      }),
    onSuccess: () => {
      onPreviewChange(null);
      setNotice({ ok: true, text: t.designApplied });
      void queryClient.invalidateQueries({ queryKey: ["site"] });
    },
    onError: (e) => setNotice({ ok: false, text: e instanceof Error ? e.message : t.saveError }),
  });

  return (
    <div className="grid gap-5 fade-up">
      <p className="dim text-sm leading-relaxed">
        {lang === "ar"
          ? "اختاري تصميماً كاملاً للموقع، عاينيه مباشرة على الصفحات، ثم طبّقيه. تغيير التصميم لا يمسّ المنشورات أو المعلومات أبداً."
          : "Choose a complete design, preview it live across the site, then apply it. Changing the design never touches posts or information."}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">
        {PRESETS.map((preset) => {
          const vars = appearance === "dark" ? preset.dark : preset.light;
          const active = selected === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => setSelected(preset.id)}
              aria-pressed={active}
              className="text-start p-0 overflow-hidden"
              style={{
                borderRadius: vars["--radius"] ?? "14px",
                border: active ? "3px solid var(--accent)" : "1px solid var(--border)",
                minHeight: 0,
              }}
            >
              <div className="p-4" style={{ background: vars["--bg"], color: vars["--text"] }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-8 h-8 rounded-full" style={{ background: vars["--accent"] }} />
                  <span className="w-8 h-8 rounded-full" style={{ background: vars["--accent2"] }} />
                  <span className="w-6 h-6 rounded-full" style={{ background: vars["--accent3"] }} />
                  <span className="w-6 h-6 rounded-full" style={{ background: vars["--neutral"] }} />
                  <span className="font-bold" style={{ fontFamily: vars["--font-display"] }}>
                    {lang === "ar" ? preset.nameAr : preset.nameEn}
                  </span>
                </div>
                <div className="rounded p-3 mb-2" style={{ background: vars["--surface"], borderRadius: vars["--radius"], boxShadow: vars["--shadow"] }}>
                  <div className="h-2.5 w-2/3 rounded mb-2" style={{ background: vars["--accent"] }} />
                  <div className="h-2 w-full rounded mb-1.5" style={{ background: vars["--border"] }} />
                  <div className="h-2 w-5/6 rounded" style={{ background: vars["--border"] }} />
                </div>
                <span
                  className="inline-block px-3 py-1 text-xs font-bold"
                  style={{ background: vars["--accent"], color: vars["--accent-ink"], borderRadius: vars["--radius"] }}
                >
                  {t.discoverWritings}
                </span>
              </div>
              <div className="p-3 surface">
                <p className="font-bold text-sm">{lang === "ar" ? preset.nameAr : preset.nameEn}</p>
                <p className="dim text-xs mt-0.5 leading-relaxed">{lang === "ar" ? preset.descAr : preset.descEn}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="card p-5 grid gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-bold">{appearance === "dark" ? t.darkMode : t.lightMode}</span>
          <button
            type="button"
            className="btn-ghost px-4 py-2 text-sm"
            onClick={() => onAppearanceChange(appearance === "dark" ? "light" : "dark")}
          >
            {appearance === "dark" ? "☀ " + t.lightMode : "☾ " + t.darkMode}
          </button>
        </div>
        <label className="flex items-center gap-2 font-semibold cursor-pointer py-1">
          <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} className="w-5 h-5" />
          {t.customColors}
        </label>
        {useCustom ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="cc-primary" className="label">{t.primaryColor}</label>
              <input id="cc-primary" {...FIELDS.saveSettings.custom_primary} type="color" className="w-full h-11 cursor-pointer rounded" value={primary} onChange={(e) => setPrimary(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cc-secondary" className="label">{t.secondaryColor}</label>
              <input id="cc-secondary" {...FIELDS.saveSettings.custom_secondary} type="color" className="w-full h-11 cursor-pointer rounded" value={secondary} onChange={(e) => setSecondary(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cc-bg" className="label">{t.bgColor}</label>
              <input id="cc-bg" {...FIELDS.saveSettings.custom_bg} type="color" className="w-full h-11 cursor-pointer rounded" value={bg} onChange={(e) => setBg(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cc-blue" className="label">{t.blueColor}</label>
              <input id="cc-blue" {...FIELDS.saveSettings.custom_accent_blue} type="color" className="w-full h-11 cursor-pointer rounded" value={accentBlue} onChange={(e) => setAccentBlue(e.target.value)} />
            </div>
            <div>
              <label htmlFor="cc-gray" className="label">{t.grayColor}</label>
              <input id="cc-gray" {...FIELDS.saveSettings.custom_gray} type="color" className="w-full h-11 cursor-pointer rounded" value={gray} onChange={(e) => setGray(e.target.value)} />
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost px-5 py-2.5" onClick={() => onPreviewChange(currentPreview())}>
            {t.preview}
          </button>
          <button type="button" className="btn-primary px-5 py-2.5" onClick={() => save.mutate(currentPreview())} disabled={save.isPending}>
            {t.applyDesign}
          </button>
          <button
            type="button"
            className="btn-ghost px-5 py-2.5"
            onClick={() =>
              save.mutate({ preset: "lavender", primary: null, secondary: null, bg: null, accentBlue: null, gray: null })
            }
            disabled={save.isPending}
          >
            {t.restoreDefault}
          </button>
        </div>
        {preview ? (
          <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg" style={{ background: "var(--surface2)" }}>
            <span className="font-bold text-sm">{t.preview}…</span>
            <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => save.mutate(preview)} disabled={save.isPending}>
              {t.applyDesign}
            </button>
            <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={() => onPreviewChange(null)}>
              {t.cancelPreview}
            </button>
          </div>
        ) : null}
        <Notice ok={notice.ok} text={notice.text} />
      </div>
    </div>
  );
}

/* ---------------- settings & seo ---------------- */

function SettingsTab({ t, token, site }: { t: Dict; token: string; site: SiteData }) {
  const queryClient = useQueryClient();
  const base = settingsPayload(site);
  const [form, setForm] = useState({
    site_name: base.site_name,
    site_description: base.site_description,
    tagline_ar: base.tagline_ar,
    tagline_en: base.tagline_en,
    default_language: base.default_language,
    appearance_default: base.appearance_default,
    footer_text: base.footer_text,
    contact_email: base.contact_email,
  });
  const [social, setSocial] = useState<Record<string, string>>({ ...base.social_links });
  const [notice, setNotice] = useState({ ok: true, text: "" });
  const save = useMutation({
    mutationFn: async () =>
      await api.saveSettings({ token, ...settingsPayload(site), ...form, social_links: social }),
    onSuccess: () => {
      setNotice({ ok: true, text: t.saved });
      void queryClient.invalidateQueries({ queryKey: ["site"] });
    },
    onError: (e) => setNotice({ ok: false, text: e instanceof Error ? e.message : t.saveError }),
  });
  const socialLabel = (k: string) =>
    k === "instagram" ? t.instagram : k === "facebook" ? t.facebook : k === "twitterX" ? t.twitterX
    : k === "telegram" ? t.telegram : k === "whatsapp" ? t.whatsapp : k === "youtube" ? t.youtube : t.tiktok;
  return (
    <form
      className="card p-5 grid gap-4 fade-up"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="set-name" className="label">{t.siteName}</label>
          <input id="set-name" className="input" {...FIELDS.saveSettings.site_name} value={form.site_name}
            onChange={(e) => setForm({ ...form, site_name: e.target.value })} />
        </div>
        <div>
          <label htmlFor="set-email" className="label">{t.contactEmail}</label>
          <input id="set-email" className="input" dir="ltr" {...FIELDS.saveSettings.contact_email} value={form.contact_email}
            onChange={(e) => setForm({ ...form, contact_email: e.target.value })} />
        </div>
        <div>
          <label htmlFor="set-tag-ar" className="label">{t.tagline} (عربي)</label>
          <input id="set-tag-ar" className="input" {...FIELDS.saveSettings.tagline_ar} value={form.tagline_ar}
            onChange={(e) => setForm({ ...form, tagline_ar: e.target.value })} />
        </div>
        <div>
          <label htmlFor="set-tag-en" className="label">{t.tagline} (English)</label>
          <input id="set-tag-en" className="input" dir="ltr" {...FIELDS.saveSettings.tagline_en} value={form.tagline_en}
            onChange={(e) => setForm({ ...form, tagline_en: e.target.value })} />
        </div>
        <div>
          <label htmlFor="set-lang" className="label">{t.defaultLang}</label>
          <select id="set-lang" className="input" value={form.default_language}
            onChange={(e) => setForm({ ...form, default_language: e.target.value as "ar" | "en" })}>
            <option value="ar">{t.arabic}</option>
            <option value="en">{t.english}</option>
          </select>
        </div>
        <div>
          <label htmlFor="set-app" className="label">{t.defaultAppearance}</label>
          <select id="set-app" className="input" value={form.appearance_default}
            onChange={(e) => setForm({ ...form, appearance_default: e.target.value as "light" | "dark" })}>
            <option value="light">{t.lightMode}</option>
            <option value="dark">{t.darkMode}</option>
          </select>
        </div>
      </div>
      <div>
        <label htmlFor="set-desc" className="label">{t.siteDescription}</label>
        <textarea id="set-desc" className="input" rows={2} {...FIELDS.saveSettings.site_description} value={form.site_description}
          onChange={(e) => setForm({ ...form, site_description: e.target.value })} />
      </div>
      <div>
        <label htmlFor="set-footer" className="label">{t.footerText}</label>
        <input id="set-footer" className="input" {...FIELDS.saveSettings.footer_text} value={form.footer_text}
          onChange={(e) => setForm({ ...form, footer_text: e.target.value })} />
      </div>
      <fieldset className="grid gap-3">
        <legend className="label">{t.socialLinks}</legend>
        <div className="grid sm:grid-cols-2 gap-3">
          {SOCIAL_PLATFORMS.map((k) => (
            <div key={k}>
              <label htmlFor={`social-${k}`} className="label">{socialLabel(k)}</label>
              <input
                id={`social-${k}`}
                className="input"
                dir="ltr"
                placeholder="https://…"
                value={social[k] ?? ""}
                maxLength={400}
                onChange={(e) => setSocial({ ...social, [k]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </fieldset>
      <Notice ok={notice.ok} text={notice.text} />
      <div>
        <button type="submit" className="btn-primary px-6 py-2.5" disabled={save.isPending}>{t.save}</button>
      </div>
    </form>
  );
}

function SeoTab({ t, token, site }: { t: Dict; token: string; site: SiteData }) {
  const queryClient = useQueryClient();
  const [seoTitle, setSeoTitle] = useState(site.settings.seo_title);
  const [seoDescription, setSeoDescription] = useState(site.settings.seo_description);
  const [notice, setNotice] = useState({ ok: true, text: "" });
  const save = useMutation({
    mutationFn: async () =>
      await api.saveSettings({
        token,
        ...settingsPayload(site),
        seo_title: seoTitle,
        seo_description: seoDescription,
      }),
    onSuccess: () => {
      setNotice({ ok: true, text: t.saved });
      void queryClient.invalidateQueries({ queryKey: ["site"] });
    },
    onError: (e) => setNotice({ ok: false, text: e instanceof Error ? e.message : t.saveError }),
  });
  return (
    <form
      className="card p-5 grid gap-4 fade-up"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div>
        <label htmlFor="seo-title" className="label">{t.seoTitle}</label>
        <input id="seo-title" className="input" {...FIELDS.saveSettings.seo_title} value={seoTitle}
          onChange={(e) => setSeoTitle(e.target.value)} />
      </div>
      <div>
        <label htmlFor="seo-desc" className="label">{t.seoDescription}</label>
        <textarea id="seo-desc" className="input" rows={3} {...FIELDS.saveSettings.seo_description} value={seoDescription}
          onChange={(e) => setSeoDescription(e.target.value)} />
      </div>
      <p className="dim text-sm leading-relaxed">
        {t.seoTitle} / {t.seoDescription}: {t.editPost} ← {t.postsMgmt}
      </p>
      <Notice ok={notice.ok} text={notice.text} />
      <div>
        <button type="submit" className="btn-primary px-6 py-2.5" disabled={save.isPending}>{t.save}</button>
      </div>
    </form>
  );
}

/* ---------------- messages ---------------- */

function MessagesTab({ t, lang, token }: { t: Dict; lang: Lang; token: string }) {
  const queryClient = useQueryClient();
  const [openId, setOpenId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const msgs = useQuery({ queryKey: ["messages", token], queryFn: () => api.listMessages({ token }) });
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["messages", token] });
    void queryClient.invalidateQueries({ queryKey: ["overview", token] });
  };
  const toggle = useMutation({
    mutationFn: async (args: { id: number; is_read: boolean }) => await api.setMessageRead({ token, ...args }),
    onSuccess: invalidate,
  });
  const del = useMutation({
    mutationFn: async (id: number) => await api.deleteMessage({ token, id }),
    onSuccess: () => {
      setConfirmDeleteId(null);
      invalidate();
    },
  });
  if (msgs.isPending) return <p className="dim">{t.loading}</p>;
  if (!msgs.data || msgs.data.messages.length === 0) return <p className="dim fade-up">{t.noMessages}</p>;
  const unreadCount = msgs.data.messages.filter((m) => !m.is_read).length;
  return (
    <div className="grid gap-3 fade-up">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-xl font-extrabold">{t.messages}</h3>
        <span
          className="px-2.5 py-0.5 rounded-full text-xs font-bold"
          style={{ background: "var(--neutral-soft)", color: "var(--neutral-ink)" }}
        >
          {msgs.data.messages.length} {t.messageCount}
        </span>
        {unreadCount > 0 ? (
          <span
            className="px-2.5 py-0.5 rounded-full text-xs font-bold"
            style={{ background: "var(--accent3)", color: "#FFFFFF" }}
          >
            {unreadCount} {t.unread}
          </span>
        ) : null}
      </div>
      {msgs.data.messages.map((m) => (
        <div key={m.id} className="card p-4">
          <button
            type="button"
            className="w-full text-start p-0"
            style={{ minHeight: 0 }}
            onClick={() => {
              setOpenId(openId === m.id ? null : m.id);
              if (!m.is_read) toggle.mutate({ id: m.id, is_read: true });
            }}
            aria-expanded={openId === m.id}
          >
            <span className="flex flex-wrap items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${m.is_read ? "opacity-30" : ""}`} style={{ background: "var(--accent2)" }} />
              <span className="font-bold">{m.name}</span>
              <span className="dim text-sm truncate">{m.subject || m.body.slice(0, 40)}</span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold shrink-0"
                style={
                  m.is_read
                    ? { background: "var(--neutral-soft)", color: "var(--neutral-ink)" }
                    : { background: "var(--accent3-soft)", color: "var(--accent3)" }
                }
              >
                {m.is_read ? t.readBadge : t.newBadge}
              </span>
              <span className="text-xs ms-auto shrink-0" style={{ color: "var(--neutral)" }}>
                {formatDateTime(m.created_at, lang)}
              </span>
            </span>
          </button>
          {openId === m.id ? (
            <div className="mt-3 pt-3 slide-down" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-sm" style={{ color: "var(--neutral)" }}>
                {t.from}: <span className="font-bold" style={{ color: "var(--text)" }}>{m.name}</span>
                {" · "}
                {formatDateTime(m.created_at, lang)}
              </p>
              {m.subject ? <p className="font-bold mt-2">{m.subject}</p> : null}
              <p className="mt-2 leading-loose whitespace-pre-line">{m.body}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  type="button"
                  className="btn-ghost px-3 py-1.5 text-sm"
                  onClick={() => toggle.mutate({ id: m.id, is_read: !m.is_read })}
                >
                  {m.is_read ? t.markUnread : t.markRead}
                </button>
                {confirmDeleteId === m.id ? (
                  <>
                    <span className="text-sm font-bold self-center" style={{ color: "#B3261E" }}>
                      {t.deleteMessageConfirm}
                    </span>
                    <button
                      type="button"
                      className="btn-ghost px-3 py-1.5 text-sm"
                      style={{ color: "#B3261E", borderColor: "#B3261E" }}
                      onClick={() => del.mutate(m.id)}
                      disabled={del.isPending}
                    >
                      {t.confirmDelete}
                    </button>
                    <button
                      type="button"
                      className="btn-ghost px-3 py-1.5 text-sm"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      {t.cancel}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="btn-ghost px-3 py-1.5 text-sm"
                    style={{ color: "#B3261E" }}
                    onClick={() => setConfirmDeleteId(m.id)}
                  >
                    {t.delete}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ---------------- security ---------------- */

function SecurityTab({ t, token, onLogout }: { t: Dict; token: string; onLogout: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [notice, setNotice] = useState({ ok: true, text: "" });
  const change = useMutation({
    mutationFn: async () => await api.changeAdminPin({ token, current_pin: current, new_pin: next }),
    onSuccess: () => {
      setCurrent(""); setNext("");
      setNotice({ ok: true, text: t.pinChanged });
    },
    onError: (e) => setNotice({ ok: false, text: e instanceof Error ? e.message : t.saveError }),
  });
  return (
    <div className="grid gap-4 fade-up max-w-lg">
      <form
        className="card p-5 grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (next.length < 6) {
            setNotice({ ok: false, text: t.pinShort });
            return;
          }
          change.mutate();
        }}
      >
        <h3 className="font-display text-lg font-extrabold">{t.changePin}</h3>
        <div>
          <label htmlFor="sec-current" className="label">{t.currentPin}</label>
          <input id="sec-current" type="password" className="input" dir="ltr" {...FIELDS.changeAdminPin.current_pin} value={current}
            onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
        </div>
        <div>
          <label htmlFor="sec-new" className="label">{t.newPin}</label>
          <input id="sec-new" type="password" className="input" dir="ltr" {...FIELDS.changeAdminPin.new_pin} value={next}
            onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
        </div>
        <Notice ok={notice.ok} text={notice.text} />
        <div>
          <button type="submit" className="btn-primary px-6 py-2.5" disabled={change.isPending}>{t.save}</button>
        </div>
      </form>
      <div>
        <button type="button" className="btn-ghost px-5 py-2.5" onClick={onLogout}>{t.logout}</button>
      </div>
    </div>
  );
}
