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

-- Profiles: one row per auth user, stores username + admin flag + developer level
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username        TEXT UNIQUE,
  is_admin        BOOLEAN DEFAULT false,
  developer_level TEXT CHECK (developer_level IN ('basic', 'senior')),
  created_at      TIMESTAMPTZ DEFAULT now()
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

-- Admins can do everything with questions
CREATE POLICY "q_write_admin"
  ON questions FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Basic developers can INSERT questions only (no update/delete)
CREATE POLICY "q_insert_developer"
  ON questions FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND developer_level IS NOT NULL)
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

-- Admins can read and update all profiles (for user management / developer roles)
CREATE POLICY "profile_admin_all"
  ON profiles FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Middleware needs to read profiles for all authenticated requests
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

-- Science
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'How many planets are in our solar system?',                                              '8'                                       FROM categories WHERE name_en = 'Science' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'What is the chemical symbol for gold?',                                                  'Au'                                      FROM categories WHERE name_en = 'Science' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Which organ in the human body produces insulin?',                                        'The pancreas'                            FROM categories WHERE name_en = 'Science' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What is the name of the process by which a solid turns directly into a gas?',           'Sublimation'                             FROM categories WHERE name_en = 'Science' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What is the atomic number of carbon?',                                                   '6'                                       FROM categories WHERE name_en = 'Science' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the half-life of Carbon-14, used in radiocarbon dating?',                        'Approximately 5,730 years'               FROM categories WHERE name_en = 'Science' ON CONFLICT DO NOTHING;
-- History
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'Who was the first President of the United States?',                                      'George Washington'                       FROM categories WHERE name_en = 'History' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'In what year did World War I begin?',                                                    '1914'                                    FROM categories WHERE name_en = 'History' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What was the name of the first artificial satellite launched into space?',               'Sputnik 1'                               FROM categories WHERE name_en = 'History' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'Who was the leader of the Soviet Union during the Cuban Missile Crisis?',                'Nikita Khrushchev'                       FROM categories WHERE name_en = 'History' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What was the name of the treaty that officially ended World War I?',                     'The Treaty of Versailles'                FROM categories WHERE name_en = 'History' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'In what year did the Byzantine Empire fall to the Ottoman Turks?',                       '1453'                                    FROM categories WHERE name_en = 'History' ON CONFLICT DO NOTHING;
-- Geography
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What is the capital city of France?',                                                    'Paris'                                   FROM categories WHERE name_en = 'Geography' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'What is the largest continent by area?',                                                 'Asia'                                    FROM categories WHERE name_en = 'Geography' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Which country has the most natural lakes in the world?',                                 'Canada'                                  FROM categories WHERE name_en = 'Geography' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What is the name of the world''s largest hot desert?',                                   'The Sahara Desert'                       FROM categories WHERE name_en = 'Geography' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What is the capital city of Kazakhstan?',                                                 'Astana'                                  FROM categories WHERE name_en = 'Geography' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'Through how many countries does the Danube River flow?',                                 '10 countries'                            FROM categories WHERE name_en = 'Geography' ON CONFLICT DO NOTHING;
-- Sports
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'How many players from one team are on the court in basketball?',                         '5 players'                               FROM categories WHERE name_en = 'Sports' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'In which country was the first FIFA World Cup held?',                                    'Uruguay (1930)'                          FROM categories WHERE name_en = 'Sports' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'How many holes are played in a standard round of golf?',                                 '18 holes'                                FROM categories WHERE name_en = 'Sports' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'In what year were the first modern Olympic Games held?',                                  '1896 (Athens, Greece)'                   FROM categories WHERE name_en = 'Sports' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What is the maximum number of sets in a men''s Grand Slam singles match?',               '5 sets'                                  FROM categories WHERE name_en = 'Sports' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the official weight of the men''s Olympic shot put in kilograms?',               '7.26 kg'                                 FROM categories WHERE name_en = 'Sports' ON CONFLICT DO NOTHING;
-- Movies & TV
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'Which animated Disney film features a young lion named Simba?',                          'The Lion King'                           FROM categories WHERE name_en = 'Movies & TV' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'Who played Iron Man in the Marvel Cinematic Universe?',                                  'Robert Downey Jr.'                       FROM categories WHERE name_en = 'Movies & TV' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Which director made The Dark Knight (2008) and Inception (2010)?',                      'Christopher Nolan'                       FROM categories WHERE name_en = 'Movies & TV' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'In what year was the original Star Wars film first released?',                           '1977'                                    FROM categories WHERE name_en = 'Movies & TV' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What is the name of the fictional African country in Black Panther?',                    'Wakanda'                                 FROM categories WHERE name_en = 'Movies & TV' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'Who directed the 1968 science fiction epic 2001: A Space Odyssey?',                     'Stanley Kubrick'                         FROM categories WHERE name_en = 'Movies & TV' ON CONFLICT DO NOTHING;
-- Music
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'How many strings does a standard guitar have?',                                          '6 strings'                               FROM categories WHERE name_en = 'Music' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'Which band recorded the song Bohemian Rhapsody?',                                        'Queen'                                   FROM categories WHERE name_en = 'Music' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What is the musical term for the speed or pace of a piece of music?',                   'Tempo'                                   FROM categories WHERE name_en = 'Music' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'In what year did Michael Jackson release the album Thriller?',                           '1982'                                    FROM categories WHERE name_en = 'Music' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'Who composed the opera The Magic Flute?',                                                'Wolfgang Amadeus Mozart'                 FROM categories WHERE name_en = 'Music' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the name of the scale that includes all 12 half-steps within one octave?',      'The chromatic scale'                     FROM categories WHERE name_en = 'Music' ON CONFLICT DO NOTHING;
-- Technology
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What does CPU stand for?',                                                               'Central Processing Unit'                 FROM categories WHERE name_en = 'Technology' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'Who co-founded Apple Inc. alongside Steve Jobs?',                                        'Steve Wozniak'                           FROM categories WHERE name_en = 'Technology' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What programming language was created by Guido van Rossum?',                            'Python'                                  FROM categories WHERE name_en = 'Technology' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'In what year did Tim Berners-Lee invent the World Wide Web?',                           '1989'                                    FROM categories WHERE name_en = 'Technology' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What does HTTP stand for?',                                                              'Hypertext Transfer Protocol'             FROM categories WHERE name_en = 'Technology' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What encryption standard replaced DES as the US federal standard in 2001?',             'AES (Advanced Encryption Standard)'      FROM categories WHERE name_en = 'Technology' ON CONFLICT DO NOTHING;
-- Literature
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'Who wrote the play Romeo and Juliet?',                                                   'William Shakespeare'                     FROM categories WHERE name_en = 'Literature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'In which novel does the wealthy and mysterious character Jay Gatsby appear?',            'The Great Gatsby'                        FROM categories WHERE name_en = 'Literature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What is the subtitle of Mary Shelley''s novel Frankenstein?',                            'The Modern Prometheus'                   FROM categories WHERE name_en = 'Literature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'Who wrote the epic poem Paradise Lost?',                                                  'John Milton'                             FROM categories WHERE name_en = 'Literature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'In what language did Dante Alighieri originally write the Divine Comedy?',               'Italian (Tuscan dialect)'                FROM categories WHERE name_en = 'Literature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the name of the narrator in Vladimir Nabokov''s novel Lolita?',                 'Humbert Humbert'                         FROM categories WHERE name_en = 'Literature' ON CONFLICT DO NOTHING;
-- Art
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'Who painted the Mona Lisa?',                                                             'Leonardo da Vinci'                       FROM categories WHERE name_en = 'Art' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'Which Spanish artist co-founded the Cubist movement?',                                   'Pablo Picasso'                           FROM categories WHERE name_en = 'Art' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'In which century did the Italian Renaissance begin?',                                    'The 14th century (1300s)'                FROM categories WHERE name_en = 'Art' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'Which Dutch Golden Age painter created Girl with a Pearl Earring?',                      'Johannes Vermeer'                        FROM categories WHERE name_en = 'Art' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What is the term for applying paint so thickly it creates a 3D textured surface?',      'Impasto'                                 FROM categories WHERE name_en = 'Art' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'Who sculpted the famous statue The Thinker?',                                             'Auguste Rodin'                           FROM categories WHERE name_en = 'Art' ON CONFLICT DO NOTHING;
-- Food & Drink
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What fruit is the main ingredient in guacamole?',                                        'Avocado'                                 FROM categories WHERE name_en = 'Food & Drink' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'From which country does pizza originally come?',                                         'Italy'                                   FROM categories WHERE name_en = 'Food & Drink' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What is the Japanese alcoholic drink made from fermented rice called?',                  'Sake'                                    FROM categories WHERE name_en = 'Food & Drink' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What expensive spice comes from the dried stigmas of Crocus sativus flowers?',           'Saffron'                                 FROM categories WHERE name_en = 'Food & Drink' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What French technique involves cooking vacuum-sealed food in a temperature-controlled water bath?', 'Sous vide'               FROM categories WHERE name_en = 'Food & Drink' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What chemical reaction between amino acids and sugars causes food to brown when cooked?', 'The Maillard reaction'                  FROM categories WHERE name_en = 'Food & Drink' ON CONFLICT DO NOTHING;
-- Nature
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What is the largest animal on Earth?',                                                   'The blue whale'                          FROM categories WHERE name_en = 'Nature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'How many bones does an adult human body have?',                                          '206 bones'                               FROM categories WHERE name_en = 'Nature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What is the name of the deepest known point in the ocean?',                             'Challenger Deep (Mariana Trench)'        FROM categories WHERE name_en = 'Nature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What is the term for an animal that is active during dawn and dusk?',                   'Crepuscular'                             FROM categories WHERE name_en = 'Nature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What is the scientific term for the process by which trees shed their leaves?',         'Abscission'                              FROM categories WHERE name_en = 'Nature' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the approximate number of neurons in the human brain?',                         'About 86 billion neurons'               FROM categories WHERE name_en = 'Nature' ON CONFLICT DO NOTHING;
-- Politics
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'How many permanent members does the UN Security Council have?',                         '5 permanent members'                     FROM categories WHERE name_en = 'Politics' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'What does NATO stand for?',                                                              'North Atlantic Treaty Organization'      FROM categories WHERE name_en = 'Politics' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What political system divides power between a central and regional governments?',        'Federalism'                              FROM categories WHERE name_en = 'Politics' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'In what year was the Universal Declaration of Human Rights adopted by the UN?',         '1948'                                    FROM categories WHERE name_en = 'Politics' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'Who was the first Secretary-General of the United Nations?',                            'Trygve Lie (Norway)'                    FROM categories WHERE name_en = 'Politics' ON CONFLICT DO NOTHING;
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What Latin term describes the legal principle that past court decisions must be followed?', 'Stare decisis'                       FROM categories WHERE name_en = 'Politics' ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 7. SEED AUDIT LOG
-- ─────────────────────────────────────────────────────────────

INSERT INTO audit_log (user_email, action, target, type) VALUES
  ('system', 'Database initialized', 'Schema v2.0', 'system'),
  ('system', 'Seed data loaded', '12 categories, 72 questions', 'create')
ON CONFLICT DO NOTHING;
