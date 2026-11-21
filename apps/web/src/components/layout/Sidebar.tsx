import { useState } from "react";
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
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useTheme, type Theme } from "@/hooks/useTheme";

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
          aria-hidden="true"
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
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <button
          // Collapsed, only the "P" mark is visible, so name the button after the workspace.
          aria-label={collapsed ? t.brand.name : undefined}
          className={cn(
            "flex w-full items-center rounded px-2 py-1.5 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            collapsed ? "justify-center gap-0" : "gap-2.5",
          )}
        >
          <span
            aria-hidden="true"
            className="flex size-6 shrink-0 select-none items-center justify-center rounded bg-foreground text-[11px] font-bold text-background"
          >
            P
          </span>
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left text-[13px] font-medium text-foreground">
                {t.brand.name}
              </span>
              <ChevronsUpDown
                size={13}
                aria-hidden="true"
                className="shrink-0 text-muted-foreground"
              />
            </>
          )}
        </button>
      </DropdownMenu.Trigger>

      {/* Not portalled, so the open menu stays inside the sidebar landmark. */}
      <DropdownMenu.Content
        side="bottom"
        align="start"
        sideOffset={4}
        className="z-50 w-[200px] animate-fade-in rounded-md border border-border bg-card px-1 py-1 shadow-lg"
      >
        <DropdownMenu.Label className="px-2.5 py-1 text-[11px] text-muted-foreground">
          {t.dashboard.sidebar.workspace}
        </DropdownMenu.Label>
        <DropdownMenu.Item className="flex h-8 cursor-pointer items-center gap-2 rounded px-2.5 text-[13px] text-foreground outline-none data-[highlighted]:bg-accent">
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-foreground text-[10px] font-bold text-background">
            P
          </span>
          {t.brand.name}
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}

// ─── User menu ────────────────────────────────────────────────────────────────

const MOCK_USER = { name: "Ada Lovelace", email: "ada@acme.com" };

const MENU_ITEM =
  "flex h-8 cursor-pointer items-center gap-2 rounded px-2.5 text-[13px] text-foreground outline-none transition-colors data-[highlighted]:bg-accent";

const THEME_OPTIONS = [
  { value: "light" as Theme, Icon: Sun, labelKey: "themeLight" as const },
  { value: "dark" as Theme, Icon: Moon, labelKey: "themeDark" as const },
  { value: "system" as Theme, Icon: Monitor, labelKey: "themeSystem" as const },
];

function UserMenu({ collapsed }: { collapsed: boolean }) {
  const t = useI18n();
  const nav = t.dashboard.nav;
  const { theme, setTheme } = useTheme();
  // Controlled so Escape on an open theme tooltip closes the whole menu, not just the tooltip.
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = MOCK_USER.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="border-t border-border px-2 py-2">
      <DropdownMenu.Root modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
        <NavTooltip label={MOCK_USER.name} enabled={collapsed}>
          <DropdownMenu.Trigger asChild>
            <button
              aria-label={collapsed ? MOCK_USER.name : undefined}
              className={cn(
                "flex h-[34px] w-full items-center rounded transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                collapsed ? "justify-center px-0" : "gap-2.5 px-2.5",
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-6 shrink-0 select-none items-center justify-center rounded-full bg-muted text-[11px] font-semibold uppercase text-foreground"
              >
                {initials}
              </span>
              {!collapsed && (
                <>
                  <span className="flex-1 truncate text-left text-[12px] text-muted-foreground">
                    {MOCK_USER.name}
                  </span>
                  <ChevronsUpDown
                    size={12}
                    aria-hidden="true"
                    className="shrink-0 text-muted-foreground"
                  />
                </>
              )}
            </button>
          </DropdownMenu.Trigger>
        </NavTooltip>

        {/* Not portalled, so the open menu stays inside the sidebar landmark. */}
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={6}
          className="z-50 w-[220px] animate-fade-in rounded-md border border-border bg-card shadow-lg"
        >
          {/* User info: a label, not an item, so the menu only holds menu items */}
          <DropdownMenu.Label className="min-w-0 px-3 py-2.5">
            <p className="truncate text-[13px] font-medium text-foreground">{MOCK_USER.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{MOCK_USER.email}</p>
          </DropdownMenu.Label>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <div className="px-1 py-1">
            <DropdownMenu.Item asChild className={MENU_ITEM}>
              <Link to="/settings">
                <Settings size={13} aria-hidden="true" className="text-muted-foreground" />
                {nav.account}
              </Link>
            </DropdownMenu.Item>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          {/* Theme: radio items, so arrow keys reach every option */}
          <div className="flex items-center justify-between px-3 py-2">
            <DropdownMenu.Label className="text-[12px] text-muted-foreground">
              {nav.theme}
            </DropdownMenu.Label>
            <DropdownMenu.RadioGroup
              value={theme}
              onValueChange={(v) => setTheme(v as Theme)}
              className="flex items-center rounded border border-border p-0.5"
            >
              {THEME_OPTIONS.map(({ value, Icon, labelKey }) => (
                <Tooltip.Root key={value} delayDuration={300}>
                  <Tooltip.Trigger asChild>
                    <DropdownMenu.RadioItem
                      value={value}
                      aria-label={nav[labelKey]}
                      // Keep the menu open so the new theme can be seen and changed again.
                      onSelect={(e) => e.preventDefault()}
                      className={cn(
                        "flex size-6 cursor-pointer items-center justify-center rounded outline-none transition-colors data-[highlighted]:ring-1 data-[highlighted]:ring-ring",
                        theme === value
                          ? "bg-foreground text-background"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon size={12} aria-hidden="true" />
                    </DropdownMenu.RadioItem>
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      sideOffset={6}
                      onEscapeKeyDown={() => setMenuOpen(false)}
                      className="z-[60] animate-fade-in rounded bg-foreground px-2 py-1 text-[11px] text-background shadow"
                    >
                      {nav[labelKey]}
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              ))}
            </DropdownMenu.RadioGroup>
          </div>

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          {/* Sign out */}
          <div className="px-1 py-1">
            <DropdownMenu.Item
              className="flex h-8 cursor-pointer items-center gap-2 rounded px-2.5 text-[13px] text-destructive outline-none transition-colors data-[highlighted]:bg-destructive/10 data-[highlighted]:text-destructive"
              onSelect={() => {}}
            >
              <LogOut size={13} aria-hidden="true" />
              {nav.signOut}
            </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function Sidebar({ collapsed, className }: { collapsed: boolean; className?: string }) {
  const t = useI18n();
  const { pathname } = useLocation();
  const nav = t.dashboard.nav;

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-border transition-all duration-200",
        collapsed ? "w-[60px]" : "w-[256px]",
        className,
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
              aria-hidden="true"
              className="pointer-events-none absolute left-2.5 text-muted-foreground"
            />
            <input
              type="search"
              placeholder={t.dashboard.sidebar.searchPlaceholder}
              aria-label={t.dashboard.sidebar.searchPlaceholder}
              className="h-[28px] w-full rounded border border-border bg-transparent pl-7 pr-3 text-[12px] text-foreground transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 coarse:text-base"
            />
          </div>
        </div>
      )}

      {/* Nav */}
      <nav aria-label="Main navigation" className="flex flex-1 flex-col overflow-y-auto px-2 py-3">
        {NAV_GROUPS.map((group, gi) => (
          <div
            key={group.key}
            role="group"
            aria-label={nav.groups[group.key]}
            className={cn("flex flex-col gap-0.5", gi > 0 && "mt-5")}
          >
            {!collapsed && (
              <span aria-hidden="true" className="mb-1 px-2.5 text-[11px] text-muted-foreground">
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
      <UserMenu collapsed={collapsed} />
    </aside>
  );
}
