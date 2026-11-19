import { DEFAULT_CONFIG } from "./config.js";

export const sourceReleaseName = (): string =>
  `thistle-v${DEFAULT_CONFIG.kernel.version}.tar.gz`;
