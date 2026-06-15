"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

// Pages that should NOT have the sidebar/portal shell
const PUBLIC_PATHS = ["/", "/login", "/register"];

export function AppShellWrapper({ children }: { children: ReactNode }) {
    const pathname = usePathname();

    // Check if current path is a public (non-portal) page
    const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

    // Exact match logic: landing "/" should be standalone, but "/dashboard" etc. should use AppShell
    const isPortalPage = !PUBLIC_PATHS.includes(pathname) &&
        !pathname.startsWith("/login") &&
        !pathname.startsWith("/register");

    if (!isPortalPage) {
        return <>{children}</>;
    }

    return <AppShell>{children}</AppShell>;
}
