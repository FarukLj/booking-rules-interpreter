export function normalizeSpaceName(spaceName: string): string {
  // Convert to lowercase and replace spaces with hyphens
  return spaceName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

export function findSpaceId(spaceName: string, availableSpaces: string[]): string | null {
  const normalizedSpaceName = normalizeSpaceName(spaceName);
  const foundSpace = availableSpaces.find(space => 
    normalizeSpaceName(space) === normalizedSpaceName
  );
  return foundSpace || null;
}
