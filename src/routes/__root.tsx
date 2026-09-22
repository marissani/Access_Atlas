import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { THEME_INIT_SCRIPT } from "~/lib/theme";
import appCss from "~/styles/app.css?url";

const SITE_TITLE = "Access Atlas — Don’t take “accessible” for an answer";
const SITE_DESCRIPTION =
  "The world’s most detailed accessibility travel database. We measure what other sites only claim — door widths, shower dimensions, step-free entrances, elevator status — and score your whole trip against your own Accessibility Profile, showing you exactly what to verify before you book.";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESCRIPTION },
      { name: "theme-color", content: "#4338ca" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESCRIPTION },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: () => <div>Page not found</div>,
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    /*
     * suppressHydrationWarning: the inline script below may add `class="dark"`
     * to <html> before React hydrates, so that one element's attributes
     * legitimately differ from what the server sent. It does not cascade — a
     * real mismatch anywhere else still warns.
     */
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/*
         * Runs synchronously before the first paint: reads the saved theme (or
         * the OS preference) and sets the `dark` class, so there is never a
         * flash of the wrong theme. Keep it inline and synchronous — a separate
         * file could load after the first paint.
         */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}