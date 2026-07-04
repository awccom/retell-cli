import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  configFileExists,
  getConfig,
  getConfigFilePath,
  getConfigSearchPaths,
  getHomeConfigFilePath,
  getLocalConfigFilePath,
  getXdgConfigFilePath,
  saveConfig,
} from "./config";

function writeConfig(path: string, apiKey: string): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(
    path,
    JSON.stringify({ apiKey, defaultFormat: "json" }, null, 2),
  );
  chmodSync(path, 0o600);
}

describe("config service", () => {
  let rootDir: string;
  let cwd: string;
  let homeDir: string;
  let xdgConfigHome: string;

  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.stubEnv("RETELL_API_KEY", "");
    vi.stubEnv("XDG_CONFIG_HOME", "");

    rootDir = mkdtempSync(join(tmpdir(), "retell-config-test-"));
    cwd = join(rootDir, "project");
    homeDir = join(rootDir, "home");
    xdgConfigHome = join(rootDir, "xdg");
    mkdirSync(cwd, { recursive: true });
    mkdirSync(homeDir, { recursive: true });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    rmSync(rootDir, { recursive: true, force: true });
  });

  it("resolves config paths for local, home, and XDG scopes", () => {
    expect(getLocalConfigFilePath({ cwd })).toBe(join(cwd, ".retellrc.json"));
    expect(getHomeConfigFilePath({ homeDir })).toBe(
      join(homeDir, ".retellrc.json"),
    );
    expect(getXdgConfigFilePath({ xdgConfigHome })).toBe(
      join(xdgConfigHome, "retell", "config.json"),
    );
    expect(getConfigSearchPaths({ cwd, homeDir, xdgConfigHome })).toEqual([
      join(cwd, ".retellrc.json"),
      join(homeDir, ".retellrc.json"),
      join(xdgConfigHome, "retell", "config.json"),
    ]);
  });

  it("falls back to home .config when XDG_CONFIG_HOME is empty", () => {
    vi.stubEnv("XDG_CONFIG_HOME", "");

    expect(getXdgConfigFilePath({ homeDir })).toBe(
      join(homeDir, ".config", "retell", "config.json"),
    );
    expect(getXdgConfigFilePath({ homeDir, xdgConfigHome: "" })).toBe(
      join(homeDir, ".config", "retell", "config.json"),
    );
  });

  it("uses RETELL_API_KEY before any config files", () => {
    vi.stubEnv("RETELL_API_KEY", "env-key");
    writeConfig(getLocalConfigFilePath({ cwd }), "local-key");
    writeConfig(getHomeConfigFilePath({ homeDir }), "home-key");

    expect(getConfig({ cwd, homeDir, xdgConfigHome })).toMatchObject({
      apiKey: "env-key",
      defaultFormat: "json",
    });
  });

  it("discovers the home config from an arbitrary cwd", () => {
    writeConfig(getHomeConfigFilePath({ homeDir }), "home-key");

    expect(getConfig({ cwd, homeDir, xdgConfigHome }).apiKey).toBe("home-key");
  });

  it("lets a cwd-local config override the home config", () => {
    writeConfig(getLocalConfigFilePath({ cwd }), "local-key");
    writeConfig(getHomeConfigFilePath({ homeDir }), "home-key");

    expect(getConfig({ cwd, homeDir, xdgConfigHome }).apiKey).toBe("local-key");
  });

  it("falls back to XDG config after local and home configs", () => {
    writeConfig(getXdgConfigFilePath({ xdgConfigHome }), "xdg-key");

    expect(getConfig({ cwd, homeDir, xdgConfigHome }).apiKey).toBe("xdg-key");
  });

  it("defaults public path helpers to the global config path", () => {
    expect(getConfigFilePath({ homeDir })).toBe(
      join(homeDir, ".retellrc.json"),
    );

    expect(configFileExists({ homeDir })).toBe(false);
    writeConfig(getHomeConfigFilePath({ homeDir }), "default-home-key");
    expect(configFileExists({ homeDir })).toBe(true);
  });

  it("saves global/home config with owner-only permissions", () => {
    const path = saveConfig(
      { apiKey: "saved-home-key", defaultFormat: "json" },
      { scope: "global", homeDir },
    );

    expect(path).toBe(join(homeDir, ".retellrc.json"));
    expect(JSON.parse(readFileSync(path, "utf-8"))).toMatchObject({
      apiKey: "saved-home-key",
      defaultFormat: "json",
    });
    expect(statSync(path).mode & 0o777).toBe(0o600);
  });

  it("saves local config when requested", () => {
    const path = saveConfig(
      { apiKey: "saved-local-key", defaultFormat: "json" },
      { scope: "local", cwd },
    );

    expect(path).toBe(join(cwd, ".retellrc.json"));
    expect(configFileExists({ scope: "local", cwd })).toBe(true);
    expect(getConfigFilePath({ scope: "local", cwd })).toBe(path);
    expect(getConfig({ cwd, homeDir, xdgConfigHome }).apiKey).toBe(
      "saved-local-key",
    );
  });
});
