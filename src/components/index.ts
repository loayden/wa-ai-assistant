// FILE: src/components/index.ts

/*
 * [ROLE: FRONTEND ENGINEER]
 * Decision: A narrow barrel exposes the v2 component layer while existing
 * feature modules can keep direct imports during the migration.
 */
export { AIToggle } from "@/components/ai/AIToggle";
export { ToneSelector } from "@/components/ai/ToneSelector";
export { ConversationCard } from "@/components/conversations/ConversationCard";
export { ConversationThread } from "@/components/conversations/ConversationThread";
export { CustomizeDrawer } from "@/components/customize/CustomizeDrawer";
export { ElderModeToggle } from "@/components/elder/ElderModeToggle";
export { VoiceSetup } from "@/components/setup/VoiceSetup";
export { ProfileSheet } from "@/components/shared/ProfileSheet";
export { TopBar } from "@/components/shared/TopBar";
export { BottomSheet } from "@/components/ui/BottomSheet";
export { Button } from "@/components/ui/button";
export { Card } from "@/components/ui/card";
export { IconButton } from "@/components/ui/IconButton";
export { Input } from "@/components/ui/input";
export { OTPInput } from "@/components/ui/OTPInput";
export { StatusBadge } from "@/components/ui/StatusBadge";
