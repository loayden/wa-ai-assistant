export type PermissionRequirement = {
  label: string;
  aliases: string[];
};

export const MESSENGER_PERMISSION_REQUIREMENTS: PermissionRequirement[] = [
  { label: "pages_messaging", aliases: ["pages_messaging"] },
  { label: "pages_manage_metadata", aliases: ["pages_manage_metadata"] },
];

export const INSTAGRAM_DM_PERMISSION_REQUIREMENTS: PermissionRequirement[] = [
  { label: "instagram_business_basic", aliases: ["instagram_business_basic", "instagram_basic"] },
  { label: "instagram_business_manage_messages", aliases: ["instagram_business_manage_messages", "instagram_manage_messages"] },
  { label: "pages_messaging", aliases: ["pages_messaging"] },
];

export const INSTAGRAM_COMMENT_PERMISSION_REQUIREMENTS: PermissionRequirement[] = [
  { label: "instagram_business_basic", aliases: ["instagram_business_basic", "instagram_basic"] },
  { label: "pages_read_engagement", aliases: ["pages_read_engagement"] },
  { label: "instagram_manage_comments", aliases: ["instagram_manage_comments"] },
];

export function hasPermissionRequirement(grantedPermissions: string[], requirement: PermissionRequirement): boolean {
  return requirement.aliases.some((permission) => grantedPermissions.includes(permission));
}

export function hasPermissionRequirements(grantedPermissions: string[], requirements: PermissionRequirement[]): boolean {
  return requirements.every((requirement) => hasPermissionRequirement(grantedPermissions, requirement));
}

export function missingPermissionLabels(grantedPermissions: string[], requirements: PermissionRequirement[]): string[] {
  return requirements.filter((requirement) => !hasPermissionRequirement(grantedPermissions, requirement)).map((requirement) => requirement.label);
}
