import { beforeEach, describe, expect, it, vi } from "vitest";

const prismaMock = vi.hoisted(() => ({
  whatsAppConnection: {
    findFirst: vi.fn(),
  },
  instagramCommentLead: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  instagramPostStats: {
    upsert: vi.fn(),
  },
  lead: {
    create: vi.fn(),
  },
  message: {
    create: vi.fn(),
  },
  customerProfile: {
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
}));

const settingsMock = vi.hoisted(() => ({
  getOrCreateUserSettings: vi.fn(),
}));

const instagramSendMock = vi.hoisted(() => ({
  sendText: vi.fn(),
}));

vi.mock("@/lib/prisma/client", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/api/settings", () => ({
  getOrCreateUserSettings: settingsMock.getOrCreateUserSettings,
}));

vi.mock("@/lib/channels/adapters/instagram", () => ({
  instagramAdapter: {
    sendText: instagramSendMock.sendText,
  },
}));

vi.mock("@/lib/utils/encryption", () => ({
  decrypt: vi.fn(() => "page-token"),
}));

vi.mock("@/lib/utils/logger", () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { detectSocialIntent } from "@/lib/ai/social-intent";
import { getOrUpsertCustomerProfile, mergeCustomerProfiles } from "@/lib/customers/profiles";
import { detectInstagramCommentBuyingIntent, processInstagramComment } from "@/lib/channels/instagram-comments";

const connection = {
  id: "00000000-0000-0000-0000-000000000011",
  userId: "00000000-0000-0000-0000-000000000001",
  phoneNumberId: "phone-id",
  instagramAccountId: "ig-1",
  pageAccessTokenEncrypted: "encrypted-page-token",
  accessToken: "encrypted-wa-token",
  permissions: ["instagram_basic", "pages_read_engagement", "instagram_manage_comments"],
  permissionStatus: "granted",
};

describe("social intent detection", () => {
  it("classifies common social channel intents deterministically", async () => {
    await expect(detectSocialIntent("I want to collaborate with your brand")).resolves.toBe("collaboration");
    await expect(detectSocialIntent("هذا المنتج سيء جدا ومش عاجبني")).resolves.toBe("complaint");
    await expect(detectSocialIntent("free crypto giveaway click now")).resolves.toBe("spam");
    await expect(detectSocialIntent("بكام ومتوفرة؟")).resolves.toBe("price_inquiry");
    await expect(detectSocialIntent("عايز اطلب اتنين")).resolves.toBe("order");
  });
});

describe("Instagram Comment-to-DM", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.whatsAppConnection.findFirst.mockResolvedValue(connection);
    prismaMock.instagramCommentLead.findUnique.mockResolvedValue(null);
    prismaMock.instagramCommentLead.create.mockResolvedValue({ id: "comment-record-1" });
    prismaMock.instagramCommentLead.update.mockResolvedValue({});
    prismaMock.instagramPostStats.upsert.mockResolvedValue({});
    prismaMock.lead.create.mockResolvedValue({ id: "lead-1" });
    prismaMock.message.create.mockResolvedValue({ id: "message-1" });
    instagramSendMock.sendText.mockResolvedValue({ success: true, externalMessageId: "dm-1" });
    settingsMock.getOrCreateUserSettings.mockResolvedValue({
      commentToDmEnabled: true,
      commentToDmMessage: "أهلاً! السعر والتفاصيل في الرسالة الخاصة.",
    });
  });

  it("detects buying intent in a comment, sends a DM, saves a lead, and updates post stats", async () => {
    expect(detectInstagramCommentBuyingIntent("how much? available?")).toBe(true);

    await processInstagramComment(
      {
        id: "comment-1",
        text: "how much? available?",
        from: { id: "ig-user-1", username: "buyer" },
        media: { id: "post-1" },
      },
      "ig-1",
    );

    expect(instagramSendMock.sendText).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: connection.id,
        recipientId: "ig-user-1",
        text: "أهلاً! السعر والتفاصيل في الرسالة الخاصة.",
        accessToken: "page-token",
        phoneNumberId: "ig-1",
      }),
    );
    expect(prismaMock.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: connection.userId,
          channel: "instagram",
          externalId: "ig-user-1",
          senderName: "buyer",
          source: "instagram_comment",
        }),
      }),
    );
    expect(prismaMock.instagramPostStats.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_postId: { userId: connection.userId, postId: "post-1" } },
        update: expect.objectContaining({
          commentCount: { increment: 1 },
          leadCount: { increment: 1 },
          dmCount: { increment: 1 },
        }),
      }),
    );
  });

  it("is idempotent for duplicate comment ids", async () => {
    prismaMock.instagramCommentLead.findUnique.mockResolvedValueOnce({ id: "existing" });

    await processInstagramComment({ id: "comment-1", text: "how much?", from: { id: "ig-user-1" } }, "ig-1");

    expect(prismaMock.instagramCommentLead.create).not.toHaveBeenCalled();
    expect(instagramSendMock.sendText).not.toHaveBeenCalled();
  });

  it("does nothing when comment-to-DM is disabled or permissions are missing", async () => {
    settingsMock.getOrCreateUserSettings.mockResolvedValueOnce({ commentToDmEnabled: false });

    await processInstagramComment({ id: "comment-disabled", text: "how much?", from: { id: "ig-user-1" } }, "ig-1");

    expect(prismaMock.instagramCommentLead.create).not.toHaveBeenCalled();

    settingsMock.getOrCreateUserSettings.mockResolvedValueOnce({ commentToDmEnabled: true });
    prismaMock.whatsAppConnection.findFirst.mockResolvedValueOnce({
      ...connection,
      permissions: ["instagram_basic"],
      permissionStatus: "partial",
    });

    await processInstagramComment({ id: "comment-perms", text: "how much?", from: { id: "ig-user-1" } }, "ig-1");

    expect(instagramSendMock.sendText).not.toHaveBeenCalled();
  });
});

describe("unified customer profiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates social profiles by PSID and IGSID without guessing identity", async () => {
    prismaMock.customerProfile.findFirst.mockResolvedValue(null);
    prismaMock.customerProfile.create.mockResolvedValue({ id: "profile-1" });

    await getOrUpsertCustomerProfile({
      userId: "00000000-0000-0000-0000-000000000001",
      externalId: "psid-1",
      channel: "messenger",
      name: "Messenger User",
    });

    expect(prismaMock.customerProfile.findFirst).toHaveBeenCalledWith({
      where: { userId: "00000000-0000-0000-0000-000000000001", messengerPsid: "psid-1" },
    });
    expect(prismaMock.customerProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: "psid-1",
          channel: "messenger",
          messengerPsid: "psid-1",
          name: "Messenger User",
        }),
      }),
    );
  });

  it("merges profiles by linking the secondary profile to the primary one", async () => {
    prismaMock.customerProfile.findFirst
      .mockResolvedValueOnce({ id: "primary", userId: "user-1", isMerged: false })
      .mockResolvedValueOnce({ id: "secondary", userId: "user-1", isMerged: false });
    prismaMock.customerProfile.update.mockResolvedValue({ id: "secondary", linkedProfileId: "primary", isMerged: true });

    await mergeCustomerProfiles({
      userId: "user-1",
      primaryProfileId: "primary",
      secondaryProfileId: "secondary",
    });

    expect(prismaMock.customerProfile.update).toHaveBeenCalledWith({
      where: { id: "secondary" },
      data: { linkedProfileId: "primary", isMerged: true },
    });
  });
});
