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

