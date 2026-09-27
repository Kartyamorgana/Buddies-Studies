export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      lecture_transcripts: {
        Row: {
          created_at: string
          duration_sec: number
          id: string
          source_kind: string
          title: string
          transcript: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_sec?: number
          id?: string
          source_kind?: string
          title?: string
          transcript?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          duration_sec?: number
          id?: string
          source_kind?: string
          title?: string
          transcript?: string
          user_id?: string
        }
        Relationships: []
      }
      note_game_sessions: {
        Row: {
          correct_count: number
          created_at: string
          difficulty: string
          duration_sec: number
          game_type: string
          id: string
          note_id: string | null
          note_title: string
          score: number
          subject: string
          timed: boolean
          total_items: number
          user_id: string
        }
        Insert: {
          correct_count?: number
          created_at?: string
          difficulty?: string
          duration_sec?: number
          game_type?: string
          id?: string
          note_id?: string | null
          note_title?: string
          score?: number
          subject?: string
          timed?: boolean
          total_items?: number
          user_id?: string
        }
        Update: {
          correct_count?: number
          created_at?: string
          difficulty?: string
          duration_sec?: number
          game_type?: string
          id?: string
          note_id?: string | null
          note_title?: string
          score?: number
          subject?: string
          timed?: boolean
          total_items?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "note_game_sessions_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "notes"
            referencedColumns: ["id"]
          },
        ]
      }
      notes: {
        Row: {
          content: string
          created_at: string
          folder_id: string | null
          id: string
          pinned: boolean
          tags: string[]
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          content?: string
          created_at?: string
          folder_id?: string | null
          id?: string
          pinned?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          folder_id?: string | null
          id?: string
          pinned?: boolean
          tags?: string[]
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notes_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      stem_bookmarks: {
        Row: {
          correct_answer: string
          created_at: string
          hints: Json
          id: string
          note: string | null
          options: Json
          question_text: string
          solution: string
          subject: string
          topic: string
          type: string
          user_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          hints?: Json
          id?: string
          note?: string | null
          options?: Json
          question_text: string
          solution?: string
          subject: string
          topic?: string
          type?: string
          user_id?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          hints?: Json
          id?: string
          note?: string | null
          options?: Json
          question_text?: string
          solution?: string
          subject?: string
          topic?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      stem_quiz_questions: {
        Row: {
          correct_answer: string
          created_at: string
          hints: Json
          id: string
          is_correct: boolean | null
          options: Json
          ord: number
          question_text: string
          session_id: string
          solution: string
          time_spent_sec: number
          topic: string
          type: string
          user_answer: string | null
          user_id: string
        }
        Insert: {
          correct_answer: string
          created_at?: string
          hints?: Json
          id?: string
          is_correct?: boolean | null
          options?: Json
          ord: number
          question_text: string
          session_id: string
          solution?: string
          time_spent_sec?: number
          topic?: string
          type: string
          user_answer?: string | null
          user_id?: string
        }
        Update: {
          correct_answer?: string
          created_at?: string
          hints?: Json
          id?: string
          is_correct?: boolean | null
          options?: Json
          ord?: number
          question_text?: string
          session_id?: string
          solution?: string
          time_spent_sec?: number
          topic?: string
          type?: string
          user_answer?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stem_quiz_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "stem_quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      stem_quiz_sessions: {
        Row: {
          correct_count: number
          difficulty: string
          duration_sec: number
          ended_at: string | null
          id: string
          metadata: Json
          mode: string
          score: number
          started_at: string
          subject: string
          time_limit_sec: number | null
          topic: string | null
          total_questions: number
          user_id: string
        }
        Insert: {
          correct_count?: number
          difficulty: string
          duration_sec?: number
          ended_at?: string | null
          id?: string
          metadata?: Json
          mode: string
          score?: number
          started_at?: string
          subject: string
          time_limit_sec?: number | null
          topic?: string | null
          total_questions?: number
          user_id?: string
        }
        Update: {
          correct_count?: number
          difficulty?: string
          duration_sec?: number
          ended_at?: string | null
          id?: string
          metadata?: Json
          mode?: string
          score?: number
          started_at?: string
          subject?: string
          time_limit_sec?: number | null
          topic?: string | null
          total_questions?: number
          user_id?: string
        }
        Relationships: []
      }
      target_campuses: {
        Row: {
          campus: string
          created_at: string
          group_kind: string
          id: string
          major: string
          passing_score: number
          subscores: Json
        }
        Insert: {
          campus: string
          created_at?: string
          group_kind?: string
          id?: string
          major: string
          passing_score?: number
          subscores?: Json
        }
        Update: {
          campus?: string
          created_at?: string
          group_kind?: string
          id?: string
          major?: string
          passing_score?: number
          subscores?: Json
        }
        Relationships: []
      }
      user_study_plans: {
        Row: {
          created_at: string
          daily_minutes: number
          exam_date: string
          id: string
          is_active: boolean
          target_label: string
          title: string
          updated_at: string
          user_id: string
          weaknesses: Json
        }
        Insert: {
          created_at?: string
          daily_minutes?: number
          exam_date: string
          id?: string
          is_active?: boolean
          target_label?: string
          title?: string
          updated_at?: string
          user_id?: string
          weaknesses?: Json
        }
        Update: {
          created_at?: string
          daily_minutes?: number
          exam_date?: string
          id?: string
          is_active?: boolean
          target_label?: string
          title?: string
          updated_at?: string
          user_id?: string
          weaknesses?: Json
        }
        Relationships: []
      }
      user_study_tasks: {
        Row: {
          created_at: string
          detail: string
          done: boolean
          done_at: string | null
          id: string
          minutes: number
          ord: number
          plan_id: string
          subject: string
          task_date: string
          title: string
          topic: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string
          done?: boolean
          done_at?: string | null
          id?: string
          minutes?: number
          ord?: number
          plan_id: string
          subject?: string
          task_date: string
          title: string
          topic?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          detail?: string
          done?: boolean
          done_at?: string | null
          id?: string
          minutes?: number
          ord?: number
          plan_id?: string
          subject?: string
          task_date?: string
          title?: string
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_study_tasks_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "user_study_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_utbk_predictions: {
        Row: {
          ability: Json
          created_at: string
          id: string
          sample_size: number
          subject_scores: Json
          target_campus_id: string | null
          target_label: string
          total_score: number
          user_id: string
        }
        Insert: {
          ability?: Json
          created_at?: string
          id?: string
          sample_size?: number
          subject_scores?: Json
          target_campus_id?: string | null
          target_label?: string
          total_score?: number
          user_id?: string
        }
        Update: {
          ability?: Json
          created_at?: string
          id?: string
          sample_size?: number
          subject_scores?: Json
          target_campus_id?: string | null
          target_label?: string
          total_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_utbk_predictions_target_campus_id_fkey"
            columns: ["target_campus_id"]
            isOneToOne: false
            referencedRelation: "target_campuses"
            referencedColumns: ["id"]
          },
        ]
      }
      vark_kinesthetic_progress: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          kind: string
          payload: Json
          score: number
          title: string
          topic: string
          total: number
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          score?: number
          title?: string
          topic?: string
          total?: number
          user_id?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          score?: number
          title?: string
          topic?: string
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      vark_podcasts: {
        Row: {
          created_at: string
          id: string
          material: string
          script: Json
          source_kind: string
          source_ref: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material?: string
          script?: Json
          source_kind?: string
          source_ref?: string | null
          title?: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          material?: string
          script?: Json
          source_kind?: string
          source_ref?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      stem_weakness: {
        Row: {
          accuracy_pct: number | null
          attempts: number | null
          correct: number | null
          last_seen: string | null
          subject: string | null
          topic: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
