import { describe, it, expect, vi, beforeEach } from "vitest";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { createPhoneCallCommand } from "./create-phone";
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

describe("createPhoneCallCommand", () => {
  let mockClient: any;
  const mockResponse = { call_id: "call_abc", call_status: "registered" };

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      call: { createPhoneCall: vi.fn().mockResolvedValue(mockResponse) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("creates a phone call with required options only", async () => {
    await createPhoneCallCommand({
      fromNumber: "+14157774444",
      toNumber: "+12137774445",
    });
    expect(mockClient.call.createPhoneCall).toHaveBeenCalledWith({
      from_number: "+14157774444",
      to_number: "+12137774445",
    });
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(mockResponse);
  });

  it("parses --metadata inline JSON and passes --override-agent-id", async () => {
    await createPhoneCallCommand({
      fromNumber: "+14157774444",
      toNumber: "+12137774445",
      overrideAgentId: "agent_1",
      metadata: '{"customer_id":"c_1"}',
    });
    expect(mockClient.call.createPhoneCall).toHaveBeenCalledWith({
      from_number: "+14157774444",
      to_number: "+12137774445",
      override_agent_id: "agent_1",
      metadata: { customer_id: "c_1" },
    });
  });

  it("loads --agent-override from file", async () => {
    const tmp = join(tmpdir(), `retell-cli-override-${process.pid}.json`);
    writeFileSync(tmp, JSON.stringify({ agent: { agent_name: "Override" } }));
    try {
      await createPhoneCallCommand({
        fromNumber: "+1",
        toNumber: "+2",
        agentOverride: tmp,
      });
      expect(mockClient.call.createPhoneCall).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_override: { agent: { agent_name: "Override" } },
        }),
      );
    } finally {
      unlinkSync(tmp);
    }
  });

  it("rejects non-numeric --override-agent-version", async () => {
    await createPhoneCallCommand({
      fromNumber: "+1",
      toNumber: "+2",
      overrideAgentVersion: "abc",
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.call.createPhoneCall).not.toHaveBeenCalled();
  });

  it("rejects invalid inline JSON for --metadata", async () => {
    await createPhoneCallCommand({
      fromNumber: "+1",
      toNumber: "+2",
      metadata: "{not json",
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("applies --fields filter", async () => {
    await createPhoneCallCommand({
      fromNumber: "+1",
      toNumber: "+2",
      fields: "call_id,call_status",
    });
    expect(outputFormatter.filterFields).toHaveBeenCalledWith(mockResponse, [
      "call_id",
      "call_status",
    ]);
  });

  it("surfaces SDK errors via handleSdkError", async () => {
    const err = new Error("rate limit");
    mockClient.call.createPhoneCall.mockRejectedValue(err);
    await createPhoneCallCommand({ fromNumber: "+1", toNumber: "+2" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(err);
  });
});
