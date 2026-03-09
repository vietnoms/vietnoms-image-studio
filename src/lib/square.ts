import { put, list, del } from "@vercel/blob";

const BASE_URL = "https://connect.squareup.com";
const API_URL = "https://connect.squareup.com/v2";
const BLOB_TOKEN_PATH = "config/square-token.json";

// In-memory cache so repeated reads within the same serverless invocation are fast
let cachedTokens: SquareTokens | null = null;

// --- Types ---

interface SquareTokens {
  access_token: string;
  refresh_token: string;
  expires_at: string; // ISO timestamp
  merchant_id: string;
  token_type: string;
}

export interface SquareCatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: string;
  imageUrl: string | null;
}

export interface SquareCatalogResult {
  items: SquareCatalogItem[];
  totalFetched: number;
}

// --- Configuration checks ---

export function isSquareConfigured(): boolean {
  return Boolean(
    process.env.SQUARE_APP_ID && process.env.SQUARE_APP_SECRET
  );
}

export async function isSquareConnected(): Promise<boolean> {
  if (!isSquareConfigured()) return false;
  const tokens = await loadTokens();
  return Boolean(tokens?.access_token);
}

// --- Auth flow ---

export function getAuthUrl(): string {
  const appId = process.env.SQUARE_APP_ID;
  const redirectUri =
    process.env.SQUARE_REDIRECT_URI ||
    "http://localhost:3000/api/auth/square/callback";

  const params = new URLSearchParams({
    client_id: appId!,
    scope: "ITEMS_READ",
    session: "false",
    redirect_uri: redirectUri,
  });

  return `${BASE_URL}/oauth2/authorize?${params.toString()}`;
}

export async function handleAuthCallback(code: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.SQUARE_APP_ID,
      client_secret: process.env.SQUARE_APP_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri:
        process.env.SQUARE_REDIRECT_URI ||
        "http://localhost:3000/api/auth/square/callback",
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err.message || err.error_description || "Failed to exchange authorization code"
    );
  }

  const data = await response.json();

  // Calculate expiry — Square tokens expire in 30 days
  const expiresAt = new Date(
    Date.now() + (data.expires_at ? 0 : 30 * 24 * 60 * 60 * 1000)
  );

  const tokens: SquareTokens = {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: data.expires_at || expiresAt.toISOString(),
    merchant_id: data.merchant_id || "",
    token_type: data.token_type || "bearer",
  };

  await saveTokens(tokens);
}

export async function disconnectSquare(): Promise<void> {
  const tokens = await loadTokens();

  // Revoke token if we have one
  if (tokens?.access_token) {
    try {
      await fetch(`${BASE_URL}/oauth2/revoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: process.env.SQUARE_APP_ID,
          access_token: tokens.access_token,
        }),
      });
    } catch {
      // Best-effort revocation
    }
  }

  // Delete stored tokens
  await deleteTokens();
}

// --- Token management (Vercel Blob + in-memory cache) ---

async function saveTokens(tokens: SquareTokens): Promise<void> {
  cachedTokens = tokens;

  // Delete any existing blob at this path first
  try {
    const { blobs } = await list({ prefix: BLOB_TOKEN_PATH });
    for (const blob of blobs) {
      await del(blob.url);
    }
  } catch { /* no existing blob */ }

  await put(BLOB_TOKEN_PATH, JSON.stringify(tokens), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

async function loadTokens(): Promise<SquareTokens | null> {
  if (cachedTokens) return cachedTokens;

  try {
    const { blobs } = await list({ prefix: BLOB_TOKEN_PATH });
    if (blobs.length > 0) {
      const response = await fetch(blobs[0].url);
      if (response.ok) {
        const tokens = await response.json();
        cachedTokens = tokens;
        return tokens;
      }
    }
  } catch {
    // Blob read failed
  }

  return null;
}

async function deleteTokens(): Promise<void> {
  cachedTokens = null;
  try {
    const { blobs } = await list({ prefix: BLOB_TOKEN_PATH });
    for (const blob of blobs) {
      await del(blob.url);
    }
  } catch { /* ignore */ }
}

async function getAccessToken(): Promise<string> {
  const tokens = await loadTokens();
  if (!tokens?.access_token) {
    throw new Error("Square not connected. Please authorize first.");
  }

  // Check if token is expired or expiring within 5 minutes
  const expiresAt = new Date(tokens.expires_at).getTime();
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  if (expiresAt - now < fiveMinutes && tokens.refresh_token) {
    // Refresh the token
    const response = await fetch(`${BASE_URL}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.SQUARE_APP_ID,
        client_secret: process.env.SQUARE_APP_SECRET,
        refresh_token: tokens.refresh_token,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      // Refresh failed — clear tokens and force re-auth
      await deleteTokens();
      throw new Error("Square token expired. Please reconnect.");
    }

    const data = await response.json();
    const refreshed: SquareTokens = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || tokens.refresh_token,
      expires_at: data.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      merchant_id: data.merchant_id || tokens.merchant_id,
      token_type: data.token_type || "bearer",
    };
    await saveTokens(refreshed);
    return refreshed.access_token;
  }

  return tokens.access_token;
}

// --- Catalog fetch ---

function formatPrice(priceMoney?: { amount?: number; currency?: string }): string {
  if (!priceMoney || priceMoney.amount == null) return "";
  const dollars = (Number(priceMoney.amount) / 100).toFixed(2);
  const symbol = priceMoney.currency === "USD" ? "$" : `${priceMoney.currency} `;
  return `${symbol}${dollars}`;
}

export async function fetchCatalogItems(): Promise<SquareCatalogResult> {
  const token = await getAccessToken();

  const categoryMap = new Map<string, string>();
  const imageMap = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawItems: any[] = [];

  let cursor: string | undefined;
  let pages = 0;
  const maxPages = 50; // Safety limit: 50 pages × 200 objects = 10,000 max

  do {
    const params = new URLSearchParams({ types: "ITEM,CATEGORY,IMAGE" });
    if (cursor) params.set("cursor", cursor);

    const response = await fetch(`${API_URL}/catalog/list?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Square-Version": "2024-12-18",
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(
        err.errors?.[0]?.detail || `Square API error: ${response.status}`
      );
    }

    const data = await response.json();

    // Process objects by type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const obj of data.objects || []) {
      if (obj.type === "CATEGORY" && obj.category_data) {
        categoryMap.set(obj.id, obj.category_data.name || "Uncategorized");
      } else if (obj.type === "IMAGE" && obj.image_data) {
        imageMap.set(obj.id, obj.image_data.url || "");
      } else if (obj.type === "ITEM" && obj.item_data) {
        rawItems.push(obj);
      }
    }

    cursor = data.cursor;
    pages++;
  } while (cursor && pages < maxPages);

  // Map raw items to our format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: SquareCatalogItem[] = rawItems.map((obj: any) => {
    const itemData = obj.item_data;

    // Resolve category
    let category = "Uncategorized";
    if (itemData.category_id) {
      category = categoryMap.get(itemData.category_id) || "Uncategorized";
    } else if (itemData.categories && itemData.categories.length > 0) {
      // Newer API versions use categories array
      category = categoryMap.get(itemData.categories[0].id) || "Uncategorized";
    }

    // Resolve price from first variation
    let price = "";
    const variations = itemData.variations || [];
    if (variations.length > 0) {
      const varData = variations[0].item_variation_data;
      if (varData?.price_money) {
        price = formatPrice(varData.price_money);
      }
    }

    // Resolve image
    let imageUrl: string | null = null;
    const imageIds = itemData.image_ids || [];
    if (imageIds.length > 0) {
      imageUrl = imageMap.get(imageIds[0]) || null;
    }

    return {
      id: obj.id,
      name: itemData.name || "",
      description: itemData.description || "",
      category,
      price,
      imageUrl,
    };
  });

  return { items, totalFetched: items.length };
}
