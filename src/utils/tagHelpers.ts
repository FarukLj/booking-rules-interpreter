/**
 * Normalizes a tag to its string name, handling both string and object formats
 */
export function tagToName(tag: string | { id: string; name: string }): string {
  if (!tag) return '';
  return typeof tag === 'string' ? tag : tag.name || '';
}

/**
 * Normalizes an array of tags to string names
 */
export function normalizeTags(tags: (string | { id: string; name: string })[] = []): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .map(tagToName)
    .filter(Boolean)
    .filter((tag, index, self) => self.indexOf(tag) === index);
}
