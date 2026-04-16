import { describe, it, expect, vi, beforeEach } from "vitest";
import { getVoiceCommand } from "./get";
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

describe("getVoiceCommand", () => {
  let mockClient: any;
  const mockResponse = { voice_id: "v1", voice_name: "Allie" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      voice: { retrieve: vi.fn().mockResolvedValue(mockResponse) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("retrieves a voice by id", async () => {
    await getVoiceCommand("v1");
    expect(mockClient.voice.retrieve).toHaveBeenCalledWith("v1");
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockResponse);
  });

  it("surfaces SDK errors", async () => {
    const err = new Error("nope");
    mockClient.voice.retrieve.mockRejectedValue(err);
    await getVoiceCommand("v1");
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(err);
  });
});
