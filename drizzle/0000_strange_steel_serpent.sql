-- PRD 10장: F3 임베딩 유사도 검색(courses/industry_tags.embedding)에 필요한 확장.
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE "course_field_tags" (
	"course_id" text NOT NULL,
	"field_tag_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "course_industry_tags" (
	"course_id" text NOT NULL,
	"industry_tag_id" uuid NOT NULL,
	"relevance_score" real DEFAULT 0 NOT NULL,
	"reviewed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" text PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"department" text NOT NULL,
	"credits" integer NOT NULL,
	"requirement" text NOT NULL,
	"syllabus" text,
	"semester" text,
	"prerequisites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "curricula" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"department" text NOT NULL,
	"admission_year" integer NOT NULL,
	"required_course_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"elective_min_credits" integer NOT NULL,
	"graduation_min_credits" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "field_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"parent_category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "field_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "industry_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"embedding" vector(1536),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "industry_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"rating" integer NOT NULL,
	"body" text NOT NULL,
	"hashtags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"semester" text NOT NULL,
	"flagged" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"course_id" text NOT NULL,
	"body" text NOT NULL,
	"based_review_count" integer NOT NULL,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "summaries_course_id_unique" UNIQUE("course_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"department" text NOT NULL,
	"second_department" text,
	"grade" integer,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"completed_course_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_student_id_unique" UNIQUE("student_id")
);
--> statement-breakpoint
ALTER TABLE "course_field_tags" ADD CONSTRAINT "course_field_tags_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_field_tags" ADD CONSTRAINT "course_field_tags_field_tag_id_field_tags_id_fk" FOREIGN KEY ("field_tag_id") REFERENCES "public"."field_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_industry_tags" ADD CONSTRAINT "course_industry_tags_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_industry_tags" ADD CONSTRAINT "course_industry_tags_industry_tag_id_industry_tags_id_fk" FOREIGN KEY ("industry_tag_id") REFERENCES "public"."industry_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "summaries" ADD CONSTRAINT "summaries_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "course_field_tags_pk" ON "course_field_tags" USING btree ("course_id","field_tag_id");--> statement-breakpoint
CREATE INDEX "course_field_tags_field_idx" ON "course_field_tags" USING btree ("field_tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "course_industry_tags_pk" ON "course_industry_tags" USING btree ("course_id","industry_tag_id");--> statement-breakpoint
CREATE INDEX "course_industry_tags_industry_idx" ON "course_industry_tags" USING btree ("industry_tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "curricula_department_year_idx" ON "curricula" USING btree ("department","admission_year");--> statement-breakpoint
CREATE INDEX "reviews_course_idx" ON "reviews" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "reviews_user_idx" ON "reviews" USING btree ("user_id");