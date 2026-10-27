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
];

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const PATTERNS = SKILLS.map((skill) => ({
  skill,
  re: new RegExp(`(?<![a-z0-9+#.])${escape(skill)}(?![a-z0-9+#])`, "i"),
}));

/** Mengekstrak skill yang dikenal dari teks bebas. */
export function extractSkills(text: string): string[] {
  return PATTERNS.filter(({ re }) => re.test(text)).map(({ skill }) => skill);
}
