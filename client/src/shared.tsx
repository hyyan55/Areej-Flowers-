import { api, type ApiResponse } from "./api";
import type { Dict, Lang } from "./i18n";

export type SiteData = ApiResponse<typeof api, "getSite">;
export type Settings = SiteData["settings"];
export type Profile = SiteData["profile"];
export type Category = SiteData["categories"][number];
export type Post = ApiResponse<typeof api, "listPosts">["posts"][number];
export type MediaItem = ApiResponse<typeof api, "listMedia">["items"][number];

export function formatDate(iso: string | null, lang: Lang): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(iso: string | null, lang: Lang): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(lang === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Visitor statistics: expand sparse daily counts into a full series of the
// last `days` UTC days (oldest first), filling days without visits with 0.
export function buildDailySeries(
  daily: { date: string; count: number }[],
  days = 30,
): { date: string; count: number }[] {
  const byDate = new Map(daily.map((d) => [d.date, d.count]));
  const out: { date: string; count: number }[] = [];
  const now = new Date();
  const base = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  for (let i = days - 1; i >= 0; i--) {
    const key = new Date(base - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
    out.push({ date: key, count: byDate.get(key) ?? 0 });
  }
  return out;
}

function fileToBase64(file: File): Promise<{ dataBase64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        const comma = result.indexOf(",");
        resolve({
          dataBase64: comma >= 0 ? result.slice(comma + 1) : result,
          mimeType: file.type || "application/octet-stream",
        });
      } else {
        reject(new Error("تعذّر قراءة الملف."));
      }
    };
    reader.onerror = () => reject(new Error("تعذّر قراءة الملف."));
    reader.readAsDataURL(file);
  });
}

export async function uploadImageFile(
  token: string,
  file: File,
  kind: "logo" | "photo" | "cover" | "content" | "favicon" | "general",
) {
  const { dataBase64, mimeType } = await fileToBase64(file);
  return await api.uploadMedia({
    token,
    filename: file.name,
    mime_type: mimeType,
    data_base64: dataBase64,
    kind,
  });
}

export function SocialLinks({
  links,
  t,
  className = "",
}: {
  links: Record<string, string>;
  t: Dict;
  className?: string;
}) {
  const entries = Object.entries(links).filter(([, v]) => v.trim());
  if (entries.length === 0) return null;
  const labels: Record<string, string> = {
    instagram: t.instagram,
    facebook: t.facebook,
    twitterX: t.twitterX,
    telegram: t.telegram,
    whatsapp: t.whatsapp,
    youtube: t.youtube,
    tiktok: t.tiktok,
  };
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {entries.map(([key, url]) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="chip px-3 py-1.5 text-sm inline-flex items-center"
          aria-label={labels[key] ?? key}
        >
          {labels[key] ?? key}
        </a>
      ))}
    </div>
  );
}

export function PostCard({
  post,
  t,
  lang,
  onOpen,
}: {
  post: Post;
  t: Dict;
  lang: Lang;
  onOpen: (slug: string) => void;
}) {
  return (
    <article className="card overflow-hidden flex flex-col fade-up">
      {post.cover_url ? (
        <button
          type="button"
          onClick={() => onOpen(post.slug)}
          className="block w-full p-0"
          aria-label={post.title}
        >
          <img
            src={post.cover_url}
            alt={post.title}
            className="w-full h-44 object-cover"
            loading="lazy"
          />
        </button>
      ) : null}
      <div className="p-5 flex flex-col gap-2 grow">
        <div className="flex flex-wrap items-center gap-2 text-xs dim">
          {post.category_name ? (
            <span
              className="px-2 py-0.5 rounded-full font-bold"
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
            <span
              className="px-2 py-0.5 rounded-full font-bold"
              style={{ background: "var(--accent2)", color: "#49305F" }}
            >
              {t.sampleBadge}
            </span>
          ) : null}
          {post.featured ? <span className="font-bold" style={{ color: "var(--accent)" }}>★ {t.featuredBadge}</span> : null}
          <span>{formatDate(post.published_at, lang)}</span>
          <span>· {post.reading_minutes} {t.minRead}</span>
        </div>
        <h3 className="font-display text-xl font-bold leading-snug">
          <button type="button" onClick={() => onOpen(post.slug)} className="text-start p-0" style={{ minHeight: 0 }}>
            {post.title}
          </button>
        </h3>
        {post.excerpt ? <p className="dim text-sm leading-relaxed line-clamp-3">{post.excerpt}</p> : null}
        <div className="mt-auto pt-2">
          <button
            type="button"
            onClick={() => onOpen(post.slug)}
            className="font-bold text-sm p-0"
            style={{ color: "var(--accent)", minHeight: 0 }}
          >
            {t.readArticle} {lang === "ar" ? "←" : "→"}
          </button>
        </div>
      </div>
    </article>
  );
}
