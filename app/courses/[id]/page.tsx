import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { AppHeader } from "@/components/app-header"
import { CourseReviewsSection } from "@/components/course-reviews-section"
import { RequirementBadge } from "@/components/course-badges"
import { getCourseById, mockCourses } from "@/lib/mock-data"

export function generateStaticParams() {
  return mockCourses.map((c) => ({ id: c.id }))
}

// 데이터 소스 메모(Sprint 1/F1):
// lib/mock-data.ts의 데모 5과목만 브라우징 UI에서 실제로 도달 가능하고, 실제 2,695개
// 강좌 카탈로그(lib/curriculum-data.ts)는 아직 F2/F3 검수 전이라 이 페이지에서 쓰지 않는다.
// 그래서 과목 자체의 정적 메타데이터(이름/학과/교수/학점)는 계속 mock-data.ts에서 읽되,
// 리뷰/평점/AI 요약처럼 실제로 쌓이는 데이터는 Neon(courses/reviews/summaries 테이블,
// lib/db/seed.ts로 mock-data의 5과목을 동일 id로 시드해둠)에서 읽는다. Sprint 2에서 과목
// 카탈로그가 통합되면 course.rating/reviewCount 같은 mock-data의 정적 필드는 폐기 대상이다.
export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const course = getCourseById(id)

  if (!course) {
    notFound()
  }

  return (
    <div className="min-h-svh">
      <AppHeader />

      <main className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          홈으로
        </Link>

        {/* 과목 정보 */}
        <div className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
              {course.name}
            </h1>
            <RequirementBadge requirement={course.requirement} />
          </div>
          <p className="mt-2 text-muted-foreground">
            {course.department} · {course.professor} · {course.credits}학점
          </p>
        </div>

        {/* 실제 평점/AI 요약/해시태그 빈도/개별 수강평 — 전부 Neon(reviews/summaries)에서 조회 */}
        <CourseReviewsSection courseId={course.id} />
      </main>
    </div>
  )
}
