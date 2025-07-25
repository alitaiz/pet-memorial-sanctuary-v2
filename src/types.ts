
export interface Memorial {
  slug: string;
  petName: string;
  shortMessage: string;
  memorialContent: string;
  images: string[]; // Array of public image URLs from R2
  createdAt: string; // ISO date string
  editKey: string; // Secret key for editing/deleting
}

export interface MemorialSummary {
  slug: string;
  petName: string;
  createdAt: string;
}

export interface CreatedMemorialInfo {
  slug: string;
  editKey: string;
}

export interface MemorialUpdatePayload {
  petName: string;
  shortMessage: string;
  memorialContent: string;
  images: string[];
}
