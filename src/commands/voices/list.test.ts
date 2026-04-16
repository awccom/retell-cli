import { describe, it, expect, vi, beforeEach } from "vitest";
import { listVoicesCommand } from "./list";
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

describe("listVoicesCommand", () => {
  let mockClient: any;
  const mockResponse = [{ voice_id: "v1", voice_name: "Allie" }];

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = { voice: { list: vi.fn().mockResolvedValue(mockResponse) } };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("calls voice.list() and outputs response", async () => {
    await listVoicesCommand();
    expect(mockClient.voice.list).toHaveBeenCalled();
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockResponse);
  });

  it("applies --fields filter", async () => {
    await listVoicesCommand({ fields: "voice_id,voice_name" });
    expect(outputFormatter.filterFields).toHaveBeenCalledWith(mockResponse, [
      "voice_id",
      "voice_name",
    ]);
  });
});
