import { describe, it, expect, vi, beforeEach } from "vitest";
import { updatePhoneNumberCommand } from "./update";
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

describe("updatePhoneNumberCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      phoneNumber: {
        update: vi.fn().mockResolvedValue({ phone_number: "+14157774444" }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("updates SIP auth with auth_username/auth_password field names (not sip_trunk_*)", async () => {
    await updatePhoneNumberCommand("+14157774444", {
      sipUsername: "user123",
      sipPassword: "pass456",
    });
    expect(mockClient.phoneNumber.update).toHaveBeenCalledWith("+14157774444", {
      auth_username: "user123",
      auth_password: "pass456",
    });
  });

  it("accepts SMS agent flags on update", async () => {
    await updatePhoneNumberCommand("+14157774444", {
      inboundSmsAgents: "agent_sms_1",
    });
    expect(mockClient.phoneNumber.update).toHaveBeenCalledWith("+14157774444", {
      inbound_sms_agents: [{ agent_id: "agent_sms_1", weight: 1 }],
    });
  });

  it("updates nickname and termination URI", async () => {
    await updatePhoneNumberCommand("+14157774444", {
      nickname: "Support",
      terminationUri: "sip.example.com",
    });
    expect(mockClient.phoneNumber.update).toHaveBeenCalledWith("+14157774444", {
      nickname: "Support",
      termination_uri: "sip.example.com",
    });
  });

  it("rejects mutual exclusion on inbound agents", async () => {
    await updatePhoneNumberCommand("+14157774444", {
      inboundAgent: "a",
      inboundAgents: "b",
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects when no mutation flags provided", async () => {
    await updatePhoneNumberCommand("+14157774444", {});
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.phoneNumber.update).not.toHaveBeenCalled();
  });

  it("clears nullable fields when passed empty string", async () => {
    await updatePhoneNumberCommand("+14157774444", {
      nickname: "",
      fallbackNumber: "",
      inboundWebhookUrl: "",
      inboundSmsWebhookUrl: "",
      transport: "",
      allowedInboundCountryList: "",
      allowedOutboundCountryList: "",
    });
    expect(mockClient.phoneNumber.update).toHaveBeenCalledWith("+14157774444", {
      nickname: null,
      fallback_number: null,
      inbound_webhook_url: null,
      inbound_sms_webhook_url: null,
      transport: null,
      allowed_inbound_country_list: null,
      allowed_outbound_country_list: null,
    });
  });

  it.each([
    ["--termination-uri", "terminationUri"],
    ["--sip-username", "sipUsername"],
    ["--sip-password", "sipPassword"],
  ] as const)("rejects empty-string %s", async (_, key) => {
    await updatePhoneNumberCommand("+14157774444", { [key]: "" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.phoneNumber.update).not.toHaveBeenCalled();
  });

  it("passes non-empty nullable fields through unchanged", async () => {
    await updatePhoneNumberCommand("+14157774444", {
      fallbackNumber: "+14155559999",
      inboundWebhookUrl: "https://example.com/hook",
      inboundSmsWebhookUrl: "https://example.com/sms-hook",
      transport: "TLS",
    });
    expect(mockClient.phoneNumber.update).toHaveBeenCalledWith("+14157774444", {
      fallback_number: "+14155559999",
      inbound_webhook_url: "https://example.com/hook",
      inbound_sms_webhook_url: "https://example.com/sms-hook",
      transport: "TLS",
    });
  });

  it("rejects invalid --transport value", async () => {
    await updatePhoneNumberCommand("+14157774444", { transport: "tls" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.phoneNumber.update).not.toHaveBeenCalled();
  });

  it("maps --outbound-agent to outbound_agents single-entry array", async () => {
    await updatePhoneNumberCommand("+14157774444", {
      outboundAgent: "agent_solo",
    });
    expect(mockClient.phoneNumber.update).toHaveBeenCalledWith("+14157774444", {
      outbound_agents: [{ agent_id: "agent_solo", weight: 1 }],
    });
  });

  it("maps --outbound-agents weighted spec to outbound_agents", async () => {
    await updatePhoneNumberCommand("+14157774444", {
      outboundAgents: "agent_1:0.7,agent_2:0.3",
    });
    expect(mockClient.phoneNumber.update).toHaveBeenCalledWith("+14157774444", {
      outbound_agents: [
        { agent_id: "agent_1", weight: 0.7 },
        { agent_id: "agent_2", weight: 0.3 },
      ],
    });
  });

  it("maps --outbound-sms-agents spec to outbound_sms_agents", async () => {
    await updatePhoneNumberCommand("+14157774444", {
      outboundSmsAgents: "agent_sms",
    });
    expect(mockClient.phoneNumber.update).toHaveBeenCalledWith("+14157774444", {
      outbound_sms_agents: [{ agent_id: "agent_sms", weight: 1 }],
    });
  });

  it("parses comma-separated allowed-inbound/outbound-country-list", async () => {
    await updatePhoneNumberCommand("+14157774444", {
      allowedInboundCountryList: "US, CA",
      allowedOutboundCountryList: "US",
    });
    expect(mockClient.phoneNumber.update).toHaveBeenCalledWith("+14157774444", {
      allowed_inbound_country_list: ["US", "CA"],
      allowed_outbound_country_list: ["US"],
    });
  });
});
