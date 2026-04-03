import {
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import {
  CommandsPage,
  ConfigPage,
  DashboardPage,
  DocsIndexPage,
  HomePage,
  InstallPage,
  QuickStartPage,
  ReleasesPage,
  RootLayout,
  ThemesPage,
  TroubleshootingPage,
} from "@/routes/site-pages";

const rootRoute = createRootRoute({
  component: RootLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const docsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs",
  component: DocsIndexPage,
});

const installRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs/install",
  component: InstallPage,
});

const quickStartRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs/quick-start",
  component: QuickStartPage,
});

const commandsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs/commands",
  component: CommandsPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs/dashboard",
  component: DashboardPage,
});

const themesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs/themes",
  component: ThemesPage,
});

const configRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs/config",
  component: ConfigPage,
});

const troubleshootingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/docs/troubleshooting",
  component: TroubleshootingPage,
});

const releasesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/releases",
  component: ReleasesPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  docsRoute,
  installRoute,
  quickStartRoute,
  commandsRoute,
  dashboardRoute,
  themesRoute,
  configRoute,
  troubleshootingRoute,
  releasesRoute,
]);

export const router = createRouter({
  routeTree,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
