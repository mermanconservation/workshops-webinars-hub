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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      certificate_verifications: {
        Row: {
          certificate_type: string
          company_name: string
          id: string
          issued_at: string
          participant_name: string
          verification_code: string
          workshop_date: string
          workshop_id: string
          workshop_title: string
        }
        Insert: {
          certificate_type?: string
          company_name: string
          id?: string
          issued_at?: string
          participant_name: string
          verification_code: string
          workshop_date: string
          workshop_id: string
          workshop_title: string
        }
        Update: {
          certificate_type?: string
          company_name?: string
          id?: string
          issued_at?: string
          participant_name?: string
          verification_code?: string
          workshop_date?: string
          workshop_id?: string
          workshop_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificate_verifications_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      company_settings: {
        Row: {
          additional_details: string | null
          company_name: string
          created_at: string
          director_name: string | null
          director_signature_url: string | null
          id: string
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          additional_details?: string | null
          company_name?: string
          created_at?: string
          director_name?: string | null
          director_signature_url?: string | null
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          additional_details?: string | null
          company_name?: string
          created_at?: string
          director_name?: string | null
          director_signature_url?: string | null
          id?: string
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      course_quizzes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          kind: string
          lesson_id: string | null
          pass_score: number
          questions: Json
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          kind: string
          lesson_id?: string | null
          pass_score?: number
          questions?: Json
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          kind?: string
          lesson_id?: string | null
          pass_score?: number
          questions?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "workshop_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          certificate_template_url: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          final_pass_score: number
          id: string
          is_public: boolean
          lesson_quiz_weight: number
          materials: Json
          order_index: number
          require_all_lesson_quizzes: boolean
          require_final_exam: boolean
          title: string
          updated_at: string
        }
        Insert: {
          certificate_template_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          final_pass_score?: number
          id?: string
          is_public?: boolean
          lesson_quiz_weight?: number
          materials?: Json
          order_index?: number
          require_all_lesson_quizzes?: boolean
          require_final_exam?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          certificate_template_url?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          final_pass_score?: number
          id?: string
          is_public?: boolean
          lesson_quiz_weight?: number
          materials?: Json
          order_index?: number
          require_all_lesson_quizzes?: boolean
          require_final_exam?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      lesson_completions: {
        Row: {
          completed_at: string
          course_id: string | null
          email: string
          id: string
          lesson_id: string
          workshop_id: string | null
        }
        Insert: {
          completed_at?: string
          course_id?: string | null
          email: string
          id?: string
          lesson_id: string
          workshop_id?: string | null
        }
        Update: {
          completed_at?: string
          course_id?: string | null
          email?: string
          id?: string
          lesson_id?: string
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "workshop_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      presenters: {
        Row: {
          bio: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          photo_url: string | null
          signature_url: string | null
          title: string | null
        }
        Insert: {
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          photo_url?: string | null
          signature_url?: string | null
          title?: string | null
        }
        Update: {
          bio?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          photo_url?: string | null
          signature_url?: string | null
          title?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          email: string
          id: string
          max_score: number
          passed: boolean
          quiz_id: string
          score: number
        }
        Insert: {
          answers?: Json
          created_at?: string
          email: string
          id?: string
          max_score: number
          passed?: boolean
          quiz_id: string
          score: number
        }
        Update: {
          answers?: Json
          created_at?: string
          email?: string
          id?: string
          max_score?: number
          passed?: boolean
          quiz_id?: string
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "course_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_lessons: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          id: string
          materials: Json
          order_index: number
          title: string
          updated_at: string
          video_url: string | null
          workshop_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          materials?: Json
          order_index?: number
          title: string
          updated_at?: string
          video_url?: string | null
          workshop_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          materials?: Json
          order_index?: number
          title?: string
          updated_at?: string
          video_url?: string | null
          workshop_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workshop_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_lessons_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_materials: {
        Row: {
          created_at: string
          file_type: string
          file_url: string
          id: string
          title: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          file_type: string
          file_url: string
          id?: string
          title: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          file_type?: string
          file_url?: string
          id?: string
          title?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_materials_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_participants: {
        Row: {
          email: string
          full_name: string
          id: string
          registered_at: string
          workshop_id: string
        }
        Insert: {
          email: string
          full_name: string
          id?: string
          registered_at?: string
          workshop_id: string
        }
        Update: {
          email?: string
          full_name?: string
          id?: string
          registered_at?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_participants_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_presenters: {
        Row: {
          created_at: string
          id: string
          presenter_id: string
          workshop_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          presenter_id: string
          workshop_id: string
        }
        Update: {
          created_at?: string
          id?: string
          presenter_id?: string
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_presenters_presenter_id_fkey"
            columns: ["presenter_id"]
            isOneToOne: false
            referencedRelation: "presenters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_presenters_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshop_videos: {
        Row: {
          created_at: string
          id: string
          title: string | null
          workshop_id: string
          youtube_url: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          workshop_id: string
          youtube_url: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          workshop_id?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_videos_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          created_at: string
          date: string
          description: string | null
          duration_minutes: number
          event_type: string
          id: string
          is_completed: boolean
          is_public: boolean
          location: string | null
          max_participants: number | null
          partner_logos: string[] | null
          presenter_id: string | null
          timeline: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date: string
          description?: string | null
          duration_minutes?: number
          event_type?: string
          id?: string
          is_completed?: boolean
          is_public?: boolean
          location?: string | null
          max_participants?: number | null
          partner_logos?: string[] | null
          presenter_id?: string | null
          timeline?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date?: string
          description?: string | null
          duration_minutes?: number
          event_type?: string
          id?: string
          is_completed?: boolean
          is_public?: boolean
          location?: string | null
          max_participants?: number | null
          partner_logos?: string[] | null
          presenter_id?: string | null
          timeline?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshops_presenter_id_fkey"
            columns: ["presenter_id"]
            isOneToOne: false
            referencedRelation: "presenters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      unmark_lesson_completion: {
        Args: { p_email: string; p_lesson_id: string }
        Returns: undefined
      }
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
