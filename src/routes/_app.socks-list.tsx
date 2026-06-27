import { createFileRoute } from "@tanstack/react-router";
import { SocksList } from "@/pages/SocksList";
export const Route = createFileRoute("/_app/socks-list")({
  component: SocksList,
});