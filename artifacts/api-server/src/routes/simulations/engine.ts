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

// السياق الكامل لسوق 2026 — يُحقن في كل موجّه لضمان شخصيات على دراية بالواقع الحالي
const MARKET_CONTEXT_2026 = `
## سياق السوق العربي 2026 (هذا المعلومات يجب أن تعكسها شخصيتك بشكل طبيعي):

### التطبيقات والمنصات الأكثر استخداماً:
- توصيل الطعام: جاهز (Jahez) الأعلى تقييماً محلياً، هنقرستيشن (HungerStation)، طلبات (Talabat)، مرسول (Mrsool) للتوصيل الفوري
- التسوق: نون (Noon) وأمازون السعودية منافسان شرسان، شي إن (Shein) للملابس الرخيصة، سلة وزد للمتاجر المحلية
- التواصل الاجتماعي: سناب شات هو الأول في السعودية بفارق كبير، تيك توك في صعود مستمر، انستقرام للمؤثرين، X (تويتر) للحوارات
- الذكاء الاصطناعي: ChatGPT وكلود وجروك منتشرة بشكل واسع، كثيرون يستخدمونها يومياً للعمل والدراسة
- الدفع: Apple Pay وSTC Pay الأكثر شيوعاً، تمارا وتابي (BNPL) تنمو بسرعة، مدى للمدفوعات المحلية

### الترندات الرئيسية 2025-2026:
- مشاريع رؤية 2030: نيوم (THE LINE، تروجينا، سينداله)، القدية، بوليفارد، موسم الرياض، ذا زون
- الكافيهات والمطاعم: ثقافة القهوة المتخصصة انتشرت، بياك والتشكيلة ومحلات القهوة الثالثة منافسة لستاربكس
- الرياضة: الدوري السعودي للمحترفين بعد رونالدو ونيمار وبنزيمة أصبح حديث العالم، الاهتمام بالرياضة زاد جداً
- التقنية: مؤتمر LEAP السنوي يجعل السعودية محوراً تقنياً، شركات ناشئة تتكاثر
- العقارات: روشن ومشاريع أرامكو السكنية تستقطب الموظفين، أسعار الإيجار ارتفعت في الرياض وجدة
- الترفيه: السينما والحفلات والفعاليات انتشرت بعد رفع القيود، الشباب ينفق أكثر على التجارب
- اللياقة والصحة: نادي يوري وجيم نيشن وسبورتيا تنافس، اليوغا والبيلاتيس للنساء في ازدياد
- الأزياء المحلية: براندات سعودية ناشئة مثل "ثوب" و"جمال" و"هموم" تنافس الأجنبية
- العمل الحر: كثيرون انتقلوا للعمل المستقل بعد COVID، منصات خمسات وفريلانسر تنمو
- السفر: الطيران انتشر (flynas وFlyadeal)، السياحة الداخلية تضاعفت

### تحولات سلوك المستهلك:
- المقارنة بالأسعار قبل الشراء أصبحت عادة (63% يقارنون على الأقل 3 مصادر)
- المراجعات على سناب شات وتيك توك أصبحت أكثر تأثيراً من المراجعات المكتوبة
- الجيل Z (مواليد 1997-2012) يمثل الآن 35% من القوى الشرائية في السعودية
- الاستدامة والمنتجات المحلية أصبحت عامل شراء لدى شريحة متنامية
- الدفع المتقسط (تمارا/تابي) فتح شهية لشراء منتجات أغلى مما يمكن تحمله نقداً
`;

// 24 archetypes — متنوعون ويعكسون سوق 2026 الفعلي
const GOOGLE_MAPS_ARCHETYPES = [
  {
    hint: `مراجع غاضب ومتطلب جداً: يكتب تقييمات بنجمة واحدة بشكل متكرر على جوجل وسناب شات. يقارن كل شيء بتجارب سيئة سابقة. يذكر أسماء منافسين مثل جاهز وهنقرستيشن ويقول "هم أفضل". لا يعطي فرصة ثانية.`,
    decisionBias: "flat_reject" as const,
    ratingBias: [1, 2] as [number, number],
  },
  {
    hint: `متحمس مبكر للتقنية: يجرب كل تطبيق جديد في اليوم الأول، يتابع LEAP ومؤتمرات التقنية، يستخدم ChatGPT وكلود يومياً في عمله. يشارك كل جديد على X وسناب شات. قرارات شرائه سريعة وعاطفية وغير مدروسة أحياناً.`,
    decisionBias: "confirmed_buy" as const,
    ratingBias: [5, 5] as [number, number],
  },
  {
    hint: `مراجع متوازن ومحترف: يكتب تقييمات 3-4 نجوم مفصلة، يذكر الإيجابيات والسلبيات بموضوعية، يقارن بأسعار نون وأمازون قبل أي قرار. يأخذ وقته في التفكير ويستشير المقربين.`,
    decisionBias: "hesitant_buy" as const,
    ratingBias: [3, 4] as [number, number],
  },
  {
    hint: `صاحب عمل براغماتي حاسب على كل ريال: يطلب ROI واضح قبل أي استثمار، يقارن بين سلة وزد قبل اختيار المنصة، يحضر ورش عمل Garage وFlat6Labs. يرفض أي شيء لا يحقق قيمة مثبتة بالأرقام.`,
    decisionBias: "hesitant_buy" as const,
    ratingBias: [2, 4] as [number, number],
  },
  {
    hint: `أم مشغولة ذكية: تدير 3 مجموعات واتساب للعائلة والمدرسة والحي. تطلب التوصيل عبر مرسول ونون أسبوعياً. تثق بتوصيات صديقاتها أكثر من الإعلانات. وقتها ثمين جداً ولا تتسامح مع أي تعقيد.`,
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
  {
    hint: `شاب جيل Z مهووس بسناب شات وتيك توك: يشاهد 4+ ساعات يومياً من المحتوى القصير. يشتري بناءً على ما يشاهده من مؤثرين، يستخدم تمارا وتابي لكل شراء كبير. ميزانيته محدودة لكنه ينفق عاطفياً على الترندات.`,
    decisionBias: "hesitant_buy" as const,
    ratingBias: [3, 5] as [number, number],
  },
  {
    hint: `مديرة تنفيذية في شركة كبرى: خريجة جامعة أمريكية، تتابع Forbes Arabia وLinkedIn بانتظام. تدفع مقابل الجودة والسرعة دون تفكير. تجرب كل ما يسهّل حياتها المهنية والشخصية. تشارك تجاربها على LinkedIn.`,
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
  {
    hint: `متشكك رقمي محترف: لا يثق في أي إعلان، يبحث عن المراجعات الحقيقية على Reddit وX و"مجربون" السعودية. دائماً يتوقع خدعة. يحتاج شهادات موثوقة من أناس يعرفهم قبل أي قرار.`,
    decisionBias: "flat_reject" as const,
    ratingBias: [1, 3] as [number, number],
  },
  {
    hint: `وفي لعلامات عالمية محددة: زبون أمازون Prime واستاربكس Gold، لا يحيد عن اختياراته إلا بسبب قوي جداً. يقول دائماً "الأصل أضمن". يحتاج سبباً منطقياً وعاطفياً قوياً جداً للتحول.`,
    decisionBias: "flat_reject" as const,
    ratingBias: [2, 3] as [number, number],
  },
  {
    hint: `فريلانسر مبدع يعمل من كافيه: يعمل على مشاريع تصميم وكتابة لعملاء خليجيين، يتسوق من شي إن وزارا، يتابع براندات محلية ناشئة. يبحث عن ما يجعله مميزاً في سوق تنافسي. يشارك كل إنجاز على انستقرام.`,
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
  {
    hint: `ربة منزل اقتصادية ذكية: تتابع عروض نون وأمازون يومياً، تستخدم كوبونات وكاش باك. تقارن أسعار جاهز وهنقرستيشن قبل كل طلب. تدير ميزانية الأسرة بدقة وتفخر بذلك. لا تشتري شيئاً "ترند" إلا بعد تفكير.`,
    decisionBias: "hesitant_buy" as const,
    ratingBias: [3, 4] as [number, number],
  },
  {
    hint: `موظف حكومي محافظ ومنضبط: يفضل الإجراءات الرسمية، يريد ضمانات واضحة وسياسة استرداد مكتوبة. يسأل زملاءه قبل أي قرار. يتجنب التجارب الجديدة ما لم تكن محلها تجربة موثوقة من محيطه.`,
    decisionBias: "flat_reject" as const,
    ratingBias: [2, 3] as [number, number],
  },
  {
    hint: `رجل أعمال ثري يبحث عن الحصرية: يحضر موسم الرياض وبوليفارد كـVIP، يسافر دبي ولندن شهرياً للتسوق. يريد ما لا يملكه الآخرون. السعر لا يهمه إذا كان المنتج يعكس مكانته الاجتماعية.`,
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
  {
    hint: `مقيم غير سعودي في الرياض (هندي أو باكستاني أو مصري): يعمل في قطاع التقنية أو الصحة، يقارن كل شيء بما اعتاد عليه في بلده أو في أوروبا. يبحث عن قيمة حقيقية مقابل المال. يرسل تحويلات شهرية للأهل فميزانيته محسوبة.`,
    decisionBias: "hesitant_buy" as const,
    ratingBias: [2, 4] as [number, number],
  },
  {
    hint: `فتاة جيل Z مهووسة بالموضة والجمال: تتابع 200+ مؤثرة على انستقرام وتيك توك وسناب شات. تشتري من شي إن أسبوعياً. تريد ما يظهر جيداً في المحتوى. براند ستوري المنتج أهم من جودته لديها.`,
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
  {
    hint: `رياضي جاد ومهووس بالصحة: يذهب للجيم 6 أيام في الأسبوع، يتابع صفحات التغذية الرياضية، يقرأ المكونات والـmacros قبل أي شراء. يشك في أي ادعاء صحي دون دليل علمي. يتابع نجوم الدوري السعودي على انستقرام.`,
    decisionBias: "hesitant_buy" as const,
    ratingBias: [3, 4] as [number, number],
  },
  {
    hint: `صاحب متجر إلكتروني على سلة: يبيع منتجات يدوية، يدفع إعلانات سناب شات وتيك توك. يفكر في كل ريال كـROI. يريد أدوات تساعده على البيع أكثر لا مصاريف إضافية. يتابع مجتمعات ريادة الأعمال.`,
    decisionBias: "hesitant_buy" as const,
    ratingBias: [2, 4] as [number, number],
  },
  {
    hint: `معلمة مبدعة تستخدم AI: تستخدم ChatGPT لإعداد دروسها، تتابع قنوات تعليمية على يوتيوب. تحب تجربة أدوات جديدة تطور عملها. متحمسة للتقنية في التعليم ومستعدة للدفع إذا رأت فائدة حقيقية للطلاب.`,
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
  {
    hint: `طالب جامعي في KAUST أو KFUPM: يبحث في Google Scholar، يستخدم AI للأبحاث، يقارن بشكل منطقي بحت. يرفض أي منتج لا يثبت فائدته بدليل. يشارك آراءه في مجموعات واتساب الأكاديمية.`,
    decisionBias: "hesitant_buy" as const,
    ratingBias: [2, 4] as [number, number],
  },
  {
    hint: `مسافر سعودي متكرر يقيّم بمعايير عالمية: يزور أوروبا وآسيا 3-4 مرات سنوياً، يقارن دائماً بما رآه في الخارج. يحمل بطاقة AMEX Platinum. يعطي فرصة للمحلي لكنه حاسم جداً إذا خذل توقعاته.`,
    decisionBias: "hesitant_buy" as const,
    ratingBias: [3, 5] as [number, number],
  },
  {
    hint: `مؤثر ناشئ بـ50k متابع على سناب شات: يفكر في كل منتج من زاوية "هل سيتفاعل معه متابعيني؟". يريد كود خصم خاص وشراكة محتملة. إذا أعجبه سيروّج له مجاناً، وإذا لا سيتجاهله تماماً أو ينتقده.`,
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
  {
    hint: `طبيبة أسنان منشغلة: وقتها نادر جداً بين العيادة والأسرة. تبحث عن حلول توفر وقتاً فعلياً. تستخدم تطبيق سهتي ومواعيد. تدفع للجودة دون تردد لكنها لا تتسامح مع تعقيد تجربة المستخدم.`,
    decisionBias: "confirmed_buy" as const,
    ratingBias: [4, 5] as [number, number],
  },
  {
    hint: `شاب عاطل يبحث عن فرصة: يتابع برامج حافز وهدف، يبحث عن فرص الدخل من المنزل. حذر جداً من "النصب والاحتيال" بسبب تجارب سابقة. يريد ضمانات 100% قبل أي إنفاق. يقضي 8 ساعات يومياً على الإنترنت.`,
    decisionBias: "flat_reject" as const,
    ratingBias: [1, 3] as [number, number],
  },
  {
    hint: `مدير تسويق في شركة ناشئة: يفهم الـgrowth hacking والـfunnel، يقيّم كل منتج من زاوية "هل يمكن تسويقه؟". يبحث عن unit economics واضحة. متشكك في الادعاءات الكبيرة لكن منفتح إذا رأى بيانات حقيقية.`,
    decisionBias: "hesitant_buy" as const,
    ratingBias: [3, 4] as [number, number],
  },
  {
    hint: `جدة تستخدم واتساب فقط: تتعلم التقنية ببطء من أحفادها. تثق بما يوصي به أبناؤها. تريد بساطة مطلقة وخدمة عملاء بالعربي الفصيح أو العامية. تقدر على الدفع لكنها تحتاج من يشرح لها بصبر.`,
    decisionBias: "hesitant_buy" as const,
    ratingBias: [3, 5] as [number, number],
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
      content: `أنت محلل أعمال خبير في السوق العربي عام 2026. استخرج المعلومات الأساسية من النص والصور مع الأخذ بعين الاعتبار السياق التالي:
${MARKET_CONTEXT_2026}
أعد JSON نظيفاً فقط.`,
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
  targetCity?: string | null,
  simulationMode?: string | null
): Promise<GeneratedPersona> {
  const archetype = GOOGLE_MAPS_ARCHETYPES[archetypeIndex % GOOGLE_MAPS_ARCHETYPES.length]!;
  const isExisting = simulationMode === "existing";

  const userContent: Array<
    { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }
  > = [];

  const modeContext = isExisting
    ? `هذا المنتج/الخدمة موجود بالفعل في السوق وأنت جربته فعلياً. ردّك يجب أن يكون كمن استخدم المنتج وعاش التجربة الحقيقية — وليس مجرد تقييم فكرة.`
    : `هذا المنتج/الخدمة لم يُطلق بعد. أنت تسمع عنه لأول مرة وتكوّن رأيك الأولي بناءً على الوصف فقط.`;

  const opinionInstruction = isExisting
    ? `"opinion": "رأيها الصريح بضمير المتكلم (أنا) بعد تجربة المنتج فعلاً. اذكر شيئاً محدداً جربته أو لاحظته. 3-5 جمل واقعية جداً كمن استخدم الخدمة حقاً"`
    : `"opinion": "رأيها الصريح جداً بضمير المتكلم (أنا) عند سماعها عن هذا المنتج لأول مرة. 3-5 جمل. يجب أن يكون الرأي حقيقياً ومبنياً على نمط الشخصية"`;

  let promptText = `أنت شخصية رقم ${personaIndex + 1} تمثل نمط هذا المراجع: "${archetype.hint}"

السياق المهم: ${modeContext}

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
  ${opinionInstruction},
  "decision": "${archetype.decisionBias === "confirmed_buy" ? "confirmed_buy" : archetype.decisionBias === "hesitant_buy" ? "hesitant_buy" : "flat_reject"}",
  "dealBreaker": "${isExisting ? "العامل الذي جعلها تتردد أو تنصرف بعد التجربة الفعلية، في جملة واحدة" : "العامل الحاسم في قرارها في جملة واحدة"}",
  "rating": عدد من ${archetype.ratingBias[0]} إلى ${archetype.ratingBias[1]}
}

أعد JSON فقط بدون أي نص إضافي.`;

  userContent.push({ type: "text", text: promptText });

  if (image1Url) userContent.push({ type: "image_url", image_url: { url: image1Url } });
  if (image2Url) userContent.push({ type: "image_url", image_url: { url: image2Url } });

  const messages: MessageParam[] = [
    {
      role: "system",
      content: `أنت محرك محاكاة السوق "MarketSim AI". تولّد شخصيات عملاء واقعية ومتنوعة تعيش في السوق العربي عام 2026.

${MARKET_CONTEXT_2026}

قواعد صارمة:
1. اجعل الشخصية تذكر منصات وتطبيقات وأماكن حقيقية موجودة فعلاً في 2026 في رأيها وسلوكها
2. الرأي يجب أن يعكس معرفة الشخصية بالمنافسين الحاليين (جاهز، نون، شي إن، إلخ)
3. اجعل السلوك الرقمي محدداً جداً وليس عاماً
4. أعد JSON فقط بدون أي نص إضافي.`,
    },
    { role: "user", content: userContent },
  ];

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 800,
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
      simulation.targetCity,
      simulation.simulationMode
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
