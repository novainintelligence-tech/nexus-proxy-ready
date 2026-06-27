// Minimal wouter shim backed by TanStack Router so ported pages can
// `import { Link, useLocation } from "wouter"`.
import { Link as TLink, useNavigate, useRouterState } from "@tanstack/react-router";
import type { ComponentProps, ReactNode } from "react";

type LinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
} & Omit<ComponentProps<"a">, "href">;

export function Link({ href, children, ...rest }: LinkProps) {
  return (
    <TLink to={href as any} {...(rest as any)}>
      {children as any}
    </TLink>
  );
}

export function useLocation(): [string, (to: string, opts?: { replace?: boolean }) => void] {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const setLocation = (to: string, opts?: { replace?: boolean }) => {
    navigate({ to: to as any, replace: opts?.replace });
  };
  return [pathname, setLocation];
}