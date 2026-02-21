# 🗺️ MyMaps

**Instagram for places you've actually been.** Share restaurants you've visited, track them on a map, and share your food journey.

## Features

- 🔐 **Google Sign-In** — One-tap authentication
- 📍 **Add Visits** — Search restaurants, upload photos, add notes & ratings
- 🗺️ **Personal Map** — See pins of everywhere you've been
- 📋 **List View** — Sortable, filterable list of all visits
- 📸 **Post Feed** — Beautiful card-based view of visits
- 🔗 **Shareable Profiles** — Public profile at `/u/username`
- 🔗 **Shareable Posts** — Each visit has its own URL

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Styling:** Tailwind CSS
- **Auth:** Firebase Authentication (Google)
- **Database:** Cloud Firestore
- **Storage:** Firebase Storage
- **Maps:** Google Maps JavaScript API + Places API
- **Deployment:** Vercel

## Setup

1. Clone the repo
2. Copy `.env.example` to `.env.local` and fill in your Firebase + Google Maps credentials
3. `npm install`
4. `npm run dev`

### Firebase Setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable Authentication → Google sign-in
3. Create a Firestore database
4. Enable Storage
5. Copy your web app config to `.env.local`

### Google Maps Setup

1. Enable Maps JavaScript API + Places API in Google Cloud Console
2. Create an API key and add it to `.env.local`

## Project Structure

```
src/
├── app/
│   ├── page.tsx          # Landing / Home
│   ├── add/page.tsx      # Add visit form
│   ├── profile/page.tsx  # User profile (Map/List/Posts)
│   ├── post/[id]/        # Individual post page
│   └── u/[username]/     # Public profile page
├── components/
│   ├── Navbar.tsx
│   ├── MapView.tsx
│   ├── PostCard.tsx
│   ├── PlaceSearch.tsx
│   ├── AddPostForm.tsx
│   ├── ProfileTabs.tsx
│   └── GoogleMapsLoader.tsx
├── context/
│   └── AuthContext.tsx
└── lib/
    ├── firebase.ts
    └── types.ts
```

## License

MIT
