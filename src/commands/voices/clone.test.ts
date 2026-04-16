import { describe, it, expect, vi, beforeEach } from "vitest";
import { cloneVoiceCommand } from "./clone";
import * as retellClient from "../../services/retell-client";
import * as outputFormatter from "../../services/output-formatter";

vi.mock("../../services/retell-client");
vi.mock("../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    handleSdkError: vi.fn(),
    filterFields: vi.fn((data, _fields) => data),
  };
});

const stubStream = { __stub: "stream" };
vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    existsSync: vi.fn(
      (p: string) => p === "/ok/one.wav" || p === "/ok/two.wav",
    ),
    createReadStream: vi.fn(() => stubStream),
  };
});

describe("cloneVoiceCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      voice: { clone: vi.fn().mockResolvedValue({ voice_id: "v1" }) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("clones with one file", async () => {
    await cloneVoiceCommand({
      voiceName: "My Clone",
      voiceProvider: "elevenlabs",
      file: ["/ok/one.wav"],
    });
    expect(mockClient.voice.clone).toHaveBeenCalledWith({
      voice_name: "My Clone",
      voice_provider: "elevenlabs",
      files: [stubStream],
    });
  });

  it("clones with multiple files", async () => {
    await cloneVoiceCommand({
      voiceName: "Multi",
      voiceProvider: "elevenlabs",
      file: ["/ok/one.wav", "/ok/two.wav"],
    });
    const call = mockClient.voice.clone.mock.calls[0][0];
    expect(call.files).toHaveLength(2);
  });

  it("rejects when no --file is supplied", async () => {
    await cloneVoiceCommand({
      voiceName: "c",
      voiceProvider: "elevenlabs",
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects invalid --voice-provider", async () => {
    await cloneVoiceCommand({
      voiceName: "c",
      voiceProvider: "gremlin",
      file: ["/ok/one.wav"],
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects missing file paths", async () => {
    await cloneVoiceCommand({
      voiceName: "c",
      voiceProvider: "elevenlabs",
      file: ["/does/not/exist.wav"],
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects empty-string --voice-name", async () => {
    await cloneVoiceCommand({
      voiceName: "",
      voiceProvider: "elevenlabs",
      file: ["/ok/one.wav"],
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.voice.clone).not.toHaveBeenCalled();
  });
});
