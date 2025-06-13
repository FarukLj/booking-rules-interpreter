
/**
 * Tag utility functions for normalizing tag data
 */

export interface TagRef {
  id: string;
  name: string;
}

/**
 * Converts a tag reference to its name string
 * Handles both string names and {id, name} objects
 */
export function tagToName(tag: string | TagRef): string {
  if (typeof tag === 'string') {
    return tag;
  }
  if (tag && typeof tag === 'object' && 'name' in tag) {
    return tag.name;
  }
  console.warn('[tagToName] Invalid tag format:', tag);
  return '';
}

/**
 * Normalizes an array of tags to string names
 */
export function normalizeTagsToNames(tags: (string | TagRef)[]): string[] {
  if (!Array.isArray(tags)) {
    console.warn('[normalizeTagsToNames] Expected array, got:', typeof tags);
    return [];
  }
  
  return tags
    .map(tagToName)
    .filter(name => name.length > 0);
}

/**
 * Validates that selected tags exist in available options
 */
export function validateSelectedTags(selected: string[], available: string[]): string[] {
  const validated = selected.filter(tag => available.includes(tag));
  
  const missing = selected.filter(tag => !available.includes(tag));
  if (missing.length > 0) {
    console.warn('[validateSelectedTags] Missing tags:', missing);
  }
  
  return validated;
}
