import { useEffect, useState, type ReactNode } from "react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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
import { GitCommitHorizontal, Menu, Moon, Sun, Tag, X } from "lucide-react";

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

type ReleaseEntry = {
  tagName: string | null;
  name: string | null;
  publishedAt: string | null;
  url: string | null;
  notes: string | null;
  isPrerelease: boolean;
  actorLogin: string | null;
  actorAvatarUrl: string | null;
  commitSha: string | null;
};

const SITE_URL = "https://taki-web.pages.dev";

type SeoMeta = {
  title: string;
  description: string;
};

const DEFAULT_SEO: SeoMeta = {
  title: "Taki Docs | Run and monitor local services in one terminal UI",
  description:
    "Documentation for @kwiruu/taki-cli with install steps, command usage, dashboard controls, themes, troubleshooting, and release notes.",
};

function getSeoMeta(pathname: string): SeoMeta {
  if (pathname === "/") {
    return DEFAULT_SEO;
  }

  if (pathname === "/docs" || pathname === "/docs/quick-start") {
    return {
      title: "Quick Start | Taki Docs",
      description:
        "Get started with @kwiruu/taki-cli quickly: setup, initialize config, and launch your terminal dashboard.",
    };
  }

  if (pathname === "/docs/install") {
    return {
      title: "Install | Taki Docs",
      description:
        "Install @kwiruu/taki-cli globally or run it locally for development workflows.",
    };
  }

  if (pathname === "/docs/commands") {
    return {
      title: "Commands | Taki Docs",
      description:
        "Reference for Taki CLI commands, flags, and usage examples for run, init, add, and config.",
    };
  }

  if (pathname === "/docs/dashboard") {
    return {
      title: "Dashboard | Taki Docs",
      description:
        "Learn dashboard controls, pane layouts, shortcuts, and service management behavior in Taki CLI.",
    };
  }

  if (pathname === "/docs/themes") {
    return {
      title: "Themes | Taki Docs",
      description:
        "Explore built-in Taki CLI themes and customize terminal appearance for your workflow.",
    };
  }

  if (pathname === "/docs/config") {
    return {
      title: "Config | Taki Docs",
      description:
        "Understand the taki.json schema, service options, and health-check configuration.",
    };
  }

  if (pathname === "/docs/troubleshooting") {
    return {
      title: "Troubleshooting | Taki Docs",
      description:
        "Fix common Taki CLI issues with diagnostics, config checks, and platform-specific guidance.",
    };
  }

  if (pathname === "/releases") {
    return {
      title: "Releases and Changelog | Taki Docs",
      description:
        "Track Taki CLI releases, changelog notes, commit history, and package publication status.",
    };
  }

  return DEFAULT_SEO;
}

function setMetaTag(key: string, content: string, attribute: "name" | "property") {
  let tag = document.head.querySelector(
    `meta[${attribute}="${key}"]`,
  ) as HTMLMetaElement | null;

  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

function setCanonical(url: string) {
  let link = document.head.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }

  link.setAttribute("href", url);
}

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

function formatRelativeTime(value: string | null): string {
  if (!value) {
    return "unknown time";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (absSeconds < 60) {
    return formatter.format(diffSeconds, "second");
  }

  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, "minute");
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, "hour");
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
}

function formatCommitRef(commitSha: string | null): string {
  if (!commitSha) {
    return "n/a";
  }

  if (/^[0-9a-f]{7,40}$/i.test(commitSha)) {
    return commitSha.slice(0, 7);
  }

  return commitSha;
}

function toCommitUrl(commitSha: string | null): string | null {
  if (!commitSha || !/^[0-9a-f]{7,40}$/i.test(commitSha)) {
    return null;
  }

  return `https://github.com/${cliData.source.repository}/commit/${commitSha}`;
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
      <aside className="h-fit p-1 lg:sticky lg:top-24">
        <p className="px-2 pb-2 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Docs Index
        </p>
        <nav className="flex flex-col space-y-1">
          {docsNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(docsNavLinkClass, "h-9 w-full justify-start px-3")}
              activeProps={{
                className: cn(
                  docsNavLinkClass,
                  "w-full justify-start bg-muted text-foreground",
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
                  title={item.text}
                  className={cn(
                    "block h-8 w-full max-w-full truncate rounded-md bg-transparent px-2 text-sm leading-8 text-muted-foreground no-underline transition-colors hover:bg-transparent hover:text-foreground focus-visible:bg-transparent focus-visible:text-foreground",
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
  const location = useLocation();

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const storedTheme = window.localStorage.getItem("taki-docs-theme");
    return storedTheme === "dark" ? "dark" : "light";
  });
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("taki-docs-theme", theme);
  }, [theme]);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const pathname = location.pathname;
    const { title, description } = getSeoMeta(pathname);
    const pathSuffix = pathname === "/" ? "" : pathname;
    const pageUrl = `${SITE_URL}${pathSuffix}`;

    document.title = title;
    setCanonical(pageUrl);

    setMetaTag("description", description, "name");
    setMetaTag("robots", "index,follow", "name");
    setMetaTag("application-name", "Taki Docs", "name");

    setMetaTag("og:type", "website", "property");
    setMetaTag("og:title", title, "property");
    setMetaTag("og:description", description, "property");
    setMetaTag("og:url", pageUrl, "property");
    setMetaTag("og:site_name", "Taki Docs", "property");
    setMetaTag("og:image", `${SITE_URL}/logo.svg`, "property");

    setMetaTag("twitter:card", "summary_large_image", "name");
    setMetaTag("twitter:title", title, "name");
    setMetaTag("twitter:description", description, "name");
    setMetaTag("twitter:image", `${SITE_URL}/logo.svg`, "name");
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,oklch(0.96_0.03_180)_0,transparent_40%),radial-gradient(circle_at_80%_0%,oklch(0.92_0.04_50)_0,transparent_35%),oklch(0.99_0_0)]">
      <header className="bg-background/80 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-3">
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

            <div className="hidden items-center gap-2 md:flex">
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

              <div>
                <a
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-10 text-muted-foreground gap-2",
                  )}
                  href="https://www.npmjs.com/package/@kwiruu/taki-cli"
                  target="_blank"
                  rel="noreferrer"
                >
                  <svg
                    viewBox="0 0 512 512"
                    xmlns="http://www.w3.org/2000/svg"
                    fill-rule="evenodd"
                    clip-rule="evenodd"
                    stroke-linejoin="round"
                    stroke-miterlimit="2"
                  >
                    <g fill-rule="nonzero">
                      <path
                        d="M10.999 500.999v-490h490v490h-490z"
                        fill="#c12127"
                      />
                      <path
                        d="M102.874 102.874h306.25v306.25h-61.25v-245h-91.875v245H102.874v-306.25z"
                        fill="#fff"
                      />
                    </g>
                  </svg>
                </a>
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

            <div className="flex items-center gap-1 sm:gap-2 md:hidden">
              <a
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-9 text-muted-foreground sm:h-10",
                )}
                href="https://www.npmjs.com/package/@kwiruu/taki-cli"
                target="_blank"
                rel="noreferrer"
                aria-label="Open taki-cli on npm"
              >
                <svg
                  viewBox="0 0 512 512"
                  xmlns="http://www.w3.org/2000/svg"
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  stroke-linejoin="round"
                  stroke-miterlimit="2"
                  className="h-5 w-5"
                  aria-hidden="true"
                >
                  <g fill-rule="nonzero">
                    <path
                      d="M10.999 500.999v-490h490v490h-490z"
                      fill="#c12127"
                    />
                    <path
                      d="M102.874 102.874h306.25v306.25h-61.25v-245h-91.875v245H102.874v-306.25z"
                      fill="#fff"
                    />
                  </g>
                </svg>
              </a>
              <a
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "h-9 text-muted-foreground sm:h-10",
                )}
                href="https://github.com/kwiruu/taki-cli"
                target="_blank"
                rel="noreferrer"
                aria-label="Open taki-cli on GitHub"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="h-5 w-5 text-black dark:text-white"
                  aria-hidden="true"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
                </svg>
              </a>

              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "h-9 sm:h-10",
                )}
                onClick={() =>
                  setTheme((current) => (current === "light" ? "dark" : "light"))
                }
                aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
              >
                {theme === "light" ? <Moon /> : <Sun />}
              </button>

              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "lg" }),
                  "h-9",
                )}
                onClick={() => setIsMobileNavOpen((open) => !open)}
                aria-label={
                  isMobileNavOpen ? "Close navigation menu" : "Open navigation menu"
                }
                aria-expanded={isMobileNavOpen}
                aria-controls="mobile-nav-menu"
              >
                {isMobileNavOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>

          {isMobileNavOpen ? (
            <div id="mobile-nav-menu" className="mt-3 md:hidden">
              <nav className="grid gap-1 rounded-xl border border-border/70 bg-card/70 p-2">
                <Link
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-10 justify-start",
                  )}
                  to="/"
                >
                  Home
                </Link>
                <Link
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-10 justify-start",
                  )}
                  to="/docs"
                >
                  Docs
                </Link>
                <Link
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-10 justify-start",
                  )}
                  to="/docs/install"
                >
                  Install
                </Link>
                <Link
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "sm" }),
                    "h-10 justify-start",
                  )}
                  to="/releases"
                >
                  Releases
                </Link>
              </nav>
            </div>
          ) : null}
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
        <h2 className="max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
          Run and monitor local multi-service workflows from one terminal UI.
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          Taki gives you one command to launch, inspect, and control multiple
          local services with focused panes, themes, shortcuts, and health
          checks.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <code className="w-full overflow-x-auto rounded-md border bg-card px-3 py-2 text-sm sm:w-auto">
            npm install -g @kwiruu/taki-cli
          </code>
          <Link className={buttonVariants({ size: "lg" })} to="/docs/install">
            Quick start
          </Link>
          <a
            className="w-6 h-6"
            href="https://www.npmjs.com/package/@kwiruu/taki-cli"
            target="_blank"
            rel="noreferrer"
          >
            <svg
              viewBox="0 0 512 512"
              xmlns="http://www.w3.org/2000/svg"
              fill-rule="evenodd"
              clip-rule="evenodd"
              stroke-linejoin="round"
              stroke-miterlimit="2"
            >
              <g fill-rule="nonzero">
                <path d="M10.999 500.999v-490h490v490h-490z" fill="#c12127" />
                <path
                  d="M102.874 102.874h306.25v306.25h-61.25v-245h-91.875v245H102.874v-306.25z"
                  fill="#fff"
                />
              </g>
            </svg>
          </a>
          <a
            className="w-6 h-8 flex items-center justify-center"
            href="https://github.com/kwiruu/taki-cli"
            target="_blank"
            rel="noreferrer"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              className="bi bi-github h-6 w-6 text-black dark:text-white"
              aria-hidden="true"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8" />
            </svg>
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          Snapshot updated: {formatTimestamp(cliData.generatedAt)} (
          {dataFreshnessLabel()})
        </p>
      </section>

      <section className="space-y-3">
        <div className="bg-vid pointer-events-none relative aspect-[16/10] overflow-hidden rounded-2xl bg-[url('/bg-vid.svg')] bg-cover bg-center shadow-sm sm:aspect-[16/8] lg:aspect-[16/7]">
          <video
            className="mx-auto mt-4 h-full w-full max-w-4xl rounded-2xl object-cover object-top sm:mt-8"
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
  const releaseEntries: ReleaseEntry[] = (
    Array.isArray(cliData.releases) ? cliData.releases : []
  ).slice(0, 20) as ReleaseEntry[];
  const [visibleReleaseCount, setVisibleReleaseCount] = useState(
    Math.min(5, releaseEntries.length),
  );

  useEffect(() => {
    setVisibleReleaseCount(Math.min(5, releaseEntries.length));
  }, [releaseEntries.length]);

  const visibleReleases = releaseEntries.slice(0, visibleReleaseCount);
  const remainingReleases = releaseEntries.length - visibleReleaseCount;
  const changelogUrl = `https://github.com/${cliData.source.repository}/blob/main/CHANGELOG.md`;

  return (
    <div className="space-y-6">
      <DataCards />

      <section className="space-y-4">
        <div className="my-10 space-y-2 sm:my-16">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary">taki-cli releases</Badge>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Releases and Changelog
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            Full release notes rendered from GitHub, including What&apos;s
            Changed, linked pull requests, and full changelog comparisons.
          </p>
        </div>

        <div className="space-y-5 text-sm text-muted-foreground">
          {visibleReleases.length > 0 ? (
            <div className="space-y-4">
              {visibleReleases.map((release, index) => (
                <div
                  key={release.tagName ?? release.url ?? `release-${index}`}
                  className="grid md:grid-cols-[220px_minmax(0,1fr)] md:items-start"
                >
                  <aside className="space-y-3 px-1 py-6">
                    <p className="text-sm font-medium text-foreground">
                      {formatRelativeTime(release.publishedAt)}
                    </p>

                    <div className="flex items-center gap-2">
                      {release.actorAvatarUrl ? (
                        <img
                          src={release.actorAvatarUrl}
                          alt={`${release.actorLogin ?? "release author"} avatar`}
                          className="h-7 w-7 rounded-full border border-border/60 object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="h-7 w-7 rounded-full border border-border/60 bg-muted" />
                      )}
                      <span className="text-sm text-foreground">
                        {release.actorLogin ?? "unknown"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Tag className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="font-medium text-foreground">
                        {release.tagName ?? "n/a"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <GitCommitHorizontal
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                      {toCommitUrl(release.commitSha) ? (
                        <a
                          href={toCommitUrl(release.commitSha) ?? undefined}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-foreground underline underline-offset-4"
                        >
                          {formatCommitRef(release.commitSha)}
                        </a>
                      ) : (
                        <span className="font-medium text-foreground">
                          {formatCommitRef(release.commitSha)}
                        </span>
                      )}
                    </div>
                  </aside>

                  <div className="rounded-xl border border-border/70 bg-background/65 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-xl font-semibold tracking-tight text-foreground">
                          {release.tagName ?? "Unversioned release"}
                        </h3>
                        {release.name && release.name !== release.tagName ? (
                          <p className="text-sm text-muted-foreground">
                            {release.name}
                          </p>
                        ) : null}
                      </div>
                      <div>
                        {release.isPrerelease ? (
                          <Badge variant="secondary">Pre-release</Badge>
                        ) : (
                          <Badge variant="outline">Stable</Badge>
                        )}
                      </div>
                    </div>

                    <p className="mt-2 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Published{" "}
                      {release.publishedAt
                        ? formatTimestamp(release.publishedAt)
                        : "n/a"}
                    </p>
                    <div className="mt-4 text-[0.95rem] leading-7 text-foreground [&_h1]:mt-5 [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mt-4 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:tracking-tight [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:tracking-tight [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border/70 [&_pre]:bg-muted/50 [&_pre]:p-3 [&_pre]:text-sm [&_pre_code]:bg-transparent [&_pre_code]:p-0">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: (props) => (
                            <a
                              {...props}
                              target="_blank"
                              rel="noreferrer"
                              className="font-medium underline underline-offset-4"
                            />
                          ),
                        }}
                      >
                        {release.notes ?? "Release notes not available."}
                      </ReactMarkdown>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <a
                        className={buttonVariants({ variant: "secondary" })}
                        href={release.url ?? cliData.links.releasesUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View release
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No release entries are available in the current snapshot.</p>
          )}

          {remainingReleases > 0 ? (
            <button
              type="button"
              className={buttonVariants({ variant: "outline" })}
              onClick={() => {
                setVisibleReleaseCount((count) =>
                  Math.min(count + 5, releaseEntries.length),
                );
              }}
            >
              Show more releases ({remainingReleases} more)
            </button>
          ) : null}

          <div className="flex flex-wrap gap-2 mt-16">
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
              href={changelogUrl}
              target="_blank"
              rel="noreferrer"
            >
              View CHANGELOG.md
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
        </div>
      </section>

      <ArticleShell>
        <ReleasesDoc />
      </ArticleShell>
    </div>
  );
}
