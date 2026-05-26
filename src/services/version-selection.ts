export interface VersionLike {
  version?: number | null;
  is_published?: boolean | null;
}

export function findNewestUnpublishedVersion(
  versions: VersionLike[],
  resourceName: string,
): number {
  const draft = versions
    .filter((item) => item.is_published === false)
    .map((item) => item.version)
    .filter((version): version is number => typeof version === "number")
    .sort((a, b) => b - a)[0];

  if (draft === undefined) {
    const err = new Error(
      `No unpublished draft version found for ${resourceName}. Pass --version to publish a specific draft.`,
    );
    err.name = "ValidationError";
    throw err;
  }

  return draft;
}
