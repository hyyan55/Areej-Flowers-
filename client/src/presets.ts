export type PresetId = "lavender" | "royal" | "blossom" | "midnight" | "editorial";

export interface Preset {
  id: PresetId;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  light: Record<string, string>;
  dark: Record<string, string>;
}

const base = {
  "--font-body": '"Cairo", "Inter", system-ui, sans-serif',
};


// Approved supporting palette (brief update): blue for the knowledge /
// professional character, gray for balance, backgrounds, and text.
// Purple stays primary, pink stays secondary — blue and gray never lead.
const blueGrayLight = {
  "--accent3": "#668FC2",
  "--accent3-soft": "#E7EFF8",
  "--neutral": "#85858F",
  "--neutral-soft": "#F0F0F3",
  "--neutral-ink": "#34343D",
};

const blueGrayDark = {
  "--accent3": "#93B4DC",
  "--accent3-soft": "#2A3A52",
  "--neutral": "#A9A9B4",
  "--neutral-soft": "#2E2E36",
  "--neutral-ink": "#EDEDF1",
};

export const PRESETS: Preset[] = [
  {
    id: "lavender",
    nameAr: "أناقة اللافندر",
    nameEn: "Lavender Elegance",
    descAr: "تصميم تحريري ناعم باللافندر والبنفسج مع لمسات وردية رقيقة.",
    descEn: "A soft lavender and purple editorial design with refined feminine details.",
    light: {
      ...base,
      ...blueGrayLight,
      "--bg": "#F8F3FA", "--surface": "#FFFFFF", "--surface2": "#F3EAF7",
      "--text": "#2C2137", "--dim": "#6F5B82", "--border": "#E3D3EE",
      "--accent": "#79509B", "--accent2": "#E7A8CB", "--accent-ink": "#FFFFFF",
      "--header-bg": "#FFFFFF", "--footer-bg": "#49305F", "--footer-text": "#F3EAF7",
      "--radius": "14px", "--shadow": "0 10px 30px rgba(73,48,95,0.10)",
      "--font-display": '"Cairo", "Playfair Display", serif', "--space-section": "4.5rem",
    },
    dark: {
      ...base,
      ...blueGrayDark,
      "--bg": "#211827", "--surface": "#2C2138", "--surface2": "#372A47",
      "--text": "#F3EAF7", "--dim": "#C7A9DF", "--border": "#4A3860",
      "--accent": "#A77BC5", "--accent2": "#E7A8CB", "--accent-ink": "#211827",
      "--header-bg": "#2C2138", "--footer-bg": "#171021", "--footer-text": "#E9DDF5",
      "--radius": "14px", "--shadow": "0 10px 30px rgba(0,0,0,0.35)",
      "--font-display": '"Cairo", "Playfair Display", serif', "--space-section": "4.5rem",
    },
  },
  {
    id: "royal",
    nameAr: "البنفسج الملكي",
    nameEn: "Royal Purple",
    descAr: "بنفسج جريء وفاخر مع ترويسة عميقة ولمسات وردية راقية.",
    descEn: "A bold, luxurious purple design with a deep masthead and sophisticated pink accents.",
    light: {
      ...base,
      ...blueGrayLight,
      "--bg": "#F5EFF9", "--surface": "#FFFFFF", "--surface2": "#EBDFF5",
      "--text": "#241631", "--dim": "#5D4472", "--border": "#D5BDEA",
      "--accent": "#5E3484", "--accent2": "#D97FB8", "--accent-ink": "#FFFFFF",
      "--header-bg": "#3D2358", "--footer-bg": "#2A1742", "--footer-text": "#EBDFF5",
      "--radius": "10px", "--shadow": "0 14px 38px rgba(62,35,88,0.20)",
      "--font-display": '"Playfair Display", "Cairo", serif', "--space-section": "5rem",
    },
    dark: {
      ...base,
      ...blueGrayDark,
      "--bg": "#1B1029", "--surface": "#2A1A42", "--surface2": "#352155",
      "--text": "#F5EFF9", "--dim": "#C9AEE6", "--border": "#4E357A",
      "--accent": "#B18FD9", "--accent2": "#E7A8CB", "--accent-ink": "#1B1029",
      "--header-bg": "#120A1F", "--footer-bg": "#120A1F", "--footer-text": "#EBDFF5",
      "--radius": "10px", "--shadow": "0 14px 38px rgba(0,0,0,0.5)",
      "--font-display": '"Playfair Display", "Cairo", serif', "--space-section": "5rem",
    },
  },
  {
    id: "blossom",
    nameAr: "زهرة ناعمة",
    nameEn: "Soft Blossom",
    descAr: "تصميم فاتح وبسيط وأنيق بدرجات لافندر ووردي هادئة ومساحات واسعة.",
    descEn: "A light, minimal, elegant design with soft lavender and pink tones and airy spacing.",
    light: {
      ...base,
      ...blueGrayLight,
      "--bg": "#FCF8FC", "--surface": "#FFFFFF", "--surface2": "#F9EFF5",
      "--text": "#3A2B44", "--dim": "#8A729C", "--border": "#F0E2F2",
      "--accent": "#9668B8", "--accent2": "#E7A8CB", "--accent-ink": "#FFFFFF",
      "--header-bg": "#FFFFFF", "--footer-bg": "#6D4C8C", "--footer-text": "#FBF3FA",
      "--radius": "22px", "--shadow": "0 6px 22px rgba(150,104,184,0.08)",
      "--font-display": '"Cormorant Garamond", "Cairo", serif', "--space-section": "5.5rem",
    },
    dark: {
      ...base,
      ...blueGrayDark,
      "--bg": "#261C30", "--surface": "#322540", "--surface2": "#3E2F52",
      "--text": "#F7EFFA", "--dim": "#CBB3DE", "--border": "#4E3D66",
      "--accent": "#BE97DC", "--accent2": "#EFB9D9", "--accent-ink": "#261C30",
      "--header-bg": "#322540", "--footer-bg": "#1B1324", "--footer-text": "#F1E6F7",
      "--radius": "22px", "--shadow": "0 6px 22px rgba(0,0,0,0.3)",
      "--font-display": '"Cormorant Garamond", "Cairo", serif', "--space-section": "5.5rem",
    },
  },
  {
    id: "midnight",
    nameAr: "أوركيد منتصف الليل",
    nameEn: "Midnight Orchid",
    descAr: "تصميم داكن فاخر بالبنفسج العميق ولمسات وردية متوازنة بعناية.",
    descEn: "A luxurious dark-purple editorial design with carefully balanced pink accents.",
    light: {
      ...base,
      ...blueGrayLight,
      "--bg": "#EFE9F4", "--surface": "#FBF8FD", "--surface2": "#E4D8F0",
      "--text": "#221631", "--dim": "#5F4A78", "--border": "#CDBBDF",
      "--accent": "#63388F", "--accent2": "#D983B8", "--accent-ink": "#FFFFFF",
      "--header-bg": "#2A1A42", "--footer-bg": "#1D1130", "--footer-text": "#E7DCF5",
      "--radius": "8px", "--shadow": "0 12px 32px rgba(34,22,49,0.18)",
      "--font-display": '"Playfair Display", "Cairo", serif', "--space-section": "4.5rem",
    },
    dark: {
      ...base,
      ...blueGrayDark,
      "--bg": "#150C21", "--surface": "#211331", "--surface2": "#2B1B42",
      "--text": "#F1E9FA", "--dim": "#BFA6DA", "--border": "#3E2A5C",
      "--accent": "#A77BC5", "--accent2": "#E7A8CB", "--accent-ink": "#150C21",
      "--header-bg": "#0F0819", "--footer-bg": "#0F0819", "--footer-text": "#E7DCF5",
      "--radius": "8px", "--shadow": "0 12px 32px rgba(0,0,0,0.55)",
      "--font-display": '"Playfair Display", "Cairo", serif', "--space-section": "4.5rem",
    },
  },
  {
    id: "editorial",
    nameAr: "تحريري حديث",
    nameEn: "Modern Editorial",
    descAr: "مجلّة احترافية بخطوط قوية وقواعد حادّة وتباعد راقٍ وحدود واضحة.",
    descEn: "A professional magazine layout with strong typography, sharp rules, and sophisticated spacing.",
    light: {
      ...base,
      ...blueGrayLight,
      "--bg": "#FAF7FB", "--surface": "#FFFFFF", "--surface2": "#F1EAF4",
      "--text": "#1E1526", "--dim": "#5C4A6B", "--border": "#1E1526",
      "--accent": "#6E3FA0", "--accent2": "#C96BA5", "--accent-ink": "#FFFFFF",
      "--header-bg": "#FFFFFF", "--footer-bg": "#1E1526", "--footer-text": "#F1EAF4",
      "--radius": "2px", "--shadow": "none",
      "--font-display": '"Playfair Display", "Cairo", serif', "--space-section": "4rem",
      "--font-body": '"Inter", "Cairo", system-ui, sans-serif',
    },
    dark: {
      ...base,
      ...blueGrayDark,
      "--bg": "#17101F", "--surface": "#201829", "--surface2": "#2A2038",
      "--text": "#F4EFF9", "--dim": "#BBA8D2", "--border": "#8E77AC",
      "--accent": "#B18FD9", "--accent2": "#E7A8CB", "--accent-ink": "#17101F",
      "--header-bg": "#201829", "--footer-bg": "#0D0913", "--footer-text": "#EDE5F7",
      "--radius": "2px", "--shadow": "none",
      "--font-display": '"Playfair Display", "Cairo", serif', "--space-section": "4rem",
      "--font-body": '"Inter", "Cairo", system-ui, sans-serif',
    },
  },
];

export function getPreset(id: string): Preset {
  return PRESETS.find((p) => p.id === id) ?? PRESETS[0]!;
}
