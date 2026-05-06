export interface QuestionData {
  points: number;
  question: string;
  answer: string;
}

export const POINT_VALUES = [200, 400, 600, 800, 1000, 1200];

export const ALL_CATEGORIES = [
  "Science", "History", "Geography", "Sports",
  "Movies & TV", "Music", "Technology", "Literature",
  "Art", "Food & Drink", "Nature", "Politics",
];

// Difficulty scale:
// 200  — Everyone knows this (trivial)
// 400  — Most adults know this (common knowledge)
// 600  — Requires some education or interest in the subject
// 800  — Requires specific knowledge; many people would guess
// 1000 — Hard; requires deep interest or study
// 1200 — Expert level; most people do not know this

export const MOCK_QUESTIONS: Record<string, QuestionData[]> = {
  Science: [
    { points: 200,  question: "How many planets are in our solar system?",                                          answer: "8" },
    { points: 400,  question: "What is the chemical symbol for gold?",                                              answer: "Au" },
    { points: 600,  question: "Which organ in the human body produces insulin?",                                    answer: "The pancreas" },
    { points: 800,  question: "What is the name of the process by which a solid turns directly into a gas?",       answer: "Sublimation" },
    { points: 1000, question: "What is the atomic number of carbon?",                                              answer: "6" },
    { points: 1200, question: "What is the half-life of Carbon-14, used in radiocarbon dating?",                   answer: "Approximately 5,730 years" },
  ],
  History: [
    { points: 200,  question: "Who was the first President of the United States?",                                 answer: "George Washington" },
    { points: 400,  question: "In what year did World War I begin?",                                               answer: "1914" },
    { points: 600,  question: "What was the name of the first artificial satellite launched into space?",          answer: "Sputnik 1" },
    { points: 800,  question: "Who was the leader of the Soviet Union during the Cuban Missile Crisis?",           answer: "Nikita Khrushchev" },
    { points: 1000, question: "What was the name of the treaty that officially ended World War I?",                answer: "The Treaty of Versailles" },
    { points: 1200, question: "In what year did the Byzantine Empire fall to the Ottoman Turks?",                  answer: "1453" },
  ],
  Geography: [
    { points: 200,  question: "What is the capital city of France?",                                              answer: "Paris" },
    { points: 400,  question: "What is the largest continent by area?",                                           answer: "Asia" },
    { points: 600,  question: "Which country has the most natural lakes in the world?",                           answer: "Canada" },
    { points: 800,  question: "What is the name of the world's largest hot desert?",                              answer: "The Sahara Desert" },
    { points: 1000, question: "What is the capital city of Kazakhstan?",                                          answer: "Astana" },
    { points: 1200, question: "Through how many countries does the Danube River flow?",                           answer: "10 countries" },
  ],
  Sports: [
    { points: 200,  question: "How many players from one team are on the court in basketball?",                   answer: "5 players" },
    { points: 400,  question: "In which country was the first FIFA World Cup held?",                              answer: "Uruguay (1930)" },
    { points: 600,  question: "How many holes are played in a standard round of golf?",                           answer: "18 holes" },
    { points: 800,  question: "In what year were the first modern Olympic Games held?",                           answer: "1896 (Athens, Greece)" },
    { points: 1000, question: "What is the maximum number of sets in a men's Grand Slam singles match?",          answer: "5 sets" },
    { points: 1200, question: "What is the official weight of the men's Olympic shot put in kilograms?",          answer: "7.26 kg" },
  ],
  "Movies & TV": [
    { points: 200,  question: "Which animated Disney film features a young lion named Simba?",                    answer: "The Lion King" },
    { points: 400,  question: "Who played Iron Man in the Marvel Cinematic Universe?",                            answer: "Robert Downey Jr." },
    { points: 600,  question: "Which director made The Dark Knight (2008) and Inception (2010)?",                answer: "Christopher Nolan" },
    { points: 800,  question: "In what year was the original Star Wars film first released?",                     answer: "1977" },
    { points: 1000, question: "What is the name of the fictional African country in Black Panther?",              answer: "Wakanda" },
    { points: 1200, question: "Who directed the 1968 science fiction epic 2001: A Space Odyssey?",               answer: "Stanley Kubrick" },
  ],
  Music: [
    { points: 200,  question: "How many strings does a standard guitar have?",                                    answer: "6 strings" },
    { points: 400,  question: "Which band recorded the song 'Bohemian Rhapsody'?",                               answer: "Queen" },
    { points: 600,  question: "What is the musical term for the speed or pace of a piece of music?",             answer: "Tempo" },
    { points: 800,  question: "In what year did Michael Jackson release the album 'Thriller'?",                  answer: "1982" },
    { points: 1000, question: "Who composed the opera 'The Magic Flute' (Die Zauberflöte)?",                     answer: "Wolfgang Amadeus Mozart" },
    { points: 1200, question: "What is the name of the scale that includes all 12 half-steps within one octave?",answer: "The chromatic scale" },
  ],
  Technology: [
    { points: 200,  question: "What does 'CPU' stand for?",                                                       answer: "Central Processing Unit" },
    { points: 400,  question: "Who co-founded Apple Inc. alongside Steve Jobs?",                                  answer: "Steve Wozniak" },
    { points: 600,  question: "What programming language was created by Guido van Rossum?",                       answer: "Python" },
    { points: 800,  question: "In what year did Tim Berners-Lee invent the World Wide Web?",                     answer: "1989" },
    { points: 1000, question: "What does 'HTTP' stand for?",                                                      answer: "Hypertext Transfer Protocol" },
    { points: 1200, question: "What encryption standard replaced DES as the US federal standard in 2001?",       answer: "AES (Advanced Encryption Standard)" },
  ],
  Literature: [
    { points: 200,  question: "Who wrote the play 'Romeo and Juliet'?",                                          answer: "William Shakespeare" },
    { points: 400,  question: "In which novel does the wealthy and mysterious character Jay Gatsby appear?",      answer: "The Great Gatsby" },
    { points: 600,  question: "What is the subtitle of Mary Shelley's novel 'Frankenstein'?",                    answer: "The Modern Prometheus" },
    { points: 800,  question: "Who wrote the epic poem 'Paradise Lost'?",                                        answer: "John Milton" },
    { points: 1000, question: "In what language did Dante Alighieri originally write the 'Divine Comedy'?",      answer: "Italian (Tuscan dialect)" },
    { points: 1200, question: "What is the name of the narrator in Vladimir Nabokov's novel 'Lolita'?",          answer: "Humbert Humbert" },
  ],
  Art: [
    { points: 200,  question: "Who painted the Mona Lisa?",                                                      answer: "Leonardo da Vinci" },
    { points: 400,  question: "Which Spanish artist co-founded the Cubist movement?",                            answer: "Pablo Picasso" },
    { points: 600,  question: "In which century did the Italian Renaissance begin?",                             answer: "The 14th century (1300s)" },
    { points: 800,  question: "Which Dutch Golden Age painter created 'Girl with a Pearl Earring'?",             answer: "Johannes Vermeer" },
    { points: 1000, question: "What is the term for applying paint so thickly it creates a 3D textured surface?",answer: "Impasto" },
    { points: 1200, question: "Who sculpted the famous statue 'The Thinker'?",                                   answer: "Auguste Rodin" },
  ],
  "Food & Drink": [
    { points: 200,  question: "What fruit is the main ingredient in guacamole?",                                  answer: "Avocado" },
    { points: 400,  question: "From which country does pizza originally come?",                                   answer: "Italy" },
    { points: 600,  question: "What is the Japanese alcoholic drink made from fermented rice called?",            answer: "Sake" },
    { points: 800,  question: "What expensive spice comes from the dried stigmas of Crocus sativus flowers?",    answer: "Saffron" },
    { points: 1000, question: "What French technique involves cooking vacuum-sealed food in a temperature-controlled water bath?", answer: "Sous vide" },
    { points: 1200, question: "What chemical reaction between amino acids and sugars causes food to brown when cooked?", answer: "The Maillard reaction" },
  ],
  Nature: [
    { points: 200,  question: "What is the largest animal on Earth?",                                            answer: "The blue whale" },
    { points: 400,  question: "How many bones does an adult human body have?",                                   answer: "206 bones" },
    { points: 600,  question: "What is the name of the deepest known point in the ocean?",                      answer: "Challenger Deep (Mariana Trench)" },
    { points: 800,  question: "What is the term for an animal that is active during dawn and dusk (twilight)?",  answer: "Crepuscular" },
    { points: 1000, question: "What is the scientific term for the process by which trees shed their leaves?",   answer: "Abscission" },
    { points: 1200, question: "What is the approximate number of neurons in the human brain?",                   answer: "About 86 billion neurons" },
  ],
  Politics: [
    { points: 200,  question: "How many permanent members does the UN Security Council have?",                   answer: "5 permanent members" },
    { points: 400,  question: "What does 'NATO' stand for?",                                                     answer: "North Atlantic Treaty Organization" },
    { points: 600,  question: "What political system divides power between a central and regional governments?", answer: "Federalism" },
    { points: 800,  question: "In what year was the Universal Declaration of Human Rights adopted by the UN?",   answer: "1948" },
    { points: 1000, question: "Who was the first Secretary-General of the United Nations?",                     answer: "Trygve Lie (Norway)" },
    { points: 1200, question: "What Latin term describes the legal principle that past court decisions must be followed?", answer: "Stare decisis" },
  ],
};
