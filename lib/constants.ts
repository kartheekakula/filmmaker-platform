export interface Category {
  slug: string;
  name: string;
  sortOrder: number;
}

export const CATEGORIES: Category[] = [
  { slug: "direction", name: "Direction", sortOrder: 1 },
  { slug: "writing", name: "Writing", sortOrder: 2 },
  { slug: "cinematography", name: "Cinematography", sortOrder: 3 },
  { slug: "editing", name: "Editing", sortOrder: 4 },
  { slug: "acting", name: "Acting", sortOrder: 5 },
  { slug: "music-and-sound", name: "Music & Sound", sortOrder: 6 },
  { slug: "production", name: "Production", sortOrder: 7 },
  { slug: "art-and-design", name: "Art & Design", sortOrder: 8 },
  { slug: "animation-and-vfx", name: "Animation & VFX", sortOrder: 9 },
];
