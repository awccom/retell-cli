/**
 * Phone Numbers Delete Command
 *
 * Releases an existing phone number.
 */

import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";

export async function deletePhoneNumberCommand(
  phoneNumber: string,
): Promise<void> {
  try {
    const client = getRetellClient();
    await client.phoneNumber.delete(phoneNumber);

    outputJson({
      message: "Phone number deleted successfully",
      phone_number: phoneNumber,
      operation: "delete",
    });
  } catch (error) {
    handleSdkError(error);
  }
}
