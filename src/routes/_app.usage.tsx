import { createFileRoute } from "@tanstack/react-router";
import { Usage } from "@/pages/Usage";
export const Route = createFileRoute("/_app/usage")({ component: Usage });