import { describe, it, expect, vi, beforeEach } from "vitest";
import { deletePhoneNumberCommand } from "./delete";
import * as retellClient from "../../services/retell-client";
import * as outputFormatter from "../../services/output-formatter";

vi.mock("../../services/retell-client");
vi.mock("../../services/output-formatter", async () => {
  const actual = await vi.importActual("../../services/output-formatter");
  return {
    ...actual,
    outputJson: vi.fn(),
    handleSdkError: vi.fn(),
  };
});

describe("deletePhoneNumberCommand", () => {
  let mockClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClient = {
      phoneNumber: { delete: vi.fn().mockResolvedValue(undefined) },
    };
    vi.mocked(retellClient.getRetellClient).mockReturnValue(mockClient);
  });

  it("deletes the specified phone number", async () => {
    await deletePhoneNumberCommand("+14157774444");
    expect(mockClient.phoneNumber.delete).toHaveBeenCalledWith("+14157774444");
    expect(outputFormatter.outputJson).toHaveBeenCalledWith(
      expect.objectContaining({
        phone_number: "+14157774444",
        operation: "delete",
      }),
    );
  });
});
