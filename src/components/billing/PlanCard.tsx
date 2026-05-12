// FILE: src/components/billing/PlanCard.tsx
/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: Plan cards keep feature comparison and payment action in the same
 * compact surface so the billing route remains operational, not marketing-led.
 */
import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlanTier } from "@/types/subscription";

type PlanCardProps = {
  title: PlanTier;
  priceLabel: string;
  description: string;
  features: string[];
  current: boolean;
  actionLabel: string;
  disabled?: boolean;
  onAction: () => void;
};

export function PlanCard({ title, priceLabel, description, features, current, actionLabel, disabled, onAction }: PlanCardProps) {
  return (
    <Card className={current ? "border-primary" : undefined}>
      <CardHeader className="gap-2">
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {current ? <Badge variant="success">Current</Badge> : null}
        </div>
        <p className="text-2xl font-semibold">{priceLabel}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {features.map((feature) => (
          <p key={feature} className="flex items-center gap-2 text-sm">
            <Check className="size-4 text-primary" aria-hidden="true" />
            {feature}
          </p>
        ))}
      </CardContent>
      <CardFooter>
        <Button className="w-full" disabled={disabled || current} onClick={onAction}>
          {current ? "Current Plan" : actionLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
