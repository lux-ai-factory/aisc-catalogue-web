/**
 * What the catalogue hands the engine when you press Install.
 *
 * Not the tool's slug and not the tool's version: LangBiTe v1.1.1 is the tool,
 * `aisc-plugin-langbite` 0.1.2 is the distribution that wraps it, and only the
 * second pair can be installed. The backend's /tool/{slug}/install-info
 * resolves one to the other and reads the version from the package index, so
 * this only unwraps its answer and refuses anything incomplete.
 */
import type { InstallInfo } from "../services/catalogueApi";

export interface InstallCoordinates {
  pkg: string;
  version: string;
  /** The catalogue entry, so an install can be traced back to what it is. */
  slug: string;
}

export function installCoordinates(
  info: InstallInfo | null | undefined
): InstallCoordinates | null {
  if (!info || !info.installable) return null;
  if (!info.package_name || !info.version) return null;
  return { pkg: info.package_name, version: info.version, slug: info.slug };
}
