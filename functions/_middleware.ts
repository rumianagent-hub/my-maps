// Cloudflare Pages middleware — intercepts bot crawlers and injects dynamic OG tags
// for /post?id=... and /user?u=... routes

const BOT_UA = /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|TelegramBot|WhatsApp|Discordbot|Googlebot|bingbot|Applebot|iMessageBot/i;

const FIREBASE_PROJECT = "my-maps-app-9cf67";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents`;

const SITE_URL = "https://my-maps-d00.pages.dev";
const SITE_NAME = "MyMaps";

interface FirestoreDoc {
  fields: Record<string, { stringValue?: string; integerValue?: string; arrayValue?: { values?: { stringValue?: string }[] }; mapValue?: unknown }>;
}

function fsString(doc: FirestoreDoc, key: string): string {
  return doc.fields?.[key]?.stringValue || "";
}

function fsInt(doc: FirestoreDoc, key: string): number {
  return parseInt(doc.fields?.[key]?.integerValue || "0", 10);
}

function fsArray(doc: FirestoreDoc, key: string): string[] {
  return doc.fields?.[key]?.arrayValue?.values?.map((v) => v.stringValue || "").filter(Boolean) || [];
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function buildOgHtml(opts: { title: string; description: string; image?: string; url: string; type?: string }): string {
  const img = opts.image || `${SITE_URL}/og-image.png`;
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escHtml(opts.title)}</title>
<meta property="og:title" content="${escHtml(opts.title)}" />
<meta property="og:description" content="${escHtml(opts.description)}" />
<meta property="og:image" content="${escHtml(img)}" />
<meta property="og:url" content="${escHtml(opts.url)}" />
<meta property="og:type" content="${opts.type || "website"}" />
<meta property="og:site_name" content="${SITE_NAME}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escHtml(opts.title)}" />
<meta name="twitter:description" content="${escHtml(opts.description)}" />
<meta name="twitter:image" content="${escHtml(img)}" />
<meta http-equiv="refresh" content="0;url=${escHtml(opts.url)}" />
</head>
<body>
<p>Redirecting to <a href="${escHtml(opts.url)}">${escHtml(opts.title)}</a>...</p>
</body>
</html>`;
}

async function fetchFirestoreDoc(collection: string, docId: string): Promise<FirestoreDoc | null> {
  try {
    const res = await fetch(`${FIRESTORE_BASE}/${collection}/${docId}`);
    if (!res.ok) return null;
    return await res.json() as FirestoreDoc;
  } catch {
    return null;
  }
}

async function fetchUserByUsername(username: string): Promise<FirestoreDoc | null> {
  try {
    const body = {
      structuredQuery: {
        from: [{ collectionId: "users" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "username" },
            op: "EQUAL",
            value: { stringValue: username },
          },
        },
        limit: 1,
      },
    };
    const res = await fetch(`${FIRESTORE_BASE}:runQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const results = await res.json() as { document?: FirestoreDoc }[];
    if (results[0]?.document) return results[0].document as unknown as FirestoreDoc;
    return null;
  } catch {
    return null;
  }
}

export const onRequest: PagesFunction = async (context) => {
  const { request } = context;
  const ua = request.headers.get("user-agent") || "";

  // Only intercept bot crawlers
  if (!BOT_UA.test(ua)) {
    return context.next();
  }

  const url = new URL(request.url);

  // Handle /post?id=...
  if (url.pathname === "/post" || url.pathname === "/post/") {
    const postId = url.searchParams.get("id");
    if (postId) {
      const doc = await fetchFirestoreDoc("posts", postId);
      if (doc) {
        const placeName = fsString(doc, "placeName");
        const city = fsString(doc, "city");
        const caption = fsString(doc, "caption");
        const rating = fsInt(doc, "rating");
        const photos = fsArray(doc, "photoUrls");
        const authorName = fsString(doc, "authorName");

        const title = `${placeName}${city ? ` — ${city}` : ""} | ${SITE_NAME}`;
        const parts: string[] = [];
        if (rating > 0) parts.push(`${"⭐".repeat(rating)} ${rating}/5`);
        if (caption) parts.push(caption);
        if (authorName) parts.push(`Shared by ${authorName}`);
        const description = parts.join(" · ") || `Check out ${placeName} on ${SITE_NAME}`;

        return new Response(buildOgHtml({
          title,
          description: description.slice(0, 200),
          image: photos[0] || undefined,
          url: `${SITE_URL}/post?id=${postId}`,
          type: "article",
        }), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
      }
    }
  }

  // Handle /user?u=...
  if (url.pathname === "/user" || url.pathname === "/user/") {
    const username = url.searchParams.get("u");
    if (username) {
      const doc = await fetchUserByUsername(username);
      if (doc) {
        const displayName = fsString(doc, "displayName");
        const bio = fsString(doc, "bio");
        const postCount = fsInt(doc, "postCount");
        const photo = fsString(doc, "photoURL");

        const title = `${displayName} (@${username}) | ${SITE_NAME}`;
        const description = bio || `${displayName} has shared ${postCount} restaurant${postCount !== 1 ? "s" : ""} on ${SITE_NAME}`;

        return new Response(buildOgHtml({
          title,
          description: description.slice(0, 200),
          image: photo || undefined,
          url: `${SITE_URL}/user?u=${username}`,
          type: "profile",
        }), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
      }
    }
  }

  // Handle /place?id=...
  if (url.pathname === "/place" || url.pathname === "/place/") {
    const placeId = url.searchParams.get("id");
    if (placeId) {
      // Fetch one post for this place to get name/city/photo
      try {
        const body = {
          structuredQuery: {
            from: [{ collectionId: "posts" }],
            where: {
              compositeFilter: {
                op: "AND",
                filters: [
                  { fieldFilter: { field: { fieldPath: "placeId" }, op: "EQUAL", value: { stringValue: placeId } } },
                  { fieldFilter: { field: { fieldPath: "visibility" }, op: "EQUAL", value: { stringValue: "public" } } },
                ],
              },
            },
            limit: 1,
          },
        };
        const res = await fetch(`${FIRESTORE_BASE}:runQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const results = await res.json() as { document?: FirestoreDoc }[];
          const doc = results[0]?.document as unknown as FirestoreDoc | undefined;
          if (doc) {
            const placeName = fsString(doc, "placeName");
            const city = fsString(doc, "city");
            const photos = fsArray(doc, "photoUrls");
            return new Response(buildOgHtml({
              title: `${placeName}${city ? ` — ${city}` : ""} | ${SITE_NAME}`,
              description: `See all posts about ${placeName} on ${SITE_NAME}`,
              image: photos[0] || undefined,
              url: `${SITE_URL}/place?id=${placeId}`,
            }), { headers: { "Content-Type": "text/html;charset=UTF-8" } });
          }
        }
      } catch { /* fall through */ }
    }
  }

  return context.next();
};
