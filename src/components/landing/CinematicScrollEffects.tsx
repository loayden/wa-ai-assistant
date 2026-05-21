"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";

export function CinematicScrollEffects() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return undefined;
    }

    gsap.registerPlugin(ScrollTrigger);

    const context = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-cinema-section]").forEach((section) => {
        const revealItems = section.querySelectorAll<HTMLElement>("[data-cinema-reveal]");

        if (revealItems.length === 0) {
          return;
        }

        gsap.fromTo(
          revealItems,
          { autoAlpha: 0.42, y: 44, filter: "blur(10px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            ease: "power3.out",
            stagger: 0.08,
            scrollTrigger: {
              trigger: section,
              start: "top 82%",
              end: "top 42%",
              scrub: 0.8,
            },
          },
        );
      });
    });

    return () => {
      context.revert();
    };
  }, []);

  return null;
}
