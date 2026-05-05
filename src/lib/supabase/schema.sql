-- ============================================================
-- Omni-Verse Database Schema
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- 1. TABLES
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS categories (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name_en       TEXT NOT NULL,
  name_ar       TEXT NOT NULL DEFAULT '',
  active        BOOLEAN DEFAULT true,
  question_count INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS questions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id   UUID REFERENCES categories(id) ON DELETE CASCADE,
  points        INTEGER NOT NULL CHECK (points IN (200, 400, 600, 800, 1000, 1200)),
  question_en   TEXT NOT NULL,
  answer_en     TEXT NOT NULL,
  question_ar   TEXT DEFAULT '',
  answer_ar     TEXT DEFAULT '',
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sessions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT NOT NULL,
  game_mode       TEXT DEFAULT 'team' CHECK (game_mode IN ('solo', 'team')),
  category_names  TEXT[] DEFAULT '{}',
  total_questions INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS teams (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID REFERENCES sessions(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  score       INTEGER DEFAULT 0,
  rank        INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email  TEXT DEFAULT 'admin',
  action      TEXT NOT NULL,
  target      TEXT DEFAULT '',
  type        TEXT DEFAULT 'system' CHECK (type IN ('create', 'update', 'delete', 'login', 'system')),
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 2. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams       ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log   ENABLE ROW LEVEL SECURITY;

-- Allow full public access (lock down after adding proper admin auth)
CREATE POLICY "allow_all_categories"  ON categories  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_questions"   ON questions   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_sessions"    ON sessions    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_teams"       ON teams       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_audit_log"   ON audit_log   FOR ALL USING (true) WITH CHECK (true);

-- 3. FUNCTION: auto-update question_count on categories
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

CREATE TRIGGER trg_question_count
AFTER INSERT OR DELETE ON questions
FOR EACH ROW EXECUTE FUNCTION update_category_question_count();

-- 4. SEED DATA — Categories
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
  ('Politics',     'السياسة',         false);

-- 5. SEED DATA — Questions
-- ─────────────────────────────────────────────────────────────

-- Science
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What is the chemical symbol for water?',                                           'H₂O'                                  FROM categories WHERE name_en = 'Science';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'Which planet is known as the Red Planet?',                                         'Mars'                                  FROM categories WHERE name_en = 'Science';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What gas do plants absorb during photosynthesis?',                                 'Carbon dioxide (CO₂)'                  FROM categories WHERE name_en = 'Science';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What is the powerhouse of the cell?',                                              'The mitochondria'                      FROM categories WHERE name_en = 'Science';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What element has the atomic number 79?',                                           'Gold (Au)'                             FROM categories WHERE name_en = 'Science';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What force causes objects to resist changes in their state of motion?',            'Inertia'                               FROM categories WHERE name_en = 'Science';

-- History
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'In what year did World War II end?',                                               '1945'                                  FROM categories WHERE name_en = 'History';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'Who was the first man to walk on the Moon?',                                       'Neil Armstrong'                        FROM categories WHERE name_en = 'History';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Which ancient wonder was located in Alexandria, Egypt?',                           'The Lighthouse of Alexandria'          FROM categories WHERE name_en = 'History';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What year did the Berlin Wall fall?',                                              '1989'                                  FROM categories WHERE name_en = 'History';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'Who was the first female Prime Minister of the United Kingdom?',                   'Margaret Thatcher'                     FROM categories WHERE name_en = 'History';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What was the name of the ship that sank after hitting an iceberg in 1912?',        'The Titanic'                           FROM categories WHERE name_en = 'History';

-- Geography
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What is the capital city of France?',                                              'Paris'                                 FROM categories WHERE name_en = 'Geography';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'Which is the longest river in the world?',                                         'The Nile'                              FROM categories WHERE name_en = 'Geography';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What country has the most natural lakes in the world?',                            'Canada'                                FROM categories WHERE name_en = 'Geography';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What is the smallest country in the world by area?',                               'Vatican City'                          FROM categories WHERE name_en = 'Geography';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'Which mountain range separates Europe from Asia?',                                 'The Ural Mountains'                    FROM categories WHERE name_en = 'Geography';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the capital city of Australia?',                                           'Canberra'                              FROM categories WHERE name_en = 'Geography';

-- Sports
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'How many players are on a soccer team on the field?',                              '11 players'                            FROM categories WHERE name_en = 'Sports';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'In which sport would you perform a slam dunk?',                                    'Basketball'                            FROM categories WHERE name_en = 'Sports';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'How many Grand Slam tournaments are there in tennis?',                             '4'                                     FROM categories WHERE name_en = 'Sports';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What country hosted the 2022 FIFA World Cup?',                                     'Qatar'                                 FROM categories WHERE name_en = 'Sports';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'How many rings are on the Olympic flag?',                                          '5 rings'                               FROM categories WHERE name_en = 'Sports';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the maximum score in a perfect game of bowling?',                          '300'                                   FROM categories WHERE name_en = 'Sports';

-- Movies & TV
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What movie features the line "I''ll be back"?',                                    'The Terminator'                        FROM categories WHERE name_en = 'Movies & TV';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'Which animated film features a character named Simba?',                            'The Lion King'                         FROM categories WHERE name_en = 'Movies & TV';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Who directed the movie Titanic (1997)?',                                           'James Cameron'                         FROM categories WHERE name_en = 'Movies & TV';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'In Breaking Bad, what drug does Walter White produce?',                            'Methamphetamine (meth)'                FROM categories WHERE name_en = 'Movies & TV';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What is the highest-grossing film of all time (unadjusted)?',                      'Avatar (2009)'                         FROM categories WHERE name_en = 'Movies & TV';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'In which film does Forrest Gump say "Life is like a box of chocolates"?',          'Forrest Gump'                          FROM categories WHERE name_en = 'Movies & TV';

-- Music
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'How many strings does a standard guitar have?',                                    '6 strings'                             FROM categories WHERE name_en = 'Music';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'What singer is known as the Queen of Pop?',                                        'Madonna'                               FROM categories WHERE name_en = 'Music';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Which band performed Bohemian Rhapsody?',                                          'Queen'                                 FROM categories WHERE name_en = 'Music';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What is the name of Beyoncé''s debut solo album?',                                 'Dangerously in Love'                   FROM categories WHERE name_en = 'Music';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'Which composer wrote the Moonlight Sonata?',                                       'Ludwig van Beethoven'                  FROM categories WHERE name_en = 'Music';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the best-selling album of all time?',                                      'Thriller by Michael Jackson'           FROM categories WHERE name_en = 'Music';

-- Technology
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What does WWW stand for?',                                                         'World Wide Web'                        FROM categories WHERE name_en = 'Technology';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'What company created the iPhone?',                                                 'Apple'                                 FROM categories WHERE name_en = 'Technology';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What programming language is primarily used for web styling?',                     'CSS'                                   FROM categories WHERE name_en = 'Technology';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What does CPU stand for?',                                                         'Central Processing Unit'               FROM categories WHERE name_en = 'Technology';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'In what year was the first version of the iPhone released?',                       '2007'                                  FROM categories WHERE name_en = 'Technology';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the name of the world''s first programmable electronic computer?',         'ENIAC'                                 FROM categories WHERE name_en = 'Technology';

-- Literature
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'Who wrote Romeo and Juliet?',                                                      'William Shakespeare'                   FROM categories WHERE name_en = 'Literature';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'What is the first book of the Harry Potter series?',                               'The Philosopher''s Stone'              FROM categories WHERE name_en = 'Literature';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Who wrote 1984?',                                                                  'George Orwell'                         FROM categories WHERE name_en = 'Literature';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'In which novel would you find the character Atticus Finch?',                       'To Kill a Mockingbird'                 FROM categories WHERE name_en = 'Literature';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What classic novel begins with "Call me Ishmael"?',                                'Moby-Dick'                             FROM categories WHERE name_en = 'Literature';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'Who wrote One Hundred Years of Solitude?',                                         'Gabriel García Márquez'                FROM categories WHERE name_en = 'Literature';

-- Art
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'Who painted the Mona Lisa?',                                                       'Leonardo da Vinci'                     FROM categories WHERE name_en = 'Art';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'In which museum is the Mona Lisa displayed?',                                      'The Louvre, Paris'                     FROM categories WHERE name_en = 'Art';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Which artist cut off his own ear?',                                                'Vincent van Gogh'                      FROM categories WHERE name_en = 'Art';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What art movement did Salvador Dalí belong to?',                                   'Surrealism'                            FROM categories WHERE name_en = 'Art';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'Who sculpted David?',                                                              'Michelangelo'                          FROM categories WHERE name_en = 'Art';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'Which painter is known for his water lily series?',                                'Claude Monet'                          FROM categories WHERE name_en = 'Art';

-- Food & Drink
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What is the main ingredient in guacamole?',                                        'Avocado'                               FROM categories WHERE name_en = 'Food & Drink';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'From which country does sushi originate?',                                         'Japan'                                 FROM categories WHERE name_en = 'Food & Drink';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What type of pastry is used to make a croissant?',                                 'Laminated (puff) pastry'               FROM categories WHERE name_en = 'Food & Drink';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What compound gives turmeric its yellow color?',                                   'Curcumin'                              FROM categories WHERE name_en = 'Food & Drink';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'What is the traditional base of a Kyushu-style Ramen broth?',                      'Tonkotsu (pork bone)'                  FROM categories WHERE name_en = 'Food & Drink';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What country produces the most coffee in the world?',                              'Brazil'                                FROM categories WHERE name_en = 'Food & Drink';

-- Nature
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'What is the largest animal on Earth?',                                             'The blue whale'                        FROM categories WHERE name_en = 'Nature';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'How many legs does a spider have?',                                                '8 legs'                                FROM categories WHERE name_en = 'Nature';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'What is the tallest type of tree in the world?',                                   'Coast redwood (Sequoia sempervirens)'  FROM categories WHERE name_en = 'Nature';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What do you call a group of lions?',                                               'A pride'                               FROM categories WHERE name_en = 'Nature';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'How long is a giraffe''s tongue approximately?',                                   'Around 45–50 cm (18–20 inches)'        FROM categories WHERE name_en = 'Nature';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What is the process called when a caterpillar becomes a butterfly?',               'Metamorphosis'                         FROM categories WHERE name_en = 'Nature';

-- Politics
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 200,  'How many branches of government does the United States have?',                     '3 (Legislative, Executive, Judicial)'  FROM categories WHERE name_en = 'Politics';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 400,  'What does NATO stand for?',                                                        'North Atlantic Treaty Organization'    FROM categories WHERE name_en = 'Politics';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 600,  'Who is the head of state in the United Kingdom?',                                  'The King (currently King Charles III)' FROM categories WHERE name_en = 'Politics';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 800,  'What is the name of the lower house of the Indian Parliament?',                    'Lok Sabha'                             FROM categories WHERE name_en = 'Politics';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1000, 'In what year was the United Nations founded?',                                     '1945'                                  FROM categories WHERE name_en = 'Politics';
INSERT INTO questions (category_id, points, question_en, answer_en) SELECT id, 1200, 'What document signed in Maastricht in 1992 formed the European Union?',            'The Maastricht Treaty'                 FROM categories WHERE name_en = 'Politics';

-- 6. SEED AUDIT LOG
-- ─────────────────────────────────────────────────────────────

INSERT INTO audit_log (user_email, action, target, type) VALUES
  ('system', 'Database initialized', 'Schema v1.0', 'system'),
  ('system', 'Seed data loaded', '12 categories, 72 questions', 'create');
