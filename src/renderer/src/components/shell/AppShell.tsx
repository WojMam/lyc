import { Home, Download, Library, Settings, Youtube } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/i18n'
import { useAppStore } from '@/stores/appStore'

const navItems = [
  { id: 'home' as const, icon: Home },
  { id: 'downloads' as const, icon: Download },
  { id: 'library' as const, icon: Library },
  { id: 'settings' as const, icon: Settings }
]

export function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { t } = useI18n()
  const page = useAppStore((s) => s.page)
  const setPage = useAppStore((s) => s.setPage)
  const jobs = useAppStore((s) => s.jobs)
  const activeCount = jobs.filter((j) =>
    ['queued', 'analyzing', 'downloading', 'processing'].includes(j.state)
  ).length

  const labels = {
    home: t.nav.home,
    downloads: t.nav.downloads,
    library: t.nav.library,
    settings: t.nav.settings
  }

  return (
    <div className="flex h-full">
      <aside className="flex w-[220px] shrink-0 flex-col border-r border-border/80 bg-card/40 backdrop-blur-md">
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Youtube className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-tight">LYC</div>
            <div className="text-[11px] text-muted-foreground">Companion</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = page === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setPage(item.id)}
                className={cn(
                  'relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-primary/15 text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/80 hover:text-foreground'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-lg bg-primary/10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon className="relative z-10 h-4 w-4" />
                <span className="relative z-10 font-medium">{labels[item.id]}</span>
                {item.id === 'downloads' && activeCount > 0 && (
                  <span className="relative z-10 ml-auto rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                    {activeCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
        <div className="px-5 py-4 text-[11px] text-muted-foreground">v1.0.0 · local-first</div>
      </aside>
      <main className="min-w-0 flex-1 overflow-hidden">{children}</main>
    </div>
  )
}
