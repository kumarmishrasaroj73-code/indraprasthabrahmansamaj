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
      announcements: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          title: string
          updated_at: string
          urgent: boolean
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          title: string
          updated_at?: string
          urgent?: boolean
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          title?: string
          updated_at?: string
          urgent?: boolean
        }
        Relationships: []
      }
      chat_call_signals: {
        Row: {
          call_id: string
          created_at: string
          from_user: string
          id: string
          payload: Json
          signal_type: string
          to_user: string | null
        }
        Insert: {
          call_id: string
          created_at?: string
          from_user: string
          id?: string
          payload: Json
          signal_type: string
          to_user?: string | null
        }
        Update: {
          call_id?: string
          created_at?: string
          from_user?: string
          id?: string
          payload?: Json
          signal_type?: string
          to_user?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_call_signals_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "chat_calls"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_calls: {
        Row: {
          call_type: string
          conversation_id: string
          ended_at: string | null
          id: string
          initiated_by: string
          started_at: string
          status: string
        }
        Insert: {
          call_type?: string
          conversation_id: string
          ended_at?: string | null
          id?: string
          initiated_by: string
          started_at?: string
          status?: string
        }
        Update: {
          call_type?: string
          conversation_id?: string
          ended_at?: string | null
          id?: string
          initiated_by?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          id: string
          is_broadcast: boolean
          is_group: boolean
          last_message_at: string
          title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_broadcast?: boolean
          is_group?: boolean
          last_message_at?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_broadcast?: boolean
          is_group?: boolean
          last_message_at?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          is_pinned: boolean
          media_duration_ms: number | null
          media_mime: string | null
          media_name: string | null
          media_size: number | null
          media_thumbnail: string | null
          media_url: string | null
          message_type: string
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          media_duration_ms?: number | null
          media_mime?: string | null
          media_name?: string | null
          media_size?: number | null
          media_thumbnail?: string | null
          media_url?: string | null
          message_type?: string
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          media_duration_ms?: number | null
          media_mime?: string | null
          media_name?: string | null
          media_size?: number | null
          media_thumbnail?: string | null
          media_url?: string | null
          message_type?: string
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          conversation_id: string
          id: string
          is_admin: boolean
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          is_admin?: boolean
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_id: string
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_id?: string
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "chat_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_polls: {
        Row: {
          allow_multiple: boolean
          closes_at: string | null
          conversation_id: string
          created_at: string
          created_by: string
          id: string
          is_closed: boolean
          message_id: string
          options: Json
          question: string
        }
        Insert: {
          allow_multiple?: boolean
          closes_at?: string | null
          conversation_id: string
          created_at?: string
          created_by: string
          id?: string
          is_closed?: boolean
          message_id: string
          options: Json
          question: string
        }
        Update: {
          allow_multiple?: boolean
          closes_at?: string | null
          conversation_id?: string
          created_at?: string
          created_by?: string
          id?: string
          is_closed?: boolean
          message_id?: string
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_polls_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: true
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_starred: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_starred_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      cultural_festivals: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          description_en: string | null
          description_hi: string | null
          display_order: number
          id: string
          is_published: boolean
          name_en: string
          name_hi: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          description_en?: string | null
          description_hi?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          name_en: string
          name_hi?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          description_en?: string | null
          description_hi?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          name_en?: string
          name_hi?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cultural_shlokas: {
        Row: {
          created_at: string
          created_by: string | null
          display_order: number
          id: string
          is_published: boolean
          meaning_en: string | null
          meaning_hi: string | null
          sanskrit: string
          source: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          meaning_en?: string | null
          meaning_hi?: string | null
          sanskrit: string
          source?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          meaning_en?: string | null
          meaning_hi?: string | null
          sanskrit?: string
          source?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cultural_temples: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          created_by: string | null
          deity_en: string | null
          deity_hi: string | null
          display_order: number
          id: string
          is_published: boolean
          name_en: string
          name_hi: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          deity_en?: string | null
          deity_hi?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          name_en: string
          name_hi?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          created_by?: string | null
          deity_en?: string | null
          deity_hi?: string | null
          display_order?: number
          id?: string
          is_published?: boolean
          name_en?: string
          name_hi?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      directory_access: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          currency: string
          donated_on: string
          donor_name: string
          id: string
          is_anonymous: boolean
          is_published: boolean
          message: string | null
          method: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          currency?: string
          donated_on?: string
          donor_name: string
          id?: string
          is_anonymous?: boolean
          is_published?: boolean
          message?: string | null
          method?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          currency?: string
          donated_on?: string
          donor_name?: string
          id?: string
          is_anonymous?: boolean
          is_published?: boolean
          message?: string | null
          method?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      event_rsvps: {
        Row: {
          attendees: number
          created_at: string
          event_id: string
          id: string
          note: string | null
          user_id: string
        }
        Insert: {
          attendees?: number
          created_at?: string
          event_id: string
          id?: string
          note?: string | null
          user_id: string
        }
        Update: {
          attendees?: number
          created_at?: string
          event_id?: string
          id?: string
          note?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          allow_rsvp: boolean
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          event_date: string
          id: string
          image_url: string | null
          is_published: boolean
          location: string | null
          title: string
          updated_at: string
        }
        Insert: {
          allow_rsvp?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          location?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          allow_rsvp?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          event_date?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          location?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      gallery_albums: {
        Row: {
          cover_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string | null
          id: string
          is_published: boolean
          title: string
          updated_at: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          is_published?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string | null
          id?: string
          is_published?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      gallery_photos: {
        Row: {
          album_id: string
          caption: string | null
          created_at: string
          display_order: number
          id: string
          photo_url: string
        }
        Insert: {
          album_id: string
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          photo_url: string
        }
        Update: {
          album_id?: string
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          photo_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "gallery_photos_album_id_fkey"
            columns: ["album_id"]
            isOneToOne: false
            referencedRelation: "gallery_albums"
            referencedColumns: ["id"]
          },
        ]
      }
      intro_content: {
        Row: {
          body: string
          created_at: string
          display_order: number
          id: string
          language: string
          section_key: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body: string
          created_at?: string
          display_order?: number
          id?: string
          language?: string
          section_key: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          display_order?: number
          id?: string
          language?: string
          section_key?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      matrimonial_contact_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          profile_id: string
          requester_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          profile_id: string
          requester_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          profile_id?: string
          requester_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "matrimonial_contact_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "matrimonial_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matrimonial_contact_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "matrimonial_public"
            referencedColumns: ["id"]
          },
        ]
      }
      matrimonial_profiles: {
        Row: {
          about: string | null
          city: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          date_of_birth: string | null
          education: string | null
          full_name: string
          gender: string
          gotra: string | null
          height_cm: number | null
          id: string
          income_range: string | null
          is_published: boolean
          marital_status: string | null
          photo_url: string | null
          profession: string | null
          updated_at: string
        }
        Insert: {
          about?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          education?: string | null
          full_name: string
          gender: string
          gotra?: string | null
          height_cm?: number | null
          id?: string
          income_range?: string | null
          is_published?: boolean
          marital_status?: string | null
          photo_url?: string | null
          profession?: string | null
          updated_at?: string
        }
        Update: {
          about?: string | null
          city?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          date_of_birth?: string | null
          education?: string | null
          full_name?: string
          gender?: string
          gotra?: string | null
          height_cm?: number | null
          id?: string
          income_range?: string | null
          is_published?: boolean
          marital_status?: string | null
          photo_url?: string | null
          profession?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      matrimonial_shortlist: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          user_id?: string
        }
        Relationships: []
      }
      meetings: {
        Row: {
          agenda: string | null
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          is_published: boolean
          location: string | null
          meeting_link: string | null
          meeting_type: string
          minutes: string | null
          scheduled_at: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          location?: string | null
          meeting_link?: string | null
          meeting_type?: string
          minutes?: string | null
          scheduled_at: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          agenda?: string | null
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          location?: string | null
          meeting_link?: string | null
          meeting_type?: string
          minutes?: string | null
          scheduled_at?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_registrations: {
        Row: {
          city: string | null
          created_at: string
          education: string | null
          email: string | null
          family_head: string | null
          full_name: string
          gotra: string | null
          id: string
          locality: string | null
          message: string | null
          phone: string | null
          profession: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          education?: string | null
          email?: string | null
          family_head?: string | null
          full_name: string
          gotra?: string | null
          id?: string
          locality?: string | null
          message?: string | null
          phone?: string | null
          profession?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          education?: string | null
          email?: string | null
          family_head?: string | null
          full_name?: string
          gotra?: string | null
          id?: string
          locality?: string | null
          message?: string | null
          phone?: string | null
          profession?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          city: string | null
          created_at: string
          created_by: string | null
          education: string | null
          email: string | null
          family_head: string | null
          full_name: string
          gotra: string | null
          id: string
          is_published: boolean
          locality: string | null
          phone: string | null
          photo_url: string | null
          profession: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          education?: string | null
          email?: string | null
          family_head?: string | null
          full_name: string
          gotra?: string | null
          id?: string
          is_published?: boolean
          locality?: string | null
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          education?: string | null
          email?: string | null
          family_head?: string | null
          full_name?: string
          gotra?: string | null
          id?: string
          is_published?: boolean
          locality?: string | null
          phone?: string | null
          photo_url?: string | null
          profession?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notices: {
        Row: {
          attachment_url: string | null
          category: Database["public"]["Enums"]["notice_category"]
          created_at: string
          created_by: string | null
          date: string
          description: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["notice_category"]
          created_at?: string
          created_by?: string | null
          date?: string
          description: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          attachment_url?: string | null
          category?: Database["public"]["Enums"]["notice_category"]
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          is_read: boolean
          kind: string
          link: string | null
          metadata: Json
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          kind?: string
          link?: string | null
          metadata?: Json
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_hidden: boolean
          post_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          post_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          post_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          author_id: string
          body: string | null
          created_at: string
          id: string
          image_url: string | null
          is_hidden: boolean
          updated_at: string
        }
        Insert: {
          author_id: string
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_hidden?: boolean
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_hidden?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          display_name: string | null
          gotra: string | null
          id: string
          profession: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          gotra?: string | null
          id?: string
          profession?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          gotra?: string | null
          id?: string
          profession?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      translation_cache: {
        Row: {
          created_at: string
          id: string
          source_hash: string
          source_text: string
          target_lang: string
          translated_text: string
        }
        Insert: {
          created_at?: string
          id?: string
          source_hash: string
          source_text: string
          target_lang: string
          translated_text: string
        }
        Update: {
          created_at?: string
          id?: string
          source_hash?: string
          source_text?: string
          target_lang?: string
          translated_text?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      donations_public: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          donated_on: string | null
          donor_name: string | null
          id: string | null
          is_anonymous: boolean | null
          message: string | null
          method: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          donated_on?: string | null
          donor_name?: never
          id?: string | null
          is_anonymous?: boolean | null
          message?: string | null
          method?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          donated_on?: string | null
          donor_name?: never
          id?: string | null
          is_anonymous?: boolean | null
          message?: string | null
          method?: string | null
        }
        Relationships: []
      }
      matrimonial_public: {
        Row: {
          about: string | null
          age: number | null
          city: string | null
          created_at: string | null
          education: string | null
          full_name: string | null
          gender: string | null
          gotra: string | null
          height_cm: number | null
          id: string | null
          income_range: string | null
          marital_status: string | null
          photo_url: string | null
          profession: string | null
        }
        Insert: {
          about?: string | null
          age?: never
          city?: string | null
          created_at?: string | null
          education?: string | null
          full_name?: string | null
          gender?: string | null
          gotra?: string | null
          height_cm?: number | null
          id?: string | null
          income_range?: string | null
          marital_status?: string | null
          photo_url?: string | null
          profession?: string | null
        }
        Update: {
          about?: string | null
          age?: never
          city?: string | null
          created_at?: string | null
          education?: string | null
          full_name?: string | null
          gender?: string | null
          gotra?: string | null
          height_cm?: number | null
          id?: string | null
          income_range?: string | null
          marital_status?: string | null
          photo_url?: string | null
          profession?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_directory: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_member: { Args: { _user_id: string }; Returns: boolean }
      is_chat_participant: {
        Args: { _conv_id: string; _user_id: string }
        Returns: boolean
      }
      is_moderator_or_admin: { Args: { _user_id: string }; Returns: boolean }
      is_participant_of_message: {
        Args: { _message_id: string; _user_id: string }
        Returns: boolean
      }
      notify_admins: {
        Args: {
          _body: string
          _kind: string
          _link: string
          _metadata?: Json
          _title: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user" | "volunteer"
      notice_category: "meeting" | "circular" | "decision" | "legal"
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
    Enums: {
      app_role: ["admin", "moderator", "user", "volunteer"],
      notice_category: ["meeting", "circular", "decision", "legal"],
    },
  },
} as const
