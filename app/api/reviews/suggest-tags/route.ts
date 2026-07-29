import { NextResponse } from "next/server";
import { generateText } from "ai";
import { AI_MODELS } from "@/lib/ai";
import { predefinedReviewTags } from "@/lib/mock-data";

// 자유 텍스트가 이보다 짧으면 AI 호출 없이 빈 후보를 반환한다(비용 절약 + 의미 있는 추천 불가).
const MIN_TEXT_LENGTH = 10;
const MAX_SUGGESTED_TAGS = 4;

// POST /api/reviews/suggest-tags — 리뷰 자유 텍스트 → AI 해시태그 "후보" 추천.
// PRD 8.1: 자동 확정이 아니라 후보 제안이며, 반드시 고정된 9종 해시태그 안에서만 고른다.
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (text.length < MIN_TEXT_LENGTH) {
      return NextResponse.json({ success: true, tags: [] });
    }

    const { text: raw } = await generateText({
      model: AI_MODELS.fast,
      system:
        `당신은 대학 수강평 문장에서 어울리는 해시태그를 추천하는 도우미입니다. ` +
        `아래 9개 해시태그 중에서만 골라야 하며, 목록에 없는 새 태그를 만들면 안 됩니다: ` +
        `${predefinedReviewTags.map((t) => `#${t}`).join(", ")}. ` +
        `수강평 내용과 명확히 관련된 태그만 최대 ${MAX_SUGGESTED_TAGS}개까지 고르세요. ` +
        `다른 설명 없이 JSON 배열로만 응답하세요. 예: ["꿀강의", "과제많음"]. 해당하는 태그가 없으면 빈 배열 []을 반환하세요.`,
      prompt: `수강평: "${text}"`,
    });

    let candidates: unknown = [];
    try {
      const match = raw.match(/\[[\s\S]*\]/);
      candidates = JSON.parse(match ? match[0] : raw);
    } catch {
      candidates = [];
    }

    const tags = Array.isArray(candidates)
      ? [
          ...new Set(
            candidates.filter(
              (tag): tag is string => typeof tag === "string" && predefinedReviewTags.includes(tag),
            ),
          ),
        ].slice(0, MAX_SUGGESTED_TAGS)
      : [];

    return NextResponse.json({ success: true, tags });
  } catch (err) {
    // 원본 Error 객체를 그대로 넘기면(특히 AI Gateway 미인증 403처럼 흔히 발생하는 에러) 개발 서버
    // (Turbopack)가 스택트레이스 코드프레임을 렌더링하다 한글(멀티바이트 UTF-8) 소스 문자열 경계에서
    // 패닉해 전체 dev 서버가 죽는 것을 확인했다(Sprint 5 QA에서 재현) — 메시지 문자열만 로깅해 회피.
    console.error("Suggest tags API error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { success: false, tags: [], message: "태그 추천 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
