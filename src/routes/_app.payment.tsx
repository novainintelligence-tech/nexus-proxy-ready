import { createFileRoute } from "@tanstack/react-router";
import { Payment } from "@/pages/Payment";
export const Route = createFileRoute("/_app/payment")({ component: Payment });