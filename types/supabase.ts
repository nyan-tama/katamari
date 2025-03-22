export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            users: {
                Row: {
                    id: string
                    email: string
                    name: string
                    avatar_url: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id: string
                    email: string
                    name: string
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    email?: string
                    name?: string
                    avatar_url?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
            articles: {
                Row: {
                    id: string
                    author_id: string
                    title: string
                    content: string
                    hero_image: string | null
                    status: string
                    view_count: number
                    download_count: number
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    author_id: string
                    title: string
                    content: string
                    hero_image?: string | null
                    status?: string
                    view_count?: number
                    download_count?: number
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    author_id?: string
                    title?: string
                    content?: string
                    hero_image?: string | null
                    status?: string
                    view_count?: number
                    download_count?: number
                    created_at?: string
                    updated_at?: string
                }
            }
            download_files: {
                Row: {
                    id: string
                    article_id: string
                    original_name: string
                    storage_path: string
                    file_size: number
                    file_type: string
                    storage_bucket: string
                }
                Insert: {
                    id: string
                    article_id: string
                    original_name: string
                    storage_path: string
                    file_size: number
                    file_type: string
                    storage_bucket: string
                }
                Update: {
                    id?: string
                    article_id?: string
                    original_name?: string
                    storage_path?: string
                    file_size?: number
                    file_type?: string
                    storage_bucket?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
} 