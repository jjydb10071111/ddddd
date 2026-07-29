import { NextResponse } from "next/server";
import { and, count, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { industryTagTaxonomy } from "@/lib/search/industry-tag-taxonomy";

export type IndustryTagListItem = {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** 검수 완료(reviewed=true)된 과목 수만 센다 — 미검수 태그는 아직 "노출되지 않은" 상태이므로. */
  courseCount: number;
};

// GET /api/industry-tags
// components/fields-explorer.tsx가 카드 목록(반도체/AI·데이터사이언스/... )을 그리는 데 쓴다.
// 이름/설명/아이콘 같은 표시용 메타데이터는 lib/search/industry-tag-taxonomy.ts(정적 데이터)에서
// 가져오고, id·과목 수는 DB(industry_tags/course_industry_tags)에서 가져와 합친다.
export async function GET() {
  try {
    const { industryTags, courseIndustryTags } = schema;

    const tagRows = await db.select().from(industryTags);

    const taxonomyByName = new Map(industryTagTaxonomy.map((t) => [t.name, t]));

    const items: IndustryTagListItem[] = [];
    for (const tag of tagRows) {
      const meta = taxonomyByName.get(tag.name);
      const [{ value: courseCount }] = await db
        .select({ value: count() })
        .from(courseIndustryTags)
        .where(and(eq(courseIndustryTags.industryTagId, tag.id), eq(courseIndustryTags.reviewed, true)));

      items.push({
        id: tag.id,
        name: tag.name,
        description: meta?.description ?? "",
        icon: meta?.icon ?? "Cpu",
        courseCount,
      });
    }

    // 태그 노출 순서는 taxonomy 정의 순서를 따른다(신조어/신산업 태그를 뒤에 추가하면
    // 자연히 뒤에 붙는다 — PRD 8.3 #6 "신조어·신산업 태그 확장" 참고).
    items.sort((a, b) => {
      const ai = industryTagTaxonomy.findIndex((t) => t.name === a.name);
      const bi = industryTagTaxonomy.findIndex((t) => t.name === b.name);
      return (ai === -1 ? Number.MAX_SAFE_INTEGER : ai) - (bi === -1 ? Number.MAX_SAFE_INTEGER : bi);
    });

    return NextResponse.json({ success: true, tags: items });
  } catch (err) {
    console.error("Industry tags GET API error:", err);
    return NextResponse.json(
      { success: false, tags: [], message: "산업/진로 태그 목록을 불러오는 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
