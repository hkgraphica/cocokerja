const SKILLS = [
  // --- Pemrograman & Infrastruktur ---
  "javascript", "typescript", "python", "java", "php", "go", "rust", "c++", "c#", "kotlin", "swift", "dart",
  "react", "next.js", "vue", "angular", "node.js", "express", "laravel", "django", "flask", "spring boot",
  "flutter", "react native", "html", "css", "tailwind", "sql", "mysql", "postgresql", "mongodb", "redis",
  "docker", "kubernetes", "git", "linux", "aws", "gcp", "azure", "rest api", "graphql", "figma",
  "machine learning", "pandas", "numpy", "tensorflow", "pytorch", "quality assurance", "selenium", "cypress",
  "ci/cd", "unit testing", "ui/ux", "wireframing", "prototyping", "etl",

  // --- Analisis & Bisnis Intelijen ---
  "excel", "power bi", "tableau", "looker studio", "google analytics", "data analysis", "statistics",
  "data visualization", "business intelligence", "google sheets", "microsoft office", "powerpoint",
  "spss", "sap",

  // --- Pemasaran & Komunikasi ---
  "seo", "content writing", "copywriting", "social media", "digital marketing", "google ads", "meta ads",
  "canva", "photoshop", "illustrator", "video editing", "email marketing", "crm", "lead generation",
  "public speaking", "content marketing", "brand management", "market research",

  // --- Keuangan & Akuntansi ---
  "accounting", "tax", "financial reporting", "bookkeeping", "budgeting", "financial analysis",
  "financial modeling", "auditing", "cost accounting", "cash flow", "laporan keuangan", "akuntansi",
  "perpajakan", "treasury",

  // --- Sumber Daya Manusia ---
  "recruitment", "hris", "training and development", "performance management", "compensation",
  "industrial relations", "hr generalist", "people management", "talent acquisition",
  "organizational development",

  // --- Operasi & Supply Chain ---
  "supply chain", "procurement", "logistics", "inventory management", "warehouse management",
  "operations management", "quality control", "lean", "six sigma", "iso",

  // --- Penjualan & Layanan Pelanggan ---
  "sales", "customer service", "negotiation", "business development", "key account management",
  "retail", "b2b sales", "after sales", "customer retention",

  // --- Manajemen Umum & Soft Skills ---
  "project management", "scrum", "agile", "jira", "communication", "english", "teamwork",
  "problem solving", "leadership", "time management", "analytical thinking", "critical thinking",
  "microsoft office", "administration", "event management", "general affair",
];

/** Padanan istilah bahasa Indonesia → skill kanonik, agar CV/lowongan berbahasa Indonesia ikut terdeteksi. */
const ALIASES: Record<string, string[]> = {
  "data analysis": ["analisis data", "analisa data", "pengolahan data"],
  statistics: ["statistika", "statistik"],
  accounting: ["akuntansi", "akunting"],
  tax: ["perpajakan", "pajak"],
  "financial reporting": ["laporan keuangan", "penyusunan laporan keuangan"],
  "financial analysis": ["analisis keuangan", "analisa keuangan"],
  "financial modeling": ["pemodelan keuangan"],
  auditing: ["audit", "pemeriksaan keuangan"],
  "cost accounting": ["akuntansi biaya"],
  "cash flow": ["arus kas"],
  treasury: ["pengelolaan kas"],
  budgeting: ["penganggaran", "penyusunan anggaran"],
  bookkeeping: ["pembukuan"],
  "customer service": ["pelayanan pelanggan", "layanan pelanggan", "layanan pelanggan", "cs"],
  sales: ["penjualan", "tenaga penjual"],
  negotiation: ["negosiasi"],
  "business development": ["pengembangan bisnis"],
  "key account management": ["manajemen akun"],
  "project management": ["manajemen proyek", "pengelolaan proyek"],
  leadership: ["kepemimpinan"],
  communication: ["komunikasi"],
  teamwork: ["kerja sama tim", "kerjasama tim", "bekerja sama"],
  "problem solving": ["pemecahan masalah", "penyelesaian masalah"],
  "analytical thinking": ["berpikir analitis", "kemampuan analitis"],
  "critical thinking": ["berpikir kritis"],
  "time management": ["manajemen waktu"],
  english: ["bahasa inggris"],
  "digital marketing": ["pemasaran digital"],
  "content writing": ["penulisan konten"],
  "content marketing": ["pemasaran konten"],
  "brand management": ["manajemen merek", "manajemen brand"],
  "market research": ["riset pasar", "penelitian pasar"],
  "social media": ["media sosial"],
  "public speaking": ["berbicara di depan umum", "presentasi"],
  recruitment: ["rekrutmen", "rekruitmen"],
  "talent acquisition": ["akuisisi talenta"],
  "training and development": ["pelatihan dan pengembangan", "training"],
  "performance management": ["manajemen kinerja", "penilaian kinerja"],
  "hr generalist": ["sdm", "sumber daya manusia", "hrd"],
  "industrial relations": ["hubungan industrial"],
  "people management": ["manajemen sumber daya"],
  "organizational development": ["pengembangan organisasi"],
  "supply chain": ["rantai pasok", "rantai pasokan"],
  procurement: ["pengadaan", "pengadaan barang"],
  logistics: ["logistik"],
  "inventory management": ["manajemen inventori", "manajemen stok", "pengelolaan stok"],
  "warehouse management": ["manajemen gudang", "pergudangan"],
  "operations management": ["manajemen operasi", "manajemen operasional"],
  "quality control": ["kontrol kualitas", "pengendalian kualitas", "qc"],
  "microsoft office": ["ms office", "ms. office", "office"],
  "google sheets": ["spreadsheet"],
  administration: ["administrasi", "tata usaha", "admin"],
  "event management": ["pengelolaan acara", "manajemen event"],
  "general affair": ["ga", "umum"],
  "after sales": ["purna jual"],
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
