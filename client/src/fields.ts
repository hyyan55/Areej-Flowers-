// Field props for the forms.
//
// The original site generated these from the server action schemas with a
// build-time macro. This project has no server, so the same props
// (name / required / minLength / maxLength) are declared here by hand,
// matching the validation rules of the original actions. They are spread
// onto the inputs exactly like before: `{...FIELDS.submitMessage.name}`.

export interface FieldProps {
  name: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

function f(
  name: string,
  opts: { required?: boolean; minLength?: number; maxLength?: number } = {},
): FieldProps {
  return { name, ...opts };
}

type ProfileFieldKey =
  | "full_name_ar"
  | "full_name_en"
  | "bio"
  | "city"
  | "university"
  | "academic_level"
  | "profession"
  | "philosophy"
  | "academic_journey"
  | "writing_interests"
  | "education_interests";

export const FIELDS = {
  listPosts: {
    search: f("search", { maxLength: 120 }),
  },
  submitMessage: {
    name: f("name", { required: true, minLength: 2, maxLength: 80 }),
    subject: f("subject", { required: true, minLength: 2, maxLength: 120 }),
    body: f("body", { required: true, minLength: 5, maxLength: 4000 }),
    website: f("website", { maxLength: 200 }),
  },
  loginAdmin: {
    pin: f("pin", { required: true, minLength: 1, maxLength: 64 }),
  },
  listAdminPosts: {
    search: f("search", { maxLength: 120 }),
  },
  savePost: {
    title: f("title", { required: true, minLength: 1, maxLength: 200 }),
    slug: f("slug", { maxLength: 120 }),
    author_name: f("author_name", { maxLength: 120 }),
    excerpt: f("excerpt", { maxLength: 600 }),
    published_at: f("published_at", { maxLength: 40 }),
    seo_title: f("seo_title", { maxLength: 200 }),
    seo_description: f("seo_description", { maxLength: 400 }),
  },
  saveCategory: {
    name: f("name", { required: true, minLength: 1, maxLength: 80 }),
    description: f("description", { maxLength: 400 }),
  },
  saveProfile: {
    full_name_ar: f("full_name_ar", { maxLength: 120 }),
    full_name_en: f("full_name_en", { maxLength: 120 }),
    bio: f("bio", { maxLength: 2000 }),
    city: f("city", { maxLength: 120 }),
    university: f("university", { maxLength: 160 }),
    academic_level: f("academic_level", { maxLength: 160 }),
    profession: f("profession", { maxLength: 300 }),
    philosophy: f("philosophy", { maxLength: 1000 }),
    academic_journey: f("academic_journey", { maxLength: 3000 }),
    writing_interests: f("writing_interests", { maxLength: 2000 }),
    education_interests: f("education_interests", { maxLength: 2000 }),
  } as Record<ProfileFieldKey, FieldProps>,
  saveSettings: {
    site_name: f("site_name", { required: true, minLength: 1, maxLength: 80 }),
    site_description: f("site_description", { maxLength: 600 }),
    tagline_ar: f("tagline_ar", { maxLength: 200 }),
    tagline_en: f("tagline_en", { maxLength: 200 }),
    theme_preset: f("theme_preset", { maxLength: 40 }),
    custom_primary: f("custom_primary", { maxLength: 20 }),
    custom_secondary: f("custom_secondary", { maxLength: 20 }),
    custom_bg: f("custom_bg", { maxLength: 20 }),
    custom_accent_blue: f("custom_accent_blue", { maxLength: 20 }),
    custom_gray: f("custom_gray", { maxLength: 20 }),
    appearance_default: f("appearance_default"),
    default_language: f("default_language"),
    header_identity: f("header_identity"),
    logo_media_id: f("logo_media_id"),
    photo_media_id: f("photo_media_id"),
    favicon_media_id: f("favicon_media_id"),
    footer_text: f("footer_text", { maxLength: 400 }),
    contact_email: f("contact_email", { maxLength: 160 }),
    social_links: f("social_links"),
    seo_title: f("seo_title", { maxLength: 200 }),
    seo_description: f("seo_description", { maxLength: 400 }),
  },
  changeAdminPin: {
    current_pin: f("current_pin", { required: true, minLength: 1, maxLength: 64 }),
    new_pin: f("new_pin", { required: true, minLength: 6, maxLength: 64 }),
  },
};
