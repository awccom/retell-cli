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
});
