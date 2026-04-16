import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerPhoneCallCommand } from "./register-phone";
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

describe("registerPhoneCallCommand", () => {
  let mockClient: any;
  const mockResponse = { call_id: "call_reg_1" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      call: { registerPhoneCall: vi.fn().mockResolvedValue(mockResponse) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("registers a call with only --agent-id", async () => {
    await registerPhoneCallCommand({ agentId: "agent_1" });
    expect(mockClient.call.registerPhoneCall).toHaveBeenCalledWith({
      agent_id: "agent_1",
    });
  });

  it("passes direction and tracking numbers", async () => {
    await registerPhoneCallCommand({
      agentId: "agent_1",
      direction: "inbound",
      fromNumber: "+1",
      toNumber: "+2",
    });
    expect(mockClient.call.registerPhoneCall).toHaveBeenCalledWith({
      agent_id: "agent_1",
      direction: "inbound",
      from_number: "+1",
      to_number: "+2",
    });
  });

  it("rejects invalid --direction", async () => {
    await registerPhoneCallCommand({
      agentId: "agent_1",
      direction: "sideways",
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects empty-string --agent-id", async () => {
    await registerPhoneCallCommand({ agentId: "" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.call.registerPhoneCall).not.toHaveBeenCalled();
  });

  it("rejects empty-string --from-number instead of silently dropping it", async () => {
    await registerPhoneCallCommand({ agentId: "agent_1", fromNumber: "" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.call.registerPhoneCall).not.toHaveBeenCalled();
  });

  it("rejects empty-string --to-number instead of silently dropping it", async () => {
    await registerPhoneCallCommand({ agentId: "agent_1", toNumber: "" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.call.registerPhoneCall).not.toHaveBeenCalled();
  });
});
