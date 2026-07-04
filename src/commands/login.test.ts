import { beforeEach, describe, expect, it, vi } from "vitest";
import { loginCommand } from "./login";
import * as config from "../services/config";
import * as outputFormatter from "../services/output-formatter";

const mocks = vi.hoisted(() => {
  return {
    question: vi.fn(),
    close: vi.fn(),
    agentList: vi.fn(),
    retellCtor: vi.fn(),
  };
});

vi.mock("readline/promises", () => ({
  createInterface: vi.fn(() => ({
    question: mocks.question,
    close: mocks.close,
  })),
}));

vi.mock("retell-sdk", () => ({
  default: mocks.retellCtor,
}));

vi.mock("../services/config");
vi.mock("../services/output-formatter", () => ({
  outputJson: vi.fn(),
  outputError: vi.fn((message: string, code?: string) => {
    throw new Error(`${code ?? "UNKNOWN_ERROR"}: ${message}`);
  }),
  handleSdkError: vi.fn((error: unknown) => {
    throw error;
  }),
}));

describe("loginCommand", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.agentList.mockResolvedValue([]);
    mocks.retellCtor.mockImplementation(function () {
      return {
        agent: {
          list: mocks.agentList,
        },
      };
    });

    vi.mocked(config.getConfigFilePath).mockImplementation(({ scope } = {}) =>
      scope === "local" ? "/repo/.retellrc.json" : "/home/user/.retellrc.json",
    );
    vi.mocked(config.configFileExists).mockReturnValue(false);
    vi.mocked(config.saveConfig).mockImplementation((_cfg, { scope } = {}) =>
      scope === "local" ? "/repo/.retellrc.json" : "/home/user/.retellrc.json",
    );
  });

  it("saves to global/home config by default", async () => {
    mocks.question.mockResolvedValueOnce("key_default");

    await loginCommand();

    expect(mocks.retellCtor).toHaveBeenCalledWith({ apiKey: "key_default" });
    expect(mocks.agentList).toHaveBeenCalledWith({ limit: 1 });
    expect(config.saveConfig).toHaveBeenCalledWith(
      { apiKey: "key_default", defaultFormat: "json" },
      { scope: "global" },
    );
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Successfully authenticated!",
        scope: "global",
        configPath: "/home/user/.retellrc.json",
      }),
    );
  });

  it("saves to local config when --local is provided", async () => {
    mocks.question.mockResolvedValueOnce("key_local");

    await loginCommand({ local: true });

    expect(config.saveConfig).toHaveBeenCalledWith(
      { apiKey: "key_local", defaultFormat: "json" },
      { scope: "local" },
    );
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "local",
        configPath: "/repo/.retellrc.json",
      }),
    );
  });

  it("rejects mutually exclusive --global and --local", async () => {
    await expect(loginCommand({ global: true, local: true })).rejects.toThrow(
      "INVALID_INPUT: Use only one of --global or --local",
    );

    expect(outputFormatter.outputError).toHaveBeenCalledWith(
      "Use only one of --global or --local",
      "INVALID_INPUT",
    );
    expect(mocks.question).not.toHaveBeenCalled();
    expect(config.saveConfig).not.toHaveBeenCalled();
  });

  it("prompts before overwriting the selected target config", async () => {
    vi.mocked(config.configFileExists).mockReturnValue(true);
    mocks.question.mockResolvedValueOnce("n");

    await loginCommand({ local: true });

    expect(mocks.question).toHaveBeenCalledWith(
      "local config already exists at /repo/.retellrc.json. Overwrite? (y/n): ",
    );
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      message: "Login cancelled",
    });
    expect(config.saveConfig).not.toHaveBeenCalled();
  });
});
