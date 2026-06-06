export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          openid: string | null
          nickname: string
          avatar_url: string
          real_name: string
          school: string
          subject: string
          phone: string
          role: 'teacher' | 'admin' | 'super_admin'
          status: 'pending' | 'approved' | 'rejected' | 'frozen'
          register_time: string
          approve_time: string | null
          approved_by: string | null
          reject_reason: string
        }
        Insert: {
          id: string
          openid?: string | null
          nickname?: string
          avatar_url?: string
          real_name?: string
          school?: string
          subject?: string
          phone?: string
          role?: 'teacher' | 'admin' | 'super_admin'
          status?: 'pending' | 'approved' | 'rejected' | 'frozen'
          register_time?: string
          approve_time?: string | null
          approved_by?: string | null
          reject_reason?: string
        }
        Update: {
          id?: string
          openid?: string | null
          nickname?: string
          avatar_url?: string
          real_name?: string
          school?: string
          subject?: string
          phone?: string
          role?: 'teacher' | 'admin' | 'super_admin'
          status?: 'pending' | 'approved' | 'rejected' | 'frozen'
          register_time?: string
          approve_time?: string | null
          approved_by?: string | null
          reject_reason?: string
        }
      }
      sheets: {
        Row: {
          id: string
          user_id: string
          title: string
          file_url: string
          storage_path: string
          file_type: string
          file_size: number
          subject: string
          grade: string
          exam_type: string
          exam_date: string | null
          tags: string[]
          keywords: string
          uploader_name: string
          ocr_text: string
          ai_anomaly: string
          ai_anomaly_time: string | null
          download_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          file_url?: string
          storage_path?: string
          file_type?: string
          file_size?: number
          subject?: string
          grade?: string
          exam_type?: string
          exam_date?: string | null
          tags?: string[]
          keywords?: string
          uploader_name?: string
          ocr_text?: string
          ai_anomaly?: string
          ai_anomaly_time?: string | null
          download_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          file_url?: string
          storage_path?: string
          file_type?: string
          file_size?: number
          subject?: string
          grade?: string
          exam_type?: string
          exam_date?: string | null
          tags?: string[]
          keywords?: string
          uploader_name?: string
          ocr_text?: string
          ai_anomaly?: string
          ai_anomaly_time?: string | null
          download_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      mistakes: {
        Row: {
          id: string
          user_id: string
          image_url: string
          storage_path: string
          subject: string
          knowledge_points: string[]
          recognized_text: string
          wrong_reason: string
          correct_answer: string
          note: string
          keywords: string
          source: 'manual' | 'ai_solve' | 'ocr'
          analysis: string
          steps: string[]
          answer: string
          content: string
          status: 'active' | 'solved' | 'archived'
          mastered: boolean
          review_count: number
          last_reviewed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_url?: string
          storage_path?: string
          subject?: string
          knowledge_points?: string[]
          recognized_text?: string
          wrong_reason?: string
          correct_answer?: string
          note?: string
          keywords?: string
          source?: 'manual' | 'ai_solve' | 'ocr'
          analysis?: string
          steps?: string[]
          answer?: string
          content?: string
          status?: 'active' | 'solved' | 'archived'
          mastered?: boolean
          review_count?: number
          last_reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_url?: string
          storage_path?: string
          subject?: string
          knowledge_points?: string[]
          recognized_text?: string
          wrong_reason?: string
          correct_answer?: string
          note?: string
          keywords?: string
          source?: 'manual' | 'ai_solve' | 'ocr'
          analysis?: string
          steps?: string[]
          answer?: string
          content?: string
          status?: 'active' | 'solved' | 'archived'
          mastered?: boolean
          review_count?: number
          last_reviewed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      ocr_results: {
        Row: {
          id: string
          user_id: string
          original_image: string
          storage_path: string
          recognized_data: Json
          corrected_data: Json | null
          excel_file: string
          excel_storage_path: string
          status: 'pending_review' | 'corrected' | 'exported'
          row_count: number
          col_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          original_image?: string
          storage_path?: string
          recognized_data?: Json
          corrected_data?: Json | null
          excel_file?: string
          excel_storage_path?: string
          status?: 'pending_review' | 'corrected' | 'exported'
          row_count?: number
          col_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          original_image?: string
          storage_path?: string
          recognized_data?: Json
          corrected_data?: Json | null
          excel_file?: string
          excel_storage_path?: string
          status?: 'pending_review' | 'corrected' | 'exported'
          row_count?: number
          col_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      config: {
        Row: {
          id: string
          key: string
          value: string
          description: string
          updated_at: string
        }
        Insert: {
          id?: string
          key: string
          value?: string
          description?: string
          updated_at?: string
        }
        Update: {
          id?: string
          key?: string
          value?: string
          description?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          type: string
          title: string
          content: string
          user_id: string | null
          target_role: 'admin' | 'teacher' | 'all'
          user_name: string
          user_school: string
          user_phone: string
          is_read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          type?: string
          title: string
          content?: string
          user_id?: string | null
          target_role?: 'admin' | 'teacher' | 'all'
          user_name?: string
          user_school?: string
          user_phone?: string
          is_read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          type?: string
          title?: string
          content?: string
          user_id?: string | null
          target_role?: 'admin' | 'teacher' | 'all'
          user_name?: string
          user_school?: string
          user_phone?: string
          is_read?: boolean
          created_at?: string
        }
      }
      admin_logs: {
        Row: {
          id: string
          action: string
          target_user_id: string | null
          admin_id: string | null
          admin_name: string
          details: Json
          created_at: string
        }
        Insert: {
          id?: string
          action: string
          target_user_id?: string | null
          admin_id?: string | null
          admin_name?: string
          details?: Json
          created_at?: string
        }
        Update: {
          id?: string
          action?: string
          target_user_id?: string | null
          admin_id?: string | null
          admin_name?: string
          details?: Json
          created_at?: string
        }
      }
      api_stats: {
        Row: {
          id: string
          service_type: string
          user_id: string | null
          model_name: string
          tokens_used: number
          duration_ms: number
          created_at: string
        }
        Insert: {
          id?: string
          service_type: string
          user_id?: string | null
          model_name?: string
          tokens_used?: number
          duration_ms?: number
          created_at?: string
        }
        Update: {
          id?: string
          service_type?: string
          user_id?: string | null
          model_name?: string
          tokens_used?: number
          duration_ms?: number
          created_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
