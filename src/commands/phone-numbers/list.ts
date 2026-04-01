/**
 * Phone Numbers List Command
 *
 * Lists all phone numbers.
 * Usage: retell phone-numbers list
 */

import { getRetellClient } from "../../services/retell-client";
import {
  outputJson,
  handleSdkError,
  filterFields,
} from "../../services/output-formatter";

export interface ListPhoneNumbersOptions {
  fields?: string;
}

/**
 * List all phone numbers
 *
 * @param options Command options
 */
export async function listPhoneNumbersCommand(
  options: ListPhoneNumbersOptions = {},
): Promise<void> {
  try {
    const client = getRetellClient();

    const phoneNumbers = await client.phoneNumber.list();

    // Format for cleaner output
    const formatted = phoneNumbers.map((pn) => ({
      phone_number: pn.phone_number,
      phone_number_pretty: pn.phone_number_pretty,
      phone_number_type: pn.phone_number_type,
      nickname: pn.nickname,
      inbound_agents: pn.inbound_agents ?? [],
      outbound_agents: pn.outbound_agents ?? [],
    }));

    // Apply field filtering if requested
    const output = options.fields
      ? filterFields(
          formatted,
          options.fields.split(",").map((f) => f.trim()),
        )
      : formatted;

    outputJson(output);
  } catch (error) {
    handleSdkError(error);
  }
}
