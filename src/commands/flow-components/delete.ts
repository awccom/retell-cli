/**
 * Flow Components Delete Command
 */

import { getRetellClient } from "../../services/retell-client";
import { outputJson, handleSdkError } from "../../services/output-formatter";

export async function deleteFlowComponentCommand(
  componentId: string,
): Promise<void> {
  try {
    const client = getRetellClient();
    await client.conversationFlowComponent.delete(componentId);

    outputJson({
      message: "Flow component deleted successfully",
      conversation_flow_component_id: componentId,
      operation: "delete",
    });
  } catch (error) {
    handleSdkError(error);
  }
}
