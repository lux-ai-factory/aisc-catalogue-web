/**
 * What the catalogue hands the engine when you press Install.
 *
 * Not the tool's slug and not the tool's version: LangBiTe v1.1.1 is the tool,
 * `aisc-plugin-langbite` 0.1.2 is the distribution that wraps it, and only the
 * second pair can be installed. The backend's /tool/{slug}/install-info
 * resolves one to the other and reads the version from the package index, so
 * this only unwraps its answer and refuses anything incomplete.
 */
import type { InstallInfo, VersionState } from "../services/catalogueApi";

export interface InstallCoordinates {
  pkg: string;
  /** null only for a test fetched on install whose version is decided when it is installed. */
  version: string | null;
  /** The platform downloads the plugin from GitHub and builds it on install. */
  fetchedOnInstall: boolean;
  /** The catalogue entry, so an install can be traced back to what it is. */
  slug: string;
  /** Set when another version than the default was chosen: the install names it. */
  chosen?: string;
  /** The version on in the project now, which the install turns off. */
  turnsOff?: string;
}

/** The versions an entry offers to install: those the stack can install that are not the one on. */
export function versionsToOffer(info: InstallInfo | null | undefined): VersionState[] {
  return (info?.versions ?? []).filter((v) => v.installable && !v.enabled);
}

/** The version preselected: the default when it is offered, else the newest offered. */
export function preselected(info: InstallInfo | null | undefined): string | null {
  const offered = versionsToOffer(info);
  return (offered.find((v) => v.version === info?.version) ?? offered[0])?.version ?? null;
}

/** The coordinates of installing `version` of the entry: the default's own, or a version from the index. */
export function coordinatesOf(info: InstallInfo, version: string): InstallCoordinates | null {
  const on = (info.versions ?? []).find((v) => v.enabled)?.version;
  const base = version === info.version ? installCoordinates(info) : null;
  const coordinates = base ?? { pkg: info.package_name, version, slug: info.slug, fetchedOnInstall: false };
  const installed = (info.versions ?? []).some((v) => v.installed);
  return {
    ...coordinates,
    // a project that has none yet installs the default as before, without naming it
    ...(installed || version !== info.version ? { chosen: version } : {}),
    ...(on && on !== version ? { turnsOff: on } : {}),
  };
}

export function installCoordinates(
  info: InstallInfo | null | undefined
): InstallCoordinates | null {
  if (!info || !info.installable) return null;
  if (!info.package_name) return null;
  const fetchedOnInstall = info.fetched_on_install === true;
  // without a version there is nothing to install, unless the platform fetches the plugin and picks the version itself
  if (!info.version && !fetchedOnInstall) return null;
  return { pkg: info.package_name, version: info.version, slug: info.slug, fetchedOnInstall };
}
