import { z } from "zod";

import { UnauthorizedError, requireAppUser } from "@/lib/api/auth";
import { InvalidJsonError, readJsonRequestBody } from "@/lib/api/request";
import { jsonDatabaseUnavailableIfNeeded, jsonError, jsonSuccess, jsonValidationError } from "@/lib/api/response";
import { mergeCustomerProfiles } from "@/lib/customers/profiles";
import { logger } from "@/lib/utils/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const mergeCustomerProfilesSchema = z
  .object({
    primaryProfileId: z.string().uuid(),
    secondaryProfileId: z.string().uuid(),
  })
  .strict();

export async function POST(request: Request) {
  try {
    const user = await requireAppUser();
    const body = await readJsonRequestBody(request);
    const parsed = mergeCustomerProfilesSchema.safeParse(body);

    if (!parsed.success) {
      return jsonValidationError(parsed.error);
    }

    const mergedProfile = await mergeCustomerProfiles({
      userId: user.id,
      primaryProfileId: parsed.data.primaryProfileId,
      secondaryProfileId: parsed.data.secondaryProfileId,
    });

    return jsonSuccess({
      merged: true,
      profile: {
        id: mergedProfile.id,
        linkedProfileId: mergedProfile.linkedProfileId,
        isMerged: mergedProfile.isMerged,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return jsonError(error.message, 401);
    }

    if (error instanceof InvalidJsonError) {
      return jsonError(error.message, 400);
    }

    if (error instanceof Error && (error.message === "Customer profile not found." || error.message === "Cannot merge the same customer profile.")) {
      return jsonError(error.message, 400);
    }

    const databaseErrorResponse = jsonDatabaseUnavailableIfNeeded("api.customers.merge", error);

    if (databaseErrorResponse) {
      return databaseErrorResponse;
    }

    logger.error("api.customers.merge", "Failed to merge customer profiles.", { error });
    return jsonError("Failed to merge customer profiles.", 500);
  }
}
