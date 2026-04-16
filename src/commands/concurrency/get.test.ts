import { describe, it, expect, vi, beforeEach } from "vitest";
import { getConcurrencyCommand } from "./get";
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

describe("getConcurrencyCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      concurrency: {
        retrieve: vi
          .fn()
          .mockResolvedValue({ current_concurrency: 0, concurrency_limit: 20 }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("retrieves concurrency info", async () => {
    await getConcurrencyCommand();
    expect(mockClient.concurrency.retrieve).toHaveBeenCalled();
    expect(outputFormatter.outputJson).toHaveBeenCalledWith({
      current_concurrency: 0,
      concurrency_limit: 20,
    });
  });

  it("applies --fields filter", async () => {
    await getConcurrencyCommand({ fields: "concurrency_limit" });
    expect(outputFormatter.filterFields).toHaveBeenCalledWith(
      expect.anything(),
      ["concurrency_limit"],
    );
  });
});
