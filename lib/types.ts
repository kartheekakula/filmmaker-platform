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
