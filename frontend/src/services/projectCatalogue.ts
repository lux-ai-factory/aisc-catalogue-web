import axios from "axios";

/**
 * An AISC project's private copy of the catalogue, stored and served by the
 * AISC platform. The page and the platform share an origin, so every URL here
 * is relative and the session cookie travels by itself.
 */

// the platform's project slugs: at most 64 characters (platform projects.py SLUG_MAX)
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;
const STORAGE_KEY = "aisc-project-catalogue-slug";

/** The project this catalogue was opened for: `?project=<slug>`, or the one
 *  remembered for this tab, so moving to another page keeps it. */
export function projectSlug(): string | null {
  const fromUrl = new URLSearchParams(window.location.search).get("project");
  if (fromUrl !== null) {
    if (!SLUG_PATTERN.test(fromUrl)) return null;
    try {
      sessionStorage.setItem(STORAGE_KEY, fromUrl);
    } catch {
      // Storage can be blocked; the slug in the URL still works.
    }
    return fromUrl;
  }
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return stored && SLUG_PATTERN.test(stored) ? stored : null;
  } catch {
    return null;
  }
}

// App redirects "/" to "/catalogue" and that drops the query string, so the
// slug is remembered here, at load, before the redirect runs.
if (typeof window !== "undefined") projectSlug();

/** The platform's endpoints for the project's catalogue. */
export const projectBase = (slug: string) => `/api/projects/${slug}/catalogue`;

/** Where the copy answers the catalogue's own API (replaces VITE_API_URL). */
export const catalogueBase = (slug: string) => `${projectBase(slug)}/api`;

export interface ProjectCatalogueInfo {
  mode: "private" | "public" | null;
  chosen_at: string | null;
  updated_at: string | null;
  can_update: boolean;
}

export interface UpdateResult {
  added: number;
  updated: number;
  unchanged: number;
  removed: number;
  local_kept: number;
}

const requireSlug = (): string => {
  const slug = projectSlug();
  if (!slug) throw new Error("No project");
  return slug;
};

export async function fetchProjectCatalogue(): Promise<ProjectCatalogueInfo> {
  const res = await axios.get<ProjectCatalogueInfo>(projectBase(requireSlug()));
  return res.data;
}

/** Refresh the copy from the public catalogue (admins only). */
export async function updateFromPublic(): Promise<UpdateResult> {
  const res = await axios.post<UpdateResult>(`${projectBase(requireSlug())}/update`);
  return res.data;
}

/** The dimension tag slugs of the project's selected control objectives;
 *  `[]` when none are selected yet. */
export async function fetchProjectDimensions(): Promise<string[]> {
  const res = await axios.get<string[]>(
    `${catalogueBase(requireSlug())}/project-dimensions`
  );
  return res.data;
}
