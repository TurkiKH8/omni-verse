export interface Database {
  public: {
    Tables: {
      categories: {
        Row: Category;
        Insert: Omit<Category, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Category, "id" | "created_at">>;
      };
      questions: {
        Row: Question;
        Insert: Omit<Question, "id" | "created_at">;
        Update: Partial<Omit<Question, "id" | "created_at">>;
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, "id" | "created_at">;
        Update: Partial<Omit<Session, "id" | "created_at">>;
      };
      teams: {
        Row: Team;
        Insert: Omit<Team, "id">;
        Update: Partial<Omit<Team, "id">>;
      };
      audit_log: {
        Row: AuditEntry;
        Insert: Omit<AuditEntry, "id" | "created_at">;
        Update: never;
      };
    };
  };
}

export interface Category {
  id: string;
  name_en: string;
  name_ar: string;
  active: boolean;
  question_count: number;
  created_at: string;
  updated_at: string;
  image_url?: string | null;
}

export interface Question {
  id: string;
  category_id: string;
  points: number;
  question_en: string;
  answer_en: string;
  question_ar: string;
  answer_ar: string;
  created_at: string;
  categories?: { name_en: string; name_ar: string } | null;
  image_url?: string | null;
}

export interface Session {
  id: string;
  name: string;
  game_mode: "solo" | "team";
  category_names: string[];
  total_questions: number;
  created_at: string;
  completed_at: string | null;
}

export interface Team {
  id: string;
  session_id: string;
  name: string;
  score: number;
  rank: number;
}

export interface AuditEntry {
  id: string;
  user_email: string;
  action: string;
  target: string;
  type: "create" | "update" | "delete" | "login" | "system";
  created_at: string;
}
