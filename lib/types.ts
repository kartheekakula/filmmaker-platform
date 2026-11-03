export interface Profile {
  id: string;
  username: string;
  display_name: string;
  headline: string | null;
  location: string | null;
  banner_url: string | null;
  avatar_url: string | null;
  bio: string | null;
  languages: string[];
  skills: string[];
  fav_dialogue: string | null;
  fav_dialogue_source: string | null;
  fav_filmmakers: string[];
  fav_genres: string[];
  links: Record<string, string>;
  follower_count: number;
  following_count: number;
  created_at: string;
}

export interface ProfileExperience {
  id: string;
  profile_id: string;
  title: string;
  org_or_project: string;
  start_year: number;
  end_year: number | null;
  description: string | null;
  link: string | null;
  created_at: string;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface Category {
  slug: string;
  name: string;
  sort_order: number;
}

export type PostType = "video" | "writing" | "image";

export interface Film {
  id: string;
  owner_id: string;
  title: string;
  caption: string | null;
  genre: string | null;
  language: string | null;
  duration_seconds: number | null;
  source_type: "youtube" | null;
  video_url: string | null;
  youtube_id: string | null;
  thumbnail_url: string | null;
  preview_start_seconds: number;
  category_slug: string;
  like_count: number;
  view_count: number;
  comment_count: number;
  post_type: PostType;
  body: string | null;
  media_urls: string[];
  created_at: string;
}

export interface FilmWithCreator extends Film {
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  categories?: Category | null;
  user_has_liked?: boolean;
}

export interface ProfileTileFilm {
  id: string;
  title: string;
  post_type: PostType;
  thumbnail_url: string | null;
  youtube_id: string | null;
  media_urls: string[];
  created_at: string;
}

export interface FeaturedFilm {
  profile_id: string;
  film_id: string;
  position: number;
  films?: Film;
}

export interface FilmInput {
  title: string;
  caption?: string | null;
  category_slug: string;
  post_type?: PostType;
  duration_seconds?: number | null;
  video_url?: string | null;
  youtube_id?: string | null;
  thumbnail_url?: string | null;
  body?: string | null;
  media_urls?: string[];
}

export interface Comment {
  id: string;
  film_id: string;
  author_id: string;
  body: string;
  created_at: string;
  profiles: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export type WorkMode = "remote" | "in_person" | "hybrid";
export type PayType = "paid" | "unpaid";
export type CollabStatus = "open" | "closed";

export interface CollabRequest {
  id: string;
  owner_id: string;
  created_at: string;
  title: string;
  role_slug: string;
  body: string;
  work_mode: WorkMode;
  city: string | null;
  pay_type: PayType;
  pay_note: string | null;
  duration_text: string | null;
  skills: string[];
  apply_by: string | null;
  status: CollabStatus;
  is_hidden: boolean;
  applicant_count: number;
  owner_username?: string;
  owner_display_name?: string;
  owner_avatar_url?: string | null;
  is_saved?: boolean;
  has_applied?: boolean;
}

export interface CollabRequestInput {
  title: string;
  role_slug: string;
  body: string;
  work_mode: WorkMode;
  city?: string | null;
  pay_type?: PayType;
  pay_note?: string | null;
  duration_text?: string | null;
  skills?: string[];
  apply_by?: string | null;
}

export interface CollabApplicationItem {
  collab_id: string;
  applicant_id: string;
  note: string | null;
  created_at: string;
  applicant: {
    id: string;
    username: string;
    display_name: string;
    headline: string | null;
    avatar_url: string | null;
    links: Record<string, string> | null;
  };
}

export interface MyCollabItem extends CollabRequest {
  application_note?: string | null;
  application_created_at?: string;
}

export type FestivalKind = "festival" | "screening" | "workshop";
export type FestivalWorkMode = "online" | "in_person" | "hybrid";
export type FestivalTab = "open" | "upcoming" | "past";

export interface Festival {
  id: string;
  created_at: string;
  name: string;
  organiser: string;
  kind: FestivalKind;
  work_mode: FestivalWorkMode;
  city: string | null;
  starts_on: string;
  ends_on: string;
  submit_by: string | null;
  fee_text: string | null;
  student_friendly: boolean;
  description: string | null;
  tags: string[];
  website_url: string;
  submit_url: string | null;
  is_published: boolean;
  is_saved?: boolean;
  total_count?: number;
}

export interface FestivalInput {
  name: string;
  organiser: string;
  kind: FestivalKind;
  work_mode: FestivalWorkMode;
  city?: string | null;
  starts_on: string;
  ends_on: string;
  submit_by?: string | null;
  fee_text?: string | null;
  student_friendly?: boolean;
  description?: string | null;
  tags?: string[];
  website_url: string;
  submit_url?: string | null;
  is_published?: boolean;
}


