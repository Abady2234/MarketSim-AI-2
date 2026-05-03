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

// 20 archetypes — cycle through them for diversity across up to 40 personas
const GOOGLE_MAPS_ARCHETYPES = [
  {
    hint: "مراجع غاضب على جوجل ماب: يكتب تقييمات بنجمة واحدة، متشكك جداً، يركز على السلبيات والسعر المرتفع، لا يتسامح مع أي نقص",
    decisionBias: "flat_reject" as const,
    ratingBias: [1, 2] as [number, number],
  },
  {
    hint: "عميل وفي ومتحمس يكتب 5 نجوم دائماً، يرى الإيجابيات في كل شيء، يحب تجربة المنتجات الجديدة بسرعة",
    decisionBias: "confirmed_buy" as const,
    ratingBias: [5, 5] as [number, number],
  },
  {
    hint: "مراجع متوازن محترف: يكتب تقييمات 3-4 نجوم، يوزن الإيجابيات والسلبيات بدقة، يصدر أحكاماً مبنية على التجربة الفعلية",
    decisionBias: "hesitant_buy" as const,
    ratingBias: [3, 4] as [number, number],
  },
  {
    hint: "صاحب عمل براغماتي: يحسب العائد على الاستثمار لكل قرار، يريد أرقاماً وبيانات لا وعوداً، حساس جداً للسعر مقابل القيمة",
    decisionBias: "hesitant_buy" as const,
    ratingBias: [2, 4] as [number, number],
  },
  {
    hint: "متبني مبكر للتقنية: أول من يجرب كل جديد، يكره التعقيد، يشارك آراءه على وسائل التواصل، قراراته سريعة وعاطفية",
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
  {
    hint: "أم مشغولة متعددة المهام: تقيّم المنتجات بناءً على توفير الوقت والجهد، تبحث عن الراحة والبساطة، تأثرها بتوصيات المعارف كبير",
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
  {
    hint: "شاب مدروس ميزانيته محدودة: يقارن الأسعار كثيراً، يقرأ كل المراجعات قبل الشراء، يبحث عن أفضل صفقة، لن يدفع أكثر مما يستحق",
    decisionBias: "hesitant_buy" as const,
    ratingBias: [2, 4] as [number, number],
  },
  {
    hint: "مديرة تنفيذية ناجحة: لا وقت لديها للتفاصيل، تريد الحل الأسرع والأكثر احترافية، مستعدة للدفع مقابل الجودة الحقيقية",
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
  {
    hint: "متشكك محترف: لا يثق في الإعلانات أبداً، يبحث عن الدليل الاجتماعي والتقييمات الحقيقية، سهل التأثر بالتجارب السلبية للآخرين",
    decisionBias: "flat_reject" as const,
    ratingBias: [1, 3] as [number, number],
  },
  {
    hint: "مستهلك وفي للعلامات الكبرى: صعب الانتزاع من منتجاته الحالية، يحتاج سبباً قوياً جداً للتحول، مقاوم للتغيير بطبعه",
    decisionBias: "flat_reject" as const,
    ratingBias: [2, 3] as [number, number],
  },
  {
    hint: "مبدع طموح في بداية مسيرته: يبحث عن كل ما يساعده على التميز والنمو، مستعد لتجربة أشياء جديدة، متأثر بما يستخدمه الناجحون",
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
  {
    hint: "ربة منزل ذكية واقتصادية: تدير ميزانية الأسرة بدقة، تقارن وتحسب قبل أي قرار، مهتمة جداً بجودة ما تشتريه لعائلتها",
    decisionBias: "hesitant_buy" as const,
    ratingBias: [3, 4] as [number, number],
  },
  {
    hint: "طالب جامعي نشط على السوشيال ميديا: يتأثر بالترندات والمؤثرين، ميزانيته ضيقة لكن مشترياته عاطفية وغير مدروسة أحياناً",
    decisionBias: "hesitant_buy" as const,
    ratingBias: [3, 5] as [number, number],
  },
  {
    hint: "موظف حكومي محافظ: يفضل ما هو مجرب ومألوف، يتجنب المخاطرة، قراراته بطيئة ومدروسة جداً، يحتاج ضمانات واضحة",
    decisionBias: "flat_reject" as const,
    ratingBias: [2, 3] as [number, number],
  },
  {
    hint: "رجل أعمال سعودي ثري: يبحث عن التميز والحصرية، لا يقلق من السعر إذا كانت الجودة عالية، يهتم بالمظهر والبراند",
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
  {
    hint: "مقيم أجنبي في السعودية: يقارن المنتجات بما اعتاد عليه في بلده، يبحث عن جودة عالمية، قد يكون متقبلاً أو رافضاً بناءً على مقارناته",
    decisionBias: "hesitant_buy" as const,
    ratingBias: [2, 4] as [number, number],
  },
  {
    hint: "مراهقة مهتمة بالموضة والجمال: قرارات شرائها تعتمد على المظهر الجمالي والـstory خلف المنتج، تأثير المؤثرين عليها كبير جداً",
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
  {
    hint: "رياضي منضبط مهتم بالصحة: يحكم على المنتجات من زاوية الفائدة والجودة وصحة المكونات، حساس جداً للمصداقية العلمية",
    decisionBias: "hesitant_buy" as const,
    ratingBias: [3, 4] as [number, number],
  },
  {
    hint: "صاحب متجر صغير: يفكر في كل ريال، يريد منتجاً يساعده على تحقيق ربح أكثر أو خفض تكاليف، منطقي جداً في قراراته",
    decisionBias: "hesitant_buy" as const,
    ratingBias: [2, 4] as [number, number],
  },
  {
    hint: "مدرب أو معلم متحمس: يبحث عما يطور عمله ويساعد طلابه، متحمس للجديد المفيد، يشارك ما يعجبه مع زملائه",
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
];

interface ParsedIdea {
  productName: string;
  productCore: string;
  targetSegment: string;
  competitiveAdvantage: string;
  category: string;
  keyInsights: string;
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
  image2Url?: string | null,
  targetAge?: string | null,
  targetCity?: string | null,
  problemSolved?: string | null,
  competitors?: string | null,
  extraDetails?: string | null
): Promise<ParsedIdea> {
  const userContent: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [];

  let contextText = `استخرج من المعلومات التالية:

فكرة المنتج/الخدمة: """${ideaText}"""`;

  if (income) contextText += `\nالدخل المستهدف للعميل: ${income}`;
  if (price) contextText += `\nسعر المنتج: ${price}`;
  if (targetAge) contextText += `\nالفئة العمرية المستهدفة: ${targetAge}`;
  if (targetCity) contextText += `\nالمنطقة الجغرافية المستهدفة: ${targetCity}`;
  if (problemSolved) contextText += `\nالمشكلة التي يحلها المنتج: ${problemSolved}`;
  if (competitors) contextText += `\nالمنافسون الحاليون: ${competitors}`;
  if (extraDetails) contextText += `\nتفاصيل إضافية: ${extraDetails}`;

  contextText += `

أعد JSON بهذا الشكل الدقيق:
{
  "productName": "اسم قصير ومعبر للمنتج بالعربية أو اللغة المناسبة",
  "productCore": "جوهر المنتج في جملة واحدة",
  "targetSegment": "الشريحة المستهدفة في جملة واحدة",
  "competitiveAdvantage": "الميزة التنافسية الأساسية في جملة واحدة",
  "category": "تصنيف المنتج (مثل: مطعم، ملابس، تقنية، خدمات، صحة، تعليم، ترفيه، إلخ)",
  "keyInsights": "أهم 2-3 نقاط حاسمة يجب أن تعرفها الشخصيات عند تقييم هذا المنتج"
}

أعد JSON فقط بدون أي نص إضافي.`;

  userContent.push({ type: "text", text: contextText });

  if (image1Url) userContent.push({ type: "image_url", image_url: { url: image1Url } });
  if (image2Url) userContent.push({ type: "image_url", image_url: { url: image2Url } });

  const messages: MessageParam[] = [
    {
      role: "system",
      content: "أنت محلل أعمال خبير. استخرج المعلومات الأساسية من النص والصور وأعد JSON نظيفاً فقط.",
    },
    { role: "user", content: userContent },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 700,
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
      keyInsights: "منتج جديد يحتاج للتقييم",
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
  personaIndex: number,
  income?: string | null,
  price?: string | null,
  image1Url?: string | null,
  image2Url?: string | null,
  targetAge?: string | null,
  targetCity?: string | null
): Promise<GeneratedPersona> {
  const archetype = GOOGLE_MAPS_ARCHETYPES[archetypeIndex % GOOGLE_MAPS_ARCHETYPES.length]!;

  const userContent: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [];

  let promptText = `أنت شخصية رقم ${personaIndex + 1} تمثل نمط هذا المراجع: "${archetype.hint}"

تفاصيل المنتج/الخدمة:
- الاسم: ${parsedIdea.productName}
- الجوهر: ${parsedIdea.productCore}
- الفئة: ${parsedIdea.category}
- الشريحة المستهدفة: ${parsedIdea.targetSegment}
- الميزة التنافسية: ${parsedIdea.competitiveAdvantage}
- نقاط حاسمة: ${parsedIdea.keyInsights}`;

  if (price) promptText += `\n- السعر: ${price}`;
  if (income) promptText += `\n- الدخل المستهدف: ${income}`;
  if (targetAge) promptText += `\n- الفئة العمرية المستهدفة: ${targetAge}`;
  if (targetCity) promptText += `\n- المنطقة: ${targetCity}`;

  promptText += `

قم بتوليد شخصية واقعية تماماً مختلفة عن الشخصيات الأخرى. هذه الشخصية لها تاريخ حقيقي وتتصرف بالضبط كنمط المراجع المذكور.

أعد JSON بهذا الشكل الدقيق:
{
  "name": "اسم واقعي مختلف (عربي أو أجنبي حسب الشخصية)",
  "age": عدد بين 19-62,
  "profession": "المهنة التي تناسب هذه الشخصية",
  "lifestyle": "نمط حياتها في جملة واحدة واقعية ومحددة",
  "digitalBehavior": "كيف تتصرف على الإنترنت تحديداً، وصف حي ومحدد",
  "opinion": "رأيها الصريح جداً بضمير المتكلم (أنا) عند سماعها عن هذا المنتج لأول مرة. 3-5 جمل. يجب أن يكون الرأي حقيقياً ومبنياً على نمط الشخصية",
  "decision": "${archetype.decisionBias === "confirmed_buy" ? "confirmed_buy" : archetype.decisionBias === "hesitant_buy" ? "hesitant_buy" : "flat_reject"}",
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
      content: 'أنت محرك محاكاة السوق "MarketSim AI". تولّد شخصيات عملاء واقعية ومتنوعة. أعد JSON فقط.',
    },
    { role: "user", content: userContent },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 700,
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
      name: `عميل ${personaIndex + 1}`,
      age: 25 + (personaIndex % 35),
      profession: "موظف",
      lifestyle: "حياة عادية",
      digitalBehavior: "مستخدم عادي للإنترنت",
      opinion: "رأي غير محدد بسبب خطأ في التوليد",
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

  // Take a smart sample for report context (first 20 to avoid token limits)
  const samplePersonas = personas.slice(0, 20);
  const personaSummaries = samplePersonas
    .map(
      (p, i) =>
        `${i + 1}. ${p.name} (${p.profession}, ${p.age}سنة) — ${p.decision} — ${p.rating}/5 — "${p.opinion.slice(0, 80)}..."`
    )
    .join("\n");

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 1500,
    messages: [
      {
        role: "system",
        content: "أنت خبير استراتيجي في تحليل السوق وإطلاق المنتجات. قدم تحليلاً حاداً وصريحاً جداً. أعد JSON فقط.",
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

عينة من آراء الشخصيات:
${personaSummaries}

أعد JSON بهذا الشكل:
{
  "emotionalAcceptance": رقم 0-100 (القبول العاطفي بناءً على الحماس والمشاعر),
  "logicalAcceptance": رقم 0-100 (القبول المنطقي بناءً على السعر والقيمة والحاجة),
  "failurePatterns": "ما الشيء المشترك الذي أزعج الرافضين؟ فقرة تحليلية صريحة وحادة",
  "successPatterns": "ما الذي حمّس المشترين؟ فقرة تحليلية",
  "recommendation1": "التوصية الأولى الحاسمة — قابلة للتنفيذ وجريئة",
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

// Process personas in batches of 8 to ensure all complete reliably
async function processBatch(
  batchIndices: number[],
  parsedIdea: ParsedIdea,
  simulation: typeof simulationsTable.$inferSelect,
  simulationId: number,
  res: Response,
  allPersonas: GeneratedPersona[]
) {
  const batchPromises = batchIndices.map((i) =>
    generatePersona(
      parsedIdea,
      i,
      i,
      simulation.income,
      simulation.price,
      simulation.image1Url,
      simulation.image2Url,
      simulation.targetAge,
      simulation.targetCity
    )
  );

  const results = await Promise.allSettled(batchPromises);

  for (let j = 0; j < results.length; j++) {
    const i = batchIndices[j]!;
    const result = results[j];
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

    allPersonas.push(persona);

    const inserted = await db
      .insert(personasTable)
      .values({
        simulationId,
        name: persona.name,
        age: Math.round(persona.age) || 25,
        profession: persona.profession || "موظف",
        lifestyle: persona.lifestyle || "",
        digitalBehavior: persona.digitalBehavior || "",
        opinion: persona.opinion || "",
        decision: persona.decision,
        dealBreaker: persona.dealBreaker || "",
        orderIndex: i,
        rating: Math.min(5, Math.max(1, Math.round(persona.rating ?? 3))),
      })
      .returning();

    if (inserted[0]) {
      sendSSE(res, { type: "persona", persona: inserted[0] });
    }
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

    // Clean up any previous partial run data
    await db.delete(personasTable).where(eq(personasTable.simulationId, simulationId));
    await db.delete(simulationReportsTable).where(eq(simulationReportsTable.simulationId, simulationId));

    await db
      .update(simulationsTable)
      .set({ status: "running", acceptanceRate: null, updatedAt: new Date() })
      .where(eq(simulationsTable.id, simulationId));

    sendSSE(res, { type: "progress", message: "تحليل الفكرة وفهم السياق..." });

    const parsedIdea = await parseIdea(
      simulation.ideaText,
      simulation.income,
      simulation.price,
      simulation.image1Url,
      simulation.image2Url,
      simulation.targetAge,
      simulation.targetCity,
      simulation.problemSolved,
      simulation.competitors,
      simulation.extraDetails
    );

    await db
      .update(simulationsTable)
      .set({ title: parsedIdea.productName, updatedAt: new Date() })
      .where(eq(simulationsTable.id, simulationId));

    const numPersonas = simulation.numPersonas ?? 7;
    sendSSE(res, { type: "progress", message: `بناء ${numPersonas} شخصية افتراضية...` });

    // Process in batches of 8 for reliability
    const BATCH_SIZE = 8;
    const allPersonas: GeneratedPersona[] = [];
    const indices = Array.from({ length: numPersonas }, (_, i) => i);

    for (let batchStart = 0; batchStart < indices.length; batchStart += BATCH_SIZE) {
      const batchIndices = indices.slice(batchStart, batchStart + BATCH_SIZE);
      const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(numPersonas / BATCH_SIZE);
      sendSSE(res, {
        type: "progress",
        message: `توليد الشخصيات: الدفعة ${batchNum} من ${totalBatches} (${allPersonas.length}/${numPersonas})...`,
      });
      await processBatch(batchIndices, parsedIdea, simulation, simulationId, res, allPersonas);
    }

    sendSSE(res, { type: "progress", message: "تحليل بيانات السوق وإعداد التقرير النهائي..." });

    const reportData = await generateReport(
      parsedIdea,
      allPersonas,
      simulation.income,
      simulation.price
    );

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
