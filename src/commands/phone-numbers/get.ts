/**
 * Phone Numbers Get Command
 *
 * Gets details of a specific phone number.
 * Usage: retell phone-numbers get <phone_number>
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface GetPhoneNumberOptions {
  fields?: string;
}

/**
 * Get phone number details
 *
 * @param phoneNumber The phone number to retrieve (E.164 format)
 * @param options Command options
 */
export async function getPhoneNumberCommand(
  phoneNumber: string,
  options: GetPhoneNumberOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();

    const pn = await client.phoneNumber.retrieve(phoneNumber);

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          pn,
          options.fields.split(",").map((f) => f.trim()),
        )
      : pn;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
