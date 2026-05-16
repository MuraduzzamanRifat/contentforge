/**
 * Single source of truth for the agarwood / Daracheon channel.
 * Source: Zoell Life new-hire training PDF (2026-05-01).
 * Update this file when brand facts change — do not hard-code these strings elsewhere.
 */

import type { Track } from "./types";

export const BRAND = {
  company: "Zoell Life Co., Ltd. (조엘라이프(주))",
  brand: "Daracheon (다라천) 참침향",
  brandEnglish: "Daracheon True Agarwood",
  site: "zoellife.com",
  ceo: "Park Byung-joo (박병주)",
  hq: "Seoul, Geumcheon-gu, Beotkkot-ro 36-gil 30, #1511",
  phone: "070-4140-4086",
  businessReg: "749-86-03668",
  tagline: "가짜가 많을수록, 진짜는 드러난다",
  taglineEn: "The more counterfeits exist, the more the genuine stands out.",
  umbrella: "12+ patents and certifications, 25+ years of research.",
} as const;

export const PRODUCT = {
  name: "Daracheon True Agarwood Oil Capsules (다라천 참침향 오일 캡슐)",
  form: "Soft-capsule supplement",
  oilSource: "Resinous heartwood of Aquilaria Agallocha Roxburgh",
  activeCompound: "agarospirol (sesquiterpene)",
  scientificBackground: "2-(2-phenylethyl)chromones (background literature, not marketing line)",
  benefits: [
    { en: "Qi circulation / energy restoration", ko: "기 순환, 원기 회복" },
    { en: "Cold-body relief, stamina, abdominal pain", ko: "냉증, 정력, 복통" },
    { en: "Nerve stabilization & sleep improvement", ko: "신경 안정, 수면" },
    { en: "Anti-inflammatory & vascular health", ko: "항염, 혈관 건강" },
    { en: "Brain blood-flow / prevention framing", ko: "뇌혈류 개선, 퇴행성 예방" },
    { en: "Digestive improvement & pain relief", ko: "소화 개선" },
  ],
} as const;

export const SPECIES = {
  scientific: "Aquilaria Agallocha Roxburgh",
  korean: "침향 (chimhyang)",
  chinese: "沈香 (chen-xiang)",
  english: "Agarwood / aloeswood",
  registration:
    "Korean Pharmacopoeia Supplement · Food Code · Korea Institute of Oriental Medicine Herbal Resources Center",
} as const;

export const PRODUCTION = {
  farms: "5 company-operated farms in Hà Tĩnh province, Vietnam",
  area: "~200 hectares · ~4 million trees",
  stages: [
    { n: 1, what: "Seed germination & seedling cultivation", duration: "6–12 months" },
    { n: 2, what: "Planting at company-owned Vietnam farms", duration: "—" },
    { n: 3, what: "Organic cultivation", duration: "20+ years" },
    { n: 4, what: "Patented resin-induction (inoculation)", duration: "3–5 years" },
    { n: 5, what: "Felling & precision raw-material extraction", duration: "—" },
    { n: 6, what: "Traditional steam distillation + GMP final inspection", duration: "—" },
  ],
  certifications: [
    { name: "CITES", proves: "Legal trade compliance (Appendix II species)" },
    { name: "HACCP", proves: "Food-safety / hazard control" },
    { name: "GMP", proves: "Good Manufacturing Practice" },
    { name: "Organic", proves: "Organic cultivation" },
    { name: "Origin verification", proves: "Provable Vietnamese origin" },
    { name: "Korean MFDS", proves: "Registered with Ministry of Food & Drug Safety" },
  ],
} as const;

/**
 * Compliance — pulled verbatim from the training PDF "Section 7: Things a rep should NEVER say".
 * These guardrails apply to every script, description, on-screen text, and pinned comment.
 */
export const NEVER_SAY: { phrase: string; reason: string }[] = [
  {
    phrase: '"Cures cancer / dementia / Alzheimer\'s"',
    reason: "Brain-health framing is prevention / blood-flow improvement, NOT cure.",
  },
  { phrase: '"Replaces your medication"', reason: "Never — supplement, not drug." },
  {
    phrase: '"Wild-harvested" or "ancient tree"',
    reason: "Daracheon is 100% farmed (Hà Tĩnh). Do not romanticise something fact-checkable.",
  },
  {
    phrase: "Specific dosages or drug interactions",
    reason: "Defer to package insert. Don't invent a number.",
  },
];

export const ALWAYS_FRAME = [
  '"Traditionally used for…" (never "cures X")',
  "Korean 건강기능식품 (functional food) lane — not 의약품 (drug)",
  "100% farmed — feature, not weakness",
  "Species verified: Aquilaria Agallocha Roxburgh",
];

/**
 * Animation direction — applies to every video on the channel.
 * User directive 2026-05-14: cartoon-based, faceless characters allowed, factually accurate.
 */
export const ANIMATION = {
  style: "Cartoon-based 2D motion graphics. Faceless characters allowed.",
  rule:
    "Visuals are stylized; on-screen content is not. Every molecule diagram, date, place name, citation, and chart must be factually accurate.",
  doList: [
    "Stylized illustration of botany, chemistry, and history",
    "Faceless silhouettes for human characters",
    "Accurate chemical structures (alpha-guaiene, agarospirol, etc.)",
    "Accurate maps with verifiable trade routes",
    "Real dates and place names, sourced",
  ],
  dontList: [
    "Photoreal AI-generated 'wild forest' footage that can't be sourced",
    "Made-up timelines (e.g. 'around 5,000 years ago' when the verifiable date is 3,000)",
    "Invented quotes attributed to historical figures",
    "Wild-harvest imagery (violates Daracheon CTA discipline)",
  ],
} as const;

/**
 * Trusted-source domains per track. Every non-obvious factual claim must cite one of these.
 */
export const SOURCE_MAP: Record<Track, { label: string; sources: string[] }> = {
  A: {
    label: "Science & The Tree",
    sources: [
      "pubmed.ncbi.nlm.nih.gov",
      "ncbi.nlm.nih.gov/pmc",
      "mdpi.com",
      "sciencedirect.com",
      "Korean Institute of Oriental Medicine",
    ],
  },
  B: {
    label: "History & Trade",
    sources: [
      "cites.org",
      "Periplus of the Erythraean Sea (primary)",
      "Shōsōin documentation",
      "Cairo Geniza scholarship",
      "Museum primary archives",
      "JSTOR humanities papers",
    ],
  },
  C: {
    label: "Culture / Myth / Medicine",
    sources: [
      "Korean Pharmacopoeia Supplement",
      "Britannica",
      "Peer-reviewed religious-studies / anthropology journals",
      "Cultural institution primary sources",
    ],
  },
  D: {
    label: "Wildcard",
    sources: [
      "Match to the angle — IUCN/CITES for conservation",
      "Industry reports for economy",
      "Google/USPTO patent records for biotech",
      "Auction-house catalogues for prices",
    ],
  },
};

/**
 * The canonical CTA block. Use as-is in YouTube descriptions and as the basis for the pinned comment.
 * Single source — if Daracheon updates their language, change it here only.
 */
export const CTA = {
  pinnedComment: `Curious where to find verified, plantation-grown agarwood?

Daracheon (다라천) "참"침향 — True Agarwood from ${BRAND.company.replace(/ \(.*\)/, "")}.
· Species verified: Aquilaria Agallocha Roxburgh (Korean Pharmacopoeia Supplement)
· 5 company-owned farms in Hà Tĩnh, Vietnam · 25-year build (20+ yr cultivation + 3–5 yr resin induction)
· CITES + HACCP + GMP + Organic + Korean MFDS — full stack

Learn more: https://${BRAND.site}

Traditionally used for qi circulation, sleep, vascular health.
This is not medical advice and is not intended to diagnose, treat, cure, or prevent any disease.`,

  outroLine: `If you want the science of agarwood in a daily traditional-use form, Daracheon at ${BRAND.site} is the verified-authentic option — link in the pinned comment.`,

  descriptionBlock: `— ABOUT THE SPONSOR —
Daracheon (다라천) True Agarwood by ${BRAND.company.replace(/ \(.*\)/, "")} — Aquilaria Agallocha Roxburgh from 5 owned farms in Hà Tĩnh, Vietnam. CITES · HACCP · GMP · Organic · Korean MFDS registered.
${BRAND.site}

Traditional use only. Not medical advice. Consult a healthcare professional before adding any supplement, especially if pregnant, breastfeeding, or on prescription medication.`,
};

export const BASELINE_TAGS = [
  "agarwood",
  "oud",
  "aquilaria",
  "chimhyang",
  "침향",
  "Daracheon",
  "다라천",
  "Zoell Life",
];
