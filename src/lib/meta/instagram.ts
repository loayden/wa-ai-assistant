export type MetaPageWithInstagram = {
  instagram_business_account?: {
    id?: string | null;
  } | null;
};

export const INSTAGRAM_PAGE_LINK_REQUIRED_MESSAGE =
  "هذه الصفحة لا تحتوي على حساب Instagram Business مرتبط. اربطي حساب Instagram Professional بصفحة Facebook من Meta Business Settings، ثم ارجعي إلى Kallem واضغطي تحديث الصلاحيات.";

export function getInstagramPageLinkIssue(page: MetaPageWithInstagram): string | null {
  return page.instagram_business_account?.id ? null : INSTAGRAM_PAGE_LINK_REQUIRED_MESSAGE;
}
