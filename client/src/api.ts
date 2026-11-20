// Supabase client + API implementation.
//
// The original site talked to server actions. This project has no server:
// Supabase (Postgres + Auth + Storage) with @supabase/supabase-js, keeping
// the exact same method names, arguments and response shapes the React
// components already use — so App.tsx / Admin.tsx / shared.tsx call sites
// stay unchanged.
//
// Data mapping (verified against the live project):
//   posts      -> articles   (slug, status, published_at columns + data JSONB)
//   categories -> categories (slug column + data JSONB)
//   settings   -> site_settings (single row id='site', data JSONB)
//   profile    -> profiles      (single row id='profile', data JSONB)
//   messages   -> messages   (name, subject, body, is_read, created_at)
//   media      -> media      (name, storage_path, content_type, size_bytes)
//                + Storage bucket "areej-media" (public read).
// The publishable key below is public by design (it ships in the browser
// bundle). Never put the service_role key in this file.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const SUPABASE_URL = "https://brpfiahribknkoqxzcch.supabase.co";
export const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lAAaaAB7EqYn5UaKBpVeJA_-3Ww2KCH";
export const ADMIN_EMAIL = "hyyanmohamed55@gmail.com";
export const ADMIN_USERNAME = "admin";
const MEDIA_BUCKET = "areej-media";

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ---------- response types (same shapes the components expect) ----------

export interface PostOut {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_url: string | null;
  cover_media_id: number | null;
  category_id: number | null;
  category_name: string | null;
  section: string;
  status: string;
  featured: boolean;
  is_sample: boolean;
  author_name: string;
  published_at: string | null;
  seo_title: string;
  seo_description: string;
  reading_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface SettingsOut {
  site_name: string;
  site_description: string;
  tagline_ar: string;
  tagline_en: string;
  theme_preset: string;
  custom_primary: string | null;
  custom_secondary: string | null;
  custom_bg: string | null;
  custom_accent_blue: string | null;
  custom_gray: string | null;
  appearance_default: string;
  default_language: string;
  header_identity: string;
  logo_media_id: number | null;
  photo_media_id: number | null;
  favicon_media_id: number | null;
  logo_url: string | null;
  photo_url: string | null;
  favicon_url: string | null;
  footer_text: string;
  contact_email: string;
  social_links: Record<string, string>;
  seo_title: string;
  seo_description: string;
}

export interface ProfileOut {
  full_name_ar: string;
  full_name_en: string;
  bio: string;
  city: string;
  university: string;
  academic_level: string;
  profession: string;
  philosophy: string;
  academic_journey: string;
  writing_interests: string;
  education_interests: string;
}

export interface CategoryOut {
  id: number;
  name: string;
  slug: string;
  description: string;
  section: string;
  post_count: number;
}

export interface MediaOut {
  id: number;
  url: string;
  filename: string;
  mime: string;
  size: number;
  kind: string;
  used_as: string[];
  created_at: string;
}

export interface MessageOut {
  id: number;
  name: string;
  email: string;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

// ---------- helpers ----------

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return base || `post-${Date.now().toString(36)}`;
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}

async function requireAdmin(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error("انتهت الجلسة أو لم يتم تسجيل الدخول. سجّل الدخول من جديد.");
  const { data, error } = await supabase.rpc("is_admin");
  if (error || data !== true) {
    throw new Error("انتهت الجلسة أو لم يتم تسجيل الدخول. سجّل الدخول من جديد.");
  }
}

function publicUrl(storagePath: string): string {
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

// The media kind is encoded in the storage path: media/<kind>/...
// Rows uploaded by the older single-file build have no kind segment.
function kindFromPath(storagePath: string): string {
  const parts = storagePath.split("/");
  if (parts.length >= 2 && parts[0] === "media") {
    const kind = parts[1] ?? "";
    if (["logo", "photo", "cover", "content", "favicon", "general"].includes(kind)) return kind;
  }
  return "general";
}

// ---------- Supabase row shapes ----------

interface ArticleRow {
  id: number;
  slug: string;
  status: string;
  published_at: string | null;
  data: Record<string, unknown> | null;
}

interface CategoryRow {
  id: number;
  slug: string;
  data: Record<string, unknown> | null;
}

interface MediaRow {
  id: number;
  name: string;
  storage_path: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
}

interface PostData {
  title: string;
  excerpt: string;
  content: string;
  cover_media_id: number | null;
  category_id: number | null;
  section: string;
  featured: boolean;
  is_sample: boolean;
  author_name: string;
  seo_title: string;
  seo_description: string;
  created_at: string;
  updated_at: string;
}

function postDataOf(row: ArticleRow): PostData {
  const d = row.data ?? {};
  return {
    title: str(d.title),
    excerpt: str(d.excerpt),
    content: str(d.content),
    cover_media_id: numOrNull(d.cover_media_id),
    category_id: numOrNull(d.category_id),
    section: str(d.section, "writings"),
    featured: d.featured === true,
    is_sample: d.is_sample === true,
    author_name: str(d.author_name),
    seo_title: str(d.seo_title),
    seo_description: str(d.seo_description),
    created_at: str(d.created_at),
    updated_at: str(d.updated_at),
  };
}

async function loadCategoryMap(): Promise<Map<number, string>> {
  const { data, error } = await supabase.from("categories").select("id,data");
  if (error) throw error;
  const map = new Map<number, string>();
  for (const row of (data ?? []) as CategoryRow[]) {
    map.set(row.id, str(row.data?.name));
  }
  return map;
}

async function loadMediaMap(): Promise<Map<number, string>> {
  const { data, error } = await supabase.from("media").select("id,storage_path");
  if (error) throw error;
  const map = new Map<number, string>();
  for (const row of (data ?? []) as MediaRow[]) {
    map.set(row.id, publicUrl(row.storage_path));
  }
  return map;
}

function toPostOut(row: ArticleRow, categories: Map<number, string>, media: Map<number, string>): PostOut {
  const d = postDataOf(row);
  const plain = d.content.replace(/<[^>]+>/g, " ").trim();
  const words = plain ? plain.split(/\s+/).length : 0;
  return {
    id: row.id,
    title: d.title,
    slug: row.slug,
    excerpt: d.excerpt,
    content: d.content,
    cover_url: d.cover_media_id ? (media.get(d.cover_media_id) ?? null) : null,
    cover_media_id: d.cover_media_id,
    category_id: d.category_id,
    category_name: d.category_id ? (categories.get(d.category_id) ?? null) : null,
    section: d.section,
    status: row.status,
    featured: d.featured,
    is_sample: d.is_sample,
    author_name: d.author_name,
    published_at: row.published_at,
    seo_title: d.seo_title,
    seo_description: d.seo_description,
    reading_minutes: Math.max(1, Math.round(words / 180)),
    created_at: d.created_at,
    updated_at: d.updated_at,
  };
}

async function fetchArticles(publishedOnly: boolean): Promise<ArticleRow[]> {
  let q = supabase
    .from("articles")
    .select("id,slug,status,published_at,data")
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });
  if (publishedOnly) q = q.eq("status", "published");
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ArticleRow[];
}

// ---------- in-memory defaults (used when the DB rows are missing) ----------

export const DEFAULT_SETTINGS: SettingsOut = {
  site_name: "Areej Flowers",
  site_description: "",
  tagline_ar: "مساحة للكلمات، والمعرفة، والأثر الجميل.",
  tagline_en: "A space for words, knowledge, and beautiful impact.",
  theme_preset: "lavender",
  custom_primary: null,
  custom_secondary: null,
  custom_bg: null,
  custom_accent_blue: null,
  custom_gray: null,
  appearance_default: "light",
  default_language: "ar",
  header_identity: "text",
  logo_media_id: null,
  photo_media_id: null,
  favicon_media_id: null,
  logo_url: null,
  photo_url: null,
  favicon_url: null,
  footer_text: "",
  contact_email: "",
  social_links: {},
  seo_title: "",
  seo_description: "",
};

export const DEFAULT_PROFILE: ProfileOut = {
  full_name_ar: "أريج خضر محمد النور",
  full_name_en: "Areej Khader Mohammed Alnoor",
  bio: "كاتبة وصانعة محتوى تعليمي وتثقيفي، تؤمن بأن وراء كل محتوى رسالة وهدفاً نبيلاً.",
  city: "كسلا، السودان",
  university: "جامعة الشرق للعلوم والتكنولوجيا",
  academic_level: "طالبة في المستوى الثاني، كلية الطب",
  profession: "كاتبة، صانعة محتوى تعليمي، صانعة محتوى تثقيفي",
  philosophy:
    "أؤمن بأن وراء كل محتوى رسالة وهدفاً نبيلاً، وأن الكلمة الصادقة والمعرفة النافعة قادرتان على ترك أثر جميل في حياة الآخرين.",
  academic_journey: "",
  writing_interests: "",
  education_interests: "",
};

async function loadSettings(): Promise<SettingsOut> {
  const { data, error } = await supabase.from("site_settings").select("data").eq("id", "site").maybeSingle();
  if (error) throw error;
  const d = (data?.data ?? {}) as Partial<SettingsOut>;
  const merged: SettingsOut = { ...DEFAULT_SETTINGS, ...d };
  merged.social_links =
    d.social_links && typeof d.social_links === "object" ? (d.social_links as Record<string, string>) : {};
  // Resolve branding media ids to public URLs.
  const media = await loadMediaMap();
  merged.logo_url = merged.logo_media_id ? (media.get(merged.logo_media_id) ?? null) : null;
  merged.photo_url = merged.photo_media_id ? (media.get(merged.photo_media_id) ?? null) : null;
  merged.favicon_url = merged.favicon_media_id ? (media.get(merged.favicon_media_id) ?? null) : null;
  return merged;
}

async function loadProfile(): Promise<ProfileOut> {
  const { data, error } = await supabase.from("profiles").select("data").eq("id", "profile").maybeSingle();
  if (error) throw error;
  const d = (data?.data ?? {}) as Partial<ProfileOut>;
  return { ...DEFAULT_PROFILE, ...d };
}

async function fetchCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase.from("categories").select("id,slug,data").order("id", { ascending: true });
  if (error) throw error;
  return (data ?? []) as CategoryRow[];
}

function categoryOut(row: CategoryRow, publishedCount: number): CategoryOut {
  const d = row.data ?? {};
  return {
    id: row.id,
    name: str(d.name),
    slug: row.slug,
    description: str(d.description),
    section: str(d.section, "general"),
    post_count: publishedCount,
  };
}

// ---------- public actions ----------

// ---------- render-first site loading ----------
// The app must paint instantly, even when the database is cold or dead:
// visitors see the built-in defaults (or the last cached copy) at once,
// and the live data replaces them in the background when it arrives.
// A slow database must never leave the visitor staring at a loading
// screen — that was the root cause of pages "not opening".

export interface SitePayload {
  settings: SettingsOut;
  profile: ProfileOut;
  categories: CategoryOut[];
}

const SITE_CACHE_KEY = "af_site_cache";

export function getInitialSite(): SitePayload {
  try {
    const raw = localStorage.getItem(SITE_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SitePayload>;
      if (parsed && typeof parsed === "object" && parsed.settings && parsed.profile) {
        return {
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings as Partial<SettingsOut>) },
          profile: { ...DEFAULT_PROFILE, ...(parsed.profile as Partial<ProfileOut>) },
          categories: Array.isArray(parsed.categories) ? (parsed.categories as CategoryOut[]) : [],
        };
      }
    }
  } catch {
    // Corrupt cache — fall through to the built-in defaults.
  }
  return { settings: DEFAULT_SETTINGS, profile: DEFAULT_PROFILE, categories: [] };
}

function writeSiteCache(payload: SitePayload): void {
  try {
    localStorage.setItem(SITE_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — the app still works from defaults.
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<T>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer !== undefined) clearTimeout(timer);
  });
}

async function fetchSiteFresh(): Promise<SitePayload> {
  const [settings, profile, cats] = await Promise.all([loadSettings(), loadProfile(), fetchCategories()]);
  const published = await fetchArticles(true);
  const counts = new Map<number, number>();
  for (const row of published) {
    const cid = postDataOf(row).category_id;
    if (cid) counts.set(cid, (counts.get(cid) ?? 0) + 1);
  }
  return {
    settings,
    profile,
    categories: cats.map((c) => categoryOut(c, counts.get(c.id) ?? 0)),
  };
}

async function getSite(_args: Record<string, never>): Promise<SitePayload> {
  const cached = getInitialSite();
  const freshPromise = fetchSiteFresh();
  // Even when the live fetch is too slow for this visit, its result still
  // lands in the cache and notifies the UI, so the page updates by itself.
  void freshPromise
    .then((fresh) => {
      writeSiteCache(fresh);
      window.dispatchEvent(new CustomEvent<SitePayload>("af-site-updated", { detail: fresh }));
    })
    .catch(() => undefined);
  try {
    const fresh = await withTimeout(freshPromise, 4000);
    writeSiteCache(fresh);
    return fresh;
  } catch {
    return cached;
  }
}

async function bootstrap(_args: Record<string, never>): Promise<{ seeded: boolean }> {
  try {
    // Seeding writes to the DB, so only an admin session may do it.
    // Visitors never write — and a failed seed must never block rendering.
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return { seeded: false };
    const { data: isAdmin, error: rpcError } = await supabase.rpc("is_admin");
    if (rpcError || isAdmin !== true) return { seeded: false };

    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("id", "site")
      .maybeSingle();
    if (existing) return { seeded: false };

    const nowIso = new Date().toISOString();
    const seedSettings: SettingsOut = {
      ...DEFAULT_SETTINGS,
      site_description:
        "المساحة الشخصية لأريج خضر محمد النور — كاتبة وصانعة محتوى تعليمي وتثقيفي من كسلا، السودان.",
      footer_text: "Areej Flowers — مساحة للكلمات، والمعرفة، والأثر الجميل.",
    };
    const { error: e1 } = await supabase
      .from("site_settings")
      .upsert({ id: "site", data: seedSettings, updated_at: nowIso });
    if (e1) throw e1;
    const { error: e2 } = await supabase
      .from("profiles")
      .upsert({ id: "profile", data: DEFAULT_PROFILE, updated_at: nowIso });
    if (e2) throw e2;

    const catDefs = [
      { name: "خواطر وتأملات", section: "writings", description: "نصوص أدبية وتأملات شخصية" },
      { name: "محتوى تعليمي", section: "education", description: "شروحات ومحتوى تعليمي مبسّط" },
      { name: "يوميات", section: "journal", description: "من يومياتي وأفكاري" },
    ] as const;
    const catIds: Record<string, number> = {};
    for (const c of catDefs) {
      const { data, error } = await supabase
        .from("categories")
        .insert({
          slug: slugify(c.name) + "-" + c.section,
          data: { name: c.name, description: c.description, section: c.section },
        })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("تعذّر إنشاء التصنيفات.");
      catIds[c.section] = data.id;
    }

    const samples = [
      {
        title: "محتوى نموذجي: لماذا أكتب؟",
        excerpt: "هذا منشور نموذجي للعرض فقط — يمكن حذفه أو استبداله من لوحة التحكم.",
        content:
          "<p>هذا منشور <strong>نموذجي</strong> وُضع لعرض شكل المقالات في الموقع، ويمكن لصاحبة الموقع حذفه أو تحريره من لوحة التحكم في أي وقت.</p><p>الكتابة بالنسبة إليّ ليست ترفاً، بل طريقة لفهم العالم ومشاركة ما أتعلمه مع الآخرين. كل نص أكتبه يحمل رسالة أرجو أن تترك أثراً جميلاً في نفس قارئه.</p><blockquote>الكلمة الصادقة تصل، ولو بعد حين.</blockquote><p>من هنا، من كسلا، أكتب وأتعلّم وأشارك.</p>",
        section: "writings",
        categoryId: catIds["writings"] ?? null,
        featured: true,
      },
      {
        title: "محتوى نموذجي: كيف أذاكر بذكاء؟",
        excerpt: "هذا منشور نموذجي للعرض فقط — يمكن حذفه أو استبداله من لوحة التحكم.",
        content:
          "<p>هذا منشور <strong>نموذجي</strong> للعرض فقط، يوضّح شكل المحتوى التعليمي في الموقع.</p><h2>ثلاث عادات بسيطة</h2><ul><li>راجع بفترات متباعدة بدل الحشو في ليلة واحدة.</li><li>اشرح ما تعلمته بصوتك — الشرح أفضل اختبار للفهم.</li><li>اربط المعلومة الجديدة بما تعرفه من قبل.</li></ul><p>هذه عادات عامة للمذاكرة الفعّالة، وليست نصائح طبية.</p>",
        section: "education",
        categoryId: catIds["education"] ?? null,
        featured: false,
      },
      {
        title: "محتوى نموذجي: من يوميات طالبة طب",
        excerpt: "هذا منشور نموذجي للعرض فقط — يمكن حذفه أو استبداله من لوحة التحكم.",
        content:
          "<p>هذا منشور <strong>نموذجي</strong> للعرض فقط، يوضّح شكل قسم اليوميات والأفكار.</p><p>بين المحاضرات والكتب، أجد دائماً لحظة صغيرة للكتابة. لحظة أكتب فيها ما تعلّمته اليوم، وما أدهشني، وما أرجو أن أتذكّره غداً.</p>",
        section: "journal",
        categoryId: catIds["journal"] ?? null,
        featured: false,
      },
    ];
    for (const s of samples) {
      const data: PostData = {
        title: s.title,
        excerpt: s.excerpt,
        content: s.content,
        cover_media_id: null,
        category_id: s.categoryId,
        section: s.section,
        featured: s.featured,
        is_sample: true,
        author_name: "أريج خضر محمد النور",
        seo_title: "",
        seo_description: "",
        created_at: nowIso,
        updated_at: nowIso,
      };
      const { error } = await supabase.from("articles").insert({
        slug: slugify(s.title) + "-" + Math.random().toString(36).slice(2, 7),
        status: "published",
        published_at: nowIso,
        data,
      });
      if (error) throw error;
    }
    return { seeded: true };
  } catch {
    return { seeded: false };
  }
}

interface ListPostsArgs {
  section?: "writings" | "education" | "journal";
  category_id?: number;
  search?: string;
  featured_only?: boolean;
  limit?: number;
  offset?: number;
}

async function listPosts(args: ListPostsArgs): Promise<{ posts: PostOut[]; total: number }> {
  const rows = await fetchArticles(true);
  const [cats, media] = await Promise.all([loadCategoryMap(), loadMediaMap()]);
  let filtered = rows;
  if (args.section) filtered = filtered.filter((r) => postDataOf(r).section === args.section);
  if (args.category_id) filtered = filtered.filter((r) => postDataOf(r).category_id === args.category_id);
  if (args.featured_only) filtered = filtered.filter((r) => postDataOf(r).featured === true);
  if (args.search) {
    const term = args.search.toLowerCase();
    filtered = filtered.filter((r) => {
      const d = postDataOf(r);
      return (
        d.title.toLowerCase().includes(term) ||
        d.excerpt.toLowerCase().includes(term) ||
        d.content.toLowerCase().includes(term)
      );
    });
  }
  const total = filtered.length;
  const limit = args.limit ?? 12;
  const offset = args.offset ?? 0;
  const page = filtered.slice(offset, offset + limit);
  return { posts: page.map((r) => toPostOut(r, cats, media)), total };
}

async function getPost(args: { slug: string }): Promise<{ post: PostOut | null; related: PostOut[] }> {
  const { data, error } = await supabase
    .from("articles")
    .select("id,slug,status,published_at,data")
    .eq("slug", args.slug)
    .eq("status", "published")
    .limit(1);
  if (error) throw error;
  const row = ((data ?? [])[0] ?? null) as ArticleRow | null;
  if (!row) return { post: null, related: [] };
  const [cats, media] = await Promise.all([loadCategoryMap(), loadMediaMap()]);
  const post = toPostOut(row, cats, media);
  const published = await fetchArticles(true);
  const related = published
    .filter((r) => postDataOf(r).section === post.section && r.id !== row.id)
    .slice(0, 3)
    .map((r) => toPostOut(r, cats, media));
  return { post, related };
}

async function submitMessage(args: {
  name: string;
  subject: string;
  body: string;
  website?: string;
}): Promise<{ ok: true }> {
  // Honeypot: bots fill the hidden "website" field; accept silently, store nothing.
  if ((args.website ?? "").trim()) return { ok: true };
  // Local rate limit: at most 5 stored messages per 10-minute window.
  const KEY = "af_msg_times";
  let times: number[] = [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    if (Array.isArray(parsed)) times = parsed.filter((x): x is number => typeof x === "number");
  } catch {
    times = [];
  }
  const now = Date.now();
  times = times.filter((x) => now - x < 10 * 60 * 1000);
  if (times.length >= 5) throw new Error("RATE_LIMIT_EXCEEDED");
  times.push(now);
  try {
    localStorage.setItem(KEY, JSON.stringify(times));
  } catch {
    /* storage unavailable — continue anyway */
  }
  const name = args.name.trim();
  const subject = args.subject.trim();
  const body = args.body.trim();
  if (name.length < 2 || subject.length < 2 || body.length < 5) {
    throw new Error("تحقق من حقول الرسالة.");
  }
  // Insert WITHOUT .select(): anonymous visitors cannot read messages back
  // (SELECT is admin-only), and asking for the row fails the whole request.
  const { error } = await supabase.from("messages").insert({
    name,
    subject,
    body,
    is_read: false,
    created_at: new Date(now).toISOString(),
  });
  if (error) throw error;
  return { ok: true };
}

// ---------- admin auth ----------

async function adminStatus(_args: Record<string, never>): Promise<{ configured: boolean }> {
  // The admin account already exists in Supabase Auth.
  return { configured: true };
}

async function setupAdminPin(_args: { pin: string }): Promise<{ token: string; expires_at: number }> {
  // The admin account already exists in Supabase Auth; there is nothing to
  // set up. This is kept only so the login screen's setup branch still
  // resolves (it is never reached because adminStatus is always true).
  return { token: "already-configured", expires_at: Date.now() + 7 * 24 * 3600 * 1000 };
}

async function loginAdmin(args: { pin: string }): Promise<{ token: string; expires_at: number }> {
  // The login screen asks for the admin password (the "pin" argument is the
  // password). The username "admin" maps to the admin email internally.
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: args.pin,
  });
  if (error || !data.session) throw new Error("كلمة المرور غير صحيحة.");
  return { token: data.session.access_token, expires_at: (data.session.expires_at ?? 0) * 1000 };
}

async function logoutAdmin(_args: { token: string }): Promise<{ ok: true }> {
  await supabase.auth.signOut();
  return { ok: true };
}

async function changeAdminPin(args: {
  token: string;
  current_pin: string;
  new_pin: string;
}): Promise<{ ok: true }> {
  if (args.new_pin.length < 6) throw new Error("يجب أن تكون كلمة المرور 6 أحرف على الأقل.");
  // Verify the current password by signing in again, then change it.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: args.current_pin,
  });
  if (signInError) throw new Error("كلمة المرور الحالية غير صحيحة.");
  const { error } = await supabase.auth.updateUser({ password: args.new_pin });
  if (error) throw error;
  return { ok: true };
}

async function requestPasswordReset(_args: Record<string, never> = {}): Promise<{ ok: true }> {
  const { error } = await supabase.auth.resetPasswordForEmail(ADMIN_EMAIL);
  if (error) throw error;
  return { ok: true };
}

async function setNewPassword(args: { password: string }): Promise<{ ok: true }> {
  if (args.password.length < 6) throw new Error("يجب أن تكون كلمة المرور 6 أحرف على الأقل.");
  const { error } = await supabase.auth.updateUser({ password: args.password });
  if (error) throw error;
  await supabase.auth.signOut();
  return { ok: true };
}

async function isRecoverySession(): Promise<boolean> {
  if (!window.location.hash.includes("type=recovery")) return false;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return !!session;
}

function onPasswordRecovery(cb: () => void): () => void {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") cb();
  });
  return () => subscription.unsubscribe();
}

// ---------- admin: overview & posts ----------

async function getAdminOverview(_args: { token: string }): Promise<{
  published_count: number;
  draft_count: number;
  category_count: number;
  message_count: number;
  unread_count: number;
  recent_posts: PostOut[];
  recent_messages: { id: number; name: string; subject: string; created_at: string; is_read: boolean }[];
}> {
  await requireAdmin();
  const [rows, cats, msgRes] = await Promise.all([
    fetchArticles(false),
    fetchCategories(),
    supabase.from("messages").select("id,name,subject,is_read,created_at").order("id", { ascending: false }),
  ]);
  if (msgRes.error) throw msgRes.error;
  const [catMap, mediaMap] = await Promise.all([loadCategoryMap(), loadMediaMap()]);
  const sorted = [...rows].sort((a, b) => postDataOf(b).updated_at.localeCompare(postDataOf(a).updated_at));
  const msgs = (msgRes.data ?? []) as { id: number; name: string; subject: string; is_read: boolean; created_at: string }[];
  return {
    published_count: rows.filter((r) => r.status === "published").length,
    draft_count: rows.filter((r) => r.status === "draft").length,
    category_count: cats.length,
    message_count: msgs.length,
    unread_count: msgs.filter((m) => !m.is_read).length,
    recent_posts: sorted.slice(0, 5).map((r) => toPostOut(r, catMap, mediaMap)),
    recent_messages: msgs.slice(0, 5).map((m) => ({
      id: m.id,
      name: m.name,
      subject: m.subject,
      created_at: m.created_at,
      is_read: m.is_read,
    })),
  };
}

async function listAdminPosts(args: {
  token: string;
  search?: string;
  status?: "draft" | "published";
}): Promise<{ posts: PostOut[] }> {
  await requireAdmin();
  const rows = await fetchArticles(false);
  const [cats, media] = await Promise.all([loadCategoryMap(), loadMediaMap()]);
  let filtered = rows;
  if (args.status) filtered = filtered.filter((r) => r.status === args.status);
  if (args.search) {
    const term = args.search.toLowerCase();
    filtered = filtered.filter((r) => {
      const d = postDataOf(r);
      return d.title.toLowerCase().includes(term) || d.excerpt.toLowerCase().includes(term);
    });
  }
  filtered = [...filtered].sort((a, b) => postDataOf(b).updated_at.localeCompare(postDataOf(a).updated_at));
  return { posts: filtered.map((r) => toPostOut(r, cats, media)) };
}

interface SavePostArgs {
  token: string;
  id?: number;
  title: string;
  slug?: string;
  excerpt?: string;
  content?: string;
  cover_media_id?: number | null;
  category_id?: number | null;
  section?: "writings" | "education" | "journal";
  status?: "draft" | "published";
  featured?: boolean;
  author_name?: string;
  published_at?: string | null;
  seo_title?: string;
  seo_description?: string;
}

async function savePost(args: SavePostArgs): Promise<{ post: PostOut }> {
  await requireAdmin();
  const content = sanitizeHtml(args.content ?? "");
  let slug = args.slug ? slugify(args.slug) : slugify(args.title);
  const { data: clash } = await supabase.from("articles").select("id").eq("slug", slug).limit(1);
  if (clash && clash.length > 0 && (clash[0] as { id: number }).id !== args.id) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }
  const nowIso = new Date().toISOString();
  const status = args.status ?? "draft";
  const section = args.section ?? "writings";

  let row: ArticleRow;
  if (args.id) {
    const { data: existing } = await supabase
      .from("articles")
      .select("id,slug,status,published_at,data")
      .eq("id", args.id)
      .limit(1);
    const prev = ((existing ?? [])[0] ?? null) as ArticleRow | null;
    if (!prev) throw new Error("المنشور غير موجود.");
    const prevData = postDataOf(prev);
    const finalPublishedAt = args.published_at
      ? new Date(args.published_at).toISOString()
      : (prev.published_at ?? (status === "published" ? nowIso : null));
    const data: PostData = {
      title: args.title,
      excerpt: args.excerpt ?? "",
      content,
      cover_media_id: args.cover_media_id ?? null,
      category_id: args.category_id ?? null,
      section,
      featured: args.featured ?? false,
      is_sample: false,
      author_name: args.author_name ?? "",
      seo_title: args.seo_title ?? "",
      seo_description: args.seo_description ?? "",
      created_at: prevData.created_at || nowIso,
      updated_at: nowIso,
    };
    const { error } = await supabase
      .from("articles")
      .update({ slug, status, published_at: finalPublishedAt, data })
      .eq("id", args.id);
    if (error) throw error;
    const { data: after, error: afterError } = await supabase
      .from("articles")
      .select("id,slug,status,published_at,data")
      .eq("id", args.id)
      .limit(1);
    if (afterError || !after || after.length === 0) throw afterError ?? new Error("تعذّر حفظ المنشور.");
    row = after[0] as ArticleRow;
  } else {
    const publishedAt = args.published_at
      ? new Date(args.published_at).toISOString()
      : status === "published"
        ? nowIso
        : null;
    const data: PostData = {
      title: args.title,
      excerpt: args.excerpt ?? "",
      content,
      cover_media_id: args.cover_media_id ?? null,
      category_id: args.category_id ?? null,
      section,
      featured: args.featured ?? false,
      is_sample: false,
      author_name: args.author_name ?? "",
      seo_title: args.seo_title ?? "",
      seo_description: args.seo_description ?? "",
      created_at: nowIso,
      updated_at: nowIso,
    };
    const { data: inserted, error } = await supabase
      .from("articles")
      .insert({ slug, status, published_at: publishedAt, data })
      .select("id,slug,status,published_at,data")
      .single();
    if (error || !inserted) throw error ?? new Error("تعذّر حفظ المنشور.");
    row = inserted as ArticleRow;
  }
  const [cats, media] = await Promise.all([loadCategoryMap(), loadMediaMap()]);
  return { post: toPostOut(row, cats, media) };
}

async function deletePost(args: { token: string; id: number }): Promise<{ ok: true }> {
  await requireAdmin();
  const { error } = await supabase.from("articles").delete().eq("id", args.id);
  if (error) throw error;
  return { ok: true };
}

// ---------- admin: categories ----------

async function countPostsInCategory(categoryId: number): Promise<number> {
  const rows = await fetchArticles(false);
  return rows.filter((r) => postDataOf(r).category_id === categoryId).length;
}

async function saveCategory(args: {
  token: string;
  id?: number;
  name: string;
  description?: string;
  section?: "writings" | "education" | "journal" | "general";
}): Promise<{ category: CategoryOut }> {
  await requireAdmin();
  const section = args.section ?? "general";
  if (args.id) {
    const { data: existing } = await supabase
      .from("categories")
      .select("id,slug,data")
      .eq("id", args.id)
      .limit(1);
    const row = ((existing ?? [])[0] ?? null) as CategoryRow | null;
    if (!row) throw new Error("التصنيف غير موجود.");
    const merged = { ...(row.data ?? {}), name: args.name, description: args.description ?? "", section };
    const { error } = await supabase.from("categories").update({ data: merged }).eq("id", args.id);
    if (error) throw error;
    const count = await countPostsInCategory(args.id);
    return { category: categoryOut({ id: args.id, slug: row.slug, data: merged }, count) };
  }
  const slug = slugify(args.name) + "-" + Math.random().toString(36).slice(2, 6);
  const { data, error } = await supabase
    .from("categories")
    .insert({ slug, data: { name: args.name, description: args.description ?? "", section } })
    .select("id,slug,data")
    .single();
  if (error || !data) throw error ?? new Error("تعذّر حفظ التصنيف.");
  const row = data as CategoryRow;
  return { category: categoryOut(row, 0) };
}

async function deleteCategory(args: {
  token: string;
  id: number;
  force?: boolean;
}): Promise<{ ok: true; used_by: number }> {
  await requireAdmin();
  const rows = await fetchArticles(false);
  const used = rows.filter((r) => postDataOf(r).category_id === args.id);
  if (used.length > 0 && !args.force) {
    throw new Error(`هذا التصنيف مستخدم في ${used.length} منشور. أكّدي الحذف لفكّ ارتباط المنشورات به أولاً.`);
  }
  if (used.length > 0) {
    for (const row of used) {
      const d = postDataOf(row);
      const { error } = await supabase
        .from("articles")
        .update({ data: { ...d, category_id: null } })
        .eq("id", row.id);
      if (error) throw error;
    }
  }
  const { error } = await supabase.from("categories").delete().eq("id", args.id);
  if (error) throw error;
  return { ok: true, used_by: used.length };
}

// ---------- admin: profile & settings ----------

type ProfileArgs = {
  token: string;
} & ProfileOut;

async function saveProfile(args: ProfileArgs): Promise<{ profile: ProfileOut }> {
  await requireAdmin();
  const data: ProfileOut = {
    full_name_ar: args.full_name_ar,
    full_name_en: args.full_name_en,
    bio: args.bio,
    city: args.city,
    university: args.university,
    academic_level: args.academic_level,
    profession: args.profession,
    philosophy: args.philosophy,
    academic_journey: args.academic_journey,
    writing_interests: args.writing_interests,
    education_interests: args.education_interests,
  };
  const { error } = await supabase
    .from("profiles")
    .upsert({ id: "profile", data, updated_at: new Date().toISOString() });
  if (error) throw error;
  return { profile: await loadProfile() };
}

type SettingsArgs = {
  token: string;
} & Omit<SettingsOut, "logo_url" | "photo_url" | "favicon_url">;

async function saveSettings(args: SettingsArgs): Promise<{ settings: SettingsOut }> {
  await requireAdmin();
  const cleanSocial: Record<string, string> = {};
  for (const [k, v] of Object.entries(args.social_links ?? {})) {
    if (v.trim()) cleanSocial[k] = v.trim();
  }
  const data: Omit<SettingsOut, "logo_url" | "photo_url" | "favicon_url"> = {
    site_name: args.site_name,
    site_description: args.site_description,
    tagline_ar: args.tagline_ar,
    tagline_en: args.tagline_en,
    theme_preset: args.theme_preset,
    custom_primary: args.custom_primary,
    custom_secondary: args.custom_secondary,
    custom_bg: args.custom_bg,
    custom_accent_blue: args.custom_accent_blue,
    custom_gray: args.custom_gray,
    appearance_default: args.appearance_default,
    default_language: args.default_language,
    header_identity: args.header_identity,
    logo_media_id: args.logo_media_id,
    photo_media_id: args.photo_media_id,
    favicon_media_id: args.favicon_media_id,
    footer_text: args.footer_text,
    contact_email: args.contact_email,
    social_links: cleanSocial,
    seo_title: args.seo_title,
    seo_description: args.seo_description,
  };
  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: "site", data, updated_at: new Date().toISOString() });
  if (error) throw error;
  return { settings: await loadSettings() };
}

// ---------- admin: media ----------

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "image/gif"];

async function uploadMedia(args: {
  token: string;
  filename: string;
  mime_type: string;
  data_base64: string;
  kind?: "logo" | "photo" | "cover" | "content" | "favicon" | "general";
}): Promise<{ media: MediaOut }> {
  await requireAdmin();
  if (!ALLOWED_MIME.includes(args.mime_type)) {
    throw new Error("نوع الملف غير مدعوم. استخدمي PNG أو JPEG أو WebP أو GIF.");
  }
  const bytes = Uint8Array.from(atob(args.data_base64), (c) => c.charCodeAt(0));
  if (bytes.length === 0) throw new Error("الملف فارغ.");
  if (bytes.length > 4 * 1024 * 1024) throw new Error("حجم الصورة أكبر من 4 ميغابايت.");
  const kind = args.kind ?? "general";
  const safeName = args.filename.replace(/[^\w.\-]+/g, "_");
  const path = `media/${kind}/${Date.now()}-${randomHex(6)}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, bytes, { contentType: args.mime_type, upsert: false });
  if (uploadError) throw uploadError;
  const { data, error } = await supabase
    .from("media")
    .insert({
      name: args.filename,
      storage_path: path,
      content_type: args.mime_type,
      size_bytes: bytes.length,
    })
    .select("id,created_at")
    .single();
  if (error || !data) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    throw error ?? new Error("تعذّر حفظ الصورة.");
  }
  return {
    media: {
      id: data.id,
      url: publicUrl(path),
      filename: args.filename,
      mime: args.mime_type,
      size: bytes.length,
      kind,
      used_as: [],
      created_at: data.created_at,
    },
  };
}

async function listMedia(_args: { token: string }): Promise<{ items: MediaOut[] }> {
  await requireAdmin();
  const { data, error } = await supabase
    .from("media")
    .select("id,name,storage_path,content_type,size_bytes,created_at")
    .order("id", { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as MediaRow[];
  const settings = await loadSettings();
  const articles = await fetchArticles(false);
  return {
    items: rows.map((r) => {
      const usedAs: string[] = [];
      if (settings.logo_media_id === r.id) usedAs.push("logo");
      if (settings.photo_media_id === r.id) usedAs.push("photo");
      if (settings.favicon_media_id === r.id) usedAs.push("favicon");
      if (articles.some((a) => postDataOf(a).cover_media_id === r.id)) usedAs.push("cover");
      return {
        id: r.id,
        url: publicUrl(r.storage_path),
        filename: r.name,
        mime: r.content_type,
        size: r.size_bytes,
        kind: kindFromPath(r.storage_path),
        used_as: usedAs,
        created_at: r.created_at,
      };
    }),
  };
}

async function deleteMedia(args: { token: string; id: number; force?: boolean }): Promise<{ ok: true }> {
  await requireAdmin();
  const { data: found, error: fetchError } = await supabase
    .from("media")
    .select("id,name,storage_path,content_type,size_bytes,created_at")
    .eq("id", args.id)
    .limit(1);
  if (fetchError) throw fetchError;
  const row = ((found ?? [])[0] ?? null) as MediaRow | null;
  if (!row) throw new Error("الصورة غير موجودة.");
  const settings = await loadSettings();
  const articles = await fetchArticles(false);
  const usedPosts = articles.filter((a) => postDataOf(a).cover_media_id === args.id);
  const usedInSettings =
    settings.logo_media_id === args.id ||
    settings.photo_media_id === args.id ||
    settings.favicon_media_id === args.id;
  if ((usedPosts.length > 0 || usedInSettings) && !args.force) {
    throw new Error("هذه الصورة مستخدمة حالياً في الموقع أو في منشور منشور. أكّدي الحذف لإزالتها من كل الأماكن.");
  }
  if (usedPosts.length > 0) {
    for (const a of usedPosts) {
      const d = postDataOf(a);
      const { error } = await supabase
        .from("articles")
        .update({ data: { ...d, cover_media_id: null } })
        .eq("id", a.id);
      if (error) throw error;
    }
  }
  if (usedInSettings) {
    const settingsData = {
      site_name: settings.site_name,
      site_description: settings.site_description,
      tagline_ar: settings.tagline_ar,
      tagline_en: settings.tagline_en,
      theme_preset: settings.theme_preset,
      custom_primary: settings.custom_primary,
      custom_secondary: settings.custom_secondary,
      custom_bg: settings.custom_bg,
      custom_accent_blue: settings.custom_accent_blue,
      custom_gray: settings.custom_gray,
      appearance_default: settings.appearance_default,
      default_language: settings.default_language,
      header_identity: settings.header_identity,
      logo_media_id: settings.logo_media_id === args.id ? null : settings.logo_media_id,
      photo_media_id: settings.photo_media_id === args.id ? null : settings.photo_media_id,
      favicon_media_id: settings.favicon_media_id === args.id ? null : settings.favicon_media_id,
      footer_text: settings.footer_text,
      contact_email: settings.contact_email,
      social_links: settings.social_links,
      seo_title: settings.seo_title,
      seo_description: settings.seo_description,
    };
    const { error } = await supabase
      .from("site_settings")
      .upsert({ id: "site", data: settingsData, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  await supabase.storage.from(MEDIA_BUCKET).remove([row.storage_path]);
  const { error } = await supabase.from("media").delete().eq("id", args.id);
  if (error) throw error;
  return { ok: true };
}

// ---------- admin: messages ----------

async function listMessages(_args: { token: string }): Promise<{ messages: MessageOut[] }> {
  await requireAdmin();
  const { data, error } = await supabase
    .from("messages")
    .select("id,name,subject,body,is_read,created_at")
    .order("id", { ascending: false });
  if (error) throw error;
  return {
    messages: ((data ?? []) as MessageOut[]).map((m) => ({
      id: m.id,
      name: m.name,
      email: "",
      subject: m.subject,
      body: m.body,
      is_read: m.is_read,
      created_at: m.created_at,
    })),
  };
}

async function setMessageRead(args: { token: string; id: number; is_read: boolean }): Promise<{ ok: true }> {
  await requireAdmin();
  const { error } = await supabase.from("messages").update({ is_read: args.is_read }).eq("id", args.id);
  if (error) throw error;
  return { ok: true };
}

async function deleteMessage(args: { token: string; id: number }): Promise<{ ok: true }> {
  await requireAdmin();
  const { error } = await supabase.from("messages").delete().eq("id", args.id);
  if (error) throw error;
  return { ok: true };
}

// ---------- the api object (same names the components already call) ----------

export const api = {
  getSite,
  getInitialSite,
  bootstrap,
  listPosts,
  getPost,
  submitMessage,
  adminStatus,
  setupAdminPin,
  loginAdmin,
  logoutAdmin,
  changeAdminPin,
  requestPasswordReset,
  setNewPassword,
  isRecoverySession,
  onPasswordRecovery,
  getAdminOverview,
  listAdminPosts,
  savePost,
  deletePost,
  saveCategory,
  deleteCategory,
  saveProfile,
  saveSettings,
  uploadMedia,
  listMedia,
  deleteMedia,
  listMessages,
  setMessageRead,
  deleteMessage,
};

// Re-exported for convenience so client code can do
//
//     import { api, type ApiResponse } from "./api";
//     type Post = ApiResponse<typeof api, "listPosts">["posts"][number];
export type ApiResponse<TApi, TAction extends keyof TApi> =
  TApi[TAction] extends (...args: never[]) => infer R ? Awaited<R> : never;
export type ApiRequest<TApi, TAction extends keyof TApi> =
  TApi[TAction] extends (args: infer A) => unknown ? A : never;
