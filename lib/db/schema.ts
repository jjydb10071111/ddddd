// PRD 9장 "데이터 요구사항 (핵심 엔티티)" 7개 엔티티의 Drizzle 스키마.
//
// 이 파일은 목표 스키마를 정의하는 것으로, 아직 어떤 UI/API도 이 테이블에서 직접 읽지 않는다.
// lib/mock-data.ts(데모 5과목)와 lib/curriculum-data.ts(실제 2,695개 강좌 정적 JSON)는
// Sprint 1~4에서 이 스키마 기반 쿼리로 점진적으로 교체될 예정 — 지금 당장 두 데이터 소스를
// 이 테이블로 옮기는 마이그레이션 스크립트는 범위 밖이다(Sprint 3/4에서 실제 태그 데이터가
// 갖춰진 뒤 진행).
//
// 이수구분(requirement)은 두 데이터셋의 값 집합이 다르다 — mock-data는 "교양"을 쓰고
// curriculum-data는 "계열공통"/"기초필수"를 쓴다. 실 데이터 이관 시 값이 섞일 수 있으므로
// DB 레벨에서는 text로 두고 애플리케이션에서 필요한 union으로 좁혀 쓴다.

import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from "drizzle-orm/pg-core";

// 사용자 (User) — 개인정보 최소 수집 원칙: 이름/비밀번호 외의 식별 정보는 두지 않는다.
// email/phoneNumber만 예외 — 회원가입(app/api/auth/register)에서 재학생 확인·연락 용도로 수집한다.
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  studentId: text("student_id").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  email: text("email").unique(), // 학교 메일 — 회원가입 시 필수, 그 이전에 만들어진 계정은 null 허용
  phoneNumber: text("phone_number").unique(), // 휴대폰 번호 — 회원가입 시 필수, 이전 계정은 null 허용
  // 개인정보 이용 동의 시각 — 회원가입 시 필수로 기록. null이면 동의 이력 없는(이 기능 이전) 계정.
  privacyConsentedAt: timestamp("privacy_consented_at", { withTimezone: true }),
  name: text("name").notNull(),
  department: text("department").notNull(),
  secondDepartment: text("second_department"), // 복수전공
  grade: integer("grade"),
  interests: jsonb("interests").$type<string[]>().notNull().default([]),
  completedCourseIds: jsonb("completed_course_ids").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 과목 (Course)
export const courses = pgTable("courses", {
  id: text("id").primaryKey(), // 학수번호(소문자) — lib/curriculum-data.ts의 CurriculumCourse.id와 동일 규칙
  code: text("code").notNull(),
  name: text("name").notNull(),
  department: text("department").notNull(),
  // real(부동소수점) — 실제 카탈로그(lib/data/courses.json)에 0.5학점 단위 과목이 존재해
  // (예: 세미나·실습 과목) integer로는 표현이 안 된다. mock-data.ts의 정수 학점도 문제없이 담긴다.
  credits: real("credits").notNull(),
  requirement: text("requirement").notNull(), // 전공필수/전공선택/계열공통/기초필수/교양
  syllabus: text("syllabus"),
  semester: text("semester"), // 개설학기, 예: "2026-2"
  // 나의 시간표용 — 원본 강좌(분반) 데이터의 요일/교시 문자열을 그대로 저장(예: "월 1-A,월 1-B").
  // 과목이 여러 분반으로 개설된 경우 이 값은 그 중 하나(첫 분반)의 시간표다 — 분반별로 시간이
  // 다를 수 있다는 한계가 있다(lib/db/backfill-course-schedule.ts 주석 참고). mock-data 5과목은
  // 원본에 시간표가 없어 항상 null.
  schedule: text("schedule"),
  room: text("room"),
  prerequisites: jsonb("prerequisites").$type<string[]>().notNull().default([]),
  // F3 임베딩 유사도 검색용 — 과목 설명/키워드를 벡터화. 값이 쌓이기 전까지는 null.
  embedding: vector("embedding", { dimensions: 1536 }),
  // Sprint 4(F4) 전용 — lib/curriculum-classify.ts의 학과명 키워드 휴리스틱 결과를 그대로
  // 옮겨온 값이다. 의도적으로 courseIndustryTags/courseFieldTags(F2/F3의 "AI 1차 분류 +
  // 담당자 검수" 조인 테이블)와는 분리했다 — 2,293개 실제 강좌를 검수 없이 그 테이블에
  // 넣으면 F2/F3 검수 대기열이 오염되고, reviewed=true 게이트 때문에 F4가 영영 이 값을
  // 못 쓰게 된다. 커리큘럼 엔진(app/api/curriculum/recommend)만 이 컬럼을 읽는다 — F2/F3
  // 검색 API는 여전히 courseIndustryTags/courseFieldTags(reviewed=true)만 본다.
  curriculumIndustry: text("curriculum_industry"),
  curriculumAcademicField: text("curriculum_academic_field"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 학문분야 태그 (Field Tag) — F2. 대분류 > 소분류 체계.
export const fieldTags = pgTable("field_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  parentCategory: text("parent_category"), // null이면 최상위 분류
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 과목 - 학문분야 태그 조인 (다대다) — AI 1차 분류 + 담당자 검수 워크플로우 (F2)
export const courseFieldTags = pgTable(
  "course_field_tags",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    fieldTagId: uuid("field_tag_id")
      .notNull()
      .references(() => fieldTags.id, { onDelete: "cascade" }),
    reviewed: boolean("reviewed").notNull().default(false), // 검수 전 태그는 검색 결과에 노출 안 함 (PRD 8.2 #3)
  },
  (t) => [
    uniqueIndex("course_field_tags_pk").on(t.courseId, t.fieldTagId),
    index("course_field_tags_field_idx").on(t.fieldTagId),
  ],
);

// 산업/진로 태그 (Industry Tag) — F3.
export const industryTags = pgTable("industry_tags", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  embedding: vector("embedding", { dimensions: 1536 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 과목 - 산업/진로 태그 조인 (연관도 스코어 + 담당자 검수 워크플로우)
export const courseIndustryTags = pgTable(
  "course_industry_tags",
  {
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    industryTagId: uuid("industry_tag_id")
      .notNull()
      .references(() => industryTags.id, { onDelete: "cascade" }),
    relevanceScore: real("relevance_score").notNull().default(0),
    reviewed: boolean("reviewed").notNull().default(false), // 검수 전 태그는 노출 안 함
  },
  (t) => [
    uniqueIndex("course_industry_tags_pk").on(t.courseId, t.industryTagId),
    index("course_industry_tags_industry_idx").on(t.industryTagId),
  ],
);

// 수강평 (Review) — 작성자는 익명 처리하되 어뷰징 탐지를 위해 userId는 내부적으로 보관.
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(), // 1~5
    body: text("body").notNull(),
    hashtags: jsonb("hashtags").$type<string[]>().notNull().default([]),
    semester: text("semester").notNull(), // 작성 학기·연도
    flagged: boolean("flagged").notNull().default(false), // 어뷰징/도배성 탐지 결과
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reviews_course_idx").on(t.courseId),
    index("reviews_user_idx").on(t.userId),
  ],
);

// AI 요약 (Summary) — 과목당 1개, 리뷰 누적 시 재생성.
export const summaries = pgTable("summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  courseId: text("course_id")
    .notNull()
    .unique()
    .references(() => courses.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  basedReviewCount: integer("based_review_count").notNull(),
  generatedAt: timestamp("generated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 장바구니 (Cart) — 담은 과목 목록. "나의 시간표"는 이 목록에서 스케줄이 있는 과목만 그린다.
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    courseId: text("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("cart_items_user_course_idx").on(t.userId, t.courseId),
    index("cart_items_user_idx").on(t.userId),
  ],
);

// 학과 커리큘럼 (Curriculum) — 입학년도별 버전 관리.
export const curricula = pgTable(
  "curricula",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    department: text("department").notNull(),
    admissionYear: integer("admission_year").notNull(),
    requiredCourseIds: jsonb("required_course_ids").$type<string[]>().notNull().default([]),
    electiveMinCredits: integer("elective_min_credits").notNull(),
    graduationMinCredits: integer("graduation_min_credits").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("curricula_department_year_idx").on(t.department, t.admissionYear)],
);

export const usersRelations = relations(users, ({ many }) => ({
  reviews: many(reviews),
  cartItems: many(cartItems),
}));

export const coursesRelations = relations(courses, ({ many, one }) => ({
  reviews: many(reviews),
  summary: one(summaries, { fields: [courses.id], references: [summaries.courseId] }),
  fieldTags: many(courseFieldTags),
  industryTags: many(courseIndustryTags),
  cartItems: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  user: one(users, { fields: [cartItems.userId], references: [users.id] }),
  course: one(courses, { fields: [cartItems.courseId], references: [courses.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  course: one(courses, { fields: [reviews.courseId], references: [courses.id] }),
  user: one(users, { fields: [reviews.userId], references: [users.id] }),
}));

export const summariesRelations = relations(summaries, ({ one }) => ({
  course: one(courses, { fields: [summaries.courseId], references: [courses.id] }),
}));

export const courseFieldTagsRelations = relations(courseFieldTags, ({ one }) => ({
  course: one(courses, { fields: [courseFieldTags.courseId], references: [courses.id] }),
  fieldTag: one(fieldTags, { fields: [courseFieldTags.fieldTagId], references: [fieldTags.id] }),
}));

export const courseIndustryTagsRelations = relations(courseIndustryTags, ({ one }) => ({
  course: one(courses, { fields: [courseIndustryTags.courseId], references: [courses.id] }),
  industryTag: one(industryTags, {
    fields: [courseIndustryTags.industryTagId],
    references: [industryTags.id],
  }),
}));
