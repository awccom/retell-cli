import type Retell from "retell-sdk";

export type AgentVersionItem = Retell.AgentListVersionsResponse.Item;

const PAGE_LIMIT = 100;
const MAX_PAGES = 100;

/**
 * Fetch every stored version of a voice or chat agent.
 *
 * SDK 6 replaced `getVersions` with the paginated `agent.listVersions`
 * endpoint, which serves both voice and chat agents.
 */
export async function listAllAgentVersions(
  client: Retell,
  agentId: string,
): Promise<AgentVersionItem[]> {
  const items: AgentVersionItem[] = [];
  let paginationKey: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await client.agent.listVersions(agentId, {
      limit: PAGE_LIMIT,
      ...(paginationKey ? { pagination_key: paginationKey } : {}),
    });
    items.push(...(response.items ?? []));
    if (!response.has_more || !response.pagination_key) break;
    paginationKey = response.pagination_key;
  }

  return items;
}
