import axios from "axios";
import { projectSlug, catalogueBase } from "./projectCatalogue";

axios.defaults.withCredentials = true;

/** Where the catalogue reads go: the project's catalogue on the AISC platform,
 *  read on each call because the project comes from the page URL. Without a
 *  project there is nothing to read, and the call fails without a request. */
function apiBase(): string {
  const slug = projectSlug();
  if (!slug) throw new Error("No project");
  return catalogueBase(slug);
}


function getCsrfToken() {
  const match = document.cookie.match(new RegExp('(^| )csrftoken=([^;]+)'));
  return match ? decodeURIComponent(match[2]) : null;
}

axios.interceptors.request.use((config) => {
  if (config.method && config.method.toLowerCase() !== 'get') {
    const token = getCsrfToken();
    if (token) {
      config.headers['X-CSRFToken'] = token;
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});


// ─── Types matching backend models ───────────────────────────────────────────

export type Licensing = "Open_Source" | "Proprietary";
export type Status = "pending" | "rejected" | "approved";
export type TagSection =
  | "license"
  | "ai_type"
  | "dimension"
  | "type"
  | "sector"
  | "testing_subdim"
  | "controls_subdim"
  | "source";

export interface Tag {
  id: number;
  slug: string;
  label: string;
  section: TagSection;
  color_bg: string;
  _color_text: string;
  sort_order: number;
  parent_dimension_slug?: string | null;
}

export interface Metadata {
  id: number;
  description: string;
  provider: string;
  link: string;
  branch: string;
  scientific_reference: string;
  project_maturity: string;
  /** Controls only: the control's topic (e.g. "Data and Data Governance"). */
  control_topic?: string | null;
  // filled in when the list is asked for with detailed=true
  target_legal_requirements?: string | null;
  input_spec?: string | null;
  config_params?: string | null;
  additional_output_fields?: string | null;
  contextual_guidance?: string | null;
  visualisation?: string | null;
  reporting?: string | null;
  tool_1_id: number;
}

/** One row per (tool, metric) pair. */
export interface Metric {
  id: number;
  name: string;
  data_type: string;
  range_str: string;
  unit: string;
  represents: string;
  is_derived: boolean;
  formula: string | null;
  tool_id: number;
  // Inlined by /metric/ and /tool/?detailed=true
  tool?: { id: number; slug: string; name: string } | null;
  dimensions?: Tag[];
}

export type CompletionStatus = "full" | "partial" | "stub";

/** Compliance question extracted from a control questionnaire. */
export interface Question {
  id: number;
  tool_id: number;
  order: number;
  text: string;
  article: string | null;
  category: string | null;
}

export interface Tool {
  id: number;
  name: string;
  slug: string;
  description: string;
  version: string;
  licensing: Licensing;
  status: Status;
  submitted_by: string;
  reviewed_by: string;
  reviewed_at: string;
  created_at: string;
  storage_path: string;
  /** JSON-LD vt:completionStatus, drives blue (full) vs pink (partial/stub) cards. */
  completion_status?: CompletionStatus;
  // Populated when ?detailed=true
  metadata?: Metadata | null;
  tags?: Tag[];
  metrics?: Metric[];
  /** A control's questionnaire, when it has one. */
  questions?: Question[];
  /** A plugin of the AISC stack, not in the public catalogue. */
  aisc_local?: boolean;
  /** Already installed in the project. */
  aisc_installed?: boolean;
}

// ─── API functions ───────────────────────────────────────────────────────────

/** Fetch all tools with their tags, metadata, and metrics. */
export async function fetchToolsDetailed(): Promise<Tool[]> {
  const res = await axios.get<Tool[]>(`${apiBase()}/tool/`, {
    params: { detailed: true },
  });
  return res.data;
}

/** Fetch all tags */
export async function fetchTags(): Promise<Tag[]> {
  const res = await axios.get<Tag[]>(`${apiBase()}/tags/`);
  return res.data;
}

/** Fetch every metric across every tool, the data source for the Metrics page. */
export async function fetchMetrics(): Promise<Metric[]> {
  const res = await axios.get<Metric[]>(`${apiBase()}/metric/`);
  return res.data;
}

/** Fetch tags associated with a specific tool. */
export async function fetchToolTags(toolId: number): Promise<Tag[]> {
  const res = await axios.get<Tag[]>(`${apiBase()}/tool/${toolId}/tags/`);
  return res.data;
}

// ─── Install (AISC platform) ─────────────────────────────────────────────────

/** What the AISC platform knows about installing a tool into a project. */
export interface InstallInfo {
  slug: string;
  package_name: string;
  /** null when the index carries no installable release of this distribution. */
  version: string | null;
  index_url: string;
  installable: boolean;
  /** Why it is not installable; null when it is. */
  reason: string | null;
}

/** GET the install descriptor for a tool. `installable=false` carries a `reason`. */
export async function fetchInstallInfo(slug: string): Promise<InstallInfo> {
  const res = await axios.get<InstallInfo>(
    `${apiBase()}/tool/${encodeURIComponent(slug)}/install-info`
  );
  return res.data;
}

/** POST: install a test into the project this catalogue belongs to. The
 *  platform installs it in the engine with the person's sign-in; a refusal carries `detail`. */
export async function installTest(slug: string): Promise<{ slug: string; package_name: string; version: string }> {
  // one path segment: a slug with "/" or ".." must not reach another route with the admin's sign-in
  const res = await axios.post(`${apiBase()}/tool/${encodeURIComponent(slug)}/install`);
  return res.data;
}
