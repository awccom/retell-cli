import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPhoneNumberCommand } from "./create";
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

describe("createPhoneNumberCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      phoneNumber: {
        create: vi.fn().mockResolvedValue({ phone_number: "+14155550000" }),
      },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("creates with area code and weighted inbound agents", async () => {
    await createPhoneNumberCommand({
      areaCode: "415",
      nickname: "Frontdesk",
      inboundAgents: "agent_1:0.6,agent_2:0.4",
    });
    expect(mockClient.phoneNumber.create).toHaveBeenCalledWith({
      area_code: 415,
      nickname: "Frontdesk",
      inbound_agents: [
        { agent_id: "agent_1", weight: 0.6 },
        { agent_id: "agent_2", weight: 0.4 },
      ],
    });
  });

  it("rejects SMS flags on create (SMS fields aren't on CreateParams)", async () => {
    await createPhoneNumberCommand({
      areaCode: "415",
      inboundSmsAgents: "agent_1",
    });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
    expect(mockClient.phoneNumber.create).not.toHaveBeenCalled();
  });

  it("rejects invalid --country-code", async () => {
    await createPhoneNumberCommand({ countryCode: "UK" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("rejects invalid --number-provider", async () => {
    await createPhoneNumberCommand({ numberProvider: "vonage" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });

  it("parses comma-separated allowed-inbound-country-list", async () => {
    await createPhoneNumberCommand({
      allowedInboundCountryList: "US, CA",
    });
    expect(mockClient.phoneNumber.create).toHaveBeenCalledWith({
      allowed_inbound_country_list: ["US", "CA"],
    });
  });

  it("rejects non-numeric --area-code", async () => {
    await createPhoneNumberCommand({ areaCode: "abc" });
    expect(outputFormatter.handleSdkError).toHaveBeenCalledWith(
      expect.objectContaining({ name: "ValidationError" }),
    );
  });
});
