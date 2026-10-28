const SKILLS = [
  "javascript", "typescript", "python", "java", "php", "go", "rust", "c++", "c#", "kotlin", "swift", "dart",
  "react", "next.js", "vue", "angular", "node.js", "express", "laravel", "django", "flask", "spring boot",
  "flutter", "react native", "html", "css", "tailwind", "sql", "mysql", "postgresql", "mongodb", "redis",
  "docker", "kubernetes", "git", "linux", "aws", "gcp", "azure", "rest api", "graphql", "figma",
  "excel", "power bi", "tableau", "looker studio", "google analytics", "data analysis", "machine learning",
  "pandas", "numpy", "tensorflow", "pytorch", "statistics", "seo", "content writing", "copywriting",
  "social media", "digital marketing", "google ads", "meta ads", "canva", "photoshop", "illustrator",
  "video editing", "accounting", "tax", "financial reporting", "customer service", "sales", "negotiation",
  "project management", "scrum", "agile", "jira", "communication", "english", "ui/ux", "wireframing",
  "quality assurance", "selenium", "cypress", "recruitment", "hris", "supply chain", "procurement",
  // Ditambahkan belakangan (urutan di atas dipertahankan agar hasil lama stabil)
  "microsoft office", "powerpoint", "google sheets", "data visualization", "business intelligence", "etl",
  "spss", "sap", "public speaking", "teamwork", "problem solving", "bookkeeping", "budgeting",
  "email marketing", "crm", "lead generation", "user research", "prototyping", "ci/cd", "unit testing",
];

/** Padanan istilah bahasa Indonesia → skill kanonik, agar CV/lowongan berbahasa Indonesia ikut terdeteksi. */
const ALIASES: Record<string, string[]> = {
  "data analysis": ["analisis data", "analisa data"],
  statistics: ["statistika", "statistik"],
  accounting: ["akuntansi", "akunting"],
  tax: ["perpajakan", "pajak"],
  "financial reporting": ["laporan keuangan"],
  "customer service": ["pelayanan pelanggan", "layanan pelanggan"],
  sales: ["penjualan"],
  negotiation: ["negosiasi"],
  "project management": ["manajemen proyek"],
  communication: ["komunikasi"],
  english: ["bahasa inggris"],
  "digital marketing": ["pemasaran digital"],
  "content writing": ["penulisan konten"],
  recruitment: ["rekrutmen"],
  procurement: ["pengadaan"],
  "social media": ["media sosial"],
  teamwork: ["kerja sama tim", "kerjasama tim"],
  "problem solving": ["pemecahan masalah"],
  "public speaking": ["berbicara di depan umum"],
  "microsoft office": ["ms office", "ms. office"],
  "google sheets": ["spreadsheet"],
  bookkeeping: ["pembukuan"],
  budgeting: ["penganggaran"],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PATTERNS = SKILLS.map((skill) => {
  const variants = [skill, ...(ALIASES[skill] ?? [])].map(escape).join("|");
  return { skill, re: new RegExp(`(?<![a-z0-9+#.])(?:${variants})(?![a-z0-9+#])`, "i") };
});

/** Mengekstrak skill yang dikenal dari teks bebas. */
export function extractSkills(text: string): string[] {
  return PATTERNS.filter(({ re }) => re.test(text)).map(({ skill }) => skill);
}
