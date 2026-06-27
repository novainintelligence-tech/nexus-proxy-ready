import { createFileRoute } from "@tanstack/react-router";
import { Plans } from "@/pages/Plans";
export const Route = createFileRoute("/_app/plans")({ component: Plans });