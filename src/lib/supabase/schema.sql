-- ============================================================
-- Omni-Verse Database Schema  v2.0  (Security hardened)
-- Run this entire file in: Supabase → SQL Editor → New query
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en        TEXT NOT NULL,
  name_ar        TEXT NOT NULL DEFAULT '',
  active         BOOLEAN DEFAULT true,
  question_count INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now(),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  points      INTEGER NOT NULL CHECK (points IN (200, 400, 600, 800, 1000, 1200)),
  question_en TEXT NOT NULL,
  answer_en   TEXT NOT NULL,
  question_ar TEXT DEFAULT '',
  answer_ar   TEXT DEFAULT '',
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  game_mode       TEXT DEFAULT 'team' CHECK (game_mode IN ('solo', 'team')),
  category_names  TEXT[] DEFAULT '{}',
  total_questions INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS teams (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  score      INTEGER DEFAULT 0,
  rank       INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT DEFAULT 'admin',
  action     TEXT NOT NULL,
  target     TEXT DEFAULT '',
  type       TEXT DEFAULT 'system' CHECK (type IN ('create', 'update', 'delete', 'login', 'system')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Profiles: one row per auth user, stores username + admin flag
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username   TEXT UNIQUE,
  is_admin   BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Purchases: which user has purchased access to which categories
CREATE TABLE IF NOT EXISTS purchases (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE NOT NULL,
  purchased_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, category_id)
);

-- ─────────────────────────────────────────────────────────────
-- 2. AUTO-CREATE PROFILE ON SIGNUP
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─────────────────────────────────────────────────────────────
-- 3. QUESTION COUNT TRIGGER
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_category_question_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE categories SET question_count = question_count + 1 WHERE id = NEW.category_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE categories SET question_count = question_count - 1 WHERE id = OLD.category_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_question_count ON questions;
CREATE TRIGGER trg_question_count
  AFTER INSERT OR DELETE ON questions
  FOR EACH ROW EXECUTE FUNCTION update_category_question_count();

-- ─────────────────────────────────────────────────────────────
-- 4. ROW LEVEL SECURITY — enable on all tables
-- ─────────────────────────────────────────────────────────────

ALTER TABLE categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases   ENABLE ROW LEVEL SECURITY;

-- Drop old wide-open policies if they exist
DROP POLICY IF EXISTS "allow_all_categories" ON categories;
DROP POLICY IF EXISTS "allow_all_questions"  ON questions;
DROP POLICY IF EXISTS "allow_all_sessions"   ON sessions;
DROP POLICY IF EXISTS "allow_all_teams"      ON teams;
DROP POLICY IF EXISTS "allow_all_audit_log"  ON audit_log;

-- ─── categories ───────────────────────────────────────────────
-- Anyone can read active categories (needed for the game)
CREATE POLICY "cat_select_public"
  ON categories FOR SELECT USING (true);

-- Only admins can insert / update / delete
CREATE POLICY "cat_write_admin"
  ON categories FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── questions ────────────────────────────────────────────────
CREATE POLICY "q_select_public"
  ON questions FOR SELECT USING (true);

CREATE POLICY "q_write_admin"
  ON questions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── sessions ─────────────────────────────────────────────────
-- Authenticated users can create sessions and read their own
CREATE POLICY "sess_select_own"
  ON sessions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "sess_insert_auth"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "sess_admin_all"
  ON sessions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── teams ────────────────────────────────────────────────────
CREATE POLICY "teams_select_auth"
  ON teams FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "teams_insert_auth"
  ON teams FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "teams_admin_all"
  ON teams FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── audit_log ────────────────────────────────────────────────
-- Only admins can read; admins can write; no public access
CREATE POLICY "audit_admin_all"
  ON audit_log FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─── profiles ─────────────────────────────────────────────────
-- Users can read and update their own profile
CREATE POLICY "profile_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profile_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profile_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id AND is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid()));

-- Admins can read all profiles (for user management)
CREATE POLICY "profile_admin_select"
  ON profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Middleware needs to read profiles — allow service role reads
CREATE POLICY "profile_service_select"
  ON profiles FOR SELECT
  USING (true);

-- ─── purchases ────────────────────────────────────────────────
-- Users can read their own purchases
CREATE POLICY "purchases_select_own"
  ON purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Admins manage all purchases
CREATE POLICY "purchases_admin_all"
  ON purchases FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- ─────────────────────────────────────────────────────────────
-- 5. SEED DATA — Categories
-- ─────────────────────────────────────────────────────────────

INSERT INTO categories (name_en, name_ar, active) VALUES
  ('Science',      'العلوم',          true),
  ('History',      'التاريخ',         true),
  ('Geography',    'الجغرافيا',       true),
  ('Sports',       'الرياضة',         true),
  ('Movies & TV',  'أفلام وتلفزيون',  true),
  ('Music',        'الموسيقى',        true),
  ('Technology',   'التقنية',         true),
  ('Literature',   'الأدب',           false),
  ('Art',          'الفن',            false),
  ('Food & Drink', 'طعام وشراب',      true),
  ('Nature',       'الطبيعة',         false),
  ('Politics',     'السياسة',         false)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 6. SEED DATA — Questions
-- ─────────────────────────────────────────────────────────────

INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What is the chemical symbol for water?',                              'H₂O'                                  FROM categories WHERE name_en = 'Science' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'Which planet is known as the Red Planet?',                            'Mars'                                  FROM categories WHERE name_en = 'Science' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What gas do plants absorb during photosynthesis?',                    'Carbon dioxide (CO₂)'                  FROM categories WHERE name_en = 'Science' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What is the powerhouse of the cell?',                                 'The mitochondria'                      FROM categories WHERE name_en = 'Science' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What element has the atomic number 79?',                              'Gold (Au)'                             FROM categories WHERE name_en = 'Science' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What force causes objects to resist changes in state of motion?',     'Inertia'                               FROM categories WHERE name_en = 'Science' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'In what year did World War II end?',                                  '1945'                                  FROM categories WHERE name_en = 'History' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'Who was the first man to walk on the Moon?',                          'Neil Armstrong'                        FROM categories WHERE name_en = 'History' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Which ancient wonder was located in Alexandria, Egypt?',              'The Lighthouse of Alexandria'          FROM categories WHERE name_en = 'History' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What year did the Berlin Wall fall?',                                 '1989'                                  FROM categories WHERE name_en = 'History' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'Who was the first female Prime Minister of the United Kingdom?',      'Margaret Thatcher'                     FROM categories WHERE name_en = 'History' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What ship sank after hitting an iceberg in 1912?',                    'The Titanic'                           FROM categories WHERE name_en = 'History' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What is the capital city of France?',                                 'Paris'                                 FROM categories WHERE name_en = 'Geography' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'Which is the longest river in the world?',                            'The Nile'                              FROM categories WHERE name_en = 'Geography' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What country has the most natural lakes in the world?',               'Canada'                                FROM categories WHERE name_en = 'Geography' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What is the smallest country in the world by area?',                  'Vatican City'                          FROM categories WHERE name_en = 'Geography' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'Which mountain range separates Europe from Asia?',                    'The Ural Mountains'                    FROM categories WHERE name_en = 'Geography' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the capital city of Australia?',                              'Canberra'                              FROM categories WHERE name_en = 'Geography' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'How many players are on a soccer team on the field?',                 '11 players'                            FROM categories WHERE name_en = 'Sports' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'In which sport would you perform a slam dunk?',                       'Basketball'                            FROM categories WHERE name_en = 'Sports' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'How many Grand Slam tournaments are there in tennis?',                '4'                                     FROM categories WHERE name_en = 'Sports' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What country hosted the 2022 FIFA World Cup?',                        'Qatar'                                 FROM categories WHERE name_en = 'Sports' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'How many rings are on the Olympic flag?',                             '5 rings'                               FROM categories WHERE name_en = 'Sports' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the maximum score in a perfect game of bowling?',             '300'                                   FROM categories WHERE name_en = 'Sports' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What movie features the line I''ll be back?',                         'The Terminator'                        FROM categories WHERE name_en = 'Movies & TV' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'Which animated film features a character named Simba?',               'The Lion King'                         FROM categories WHERE name_en = 'Movies & TV' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Who directed the movie Titanic (1997)?',                              'James Cameron'                         FROM categories WHERE name_en = 'Movies & TV' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'In Breaking Bad, what drug does Walter White produce?',               'Methamphetamine (meth)'                FROM categories WHERE name_en = 'Movies & TV' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What is the highest-grossing film of all time (unadjusted)?',         'Avatar (2009)'                         FROM categories WHERE name_en = 'Movies & TV' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'In which film does Forrest Gump say Life is like a box of chocolates?','Forrest Gump'                          FROM categories WHERE name_en = 'Movies & TV' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'How many strings does a standard guitar have?',                       '6 strings'                             FROM categories WHERE name_en = 'Music' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'What singer is known as the Queen of Pop?',                           'Madonna'                               FROM categories WHERE name_en = 'Music' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Which band performed Bohemian Rhapsody?',                             'Queen'                                 FROM categories WHERE name_en = 'Music' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What is Beyoncé''s debut solo album?',                                'Dangerously in Love'                   FROM categories WHERE name_en = 'Music' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'Which composer wrote the Moonlight Sonata?',                          'Ludwig van Beethoven'                  FROM categories WHERE name_en = 'Music' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the best-selling album of all time?',                         'Thriller by Michael Jackson'           FROM categories WHERE name_en = 'Music' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What does WWW stand for?',                                            'World Wide Web'                        FROM categories WHERE name_en = 'Technology' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'What company created the iPhone?',                                    'Apple'                                 FROM categories WHERE name_en = 'Technology' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What programming language is primarily used for web styling?',        'CSS'                                   FROM categories WHERE name_en = 'Technology' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What does CPU stand for?',                                            'Central Processing Unit'               FROM categories WHERE name_en = 'Technology' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'In what year was the first iPhone released?',                         '2007'                                  FROM categories WHERE name_en = 'Technology' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the name of the world''s first programmable electronic computer?','ENIAC'                              FROM categories WHERE name_en = 'Technology' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'Who wrote Romeo and Juliet?',                                         'William Shakespeare'                   FROM categories WHERE name_en = 'Literature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'What is the first book of the Harry Potter series?',                  'The Philosopher''s Stone'              FROM categories WHERE name_en = 'Literature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Who wrote 1984?',                                                     'George Orwell'                         FROM categories WHERE name_en = 'Literature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'In which novel would you find the character Atticus Finch?',          'To Kill a Mockingbird'                 FROM categories WHERE name_en = 'Literature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What classic novel begins with "Call me Ishmael"?',                   'Moby-Dick'                             FROM categories WHERE name_en = 'Literature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'Who wrote One Hundred Years of Solitude?',                            'Gabriel García Márquez'                FROM categories WHERE name_en = 'Literature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'Who painted the Mona Lisa?',                                          'Leonardo da Vinci'                     FROM categories WHERE name_en = 'Art' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'In which museum is the Mona Lisa displayed?',                         'The Louvre, Paris'                     FROM categories WHERE name_en = 'Art' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Which artist cut off his own ear?',                                   'Vincent van Gogh'                      FROM categories WHERE name_en = 'Art' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What art movement did Salvador Dalí belong to?',                      'Surrealism'                            FROM categories WHERE name_en = 'Art' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'Who sculpted David?',                                                 'Michelangelo'                          FROM categories WHERE name_en = 'Art' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'Which painter is known for his water lily series?',                   'Claude Monet'                          FROM categories WHERE name_en = 'Art' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What is the main ingredient in guacamole?',                           'Avocado'                               FROM categories WHERE name_en = 'Food & Drink' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'From which country does sushi originate?',                            'Japan'                                 FROM categories WHERE name_en = 'Food & Drink' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What type of pastry is used to make a croissant?',                    'Laminated (puff) pastry'               FROM categories WHERE name_en = 'Food & Drink' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What compound gives turmeric its yellow color?',                      'Curcumin'                              FROM categories WHERE name_en = 'Food & Drink' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What is the traditional base of a Kyushu-style Ramen broth?',         'Tonkotsu (pork bone)'                  FROM categories WHERE name_en = 'Food & Drink' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What country produces the most coffee in the world?',                 'Brazil'                                FROM categories WHERE name_en = 'Food & Drink' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What is the largest animal on Earth?',                                'The blue whale'                        FROM categories WHERE name_en = 'Nature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'How many legs does a spider have?',                                   '8 legs'                                FROM categories WHERE name_en = 'Nature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What is the tallest type of tree in the world?',                      'Coast redwood (Sequoia sempervirens)'  FROM categories WHERE name_en = 'Nature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What do you call a group of lions?',                                  'A pride'                               FROM categories WHERE name_en = 'Nature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'How long is a giraffe''s tongue approximately?',                      'Around 45–50 cm (18–20 inches)'        FROM categories WHERE name_en = 'Nature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the process called when a caterpillar becomes a butterfly?',  'Metamorphosis'                         FROM categories WHERE name_en = 'Nature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'How many branches of government does the United States have?',        '3 (Legislative, Executive, Judicial)'  FROM categories WHERE name_en = 'Politics' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'What does NATO stand for?',                                           'North Atlantic Treaty Organization'    FROM categories WHERE name_en = 'Politics' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Who is the head of state in the United Kingdom?',                     'The King (currently King Charles III)' FROM categories WHERE name_en = 'Politics' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What is the name of the lower house of the Indian Parliament?',       'Lok Sabha'                             FROM categories WHERE name_en = 'Politics' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'In what year was the United Nations founded?',                        '1945'                                  FROM categories WHERE name_en = 'Politics' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What document signed in Maastricht in 1992 formed the European Union?','The Maastricht Treaty'                FROM categories WHERE name_en = 'Politics' ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 7. SEED AUDIT LOG
-- ─────────────────────────────────────────────────────────────

INSERT INTO audit_log (user_email, action, target, type) VALUES
  ('system', 'Database initialized', 'Schema v2.0', 'system'),
  ('system', 'Seed data loaded', '12 categories, 72 questions', 'create')
ON CONFLICT DO NOTHING;
