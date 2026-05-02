import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import { simulationsTable, personasTable, simulationReportsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Response } from "express";

type SSEEvent =
  | { type: "progress"; message: string }
  | { type: "persona"; persona: typeof personasTable.$inferSelect }
  | { type: "report"; report: typeof simulationReportsTable.$inferSelect }
  | { type: "complete"; acceptanceRate: number }
  | { type: "error"; message: string };

function sendSSE(res: Response, event: SSEEvent) {
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

const PERSONA_ARCHETYPES = [
  "مستهلك غاضب يعلق دائماً بنجمة واحدة إذا كان السعر مرتفعاً، لا يتسامح مع أي تعقيد",
  "أم مشغولة تقيم بخمس نجوم لأي شيء يوفر وقتها، قراراتها عاطفية وسريعة",
  "متبني مبكر للتقنية يكره التعقيد، يريد الحل الأسرع والأذكى دائماً",
  "عميل متشكك لا يثق في الإعلانات، يقرأ كل الآراء قبل الشراء ويبحث عن الدليل الاجتماعي",
  "رجل أعمال براغماتي يحسب ROI لكل شراء، يريد أرقاماً وبيانات لا وعوداً",
  "شاب طموح في بداية مسيرته المهنية، ميزانيته محدودة لكن طموحاته كبيرة",
  "مديرة تنفيذية تبحث عن الكفاءة، لا وقت لديها للتفاصيل، تريد النتائج مباشرة",
  "عميل وفي للعلامات التجارية الكبرى، يصعب إقناعه بتجربة شيء جديد",
];

interface ParsedIdea {
  productName: string;
  productCore: string;
  targetSegment: string;
  competitiveAdvantage: string;
}

async function parseIdea(ideaText: string): Promise<ParsedIdea> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 1024,
    messages: [
      {
        role: "system",
        content: `أنت محلل أعمال خبير. استخرج المعلومات الأساسية من النص وأعد JSON نظيفاً فقط بدون أي نص إضافي.`,
      },
      {
        role: "user",
        content: `استخرج من النص التالي المعلومات التالية وأعدها كـ JSON:
{
  "productName": "اسم قصير للمنتج/الخدمة",
  "productCore": "جوهر المنتج في جملة واحدة",
  "targetSegment": "الشريحة المستهدفة في جملة واحدة",
  "competitiveAdvantage": "الميزة التنافسية الأساسية في جملة واحدة"
}

النص: """${ideaText}"""

أعد JSON فقط بدون أي نص إضافي.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content) as ParsedIdea;
  } catch {
    return {
      productName: "منتج جديد",
      productCore: ideaText.slice(0, 100),
      targetSegment: "عملاء متنوعون",
      competitiveAdvantage: "حل مبتكر",
    };
  }
}

interface GeneratedPersona {
  name: string;
  age: number;
  profession: string;
  lifestyle: string;
  digitalBehavior: string;
  opinion: string;
  decision: "confirmed_buy" | "hesitant_buy" | "flat_reject";
  dealBreaker: string;
}

async function generatePersona(
  ideaText: string,
  parsedIdea: ParsedIdea,
  archetypeHint: string,
  index: number
): Promise<GeneratedPersona> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 1024,
    messages: [
      {
        role: "system",
        content: `أنت محرك المحاكاة المتقدم لمنصة "MarketSim AI". مهمتك توليد شخصية عميل واقعية جداً تحاكي السوق الحقيقي. أعد JSON فقط.`,
      },
      {
        role: "user",
        content: `قم بتوليد شخصية عميل واقعية لهذا المنتج مع الأخذ بعين الاعتبار نمط الشخصية المطلوب.

المنتج: "${parsedIdea.productName}"
الوصف: "${parsedIdea.productCore}"
الشريحة المستهدفة: "${parsedIdea.targetSegment}"
نمط الشخصية المطلوب: "${archetypeHint}"

أعد JSON بهذا الشكل الدقيق:
{
  "name": "اسم عربي أو أجنبي واقعي",
  "age": عدد بين 22-55,
  "profession": "المهنة",
  "lifestyle": "نمط الحياة في جملة",
  "digitalBehavior": "نمط السلوك الرقمي في جملة وصفية مثيرة للاهتمام",
  "opinion": "رأيه الصريح بضمير المتكلم (أنا) في 3-4 جمل. يجب أن يكون صريحاً جداً، قد يكون قاسياً أو متحمساً حسب نمط الشخصية",
  "decision": "confirmed_buy" أو "hesitant_buy" أو "flat_reject",
  "dealBreaker": "العامل الحاسم في قراره في جملة واحدة"
}

أعد JSON فقط بدون أي نص إضافي.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    const persona = JSON.parse(content) as GeneratedPersona;
    if (!["confirmed_buy", "hesitant_buy", "flat_reject"].includes(persona.decision)) {
      persona.decision = index % 3 === 0 ? "flat_reject" : index % 3 === 1 ? "hesitant_buy" : "confirmed_buy";
    }
    return persona;
  } catch {
    return {
      name: `عميل ${index + 1}`,
      age: 30 + index * 3,
      profession: "موظف",
      lifestyle: "حياة عادية",
      digitalBehavior: "مستخدم عادي للتقنية",
      opinion: "رأي محايد في المنتج",
      decision: "hesitant_buy",
      dealBreaker: "السعر والجودة",
    };
  }
}

interface GeneratedReport {
  emotionalAcceptance: number;
  logicalAcceptance: number;
  failurePatterns: string;
  successPatterns: string;
  recommendation1: string;
  recommendation2: string;
  recommendation3: string;
}

async function generateReport(
  parsedIdea: ParsedIdea,
  personas: GeneratedPersona[]
): Promise<GeneratedReport> {
  const personaSummaries = personas
    .map((p, i) => `${i + 1}. ${p.name} (${p.profession}): ${p.decision} - "${p.opinion.slice(0, 80)}..."`)
    .join("\n");

  const confirmedBuys = personas.filter((p) => p.decision === "confirmed_buy").length;
  const hesitantBuys = personas.filter((p) => p.decision === "hesitant_buy").length;
  const flatRejects = personas.filter((p) => p.decision === "flat_reject").length;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 2048,
    messages: [
      {
        role: "system",
        content: `أنت خبير في تحليل السوق وإطلاق المنتجات. بناءً على آراء الشخصيات، قدم تحليلاً دقيقاً واحترافياً. أعد JSON فقط.`,
      },
      {
        role: "user",
        content: `بناءً على محاكاة السوق التالية، قدم تحليلاً شاملاً:

المنتج: "${parsedIdea.productName}"
الجوهر: "${parsedIdea.productCore}"
الميزة التنافسية: "${parsedIdea.competitiveAdvantage}"

نتائج الشخصيات:
- قرارات الشراء المؤكد: ${confirmedBuys} من ${personas.length}
- قرارات الشراء المتردد: ${hesitantBuys} من ${personas.length}
- قرارات الرفض: ${flatRejects} من ${personas.length}

ملخص الآراء:
${personaSummaries}

أعد JSON بهذا الشكل:
{
  "emotionalAcceptance": رقم من 0-100 (نسبة القبول العاطفي),
  "logicalAcceptance": رقم من 0-100 (نسبة القبول المنطقي),
  "failurePatterns": "أنماط الفشل المشتركة في فقرة واحدة",
  "successPatterns": "أنماط النجاح المشتركة في فقرة واحدة",
  "recommendation1": "التوصية الأولى الحاسمة لتحسين المنتج أو طريقة طرحه",
  "recommendation2": "التوصية الثانية",
  "recommendation3": "التوصية الثالثة"
}

أعد JSON فقط.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content) as GeneratedReport;
  } catch {
    const rate = Math.round((confirmedBuys / personas.length) * 100);
    return {
      emotionalAcceptance: rate,
      logicalAcceptance: rate,
      failurePatterns: "يحتاج إلى مزيد من التحليل",
      successPatterns: "بعض الشخصيات أبدت اهتماماً إيجابياً",
      recommendation1: "تحسين طريقة تقديم المنتج",
      recommendation2: "مراجعة استراتيجية التسعير",
      recommendation3: "تبسيط تجربة المستخدم",
    };
  }
}

export async function runSimulationEngine(simulationId: number, res: Response) {
  try {
    const simulations = await db
      .select()
      .from(simulationsTable)
      .where(eq(simulationsTable.id, simulationId))
      .limit(1);

    const simulation = simulations[0];
    if (!simulation) {
      sendSSE(res, { type: "error", message: "Simulation not found" });
      res.end();
      return;
    }

    await db
      .update(simulationsTable)
      .set({ status: "running", updatedAt: new Date() })
      .where(eq(simulationsTable.id, simulationId));

    sendSSE(res, { type: "progress", message: "تحليل الفكرة..." });

    const parsedIdea = await parseIdea(simulation.ideaText);

    await db
      .update(simulationsTable)
      .set({ title: parsedIdea.productName, updatedAt: new Date() })
      .where(eq(simulationsTable.id, simulationId));

    const numPersonas = 7;
    const archetypes = PERSONA_ARCHETYPES.slice(0, numPersonas);

    sendSSE(res, { type: "progress", message: "بناء الجمهور الافتراضي..." });

    for (let i = 0; i < archetypes.length; i++) {
      sendSSE(res, { type: "progress", message: `توليد الشخصية ${i + 1} من ${numPersonas}...` });

      const generatedPersona = await generatePersona(
        simulation.ideaText,
        parsedIdea,
        archetypes[i]!,
        i
      );

      const inserted = await db
        .insert(personasTable)
        .values({
          simulationId,
          name: generatedPersona.name,
          age: generatedPersona.age,
          profession: generatedPersona.profession,
          lifestyle: generatedPersona.lifestyle,
          digitalBehavior: generatedPersona.digitalBehavior,
          opinion: generatedPersona.opinion,
          decision: generatedPersona.decision,
          dealBreaker: generatedPersona.dealBreaker,
          orderIndex: i,
        })
        .returning();

      if (inserted[0]) {
        sendSSE(res, { type: "persona", persona: inserted[0] });
      }
    }

    sendSSE(res, { type: "progress", message: "تحليل بيانات السوق الافتراضي..." });

    const allPersonas = await db
      .select()
      .from(personasTable)
      .where(eq(personasTable.simulationId, simulationId));

    const generatedPersonaObjects: GeneratedPersona[] = allPersonas.map((p) => ({
      name: p.name,
      age: p.age,
      profession: p.profession,
      lifestyle: p.lifestyle,
      digitalBehavior: p.digitalBehavior,
      opinion: p.opinion,
      decision: p.decision as "confirmed_buy" | "hesitant_buy" | "flat_reject",
      dealBreaker: p.dealBreaker,
    }));

    const reportData = await generateReport(parsedIdea, generatedPersonaObjects);

    const confirmedBuys = allPersonas.filter((p) => p.decision === "confirmed_buy").length;
    const hesitantBuys = allPersonas.filter((p) => p.decision === "hesitant_buy").length;
    const acceptanceRate = Math.round(
      ((confirmedBuys + hesitantBuys * 0.5) / allPersonas.length) * 100
    );

    const insertedReport = await db
      .insert(simulationReportsTable)
      .values({
        simulationId,
        productCore: parsedIdea.productCore,
        targetSegment: parsedIdea.targetSegment,
        competitiveAdvantage: parsedIdea.competitiveAdvantage,
        emotionalAcceptance: reportData.emotionalAcceptance,
        logicalAcceptance: reportData.logicalAcceptance,
        failurePatterns: reportData.failurePatterns,
        successPatterns: reportData.successPatterns,
        recommendation1: reportData.recommendation1,
        recommendation2: reportData.recommendation2,
        recommendation3: reportData.recommendation3,
      })
      .returning();

    await db
      .update(simulationsTable)
      .set({
        status: "completed",
        acceptanceRate,
        updatedAt: new Date(),
      })
      .where(eq(simulationsTable.id, simulationId));

    if (insertedReport[0]) {
      sendSSE(res, { type: "report", report: insertedReport[0] });
    }

    sendSSE(res, { type: "complete", acceptanceRate });
  } catch (error) {
    await db
      .update(simulationsTable)
      .set({ status: "failed", updatedAt: new Date() })
      .where(eq(simulationsTable.id, simulationId));

    sendSSE(res, {
      type: "error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    res.end();
  }
}
