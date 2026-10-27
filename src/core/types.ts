/** Tipe domain murni: tidak bergantung pada framework, DB, atau vendor. */

export type Level = "fresh" | "magang" | "any";

export interface Preferences {
  roles: string[];
  location: string;
  remote: boolean;
  level: Level;
}

export interface ProfileData {
  skills: string[];
  education: string;
  preferences: Preferences;
}

export interface JobData {
  title: string;
  company: string;
  location: string;
  description: string;
}

export interface ScoreResult {
  /** 0-100 */
  score: number;
  components: Record<"role" | "skills" | "level" | "location" | "salary", number>;
  reasons: string[];
  gaps: string[];
}

export type UserState =
  | "new"
  | "consent"
  | "cv"
  | "role"
  | "location"
  | "level"
  | "active";

export type Tier = "free" | "premium";
