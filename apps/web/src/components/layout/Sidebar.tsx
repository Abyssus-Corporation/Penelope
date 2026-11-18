import { Link, useLocation } from "react-router-dom";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  FolderGit2,
  Rocket,
  HardDrive,
  Layers,
  Users,
  Settings,
  BarChart2,
  ChevronsUpDown,
  LogOut,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";

// ─── Nav config ───────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    key: "general" as const,
    items: [
      { key: "projects" as const, href: "/dashboard", Icon: FolderGit2 },
      { key: "deployments" as const, href: "/deployments", Icon: Rocket },
      { key: "volumes" as const, href: "/volumes", Icon: HardDrive },
      { key: "templates" as const, href: "/templates", Icon: Layers },
    ],
  },
  {
    key: "admin" as const,
    items: [
      { key: "team" as const, href: "/team", Icon: Users },
      { key: "usage" as const, href: "/usage", Icon: BarChart2 },
      { key: "settings" as const, href: "/settings", Icon: Settings },
    ],
  },
];

// ─── Tooltip wrapper ──────────────────────────────────────────────────────────

function NavTooltip({
  label,
  children,
  enabled,
}: {
  label: string;
  children: React.ReactNode;
  enabled: boolean;
}) {
  if (!enabled) return <>{children}</>;
  return (
    <Tooltip.Root delayDuration={300}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="right"
          sideOffset={8}
          className="z-50 animate-fade-in rounded bg-foreground px-2 py-1 text-[12px] text-background shadow"
        >
          {label}
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  navKey,
  href,
  Icon,
  collapsed,
  label,
  pathname,
}: {
  navKey: string;
  href: string;
  Icon: React.ElementType;
  collapsed: boolean;
  label: string;
  pathname: string;
}) {
  const active = pathname === href || (navKey === "projects" && pathname.startsWith("/projects"));

  return (
    <NavTooltip label={label} enabled={collapsed}>
      <Link
        to={href}
        className={cn(
          "flex h-[34px] items-center rounded transition-colors",
          collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
          active
            ? "bg-accent font-medium text-foreground"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        <Icon
          size={15}
          strokeWidth={active ? 2 : 1.5}
          className={active ? "text-foreground" : "text-muted-foreground"}
        />
        {!collapsed && <span className="text-[13px]">{label}</span>}
      </Link>
    </NavTooltip>
  );
}

// ─── Workspace switcher ───────────────────────────────────────────────────────

function WorkspaceSwitcher({ collapsed }: { collapsed: boolean }) {
  const t = useI18n();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "flex w-full items-center rounded px-2 py-1.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            collapsed ? "justify-center gap-0" : "gap-2.5",
          )}
        >
          <span className="flex size-6 shrink-0 select-none items-center justify-center rounded bg-foreground text-[11px] font-bold text-background">
            P
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left text-[13px] font-medium text-foreground">
                {t.brand.name}
              </span>
              <ChevronsUpDown size={13} className="shrink-0 text-muted-foreground" />
            </>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="bottom"
          align="start"
          sideOffset={4}
          className="z-50 w-[200px] animate-fade-in rounded-md border border-border bg-card px-1 py-1 shadow-lg"
        >
          <DropdownMenu.Label className="px-2.5 py-1 text-[11px] text-muted-foreground/60">
            {t.dashboard.sidebar.workspace}
          </DropdownMenu.Label>
          <DropdownMenu.Item className="flex h-8 cursor-pointer items-center gap-2 rounded px-2.5 text-[13px] text-foreground outline-none data-[highlighted]:bg-accent">
            <span className="flex size-5 shrink-0 items-center justify-center rounded bg-foreground text-[10px] font-bold text-background">
              P
            </span>
            {t.brand.name}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const t = useI18n();
  const { pathname } = useLocation();
  const nav = t.dashboard.nav;

  return (
    <Tooltip.Provider>
      <aside
        className={cn(
          "flex h-full shrink-0 flex-col border-r border-border transition-all duration-200",
          collapsed ? "w-[60px]" : "w-[256px]",
        )}
      >
        {/* Workspace */}
        <div className="flex h-14 shrink-0 items-center border-b border-border px-3">
          <WorkspaceSwitcher collapsed={collapsed} />
        </div>

        {/* Search */}
        {!collapsed && (
          <div className="border-b border-border px-3 py-2">
            <div className="relative flex items-center">
              <Search
                size={12}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-2.5 text-muted-foreground/40"
              />
              <input
                type="text"
                placeholder={t.dashboard.sidebar.searchPlaceholder}
                className="h-[28px] w-full rounded border border-border bg-transparent pl-7 pr-3 text-[12px] text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-foreground/30 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.key} className={cn("flex flex-col gap-0.5", gi > 0 && "mt-5")}>
              {!collapsed && (
                <span className="mb-1 px-2.5 text-[11px] text-muted-foreground/50">
                  {nav.groups[group.key]}
                </span>
              )}
              {group.items.map(({ key, href, Icon }) => (
                <NavItem
                  key={key}
                  navKey={key}
                  href={href}
                  Icon={Icon}
                  collapsed={collapsed}
                  label={nav[key]}
                  pathname={pathname}
                />
              ))}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="flex flex-col gap-0.5 border-t border-border px-2 py-2">
          <DropdownMenu.Root>
            <NavTooltip label={t.auth.login.emailPlaceholder} enabled={collapsed}>
              <DropdownMenu.Trigger asChild>
                <button
                  className={cn(
                    "flex h-[34px] w-full items-center rounded transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
                  )}
                >
                  <span className="flex size-6 shrink-0 select-none items-center justify-center rounded-full bg-muted text-[11px] font-semibold uppercase text-foreground">
                    {t.auth.login.emailPlaceholder[0]}
                  </span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate text-left text-[12px] text-muted-foreground">
                        {t.auth.login.emailPlaceholder}
                      </span>
                      <ChevronsUpDown size={12} className="shrink-0 text-muted-foreground/50" />
                    </>
                  )}
                </button>
              </DropdownMenu.Trigger>
            </NavTooltip>

            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side="top"
                align="start"
                sideOffset={4}
                className="z-50 w-[180px] animate-fade-in rounded-md border border-border bg-card px-1 py-1 shadow-lg"
              >
                <DropdownMenu.Item
                  className="flex h-8 cursor-pointer items-center gap-2 rounded px-2.5 text-[13px] text-muted-foreground outline-none transition-colors data-[highlighted]:bg-accent data-[highlighted]:text-foreground"
                  onSelect={() => {}}
                >
                  <LogOut size={13} />
                  {nav.signOut}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </aside>
    </Tooltip.Provider>
  );
}
