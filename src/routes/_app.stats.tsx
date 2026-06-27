import { createFileRoute } from "@tanstack/react-router";
import { Stats } from "@/pages/Stats";
export const Route = createFileRoute("/_app/stats")({ component: Stats });