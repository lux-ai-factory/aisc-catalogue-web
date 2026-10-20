import React, { useState } from "react";
import { isPlatformAddress, type HandshakePayload } from "./connect";
import { controlsBase, controlsInstallUrl, projectParam } from "./controlsInstall";
import { useFocusOnOpen } from "../hooks/useFocusOnOpen";

/** What the platform's controls app offers for one control. */
type Options = {
  control: { title: string; source: string; topic: string; questions: number; description: string | null };
  projects: Array<{ pid: string; name: string }>;
  preselect: string | null;
  installed: Record<string, string>;
};

type State =
  | { phase: "loading" }
  | { phase: "unreachable" }
  | { phase: "error"; error: string }
  | { phase: "ready"; options: Options };

/** The answer's `error` when it is text, else `fallback`: anything else would crash the page. */
const errorText = (body: { error?: unknown } | null, fallback: string): string =>
  typeof body?.error === "string" && body.error ? body.error : fallback;

/** Ask the platform what it would install and where. */
function fetchOffer(base: string, slug: string, handshake: HandshakePayload | null): Promise<State> {
  return fetch(`${base}/api/install?slug=${encodeURIComponent(slug)}${projectParam(handshake)}`, { credentials: "include" })
    .then(async (res): Promise<State> => {
      const body = await res.json().catch(() => null);
      if (res.ok && body && Array.isArray(body.projects)) return { phase: "ready", options: body as Options };
      return { phase: "error", error: errorText(body, "The platform could not offer this control.") };
    })
    // A redirect to the sign-in page, or a platform on another site: the
    // browser shows neither to this page, only that the call failed.
    .catch((): State => ({ phase: "unreachable" }));
}

/**
 * "Install into a project…" for a control, without leaving the catalogue.
 *
 * The dialog asks the opening platform's controls app, from the browser and
 * with the person's sign-in, what it would install and where (GET), and installs
 * into the chosen project (POST). The catalogue stays open: the
 * dialog says it is installed and links to the checklist in a new tab, and
 * `onInstalled` tells the page when the catalogue's own project got it, so its
 * card says installed. The link's own address is the platform's install page,
 * which is what opens if the platform cannot be reached from here.
 */
export default function ControlInstall({
  slug,
  handshake,
  style,
  onInstalled,
}: {
  slug: string;
  handshake: HandshakePayload | null;
  style: React.CSSProperties;
  onInstalled?: (slug: string) => void;
}) {
  // The controls app is the platform's: an address elsewhere came from a fragment someone else wrote,
  // and the dialog would show their text and links.
  const offered = controlsBase(handshake);
  const trusted = offered !== null && isPlatformAddress(offered);
  const base = trusted ? offered : null;
  const fallback = trusted ? controlsInstallUrl(handshake, slug) : null;
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State>({ phase: "loading" });
  const dialogRef = useFocusOnOpen<HTMLDivElement>(open);

  if (!base || !fallback) {
    return (
      <span style={{ color: "#6b7280", fontSize: 13, alignSelf: "center" }}>
        Open the catalogue from your platform to install this control.
      </span>
    );
  }

  const close = () => setOpen(false);

  const start = (e: React.MouseEvent) => {
    e.preventDefault();
    setOpen(true);
    setState({ phase: "loading" });
    fetchOffer(base, slug, handshake).then(setState);
  };

  return (
    <>
      <a style={style} href={fallback} onClick={start}>
        Install into a project…
      </a>
      {open && (
        <div style={s.overlay} onClick={close}>
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="control-install-title"
            style={s.dialog}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => closeOnEscape(e, close)}
          >
            <div id="control-install-title" style={s.eyebrow}>Install a control</div>
            {state.phase === "loading" && <p style={s.muted}>Asking your platform…</p>}
            {state.phase === "unreachable" && (
              <>
                <p style={s.error}>
                  Your platform did not answer here. Sign in to your platform in this browser, then try again.
                </p>
                <p style={s.muted}>
                  <a href={fallback} style={s.link}>Open the platform's install page</a> instead.
                </p>
                <Actions onCancel={close} />
              </>
            )}
            {state.phase === "error" && (
              <>
                <p style={s.error}>{state.error}</p>
                <Actions onCancel={close} />
              </>
            )}
            {state.phase === "ready" && (
              <Ready
                base={base}
                slug={slug}
                options={state.options}
                onCancel={close}
                onInstalled={(project) => {
                  if (project === handshake?.project) onInstalled?.(slug);
                }}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

function Ready({
  base,
  slug,
  options,
  onCancel,
  onInstalled,
}: {
  base: string;
  slug: string;
  options: Options;
  onCancel: () => void;
  onInstalled: (project: string) => void;
}) {
  const [project, setProject] = useState(options.preselect ?? options.projects[0]?.pid ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // the installed checklist's page in the controls app, once the install worked
  const [done, setDone] = useState<string | null>(null);
  const { control } = options;
  const already = options.installed[project];
  const questions = `${control.questions} ${control.questions === 1 ? "question" : "questions"}`;

  const install = () => {
    setPending(true);
    setError(null);
    fetch(`${base}/api/install`, {
      method: "POST",
      credentials: "include",
      body: new URLSearchParams({ slug, project }),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (res.ok && body?.path) {
          setDone(`${base}${body.path}`);
          setPending(false);
          onInstalled(project);
        } else {
          setError(errorText(body, "The platform did not install it."));
          setPending(false);
        }
      })
      .catch(() => {
        setError("Your platform did not answer. Nothing was installed.");
        setPending(false);
      });
  };

  const summary = (
    <div style={s.control}>
      <div style={s.title}>{control.title}</div>
      <div style={s.muted}>{`${control.source} · ${control.topic} · ${questions}`}</div>
      {control.description && <p style={s.description}>{control.description}</p>}
    </div>
  );

  if (done) {
    const name = options.projects.find((p) => p.pid === project)?.name ?? "the project";
    return (
      <>
        {summary}
        <p style={s.already}>{`Installed in ${name}.`}</p>
        <p style={s.muted}>
          <a style={s.link} href={done} target="_blank" rel="noopener noreferrer">Open the checklist</a>
          {" "}in a new tab, or fill it later from the sandbox&apos;s Address controls.
        </p>
        <Actions onCancel={onCancel} cancelLabel="Close" />
      </>
    );
  }

  return (
    <>
      {summary}
      {options.projects.length === 0 ? (
        <>
          <p style={s.muted}>
            You cannot change any project, so there is none to install into. An owner of a project can make you an
            editor of it.
          </p>
          <Actions onCancel={onCancel} />
        </>
      ) : (
        <>
          <label htmlFor="control-install-project" style={s.label}>Project</label>
          <select
            id="control-install-project"
            style={s.select}
            value={project}
            onChange={(e) => setProject(e.target.value)}
          >
            {options.projects.map((p) => (
              <option key={p.pid} value={p.pid}>{p.name}</option>
            ))}
          </select>
          {already && (
            <p style={s.already}>
              Already installed in this project.{" "}
              <a style={s.link} href={`${base}/p/${project}/checklists/${already}/fill`}>Open it</a>
            </p>
          )}
          {error && <p style={s.error}>{error}</p>}
          <Actions onCancel={onCancel}>
            {!already && (
              <button type="button" style={s.primary(pending)} disabled={pending} onClick={install}>
                {pending ? "Installing…" : "Install"}
              </button>
            )}
          </Actions>
        </>
      )}
    </>
  );
}

/** Escape closes an install dialog, and only it: the detail pop-up behind
 *  leaves an Escape whose default was prevented alone. */
export function closeOnEscape(e: React.KeyboardEvent, close: () => void) {
  if (e.key !== "Escape") return;
  e.preventDefault();
  close();
}

export function Actions({
  onCancel,
  cancelLabel = "Cancel",
  children,
}: {
  onCancel: () => void;
  cancelLabel?: string;
  children?: React.ReactNode;
}) {
  return (
    <div style={s.actions}>
      <button type="button" style={s.secondary} onClick={onCancel}>{cancelLabel}</button>
      {children}
    </div>
  );
}

/** The install dialogs' look, shared with a test's (TestInstall). */
export const s = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    backgroundColor: "rgba(0,0,0,0.35)",
    zIndex: 1100,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "16px",
  },
  dialog: {
    outline: "none",
    backgroundColor: "#fff",
    borderRadius: "12px",
    width: "100%",
    maxWidth: "460px",
    padding: "24px 28px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
    fontFamily: "Arial, sans-serif",
  },
  eyebrow: {
    fontSize: "12px",
    fontWeight: 700 as const,
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    color: "#6b7280",
    marginBottom: "14px",
  },
  control: { borderLeft: "3px solid #3b5bdb", paddingLeft: "12px", marginBottom: "18px" },
  title: { fontSize: "18px", fontWeight: 700 as const, color: "#1a1a2e", marginBottom: "4px" },
  description: { fontSize: "13px", color: "#495057", margin: "8px 0 0", lineHeight: 1.5 },
  muted: { fontSize: "13px", color: "#6b7280", margin: 0 },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: 700 as const,
    color: "#6b7280",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    marginBottom: "6px",
  },
  select: {
    width: "100%",
    padding: "9px 10px",
    border: "1px solid #dee2e6",
    borderRadius: "8px",
    fontSize: "14px",
    marginBottom: "14px",
    backgroundColor: "#fff",
  },
  already: { fontSize: "13px", backgroundColor: "#e7f0ff", padding: "8px 10px", borderRadius: "8px", margin: "0 0 14px" },
  error: { fontSize: "13px", color: "#c92a2a", margin: "0 0 12px" },
  link: { color: "#3b5bdb" },
  actions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" },
  secondary: {
    padding: "8px 18px",
    borderRadius: "8px",
    border: "1px solid #dee2e6",
    backgroundColor: "#fff",
    color: "#495057",
    fontSize: "13px",
    fontWeight: 600 as const,
    cursor: "pointer",
  },
  primary: (pending: boolean) => ({
    padding: "8px 18px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: pending ? "#9aa5d8" : "#3b5bdb",
    color: "#fff",
    fontSize: "13px",
    fontWeight: 600 as const,
    cursor: pending ? "default" : "pointer",
  }),
};
