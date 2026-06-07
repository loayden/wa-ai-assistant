// FILE: src/app/(dashboard)/knowledge/page.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Knowledge is a first-class protected page so owners can teach the
 * assistant before inviting real customers.
 */
import { KnowledgePageClient } from "@/components/knowledge/KnowledgePageClient";
import { serializeKnowledgeEntry } from "@/lib/api/knowledge";
import { prisma } from "@/lib/prisma/client";
import { getShellUser } from "@/lib/server/dashboard-bootstrap";

export default async function KnowledgePage() {
  const auth = await getShellUser();

  if (!auth) {
    return null;
  }

  const [entries, products] = await Promise.all([
    prisma.knowledgeBaseEntry.findMany({
      where: { userId: auth.appUser.id },
      orderBy: [{ type: "asc" }, { updatedAt: "desc" }],
    }),
    prisma.product.findMany({
      where: {
        userId: auth.appUser.id,
        isAvailable: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
        category: true,
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      take: 6,
    }),
  ]);

  return (
    <KnowledgePageClient
      initialEntries={entries.map(serializeKnowledgeEntry)}
      initialProducts={products.map((product) => ({
        id: product.id,
        name: product.name,
        priceEGP: product.price / 100,
        category: product.category,
      }))}
    />
  );
}
