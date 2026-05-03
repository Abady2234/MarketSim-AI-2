import { openai } from "@workspace/integrations-openai-ai-server";
import { db } from "@workspace/db";
import {
  simulationsTable,
  personasTable,
  simulationReportsTable,
} from "@workspace/db";
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

const GOOGLE_MAPS_ARCHETYPES = [
  {
    hint: "مراجع غاضب على جوجل ماب: يكتب تقييمات بنجمة واحدة، متشكك جداً، يركز على السلبيات والسعر المرتفع، لا يتسامح مع أي نقص",
    decisionBias: "flat_reject" as const,
    ratingBias: [1, 2],
  },
  {
    hint: "عميل وفي ومتحمس يكتب 5 نجوم دائماً، يرى الإيجابيات في كل شيء، يحب تجربة المنتجات الجديدة",
    decisionBias: "confirmed_buy" as const,
    ratingBias: [5, 5],
  },
  {
    hint: "مراجع متوازن محترف: يكتب تقييمات 3-4 نجوم، يوزن الإيجابيات والسلبيات بدقة، يصدر أحكاماً مبنية على التجربة الفعلية",
    decisionBias: "hesitant_buy" as const,
    ratingBias: [3, 4],
  },
  {
    hint: "صاحب عمل براغماتي: يحسب العائد على الاستثمار لكل قرار، يريد أرقاماً وبيانات لا وعوداً، حساس جداً للسعر مقابل القيمة",
    decisionBias: "hesitant_buy" as const,
    ratingBias: [2, 4],
  },
  {
    hint: "متبني مبكر للتقنية: أول من يجرب كل جديد، يكره التعقيد، يشارك آراءه على وسائل التواصل، قراراته سريعة وعاطفية",
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5],
  },
  {
    hint: "أم مشغولة متعددة المهام: تقيّم المنتجات بناءً على توفير الوقت والجهد، تبحث عن الراحة والبساطة، تأثرها بتوصيات المعارف كبير",
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5],
  },
  {
    hint: "شاب مدروس ميزانيته محدودة: يقارن الأسعار كثيراً، يقرأ كل المراجعات قبل الشراء، يبحث عن أفضل صفقة، لن يدفع أكثر مما يستحق",
    decisionBias: "hesitant_buy" as const,
    ratingBias: [2, 4],
  },
  {
    hint: "مديرة تنفيذية ناجحة: لا وقت لديها للتفاصيل، تريد الحل الأسرع والأكثر احترافية، مستعدة للدفع مقابل الجودة الحقيقية",
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5],
  },
  {
    hint: "متشكك محترف: لا يثق في الإعلانات أبداً، يبحث عن الدليل الاجتماعي والتقييمات الحقيقية، سهل التأثر بالتجارب السلبية للآخرين",
    decisionBias: "flat_reject" as const,
    ratingBias: [1, 3],
  },
  {
    hint: "مستهلك وفي للعلامات الكبرى: صعب الانتزاع من منتجاته الحالية، يحتاج سبباً قوياً جداً للتحول، مقاوم للتغيير بطبعه",
    decisionBias: "flat_reject" as const,
    ratingBias: [2, 3],
  },
  {
    hint: "مبدع طموح في بداية مسيرته: يبحث عن كل ما يساعده على التميز والنمو، مستعد لتجربة أشياء جديدة، متأثر بما يستخدمه الناجحون",
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5],
  },
  {
    hint: "ربة منزل ذكية واقتصادية: تدير ميزانية الأسرة بدقة، تقارن وتحسب قبل أي قرار، مهتمة جداً بجودة ما تشتريه لعائلتها",
    decisionBias: "hesitant_buy" as const,
    ratingBias: [3, 4],
  },
];

interface ParsedIdea {
  productName: string;
  productCore: string;
  targetSegment: string;
  competitiveAdvantage: string;
  category: string;
}

type MessageParam = {
  role: "user" | "assistant" | "system";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
};

async function parseIdea(
  ideaText: string,
  income?: string | null,
  price?: string | null,
  image1Url?: string | null,
  image2Url?: string | null
): Promise<ParsedIdea> {
  const userContent: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [];

  let contextText = `استخرج من المعلومات التالية:

فكرة المنتج/الخدمة: """${ideaText}"""`;

  if (income) contextText += `\nالدخل المستهدف للعميل: ${income}`;
  if (price) contextText += `\nسعر المنتج: ${price}`;

  contextText += `

أعد JSON بهذا الشكل الدقيق:
{
  "productName": "اسم قصير ومعبر للمنتج بالعربية أو اللغة المناسبة",
  "productCore": "جوهر المنتج في جملة واحدة",
  "targetSegment": "الشريحة المستهدفة في جملة واحدة",
  "competitiveAdvantage": "الميزة التنافسية الأساسية في جملة واحدة",
  "category": "تصنيف المنتج (مثل: مطعم، ملابس، تقنية، خدمات، صحة، تعليم، ترفيه، إلخ)"
}

أعد JSON فقط بدون أي نص إضافي.`;

  userContent.push({ type: "text", text: contextText });

  if (image1Url) {
    userContent.push({ type: "image_url", image_url: { url: image1Url } });
  }
  if (image2Url) {
    userContent.push({ type: "image_url", image_url: { url: image2Url } });
  }

  const messages: MessageParam[] = [
    {
      role: "system",
      content:
        "أنت محلل أعمال خبير. استخرج المعلومات الأساسية من النص والصور وأعد JSON نظيفاً فقط.",
    },
    { role: "user", content: userContent },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 512,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: messages as any,
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as ParsedIdea;
  } catch {
    return {
      productName: "منتج جديد",
      productCore: ideaText.slice(0, 100),
      targetSegment: "عملاء متنوعون",
      competitiveAdvantage: "حل مبتكر",
      category: "عام",
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
  rating: number;
}

async function generatePersona(
  parsedIdea: ParsedIdea,
  archetypeIndex: number,
  income?: string | null,
  price?: string | null,
  image1Url?: string | null,
  image2Url?: string | null
): Promise<GeneratedPersona> {
  const archetype = GOOGLE_MAPS_ARCHETYPES[archetypeIndex % GOOGLE_MAPS_ARCHETYPES.length]!;

  const userContent: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [];

  let promptText = `أنت شخصية تمثل نمط هذا المراجع: "${archetype.hint}"

تفاصيل المنتج/الخدمة:
- الاسم: ${parsedIdea.productName}
- الجوهر: ${parsedIdea.productCore}
- الفئة: ${parsedIdea.category}
- الشريحة المستهدفة: ${parsedIdea.targetSegment}
- الميزة التنافسية: ${parsedIdea.competitiveAdvantage}`;

  if (price) promptText += `\n- السعر: ${price}`;
  if (income) promptText += `\n- الدخل المستهدف للعميل: ${income}`;

  promptText += `

قم بتوليد شخصية واقعية تماماً تتصرف بالضبط كنمط المراجع المذكور. تذكر أن هذه الشخصية لها تاريخ حقيقي من التجارب والآراء على منصات مثل جوجل ماب، وهي تتصرف من خلال هذا المنظور الفريد.

أعد JSON بهذا الشكل الدقيق:
{
  "name": "اسم واقعي (عربي أو أجنبي حسب الشخصية)",
  "age": عدد بين 20-60,
  "profession": "المهنة التي تناسب هذه الشخصية",
  "lifestyle": "نمط حياتها في جملة واحدة واقعية",
  "digitalBehavior": "كيف تتصرف على الإنترنت وجوجل ماب، وصف حي ومحدد",
  "opinion": "رأيها الصريح جداً بضمير المتكلم (أنا) عند سماعها عن هذا المنتج لأول مرة. 3-5 جمل. يجب أن يكون الرأي حقيقياً ومبنياً على نمط الشخصية، قد يكون قاسياً جداً أو متحمساً جداً أو متذبذباً",
  "decision": "${archetype.decisionBias === "confirmed_buy" ? "confirmed_buy" : archetype.decisionBias === "hesitant_buy" ? "hesitant_buy أو confirmed_buy" : "flat_reject أو hesitant_buy"}",
  "dealBreaker": "العامل الحاسم في قرارها في جملة واحدة",
  "rating": عدد من ${archetype.ratingBias[0]} إلى ${archetype.ratingBias[1]}
}

أعد JSON فقط بدون أي نص إضافي.`;

  userContent.push({ type: "text", text: promptText });

  if (image1Url) userContent.push({ type: "image_url", image_url: { url: image1Url } });
  if (image2Url) userContent.push({ type: "image_url", image_url: { url: image2Url } });

  const messages: MessageParam[] = [
    {
      role: "system",
      content:
        'أنت محرك محاكاة السوق "MarketSim AI". تولّد شخصيات عملاء واقعية مستوحاة من أنماط مراجعي جوجل ماب الحقيقيين. أعد JSON فقط.',
    },
    { role: "user", content: userContent },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 800,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: messages as any,
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    const persona = JSON.parse(cleaned) as GeneratedPersona;
    if (!["confirmed_buy", "hesitant_buy", "flat_reject"].includes(persona.decision)) {
      persona.decision = archetype.decisionBias;
    }
    if (!persona.rating || persona.rating < 1 || persona.rating > 5) {
      const bias = archetype.ratingBias;
      persona.rating = bias[0]! + Math.floor(Math.random() * (bias[1]! - bias[0]! + 1));
    }
    return persona;
  } catch {
    return {
      name: `عميل ${archetypeIndex + 1}`,
      age: 28 + archetypeIndex * 4,
      profession: "موظف",
      lifestyle: "حياة عادية",
      digitalBehavior: "مستخدم عادي للإنترنت",
      opinion: "رأي غير محدد",
      decision: archetype.decisionBias,
      dealBreaker: "السعر والجودة",
      rating: archetype.ratingBias[0]!,
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
  personas: GeneratedPersona[],
  income?: string | null,
  price?: string | null
): Promise<GeneratedReport> {
  const confirmedBuys = personas.filter((p) => p.decision === "confirmed_buy").length;
  const hesitantBuys = personas.filter((p) => p.decision === "hesitant_buy").length;
  const flatRejects = personas.filter((p) => p.decision === "flat_reject").length;
  const avgRating = (personas.reduce((s, p) => s + (p.rating ?? 3), 0) / personas.length).toFixed(1);

  const personaSummaries = personas
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} (${p.profession}, ${p.age}سنة) — ${p.decision} — تقييم: ${p.rating}/5 — "${p.opinion.slice(0, 100)}..."`
    )
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 1500,
    messages: [
      {
        role: "system",
        content:
          "أنت خبير استراتيجي في تحليل السوق وإطلاق المنتجات. قدم تحليلاً حاداً وصريحاً جداً. أعد JSON فقط.",
      },
      {
        role: "user",
        content: `بناءً على محاكاة السوق التالية قدم تقرير تحليلي شامل:

المنتج: "${parsedIdea.productName}" — الفئة: ${parsedIdea.category}
الجوهر: ${parsedIdea.productCore}
الميزة التنافسية: ${parsedIdea.competitiveAdvantage}
${price ? `السعر: ${price}` : ""}
${income ? `الدخل المستهدف: ${income}` : ""}

نتائج المحاكاة (${personas.length} شخصية):
- شراء مؤكد: ${confirmedBuys} (${Math.round((confirmedBuys / personas.length) * 100)}%)
- شراء متردد: ${hesitantBuys} (${Math.round((hesitantBuys / personas.length) * 100)}%)
- رفض قاطع: ${flatRejects} (${Math.round((flatRejects / personas.length) * 100)}%)
- متوسط التقييم: ${avgRating}/5

آراء الشخصيات:
${personaSummaries}

أعد JSON بهذا الشكل:
{
  "emotionalAcceptance": رقم 0-100 (القبول العاطفي بناءً على الحماس والمشاعر في الآراء),
  "logicalAcceptance": رقم 0-100 (القبول المنطقي بناءً على السعر والقيمة والحاجة),
  "failurePatterns": "ما الشيء المشترك الذي أزعج الرافضين؟ فقرة تحليلية صريحة وحادة",
  "successPatterns": "ما الذي حمّس المشترين؟ فقرة تحليلية",
  "recommendation1": "التوصية الأولى الحاسمة — يجب أن تكون قابلة للتنفيذ وجريئة",
  "recommendation2": "التوصية الثانية",
  "recommendation3": "التوصية الثالثة"
}

أعد JSON فقط.`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  try {
    const cleaned = content.replace(/```json\n?|\n?```/g, "").trim();
    return JSON.parse(cleaned) as GeneratedReport;
  } catch {
    const rate = Math.round(((confirmedBuys + hesitantBuys * 0.5) / personas.length) * 100);
    return {
      emotionalAcceptance: rate,
      logicalAcceptance: rate - 10,
      failurePatterns: "يحتاج مزيداً من التحليل",
      successPatterns: "بعض الإيجابيات واضحة",
      recommendation1: "تحسين تقديم المنتج",
      recommendation2: "مراجعة التسعير",
      recommendation3: "تبسيط التجربة",
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

    sendSSE(res, { type: "progress", message: "تحليل الفكرة وفهم السياق..." });

    const parsedIdea = await parseIdea(
      simulation.ideaText,
      simulation.income,
      simulation.price,
      simulation.image1Url,
      simulation.image2Url
    );

    await db
      .update(simulationsTable)
      .set({ title: parsedIdea.productName, updatedAt: new Date() })
      .where(eq(simulationsTable.id, simulationId));

    const numPersonas = simulation.numPersonas ?? 7;
    sendSSE(res, { type: "progress", message: `بناء ${numPersonas} شخصيات افتراضية بالتوازي...` });

    const personaIndices = Array.from({ length: numPersonas }, (_, i) => i);

    const personaPromises = personaIndices.map((i) =>
      generatePersona(
        parsedIdea,
        i,
        simulation.income,
        simulation.price,
        simulation.image1Url,
        simulation.image2Url
      )
    );

    const generatedPersonas = await Promise.allSettled(personaPromises);

    const successfulPersonas: GeneratedPersona[] = [];

    for (let i = 0; i < generatedPersonas.length; i++) {
      const result = generatedPersonas[i];
      if (!result) continue;

      const persona =
        result.status === "fulfilled"
          ? result.value
          : {
              name: `عميل ${i + 1}`,
              age: 30,
              profession: "موظف",
              lifestyle: "حياة عادية",
              digitalBehavior: "مستخدم الإنترنت",
              opinion: "رأي محايد",
              decision: "hesitant_buy" as const,
              dealBreaker: "السعر",
              rating: 3,
            };

      successfulPersonas.push(persona);

      const inserted = await db
        .insert(personasTable)
        .values({
          simulationId,
          name: persona.name,
          age: persona.age,
          profession: persona.profession,
          lifestyle: persona.lifestyle,
          digitalBehavior: persona.digitalBehavior,
          opinion: persona.opinion,
          decision: persona.decision,
          dealBreaker: persona.dealBreaker,
          orderIndex: i,
          rating: persona.rating,
        })
        .returning();

      if (inserted[0]) {
        sendSSE(res, { type: "persona", persona: inserted[0] });
      }
    }

    sendSSE(res, { type: "progress", message: "تحليل بيانات السوق وإعداد التقرير النهائي..." });

    const reportData = await generateReport(
      parsedIdea,
      successfulPersonas,
      simulation.income,
      simulation.price
    );

    const confirmedBuys = successfulPersonas.filter((p) => p.decision === "confirmed_buy").length;
    const hesitantBuys = successfulPersonas.filter((p) => p.decision === "hesitant_buy").length;
    const acceptanceRate = Math.round(
      ((confirmedBuys + hesitantBuys * 0.5) / successfulPersonas.length) * 100
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
      .set({ status: "completed", acceptanceRate, updatedAt: new Date() })
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
