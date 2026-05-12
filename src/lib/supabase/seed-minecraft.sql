-- ============================================================
-- Omni-Verse: 30 Minecraft questions (EN + AR)
-- Run this entire file in: Supabase → SQL Editor → New query
--
-- Requires: a category with name_en = 'Minecraft' already exists
-- (created from /admin → Categories). If it doesn't, this inserts
-- nothing and is a harmless no-op.
--
-- Difficulty maps to point value:
--   200  = trivial      400 = easy        600 = medium
--   800  = hard        1000 = very hard  1200 = brutal
-- 5 questions per tier × 6 tiers = 30.
--
-- categories.question_count is bumped automatically by the existing
-- trg_question_count trigger — no need to touch it here.
-- ============================================================

INSERT INTO public.questions (category_id, points, question_en, answer_en, question_ar, answer_ar)
SELECT c.id, v.points, v.qen, v.aen, v.qar, v.aar
FROM public.categories c
CROSS JOIN (VALUES
  -- ── 200 · trivial ────────────────────────────────────────────────────────
  (200, 'What do you usually punch first when starting a new Minecraft world?',
        'Wood (a tree)',
        'ما هو أول شيء تضربه عادةً عند بدء عالم جديد في ماينكرافت؟',
        'الخشب (شجرة)'),
  (200, 'Which hostile mob hisses and explodes when it gets close to you?',
        'A Creeper',
        'أي وحش معادٍ يصدر صوت فحيح وينفجر عندما يقترب منك؟',
        'الكريبر (Creeper)'),
  (200, 'What do you sleep in to skip the night?',
        'A bed',
        'ما الذي تنام فيه لتجاوز الليل؟',
        'السرير'),
  (200, 'What tool do you need to mine stone and ores?',
        'A pickaxe',
        'ما الأداة التي تحتاجها لتعدين الحجر والخامات؟',
        'الفأس المعدني (Pickaxe)'),
  (200, 'What flat tool do you use to dig dirt, sand, and gravel quickly?',
        'A shovel',
        'ما الأداة المسطّحة التي تستخدمها لحفر التراب والرمل والحصى بسرعة؟',
        'المجرفة (Shovel)'),

  -- ── 400 · easy ───────────────────────────────────────────────────────────
  (400, 'What item do skeletons drop besides bones?',
        'Arrows',
        'ما العنصر الذي تُسقطه الهياكل العظمية إضافةً إلى العظام؟',
        'السهام'),
  (400, 'What is the maximum number of items in a normal stack?',
        '64',
        'ما العدد الأقصى للعناصر في الكومة العادية؟',
        '٦٤'),
  (400, 'What do you light an obsidian frame with to open a Nether portal?',
        'Flint and Steel',
        'بماذا تُشعل إطار الأوبسيديان لفتح بوابة النذر (Nether)؟',
        'حجر الصوان والفولاذ (Flint and Steel)'),
  (400, 'What animal do you shear to get wool?',
        'A sheep',
        'أي حيوان تجزّه للحصول على الصوف؟',
        'الخروف'),
  (400, 'What do you get from cooking raw porkchop, beef, or chicken in a furnace?',
        'Cooked meat (it restores more hunger)',
        'ماذا تحصل عند طهي اللحم النيء في الفرن؟',
        'اللحم المطهو (يستعيد جوعاً أكثر)'),

  -- ── 600 · medium ─────────────────────────────────────────────────────────
  (600, 'What gem do you mine to craft the strongest tools before Netherite was added?',
        'Diamond',
        'ما الجوهرة التي تُعدّنها لصنع أقوى الأدوات قبل إضافة النذرايت؟',
        'الألماس'),
  (600, 'What boss lives in the End dimension?',
        'The Ender Dragon',
        'أي زعيم يعيش في بُعد النهاية (The End)؟',
        'تنين النهاية (Ender Dragon)'),
  (600, 'What do you give a wolf to tame it?',
        'Bones',
        'ماذا تعطي الذئب لترويضه؟',
        'العظام'),
  (600, 'Drinking what liquid removes all your active potion or status effects?',
        'Milk',
        'شُرب أي سائل يزيل كل تأثيرات الجرعات أو الحالات الفعّالة؟',
        'الحليب'),
  (600, 'What plant do you farm to make bread?',
        'Wheat',
        'أي نبات تزرعه لصنع الخبز؟',
        'القمح'),

  -- ── 800 · hard ───────────────────────────────────────────────────────────
  (800, 'How many Eyes of Ender are needed to activate the End portal?',
        '12',
        'كم عين إندر (Eye of Ender) تحتاج لتفعيل بوابة النهاية؟',
        '١٢'),
  (800, 'What enchantment lets you mine a block and get the block itself, like glass or grass?',
        'Silk Touch',
        'أي تعويذة تتيح لك تعدين كتلة والحصول على الكتلة نفسها مثل الزجاج أو العشب؟',
        'اللمسة الحريرية (Silk Touch)'),
  (800, 'In what Nether structure do you find Wither Skeletons and Nether Wart?',
        'A Nether Fortress',
        'في أي هيكل في النذر تجد هياكل الويذر العظمية ونبتة النذر وارت؟',
        'قلعة النذر (Nether Fortress)'),
  (800, 'How many Wither Skeleton skulls are needed to build the Wither?',
        '3',
        'كم جمجمة هيكل ويذر تحتاج لبناء الويذر؟',
        '٣'),
  (800, 'What hostile underwater mob shoots you with spikes and is found in ocean monuments?',
        'A Guardian',
        'أي وحش مائي معادٍ يطلق عليك أشواكاً ويوجد في معابد المحيط؟',
        'الحارس (Guardian)'),

  -- ── 1000 · very hard ─────────────────────────────────────────────────────
  (1000, 'What blocks, and in what shape, do you place before adding the skulls to summon the Wither?',
         'Four Soul Sand or Soul Soil blocks in a T-shape',
         'ما الكتل وبأي شكل تضعها قبل إضافة الجماجم لاستدعاء الويذر؟',
         'أربع كتل من رمل الأرواح أو تربة الأرواح على شكل حرف T'),
  (1000, 'What ore do you smelt to get Netherite Scrap?',
         'Ancient Debris',
         'أي خام تصهره للحصول على شظايا النذرايت (Netherite Scrap)؟',
         'الحطام القديم (Ancient Debris)'),
  (1000, 'How many Netherite Scrap and Gold Ingots make one Netherite Ingot?',
         '4 Netherite Scrap and 4 Gold Ingots',
         'كم شظية نذرايت وسبيكة ذهب تصنع سبيكة نذرايت واحدة؟',
         '٤ شظايا نذرايت و ٤ سبائك ذهب'),
  (1000, 'What rare item, which lets you glide, is found in End Ships inside End Cities?',
         'The Elytra',
         'ما العنصر النادر الذي يتيح لك التحليق وتجده في سفن النهاية داخل مدن النهاية؟',
         'الإليترا (Elytra)'),
  (1000, 'What is the highest level of the Efficiency enchantment in vanilla survival?',
         'Level 5 (Efficiency V)',
         'ما أعلى مستوى لتعويذة الكفاءة (Efficiency) في وضع البقاء العادي؟',
         'المستوى الخامس (Efficiency V)'),

  -- ── 1200 · brutal ────────────────────────────────────────────────────────
  (1200, 'In current versions, around what Y-level (height) do diamonds spawn most often?',
         'Around Y -59 (just above bedrock)',
         'في الإصدارات الحالية، عند أي مستوى ارتفاع (Y) يظهر الألماس بكثرة عادةً؟',
         'حوالي Y -59 (فوق حجر الأساس مباشرةً)'),
  (1200, 'How many bookshelves must surround an enchanting table to reach the maximum level-30 enchantments?',
         '15 bookshelves',
         'كم رفّ كتب يجب أن يحيط بطاولة التعويذ للوصول إلى أعلى تعويذات من المستوى ٣٠؟',
         '١٥ رف كتب'),
  (1200, 'What underground biome, added in 1.19, is full of sculk blocks and is home to the Warden?',
         'The Deep Dark',
         'ما البيئة الجوفية المضافة في تحديث 1.19 المليئة بكتل السكالك وموطن الوارد؟',
         'الظلام العميق (Deep Dark)'),
  (1200, 'What blind mob in the Deep Dark hunts you by detecting vibrations and sound?',
         'The Warden',
         'ما الوحش الأعمى في الظلام العميق الذي يصطادك عبر استشعار الاهتزازات والصوت؟',
         'الوارد (Warden)'),
  (1200, 'Which Nether biome do Hoglins naturally spawn in?',
         'The Crimson Forest',
         'في أي بيئة من النذر تظهر الهوجلين بشكل طبيعي؟',
         'الغابة القرمزية (Crimson Forest)')
) AS v(points, qen, aen, qar, aar)
WHERE c.name_en = 'Minecraft';

-- Verify after running:
--   SELECT points, count(*) FROM public.questions q
--   JOIN public.categories c ON c.id = q.category_id
--   WHERE c.name_en = 'Minecraft' GROUP BY points ORDER BY points;
--   -> should show 5 rows of each: 200,400,600,800,1000,1200
