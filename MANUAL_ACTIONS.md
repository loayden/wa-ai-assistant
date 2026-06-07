# Kallem Manual Launch Actions

هذه القائمة هي الأشياء التي لا يمكن اعتبارها مكتملة من الكود وحده. لا تنشر التطبيق للعملاء الحقيقيين قبل إنهائها.

## 1. قاعدة البيانات الإنتاجية

- خذ نسخة احتياطية من Supabase قبل أي migration.
- طبّق migrations الجديدة على Production Supabase:
  - `20260606033000_add_outbound_messages`
  - `20260606152000_add_audit_logs`
  - `20260606165000_add_launch_observability_tables`
- الطريقة الآمنة: شغل `npx prisma migrate deploy` من بيئة موثوقة فيها `DATABASE_URL` و`DIRECT_URL` للإنتاج، أو طبّق SQL من مجلد `prisma/migrations` داخل Supabase SQL Editor.
- بعد التطبيق، تأكد أن RLS مفعل على:
  - `audit_logs`
  - `ai_reply_traces`
  - `readiness_snapshots`
  - `webhook_events`

## 2. Vercel Production Environment

- افتح إعدادات مشروع Vercel وتأكد أن كل القيم مضبوطة في Environment = Production، وليس Development فقط.
- تأكد من وجود:
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `META_APP_ID`
  - `META_APP_SECRET`
  - `META_VERIFY_TOKEN`
  - `WHATSAPP_VERIFY_TOKEN`
  - `PAYMOB_PUBLIC_KEY`
  - `PAYMOB_SECRET_KEY`
  - `PAYMOB_HMAC_SECRET`
  - `PAYMOB_CARD_INTEGRATION_ID`
  - `PAYMOB_CURRENCY`
- بعد أي تغيير في env vars، اعمل redeploy من Vercel.

## 3. OpenAI Billing And Quota

- افتح OpenAI Platform billing وتأكد أن الحساب عليه رصيد أو billing method فعال.
- اختبر صفحة الجاهزية في kallem بعد الشحن. إذا ظهر OpenAI كـ fail أو warn، لا تفتح التطبيق للعملاء.
- ابدأ برصيد صغير مضبوط للحد من المخاطر، ثم راقب الاستهلاك أول أسبوع.

## 4. Meta App Review

- Messenger لا يكون جاهزًا للعملاء الحقيقيين حتى تتم موافقة Meta على صلاحيات الرسائل المطلوبة.
- Instagram DMs لا تكون جاهزة للعملاء الحقيقيين حتى تتم موافقة Meta على صلاحيات Instagram messaging المطلوبة.
- بعد الموافقة، افتح صفحة الربط داخل kallem وأعد فحص القنوات حتى تظهر حالة webhook والpermissions كجاهزة.
- إذا كان التطبيق في Development Mode أو القنوات تعمل مع test users فقط، فهذه ليست جاهزية إنتاج.
- الحالة الحالية من فحص 2026-06-07:
  - التطبيق Published.
  - App Review submission موجود كمسودة `Not submitted`.
  - `Kallem Business` مربوط لكنه `Unverified`.
  - زر `Submit for review` معطل حتى يتم Business verification وإكمال allowed-usage forms.
  - راجع الخطوات والنصوص الجاهزة في `docs/meta-app-review-action-plan.md`.

## 5. WhatsApp Production Number

- لا تعتمد على Meta test phone number للعملاء الحقيقيين.
- اربط رقم WhatsApp Business production موثق ومملوك للنشاط.
- أرسل رسالة اختبار من رقم عميل غير مضاف كـ test recipient وتأكد أن:
  - الرسالة تظهر في kallem.
  - الرد التلقائي يرسل فعليًا عبر WhatsApp.
  - outbox يسجل `sent`.

## 6. Paymob Live Payment Test

- تأكد أن مفاتيح Paymob live موجودة في Vercel Production.
- نفّذ اختبار دفع حي بمبلغ صغير من حساب مراقب.
- تأكد أن webhook يحدث اشتراك المستخدم أو الطلب داخل قاعدة البيانات.
- لا تفتح الاشتراكات العامة قبل نجاح اختبار دفع حي كامل.

## 7. Google OAuth Branding

- افتح Google Cloud Console.
- اضبط OAuth consent screen باسم kallem وشعار kallem.
- أضف الدومين الإنتاجي `kallem.vercel.app` أو الدومين المخصص إذا تم استخدامه.
- تأكد أن redirect URLs في Supabase وGoogle تشير إلى رابط الإنتاج الصحيح.

## 8. Supabase Auth Email Templates

- راجع قوالب:
  - Signup confirmation
  - Magic link
  - Reset password
- يجب أن يظهر اسم kallem وروابط الإنتاج، وليس اسم مشروع Supabase الداخلي.
- لا تفعّل Supabase SMTP قبل شراء دومين حقيقي وتوثيقه في Resend.
- عند شراء الدومين:
  - أضفه في Resend Domains.
  - انسخ DNS records إلى مزود الدومين وانتظر حالة `Verified`.
  - استخدم بريد إرسال حقيقي مثل `no-reply@yourdomain.com`.
  - حدّث `RESEND_FROM_EMAIL` في Vercel إلى البريد الحقيقي.
  - فعّل Supabase SMTP بالقيم: `smtp.resend.com`, port `587`, username `resend`, password = Resend API key.
  - اختبر signup وreset password قبل الإطلاق العام.

## 9. Clean Browser Launch Test

نفّذ هذه الرحلة في نافذة incognito أو متصفح جديد:

- Sign up جديد.
- Login بكلمة مرور خاطئة ثم صحيحة.
- ربط WhatsApp.
- ربط Messenger بعد موافقات Meta.
- ربط Instagram بعد موافقات Meta وربطه بصفحة Facebook.
- إضافة منتج.
- إضافة معرفة.
- اختبار المساعد.
- استقبال رسالة حقيقية من WhatsApp/Instagram/Messenger.
- التأكد من وصول الرد التلقائي.
- فتح readiness والتأكد أن Manual/External لا يحتوي عناصر حرجة.
- إنشاء support ticket.
- تجربة checkout live controlled.

## 10. Launch Rule

يمكن اعتبار التطبيق جاهزًا للعملاء فقط عندما:

- `npm run build` ينجح.
- الاختبارات تمر.
- لا توجد secrets في bundle.
- صفحة الجاهزية لا تعرض blockers حرجة.
- كل manual action أعلاه تم تنفيذه أو تم قبول مخاطره كتابة.
