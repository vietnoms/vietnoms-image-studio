import { google, drive_v3 } from "googleapis";
import { OAuth2Client, Credentials } from "google-auth-library";
import { put, list, del } from "@vercel/blob";

const BLOB_TOKEN_PATH = "config/google-drive-token.json";
const SCOPES = ["https://www.googleapis.com/auth/drive.file"];
const ROOT_FOLDER_NAME = "Image Studio";

// In-memory folder ID cache: "Image Studio/vietnoms/Uncategorized" → folderId
const folderCache = new Map<string, string>();

let oauth2Client: OAuth2Client | null = null;
let cachedTokens: Credentials | null = null;

// --- Configuration checks ---

export function isGoogleDriveConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_DRIVE_CLIENT_ID &&
    process.env.GOOGLE_DRIVE_CLIENT_SECRET
  );
}

export async function isGoogleDriveConnected(): Promise<boolean> {
  if (!isGoogleDriveConfigured()) return false;
  const tokens = await loadTokens();
  return Boolean(tokens?.refresh_token);
}

// --- OAuth2 client ---

function getOAuth2Client(): OAuth2Client {
  if (!process.env.GOOGLE_DRIVE_CLIENT_ID || !process.env.GOOGLE_DRIVE_CLIENT_SECRET) {
    throw new Error("Google Drive OAuth credentials not configured.");
  }
  if (!oauth2Client) {
    oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_DRIVE_CLIENT_ID,
      process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      process.env.GOOGLE_DRIVE_REDIRECT_URI || "http://localhost:3000/api/auth/google-drive/callback"
    );

    // Auto-save refreshed tokens
    oauth2Client.on("tokens", async (tokens) => {
      if (tokens.refresh_token) {
        const existing = await loadTokens();
        await saveTokens({ ...existing, ...tokens });
      }
    });
  }
  return oauth2Client;
}

async function getAuthenticatedClient(): Promise<OAuth2Client> {
  const client = getOAuth2Client();
  const tokens = await loadTokens();
  if (!tokens?.refresh_token) {
    throw new Error("Google Drive not connected. Please authorize first.");
  }
  client.setCredentials(tokens);
  return client;
}

function getDriveClient(auth: OAuth2Client): drive_v3.Drive {
  return google.drive({ version: "v3", auth });
}

// --- Auth flow ---

export function getAuthUrl(): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
  });
}

export async function handleAuthCallback(code: string): Promise<void> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);
  await saveTokens(tokens);
}

export async function disconnectDrive(): Promise<void> {
  await deleteTokens();
  if (oauth2Client) {
    oauth2Client.revokeCredentials().catch(() => {});
    oauth2Client = null;
  }
  folderCache.clear();
}

// --- Token persistence (Vercel Blob + in-memory cache) ---

async function saveTokens(tokens: Credentials): Promise<void> {
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

async function loadTokens(): Promise<Credentials | null> {
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

// --- Folder management ---

async function findOrCreateFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string
): Promise<string> {
  // Check cache
  const cacheKey = parentId ? `${parentId}/${name}` : name;
  const cached = folderCache.get(cacheKey);
  if (cached) return cached;

  // Search for existing folder
  let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }

  const res = await drive.files.list({
    q: query,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    const folderId = res.data.files[0].id!;
    folderCache.set(cacheKey, folderId);
    return folderId;
  }

  // Create folder
  const fileMetadata: drive_v3.Schema$File = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) {
    fileMetadata.parents = [parentId];
  }

  const folder = await drive.files.create({
    requestBody: fileMetadata,
    fields: "id",
  });

  const folderId = folder.data.id!;
  folderCache.set(cacheKey, folderId);
  return folderId;
}

async function ensureFolderPath(
  drive: drive_v3.Drive,
  workspace: string,
  category: string
): Promise<string> {
  // Create: Image Studio / {Workspace} / {Category}
  const rootId = await findOrCreateFolder(drive, ROOT_FOLDER_NAME);

  // Capitalize workspace name for display
  const workspaceName = workspace.charAt(0).toUpperCase() + workspace.slice(1);
  const workspaceId = await findOrCreateFolder(drive, workspaceName, rootId);

  const categoryId = await findOrCreateFolder(drive, category, workspaceId);
  return categoryId;
}

// --- Upload ---

export interface UploadToDriveOptions {
  buffer: Buffer;
  filename: string;
  workspace: string;
  category?: string;
  mimeType?: string;
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
}

export async function uploadToDrive(options: UploadToDriveOptions): Promise<DriveUploadResult> {
  const {
    buffer,
    filename,
    workspace,
    category = "Uncategorized",
    mimeType = "image/png",
  } = options;

  const auth = await getAuthenticatedClient();
  const drive = getDriveClient(auth);

  // Ensure folder structure exists
  const folderId = await ensureFolderPath(drive, workspace, category);

  // Upload from buffer using a readable stream
  const { Readable } = await import("stream");
  const stream = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: {
      name: filename,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id, webViewLink",
  });

  return {
    fileId: res.data.id!,
    webViewLink: res.data.webViewLink || `https://drive.google.com/file/d/${res.data.id}/view`,
  };
}
