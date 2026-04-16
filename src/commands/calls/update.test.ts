import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateCallCommand } from "./update";
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

describe("updateCallCommand", () => {
  let mockClient: any;
  const mockResponse = { call_id: "call_1", metadata: { k: "v" } };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      call: { update: vi.fn().mockResolvedValue(mockResponse) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("updates metadata from inline JSON", async () => {
    await updateCallCommand("call_1", { metadata: '{"k":"v"}' });
    expect(mockClient.call.update).toHaveBeenCalledWith("call_1", {
      metadata: { k: "v" },
    });
  });

  it("accepts valid --data-storage-setting", async () => {
    await updateCallCommand("call_1", {
      dataStorageSetting: "everything_except_pii",
    });
    expect(mockClient.call.update).toHaveBeenCalledWith("call_1", {
      data_storage_setting: "everything_except_pii",
    });
  });

  it("rejects invalid --data-storage-setting value", async () => {
    await updateCallCommand("call_1", {
      dataStorageSetting: "everything_ever",
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("maps --dynamic-variables to override_dynamic_variables", async () => {
    await updateCallCommand("call_1", {
      dynamicVariables: '{"name":"Jane"}',
    });
    expect(mockClient.call.update).toHaveBeenCalledWith("call_1", {
      override_dynamic_variables: { name: "Jane" },
    });
  });

  it("rejects when no mutation flags provided", async () => {
    await updateCallCommand("call_1", {});
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.call.update).not.toHaveBeenCalled();
  });
});
