import { describe, it, expect, vi, beforeEach } from "vitest";
import { listExportRequestsCommand } from "./list";
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

describe("listExportRequestsCommand", () => {
  let mockClient: any;
  const mockResponse = {
    items: [{ export_request_id: "exp_1", status: "completed" }],
    has_more: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      exportRequest: { list: vi.fn().mockResolvedValue(mockResponse) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("calls exportRequest.list() with empty query by default", async () => {
    await listExportRequestsCommand();
    expect(mockClient.exportRequest.list).toHaveBeenCalledWith({});
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockResponse);
  });

  it("passes pagination options to exportRequest.list()", async () => {
    await listExportRequestsCommand({
      limit: "25",
      paginationKey: "exp_1",
      sortOrder: "ascending",
    });
    expect(mockClient.exportRequest.list).toHaveBeenCalledWith({
      limit: 25,
      pagination_key: "exp_1",
      sort_order: "ascending",
    });
  });

  it("rejects invalid --sort-order value", async () => {
    await listExportRequestsCommand({ sortOrder: "oldest" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.exportRequest.list).not.toHaveBeenCalled();
  });

  it("rejects non-positive or fractional --limit values", async () => {
    await listExportRequestsCommand({ limit: "0" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ValidationError",
        message: "--limit must be a positive integer",
      }),
    );
    expect(mockClient.exportRequest.list).not.toHaveBeenCalled();

    vi.clearAllMocks();
    await listExportRequestsCommand({ limit: "2.5" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "ValidationError",
        message: "--limit must be a positive integer",
      }),
    );
    expect(mockClient.exportRequest.list).not.toHaveBeenCalled();
  });

  it("filters fields when requested", async () => {
    const filtered = { items: [{ export_request_id: "exp_1" }] };
    vi.mocked(outputFormatter.filterFields).mockReturnValue(filtered);

    await listExportRequestsCommand({ fields: "items.0.export_request_id" });
    expect(outputFormatter.filterFields).toHaveBeenCalledWith(mockResponse, [
      "items.0.export_request_id",
    ]);
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(filtered);
  });
});
