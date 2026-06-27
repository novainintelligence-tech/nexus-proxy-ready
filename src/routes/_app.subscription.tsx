import { createFileRoute } from "@tanstack/react-router";
import { Subscription } from "@/pages/Subscription";
export const Route = createFileRoute("/_app/subscription")({ component: Subscription });