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

  it("rejects empty-string --from-number", async () => {
    await createPhoneCallCommand({ fromNumber: "", toNumber: "+12137774445" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.call.createPhoneCall).not.toHaveBeenCalled();
  });

  it("rejects empty-string --to-number", async () => {
    await createPhoneCallCommand({ fromNumber: "+14157774444", toNumber: "" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.call.createPhoneCall).not.toHaveBeenCalled();
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

  it("maps --ignore-e164-validation to ignore_e164_validation", async () => {
    await createPhoneCallCommand({
      fromNumber: "+1",
      toNumber: "+2",
      ignoreE164Validation: true,
    });
    expect(mockClient.call.createPhoneCall).toHaveBeenCalledWith(
      expect.objectContaining({ ignore_e164_validation: true }),
    );
  });

  it("maps --custom-sip-headers to custom_sip_headers", async () => {
    await createPhoneCallCommand({
      fromNumber: "+1",
      toNumber: "+2",
      customSipHeaders: '{"X-Retell-Custom":"true"}',
    });
    expect(mockClient.call.createPhoneCall).toHaveBeenCalledWith(
      expect.objectContaining({
        custom_sip_headers: { "X-Retell-Custom": "true" },
      }),
    );
  });

  it("maps --dynamic-variables to retell_llm_dynamic_variables (NOT override_dynamic_variables)", async () => {
    await createPhoneCallCommand({
      fromNumber: "+1",
      toNumber: "+2",
      dynamicVariables: '{"user_name":"Alice"}',
    });
    const call = mockClient.call.createPhoneCall.mock.calls[0][0];
    expect(call.retell_llm_dynamic_variables).toEqual({ user_name: "Alice" });
    expect(call.override_dynamic_variables).toBeUndefined();
  });

  it("maps --override-agent-version to override_agent_version as a number", async () => {
    await createPhoneCallCommand({
      fromNumber: "+1",
      toNumber: "+2",
      overrideAgentVersion: "3",
    });
    expect(mockClient.call.createPhoneCall).toHaveBeenCalledWith(
      expect.objectContaining({ override_agent_version: 3 }),
    );
  });
});
