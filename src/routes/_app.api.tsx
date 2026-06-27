import { createFileRoute } from "@tanstack/react-router";
import { Api } from "@/pages/Api";
export const Route = createFileRoute("/_app/api")({ component: Api });