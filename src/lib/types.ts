export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
  bio: string;
  homeCity: string;
  isPublic: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  createdAt: number;
  updatedAt: number;
  onboarded: boolean;
}

export interface Post {
  id: string;
  uid: string;
  placeId: string;
  placeName: string;
  placeAddress: string;
  lat: number;
  lng: number;
  city: string;
  caption: string;
  rating: number;
  tags: string[];
  visitedAt: number;
  createdAt: number;
  photoUrls: string[];
  visibility: "public" | "followers" | "private";
  authorName?: string;
  authorPhoto?: string;
  authorUsername?: string;
}
