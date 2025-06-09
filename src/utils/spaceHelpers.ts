
import { SpaceRef } from "@/types/RuleResult";

/**  Court object → "name",  "Court 1" → "Court 1"  */
export function spaceToName(space: string | SpaceRef): string {
  return typeof space === "string" ? space : space.name;
}
