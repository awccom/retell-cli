import { describe, it, expect, vi, beforeEach } from "vitest";
import { addVoiceResourceCommand } from "./add-resource";
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

describe("addVoiceResourceCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      voice: { addResource: vi.fn().mockResolvedValue({ voice_id: "v1" }) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("adds a voice resource with required fields", async () => {
    await addVoiceResourceCommand({
      providerVoiceId: "prov_1",
      voiceName: "My voice",
    });
    expect(mockClient.voice.addResource).toHaveBeenCalledWith({
      provider_voice_id: "prov_1",
      voice_name: "My voice",
    });
  });

  it("passes --voice-provider and --public-user-id through", async () => {
    await addVoiceResourceCommand({
      providerVoiceId: "prov_1",
      voiceName: "My voice",
      voiceProvider: "elevenlabs",
      publicUserId: "user_1",
    });
    expect(mockClient.voice.addResource).toHaveBeenCalledWith({
      provider_voice_id: "prov_1",
      voice_name: "My voice",
      voice_provider: "elevenlabs",
      public_user_id: "user_1",
    });
  });

  it("rejects invalid --voice-provider", async () => {
    await addVoiceResourceCommand({
      providerVoiceId: "prov_1",
      voiceName: "My voice",
      voiceProvider: "gremlin",
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects empty-string --provider-voice-id", async () => {
    await addVoiceResourceCommand({ providerVoiceId: "", voiceName: "n" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.voice.addResource).not.toHaveBeenCalled();
  });

  it("rejects empty-string --voice-name", async () => {
    await addVoiceResourceCommand({ providerVoiceId: "p", voiceName: "" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.voice.addResource).not.toHaveBeenCalled();
  });
});
