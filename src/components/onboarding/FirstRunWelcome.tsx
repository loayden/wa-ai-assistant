"use client";

/*
 * [ROLE: FRONTEND ENGINEER + PRODUCT DESIGNER]
 * Decision: First-run welcome is a 3-step cinematic overlay driven by the
 * server `onboardingCompleted` flag — the single source of truth, so refreshes
 * and multi-tab sessions can never duplicate or lose it. Completing or
 * skipping both persist via POST /api/onboarding; replay is a client-only
 * event that never touches the database.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, Bot, MessageSquareText, RadioTower, Sparkles, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shared/LogoMark";
import { cn } from "@/lib/utils";

export const REPLAY_WELCOME_EVENT = "kallem:replay-welcome";

export function replayWelcome() {
  window.dispatchEvent(new CustomEvent(REPLAY_WELCOME_EVENT));
}

/**
 * First displayable name: first token of the full name, otherwise null so
 * the UI falls back to a generic greeting (never an email prefix).
 */
export function resolveWelcomeName(userName: string | null | undefined): string | null {
  const first = userName?.trim().split(/\s+/)[0];

  return first ? first : null;
}

const STEP_COUNT = 3;

const howItWorks = [
  {
    icon: RadioTower,
    title: "اربط قنواتك",
    body: "وصّل واتساب أو إنستجرام أو ماسنجر في دقيقة واحدة.",
  },
  {
    icon: Bot,
    title: "علّم المساعد",
    body: "عرّفه بنشاطك ومنتجاتك وأسعارك وساعات عملك.",
  },
  {
    icon: MessageSquareText,
    title: "استقبل الردود",
    body: "هو بيرد فورًا على عملائك، وأنت بتتدخل وقت ما تحب.",
  },
];

function StepDots({ step }: { step: number }) {
  return (
    <div className="flex items-center justify-center gap-2" aria-hidden="true">
      {Array.from({ length: STEP_COUNT }, (_, index) => (
        <motion.span
          key={index}
          className={cn("h-2 rounded-full", index === step ? "bg-wa-blue-600" : "bg-wa-gray-200")}
          initial={false}
          animate={{ width: index === step ? 28 : 8, opacity: index === step ? 1 : 0.7 }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
        />
      ))}
    </div>
  );
}

export function FirstRunWelcome({ show, userName }: { show: boolean; userName: string | null }) {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const [dismissed, setDismissed] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [direction, setDirection] = useState(1);
  const postedRef = useRef(false);

  const visible = (show && !dismissed) || replaying;
  const displayName = resolveWelcomeName(userName);

  const persistAndClose = useCallback(async () => {
    setDismissed(true);
    setReplaying(false);

    if (postedRef.current) {
      return;
    }

    postedRef.current = true;

    try {
      await fetch("/api/onboarding", { method: "POST" });
    } catch {
      // Best-effort: the server flag stays false and the welcome simply
      // shows again next visit instead of losing the moment silently.
      postedRef.current = false;
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    const onReplay = () => {
      setStep(0);
      setDirection(1);
      setDismissed(true);
      setReplaying(true);
    };

    window.addEventListener(REPLAY_WELCOME_EVENT, onReplay);

    return () => window.removeEventListener(REPLAY_WELCOME_EVENT, onReplay);
  }, []);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        void persistAndClose();
      } else if (event.key === "ArrowLeft") {
        goNext();
      } else if (event.key === "ArrowRight") {
        goPrev();
      }
    };

    window.addEventListener("keydown", onKey);

    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, step, persistAndClose]);

  function goNext() {
    if (step >= STEP_COUNT - 1) {
      return;
    }

    setDirection(1);
    setStep((current) => current + 1);
  }

  function goPrev() {
    if (step <= 0) {
      return;
    }

    setDirection(-1);
    setStep((current) => current - 1);
  }

  async function finish(to: string | null) {
    setFinishing(true);
    await persistAndClose();
    setFinishing(false);

    if (to) {
      router.push(to);
      router.refresh();
    }
  }

  const slide = reduceMotion ? 0 : 48 * direction;

  return (
    <AnimatePresence>
      {visible ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-[#0B1B3A]/60 p-3 backdrop-blur-md sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.1 : 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-label="جولة الترحيب"
        >
          {/* Ambient orbs: transform-only drift, disabled under reduced motion */}
          {!reduceMotion ? (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
              <motion.div
                className="absolute -top-24 right-[8%] size-72 rounded-full bg-wa-blue-600/25 blur-3xl"
                animate={{ x: [0, -36, 0], y: [0, 28, 0] }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute bottom-[6%] left-[4%] size-80 rounded-full bg-emerald-400/20 blur-3xl"
                animate={{ x: [0, 30, 0], y: [0, -24, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          ) : null}

          <motion.div
            className="glass-surface relative w-full max-w-[520px] overflow-hidden rounded-[28px] p-6 text-center sm:rounded-[36px] sm:p-10"
            initial={{ opacity: 0, y: reduceMotion ? 0 : 44, scale: reduceMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : 24, scale: reduceMotion ? 1 : 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
          >
            <button
              type="button"
              onClick={() => void persistAndClose()}
              aria-label="تخطي الجولة"
              className="absolute left-4 top-4 flex size-11 items-center justify-center rounded-full text-wa-gray-400 transition hover:bg-white/70 hover:text-wa-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-wa-blue-600"
            >
              <X className="size-5" aria-hidden="true" />
            </button>

            <div className="flex justify-center">
              <LogoMark size="lg" />
            </div>

            <div className="mt-5 min-h-[300px] sm:min-h-[320px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={step}
                  custom={direction}
                  initial={{ opacity: 0, x: slide }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: reduceMotion ? 0 : -48 * direction }}
                  transition={{ duration: reduceMotion ? 0.1 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {step === 0 ? (
                    <div>
                      <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">أهلاً بك في كَلّم</p>
                      <h2 className="mt-3 text-[30px] font-semibold leading-tight text-wa-gray-900 sm:text-[38px]">
                        أهلاً{displayName ? `، ${displayName}` : " بك"} 👋
                      </h2>
                      <p className="mx-auto mt-4 max-w-[400px] text-body leading-8 text-wa-gray-600">
                        مساعدك الذكي اللي بيرد على عملائك على واتساب وإنستجرام وماسنجر — حتى وأنت مشغول أو نايم.
                      </p>
                      <div className="mx-auto mt-6 flex max-w-[400px] items-center gap-2 rounded-2xl border border-wa-blue-100 bg-wa-blue-50 px-4 py-3 text-right">
                        <Sparkles className="size-5 shrink-0 text-wa-blue-600" aria-hidden="true" />
                        <p className="text-body-sm leading-6 text-wa-gray-700">٣ خطوات بس وتكون جاهز تستقبل أول رسالة.</p>
                      </div>
                    </div>
                  ) : null}

                  {step === 1 ? (
                    <div>
                      <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">إزاي بيشتغل؟</p>
                      <h2 className="mt-3 text-[26px] font-semibold leading-tight text-wa-gray-900 sm:text-[32px]">أنت بتوجّه، وهو بينفّذ</h2>
                      <div className="mt-6 space-y-3 text-right">
                        {howItWorks.map((row, index) => {
                          const Icon = row.icon;

                          return (
                            <motion.div
                              key={row.title}
                              className="flex items-center gap-3 rounded-2xl border border-wa-gray-100 bg-white/80 px-4 py-3"
                              initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: reduceMotion ? 0 : 0.12 + index * 0.08, duration: 0.3 }}
                            >
                              <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-wa-blue-50 text-wa-blue-600">
                                <Icon className="size-5" aria-hidden="true" />
                              </span>
                              <span>
                                <span className="block text-body-sm font-semibold text-wa-gray-900">{row.title}</span>
                                <span className="mt-0.5 block text-body-sm leading-6 text-wa-gray-600">{row.body}</span>
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  {step === 2 ? (
                    <div>
                      <p className="text-label font-semibold uppercase tracking-widest text-wa-blue-600">أول خطوة</p>
                      <h2 className="mt-3 text-[26px] font-semibold leading-tight text-wa-gray-900 sm:text-[32px]">
                        جاهز في ٥ دقايق ⏱️
                      </h2>
                      <p className="mx-auto mt-4 max-w-[400px] text-body leading-8 text-wa-gray-600">
                        اربط أول قناة دلوقتي، والمساعد هيبدأ يشتغل معاك فورًا. تقدر تضيف منتجاتك وأسعارك بعدها من صفحة المعرفة.
                      </p>
                    </div>
                  ) : null}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-6 space-y-4">
              <StepDots step={step} />
              <p className="text-label font-semibold text-wa-gray-400">
                {(step + 1).toLocaleString("ar-EG")} / {STEP_COUNT.toLocaleString("ar-EG")}
              </p>

              {step < STEP_COUNT - 1 ? (
                <div className="flex gap-2">
                  {step > 0 ? (
                    <Button variant="outline" className="min-h-12 flex-1 rounded-full" onClick={goPrev}>
                      رجوع
                    </Button>
                  ) : null}
                  <motion.div className="flex-[2]" whileTap={{ scale: 0.97 }}>
                    <Button className="min-h-12 w-full rounded-full" onClick={goNext}>
                      {step === 0 ? "يلا نبدأ" : "تمام، وبعدين؟"}
                      <ArrowLeft className="size-4" aria-hidden="true" />
                    </Button>
                  </motion.div>
                </div>
              ) : (
                <div className="space-y-2">
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button className="min-h-12 w-full rounded-full" isLoading={finishing} onClick={() => void finish("/connect")}>
                      ابدأ الآن
                      <ArrowLeft className="size-4" aria-hidden="true" />
                    </Button>
                  </motion.div>
                  <Button variant="ghost" className="min-h-11 w-full rounded-full" onClick={() => void finish(null)}>
                    هستكشف لوحدي
                  </Button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
