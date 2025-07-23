
export interface Memorial {
  slug: string;
  petName: string;
  shortMessage: string;
  memorialContent: string;
  images: string[]; // Array of public image URLs from R2
  createdAt: string; // ISO date string
}
