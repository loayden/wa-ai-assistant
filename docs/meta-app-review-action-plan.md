# Meta App Review Action Plan

Last checked: 2026-06-07

## Current Meta Status

- App: `kallem`
- App ID: `1494906165521909`
- App publish status: Published
- Business portfolio connected: `Kallem Business`
- Business verification status: Unverified
- App Review submission status: Not submitted

Meta blocks final submission until the connected business portfolio is verified.

## Permissions In Draft Submission

Required for Messenger and Instagram DM launch:

- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_metadata`
- `pages_messaging`
- `instagram_basic`
- `instagram_manage_messages`
- `instagram_business_basic`
- `instagram_business_manage_messages`

Optional and not required for Instagram DM launch:

- `instagram_business_manage_comments`

Recommendation: remove `instagram_business_manage_comments` from the App Review submission unless comment-to-DM is part of the first public launch. Keeping it requires a separate screencast and allowed-usage explanation.

## Manual Blockers

### 1. Verify The Business Portfolio

Open:

`Meta for Developers > App Review submission > Verification > Go to verification`

Then click `Start verification` next to `Kallem Business`.

You must provide real legal/business details. Do not guess:

- Legal business name.
- Business address.
- Business phone/email.
- Business website.
- Registration, tax, or official business documents if Meta asks.
- Any ownership or admin verification Meta requests.

Only a person with full control of the business portfolio can complete this.

### 2. Complete `instagram_manage_messages`

Paste this in the description field:

```text
Kallem lets a business owner connect their own Instagram Professional account, read Instagram Direct Message conversations in the Kallem inbox, and send manual or AI-assisted replies to customers. This is necessary for customer support, product questions, order follow-up, and lead management. Kallem only uses message data for the connected business inbox and automation features, and does not sell or use the data for unrelated advertising.
```

Upload a real MP4/MOV screencast showing:

- Open `https://kallem.vercel.app`.
- Sign in as a business owner.
- Open the connect page.
- Click the Meta/Instagram connection.
- Grant Meta permissions.
- Select the Facebook Page linked to the Instagram Professional account.
- Show the Instagram channel connected in Kallem.
- Send an Instagram DM to the connected account.
- Show the DM arriving in Kallem messages.
- Send a manual or AI-assisted reply from Kallem.
- Show the reply delivered in Instagram.

Check the allowed-usage agreement and save.

### 3. Complete `instagram_basic`

Paste this in the description field:

```text
Kallem uses instagram_basic to identify the Instagram Professional account connected to the selected Facebook Page and display the account username/profile information to the business owner during setup. This confirms that the owner is connecting the correct Instagram account before enabling Instagram Direct Message inbox and reply automation. Kallem does not use Instagram profile or media data for unrelated purposes.
```

Upload the same screencast if Meta accepts it for this permission, or a focused screencast showing the Instagram account selection/confirmation inside Kallem.

Check the allowed-usage agreement and save.

### 4. Reviewer Instructions

Current reviewer instructions are mostly filled, but the test account section contains a placeholder:

`Password: [provide the test password separately in the secure review field if required]`

Before submission, replace it with a real active reviewer test account or remove the placeholder and create a Meta test user flow.

Recommended test account text:

```text
No payment is required to review the app. The reviewer may create a free account using email/password on https://kallem.vercel.app/signup or use Facebook Login. If a dedicated test account is preferred, use:
Email: [reviewer-test-email]
Password: [reviewer-test-password]
```

Do not commit real passwords to the repository.

### 5. Submit For Review

After business verification and all allowed-usage forms are complete:

- Confirm `Submit for review` is enabled.
- Submit the App Review request.
- Wait for Meta approval.
- If Meta rejects, fix the exact rejection reason and resubmit.

### 6. After Approval

After Meta approves the permissions:

- Open `https://kallem.vercel.app/connect`.
- Reconnect Messenger and Instagram.
- Confirm Kallem shows permissions as granted.
- Confirm the Page webhook subscription is successful.
- Send real test messages:
  - Messenger inbound message.
  - Instagram DM inbound message.
  - Manual reply.
  - AI auto reply.
- Confirm replies are delivered in Messenger and Instagram.

