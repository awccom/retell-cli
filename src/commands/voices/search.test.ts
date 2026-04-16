import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchVoicesCommand } from "./search";
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

describe("searchVoicesCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      voice: { search: vi.fn().mockResolvedValue({ voices: [] }) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("searches by --search-query", async () => {
    await searchVoicesCommand({ searchQuery: "warm female" });
    expect(mockClient.voice.search).toHaveBeenCalledWith({
      search_query: "warm female",
    });
  });

  it("passes --voice-provider", async () => {
    await searchVoicesCommand({
      searchQuery: "x",
      voiceProvider: "cartesia",
    });
    expect(mockClient.voice.search).toHaveBeenCalledWith({
      search_query: "x",
      voice_provider: "cartesia",
    });
  });

  it("rejects invalid --voice-provider", async () => {
    await searchVoicesCommand({
      searchQuery: "x",
      voiceProvider: "gremlin",
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects empty-string --search-query", async () => {
    await searchVoicesCommand({ searchQuery: "" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.voice.search).not.toHaveBeenCalled();
  });
});
