// types/listening.ts
export type Level = 'beginner' | 'intermediate' | 'advanced';
export type Accent = 'uk' | 'us' | 'aus' | 'mix';
export type Section = 1 | 2 | 3 | 4;
export type QType = 'mcq' | 'map' | 'form' | 'matching' | 'short' | 'other';

export type Article = {
  id: string;
  slug: string;
  title: string;
  level: Level;
  tags: string[];
  content_md: string;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type Media = {
  id: string;
  kind: 'audio' | 'video';
  url: string;
  duration_secs: number;
  transcript?: string | null;
  accent: Accent;
  level: Level;
  tags: string[];
  created_at: string;
};

export type Exercise = {
  id: string;
  media_id: string;
  section: Section;
  qtype: QType;
  questions: unknown; // see zod schema
  answers: unknown;   // see zod schema
  level: Level;
  tags: string[];
  created_at: string;
};

export type Attempt = {
  id: string;
  user_id: string;
  exercise_id: string;
  score: number;
  mistakes?: unknown;
  meta?: unknown;
  created_at: string;
};

// ===== Normalized preview types =====
export type ResourceKind = 'article' | 'audio' | 'video' | 'exercise';

export type ResourcePreview = {
  id: string;
  kind: ResourceKind;
  title: string;
  level: Level;
  topics: string[];
  accent: Accent;     // use 'mix' for articles (no accent)
  href: string;       // route or placeholder
  created_at?: string;
};
