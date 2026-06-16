export type UserRole = 'visitor' | 'pending' | 'member' | 'admin' | 'superadmin'
export type SexType = 'male' | 'female' | 'other'
export type EntityType = 'photo' | 'album_photo' | 'video' | 'poetry' | 'thread' | 'thread_reply' | 'timeless_moment' | 'experience'

export interface User {
  id: string
  email: string
  first_name: string
  last_name: string
  sex: SexType
  dob?: string
  place_of_residence: string
  link_to_bazidpur: string
  comments?: string
  role: UserRole
  is_active: boolean
  photo_url?: string
  location_country?: string
  location_state?: string
  location_city?: string
  location_lat?: number
  location_lng?: number
  privacy_policy_accepted_at?: string
  member_since?: string
  approved_by?: string
  approved_at?: string
  suspended_at?: string
  created_at: string
  updated_at: string
}

export interface Photo {
  id: string
  title: string
  description?: string
  r2_url: string
  thumbnail_url: string
  display_order: number
  is_active: boolean
  uploaded_by?: string
  created_at: string
  updated_at: string
}

export interface Video {
  id: string
  title: string
  description?: string
  youtube_url: string
  youtube_id: string
  thumbnail_url?: string
  display_order: number
  is_active: boolean
  uploaded_by?: string
  created_at: string
  updated_at: string
}

export interface Like {
  id: string
  user_id: string
  entity_type: EntityType
  entity_id: string
  created_at: string
}

export interface Comment {
  id: string
  user_id: string
  entity_type: EntityType
  entity_id: string
  content: string
  is_deleted: boolean
  created_at: string
  updated_at: string
  user?: User
}

export interface FamilyTreeNode {
  id: string
  parent_id?: string
  name: string
  sex: SexType
  dob?: string
  dod?: string
  description?: string
  photo_url?: string
  is_alive: boolean
  tree_level: number
  display_order: number
  created_at: string
  updated_at: string
  children?: FamilyTreeNode[]
}

export interface AncestorNode {
  position: number
  name: string
  title?: string
  gender: 'male' | 'female'
  bornApprox: number
}

export interface LandingCard {
  id: string
  title: string
  value: string
  icon?: string
  display_order: number
  is_active: boolean
}

export interface LandingPhoto {
  id: string
  r2_url: string
  caption?: string
  display_order: number
  is_active: boolean
}

export interface ContactSubmission {
  name: string
  email: string
  subject?: string
  message: string
}

export interface Album {
  id: string
  user_id: string
  title: string
  description?: string
  cover_photo_url?: string
  is_hidden: boolean
  display_order: number
  created_at: string
  user?: { first_name: string; last_name: string }
}

export interface AlbumPhoto {
  id: string
  album_id: string
  r2_url: string
  thumbnail_url?: string
  caption?: string
  display_order: number
  is_hidden?: boolean
  created_at: string
}

export interface PoetryVerse {
  id: string
  poetry_id: string
  verse_order: number
  content_original: string
  content_english?: string
}

export interface Poetry {
  id: string
  type: 'poetry' | 'ghazal'
  title_english: string
  title_urdu?: string
  title_persian?: string
  content_urdu?: string
  content_persian?: string
  author?: string
  display_order: number
  is_active: boolean
  created_at: string
  verses?: PoetryVerse[]
}

export interface Experience {
  id: string
  title: string
  summary?: string
  author_name: string
  author_bio?: string
  author_photo_url?: string
  author_user_id?: string
  cover_photo_url?: string
  is_published: boolean
  display_order: number
  created_at: string
}

export interface ExperienceChapter {
  id: string
  experience_id: string
  chapter_number: number
  title: string
  content: string
}

export interface ThreadMedia {
  id: string
  thread_id: string | null
  reply_id: string | null
  url: string
  filename: string | null
  media_type: 'image' | 'audio' | 'document' | 'youtube'
}

export interface ForumThread {
  id: string
  title: string
  body?: string
  room: string
  is_pinned: boolean
  is_deleted: boolean
  created_at: string
  author_id: string
  author?: { first_name: string; last_name: string; photo_url?: string; role?: string }
  replies?: [{ count: number }]
  media?: ThreadMedia[]
}

export interface ForumReply {
  id: string
  thread_id: string
  body?: string
  is_deleted: boolean
  created_at: string
  author_id: string
  parent_reply_id?: string | null
  author?: { first_name: string; last_name: string; photo_url?: string; role?: string }
  media?: ThreadMedia[]
}
