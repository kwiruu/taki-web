import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import CommandsDoc from "@/content/commands.mdx";
import ConfigDoc from "@/content/config.mdx";
import DashboardDoc from "@/content/dashboard.mdx";
import InstallDoc from "@/content/install.mdx";
import QuickStartDoc from "@/content/quick-start.mdx";
import ReleasesDoc from "@/content/releases.mdx";
import ThemesDoc from "@/content/themes.mdx";
import TroubleshootingDoc from "@/content/troubleshooting.mdx";
import { cliData } from "@/data/generated/cli-data";
import { Moon, Sun } from "lucide-react";

const docsNavItems = [
  { label: "Quick Start", to: "/docs/quick-start" },
  { label: "Install", to: "/docs/install" },
  { label: "Commands", to: "/docs/commands" },
  { label: "Dashboard", to: "/docs/dashboard" },
  { label: "Themes", to: "/docs/themes" },
  { label: "Config", to: "/docs/config" },
  { label: "Troubleshooting", to: "/docs/troubleshooting" },
] as const;

type TocItem = {
  id: string;
  text: string;
  level: 2 | 3;
};

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function formatValue(value: number | string | null): string {
  if (value === null) {
    return "n/a";
  }

  if (typeof value === "number") {
    return new Intl.NumberFormat().format(value);
  }

  return value;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function dataFreshnessLabel(): string {
  return cliData.stale ? "stale fallback" : "fresh build-time data";
}

function ArticleShell({ children }: { children: ReactNode }) {
  return (
    <article className="max-w-3xl text-[15px] leading-7 text-foreground [&_h1]:mt-2 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-10 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-4 [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[0.85em] [&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-border/80 [&_pre]:bg-muted/70 [&_pre]:p-4 [&_pre]:text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:my-6 [&_table]:w-full [&_table]:text-sm [&_th]:border-b [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold [&_td]:border-b [&_td]:p-2">
      {children}
    </article>
  );
}

const docsNavLinkClass = buttonVariants({ variant: "ghost", size: "sm" });

function DocsShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeTocId, setActiveTocId] = useState<string>("");

  useEffect(() => {
    const buildToc = () => {
      const article = document.querySelector("main article");
      if (!article) {
        setTocItems([]);
        return;
      }

      const seen = new Map<string, number>();
      const headings = Array.from(article.querySelectorAll("h2, h3"));
      const items: TocItem[] = [];

      for (const heading of headings) {
        const text = heading.textContent?.trim();
        if (!text) {
          continue;
        }

        const level = heading.tagName === "H3" ? 3 : 2;
        let id = heading.id.trim();
        if (!id) {
          const base = slugifyHeading(text) || "section";
          const count = seen.get(base) ?? 0;
          seen.set(base, count + 1);
          id = count === 0 ? base : `${base}-${count + 1}`;
          heading.id = id;
        }

        items.push({ id, text, level });
      }

      setTocItems(items);
      setActiveTocId((current) => current || items[0]?.id || "");
    };

    const frame = requestAnimationFrame(buildToc);
    const observer = new MutationObserver(buildToc);
    const main = document.querySelector("main");
    if (main) {
      observer.observe(main, { childList: true, subtree: true });
    }

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [location.pathname]);

  useEffect(() => {
    if (tocItems.length === 0) {
      return;
    }

    const headings = tocItems
      .map((item) => document.getElementById(item.id))
      .filter((heading): heading is HTMLElement => Boolean(heading));

    if (headings.length === 0) {
      return;
    }

    const updateActiveSection = () => {
      let currentId = headings[0].id;

      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= 140) {
          currentId = heading.id;
        }
      }

      setActiveTocId(currentId);
    };

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("resize", updateActiveSection);

    return () => {
      window.removeEventListener("scroll", updateActiveSection);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [tocItems]);

  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_220px]">
      <aside className="h-fit p-3 lg:sticky lg:top-24">
        <p className="px-2 pb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Docs Index
        </p>
        <nav className="space-y-1 flex flex-col">
          {docsNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(docsNavLinkClass, "justify-start h-9 w-full")}
              activeProps={{
                className: cn(
                  docsNavLinkClass,
                  "justify-start bg-muted text-foreground",
                ),
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">{children}</div>

      <aside className="hidden xl:block">
        <div className="sticky top-24 rounded-xl bg-card/40">
          <p className="px-2 pb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            On This Page
          </p>
          {tocItems.length > 0 ? (
            <nav className="space-y-1 flex flex-col">
              {tocItems.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={cn(
                    "block h-8 w-full rounded-md bg-transparent px-2 text-sm leading-8 text-muted-foreground no-underline transition-colors hover:bg-transparent hover:text-foreground focus-visible:bg-transparent focus-visible:text-foreground",
                    activeTocId === item.id && "text-foreground",
                    item.level === 3 && "pl-5",
                  )}
                >
                  {item.text}
                </a>
              ))}
            </nav>
          ) : (
            <p className="px-2 text-sm text-muted-foreground">
              No sections yet.
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}

function DocsArticle({ children }: { children: ReactNode }) {
  return (
    <DocsShell>
      <ArticleShell>{children}</ArticleShell>
    </DocsShell>
  );
}

function DataCards() {
  return (
    <section className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">GitHub Stars</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">
          {formatValue(cliData.stats.stars)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Open Issues</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">
          {formatValue(cliData.stats.openIssues)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Latest Release</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">
          {formatValue(cliData.release.tagName)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">npm Version</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">
          {formatValue(cliData.npm.version)}
        </CardContent>
      </Card>
    </section>
  );
}

export function RootLayout() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const storedTheme = window.localStorage.getItem("taki-docs-theme");
    return storedTheme === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("taki-docs-theme", theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,oklch(0.96_0.03_180)_0,transparent_40%),radial-gradient(circle_at_80%_0%,oklch(0.92_0.04_50)_0,transparent_35%),oklch(0.99_0_0)]">
      <header className="bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="Taki logo"
              className="h-7 w-auto dark:invert"
            />
            <div>
              <p className="text-xs tracking-[0.18em] text-muted-foreground">
                taki-cli
              </p>
              <h1 className="text-lg font-semibold">Taki Docs</h1>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-2">
              <Link
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-10",
                )}
                to="/"
              >
                Home
              </Link>
              <Link
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-10",
                )}
                to="/docs"
              >
                Docs
              </Link>
              <Link
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-10",
                )}
                to="/docs/install"
              >
                Install
              </Link>
              <Link
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-10",
                )}
                to="/releases"
              >
                Releases
              </Link>
            </nav>

            <Separator orientation="vertical" className="my-2" />

            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "ghost", size: "lg" }),
                "h-10",
              )}
              onClick={() =>
                setTheme((current) => (current === "light" ? "dark" : "light"))
              }
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
            >
              {theme === "light" ? <Moon /> : <Sun />}
            </button>

            <Separator orientation="vertical" className="my-2" />

            <a
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "h-10 text-muted-foreground gap-2",
              )}
              href="https://github.com/kwiruu/taki-cli"
              target="_blank"
              rel="noreferrer"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                className="bi bi-github h-5 w-5 text-black dark:text-white"
                aria-hidden="true"
              >
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
              </svg>
              {formatValue(cliData.stats.stars)}
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 py-10">
        <Outlet />
      </main>
    </div>
  );
}

export function HomePage() {
  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <Badge variant="secondary">Phase 2A in progress</Badge>
        <h2 className="max-w-3xl text-4xl font-semibold leading-tight">
          Run and monitor local multi-service workflows from one terminal UI.
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          Taki gives you one command to launch, inspect, and control multiple
          local services with focused panes, themes, shortcuts, and health
          checks.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="rounded-md border bg-card px-3 py-2 text-sm">
            npm install -g @kwiruu/taki-cli
          </code>
          <Link className={buttonVariants()} to="/docs/install">
            Quick start
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">
          Snapshot updated: {formatTimestamp(cliData.generatedAt)} (
          {dataFreshnessLabel()})
        </p>
      </section>

      <section className="space-y-3">
        <div className="bg-vid pointer-events-none relative aspect-[16/7] overflow-hidden rounded-2xl bg-[url('/bg-vid.svg')] bg-cover bg-center shadow-sm">
          <video
            className="h-full w-4xl m-auto mt-15 rounded-2xl object-cover object-top"
            src="/demo.mp4"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          >
            Your browser does not support the video tag.
          </video>
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10" />
        </div>
      </section>

      <Separator />
      <DataCards />
      <Separator />

      <section className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Command Coverage</CardTitle>
            <CardDescription>
              Generated from CLI behavior and command flags.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            run, init, add, config, version, plus global flags for config path,
            shutdown timeout, and log buffer control.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dashboard UX</CardTitle>
            <CardDescription>
              Layout modes, shortcuts, focus movement, and service restarts.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Single, vertical, horizontal, and grid layouts with pane controls
            and keyboard-first navigation.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reliability Story</CardTitle>
            <CardDescription>
              Release automation, CI verification, and publish safeguards.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Multi-OS CI matrix, release PR automation, and npm publish with
            provenance enabled.
          </CardContent>
        </Card>
      </section>

      <footer className="pt-6 text-sm text-muted-foreground text-center">
        Built by{" "}
        <a
          href="https://www.linkedin.com/in/keirucabili/"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Keiru Cabili
        </a>
        . The source code is available at{" "}
        <a
          href="https://github.com/kwiruu/taki-cli"
          target="_blank"
          rel="noreferrer"
          className="font-medium text-foreground underline underline-offset-4"
        >
          GitHub
        </a>
        .
      </footer>
    </div>
  );
}

export function DocsIndexPage() {
  return (
    <DocsArticle>
      <QuickStartDoc />
    </DocsArticle>
  );
}

export function InstallPage() {
  return (
    <DocsArticle>
      <InstallDoc />
    </DocsArticle>
  );
}

export function QuickStartPage() {
  return (
    <DocsArticle>
      <QuickStartDoc />
    </DocsArticle>
  );
}

export function CommandsPage() {
  return (
    <DocsArticle>
      <CommandsDoc />
    </DocsArticle>
  );
}

export function DashboardPage() {
  return (
    <DocsArticle>
      <DashboardDoc />
    </DocsArticle>
  );
}

export function ThemesPage() {
  return (
    <DocsArticle>
      <ThemesDoc />
    </DocsArticle>
  );
}

export function ConfigPage() {
  return (
    <DocsArticle>
      <ConfigDoc />
    </DocsArticle>
  );
}

export function TroubleshootingPage() {
  return (
    <DocsArticle>
      <TroubleshootingDoc />
    </DocsArticle>
  );
}

export function ReleasesPage() {
  return (
    <div className="space-y-6">
      <DataCards />

      <Card>
        <CardHeader>
          <CardTitle>Latest Release</CardTitle>
          <CardDescription>
            {cliData.release.tagName ?? "No tagged release detected yet."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>
            Published:{" "}
            {cliData.release.publishedAt
              ? formatTimestamp(cliData.release.publishedAt)
              : "n/a"}
          </p>
          <p>
            Notes:{" "}
            {cliData.release.notes ??
              "Release notes not available in snapshot."}
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              className={buttonVariants({ variant: "secondary" })}
              href={cliData.links.releasesUrl}
              target="_blank"
              rel="noreferrer"
            >
              View CLI releases
            </a>
            <a
              className={buttonVariants({ variant: "outline" })}
              href={cliData.links.issuesUrl}
              target="_blank"
              rel="noreferrer"
            >
              Report a bug
            </a>
            <a
              className={buttonVariants({ variant: "outline" })}
              href={cliData.links.featureRequestUrl}
              target="_blank"
              rel="noreferrer"
            >
              Feature request
            </a>
          </div>
          <p className="text-xs">
            Snapshot updated: {formatTimestamp(cliData.generatedAt)} (
            {dataFreshnessLabel()})
          </p>
        </CardContent>
      </Card>

      <ArticleShell>
        <ReleasesDoc />
      </ArticleShell>
    </div>
  );
}
