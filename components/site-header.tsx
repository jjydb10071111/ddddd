"use client"

import type React from "react"

import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import {
  CalendarDays,
  Compass,
  LogIn,
  LogOut,
  MessageSquareText,
  Search,
  ShoppingCart,
  Sparkles,
  User as UserIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useAuth } from "@/components/auth-provider"

const navLinks = [
  { href: "/fields", label: "분야로 찾기", icon: Compass },
  { href: "/curriculum", label: "AI 커리큘럼", icon: Sparkles },
]

// 로그인 후에만 보이는 개인화 메뉴.
const authedNavLinks = [
  { href: "/", label: "강의평 보기", icon: MessageSquareText },
  { href: "/timetable", label: "나의 시간표", icon: CalendarDays },
  { href: "/cart", label: "장바구니", icon: ShoppingCart },
]

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { user, isLoading, logout } = useAuth()
  const [query, setQuery] = useState("")

  // 검색 결과 화면에서는 현재 검색어를 검색창에 반영
  useEffect(() => {
    if (pathname === "/search") {
      setQuery(searchParams.get("q") ?? "")
    }
  }, [pathname, searchParams])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    if (!trimmed) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  async function handleLogout() {
    await logout()
    router.push("/")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg font-bold tracking-tight text-foreground">
            수강길잡이
          </span>
        </Link>

        <form
          onSubmit={handleSubmit}
          className="order-last w-full flex-1 md:order-none md:w-auto md:max-w-md"
          role="search"
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="과목명 또는 관심 분야를 검색해보세요"
              aria-label="과목 검색"
              className="h-10 w-full rounded-full border border-input bg-secondary/60 pl-9 pr-4 text-sm text-foreground outline-none transition focus:border-ring focus:bg-card focus:ring-2 focus:ring-ring/25"
            />
          </div>
        </form>

        <nav className="ml-auto flex items-center gap-1.5 md:ml-0">
          {[...navLinks, ...(!isLoading && user ? authedNavLinks : [])].map((link) => {
            const active = pathname === link.href
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">{link.label}</span>
              </Link>
            )
          })}

          {!isLoading && (
            user ? (
              <div className="flex items-center gap-2 pl-2">
                <div className="flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground">
                  <UserIcon className="size-3.5 text-primary" />
                  <span>{user.name}</span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="로그아웃"
                  className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="size-3.5" />
                  <span className="hidden sm:inline">로그아웃</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="ml-1 flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <LogIn className="size-4" />
                <span>로그인</span>
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  )
}
