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

export const MOCK_QUESTIONS: Record<string, QuestionData[]> = {
  Science: [
    { points: 200, question: "What is the chemical symbol for water?", answer: "H₂O" },
    { points: 400, question: "Which planet is known as the Red Planet?", answer: "Mars" },
    { points: 600, question: "What gas do plants absorb from the atmosphere during photosynthesis?", answer: "Carbon dioxide (CO₂)" },
    { points: 800, question: "What is the powerhouse of the cell?", answer: "The mitochondria" },
    { points: 1000, question: "What element has the atomic number 79?", answer: "Gold (Au)" },
    { points: 1200, question: "What is the name of the force that causes objects to resist changes in their state of motion?", answer: "Inertia" },
  ],
  History: [
    { points: 200, question: "In what year did World War II end?", answer: "1945" },
    { points: 400, question: "Who was the first man to walk on the Moon?", answer: "Neil Armstrong" },
    { points: 600, question: "Which ancient wonder was located in Alexandria, Egypt?", answer: "The Lighthouse of Alexandria" },
    { points: 800, question: "What year did the Berlin Wall fall?", answer: "1989" },
    { points: 1000, question: "Who was the first female Prime Minister of the United Kingdom?", answer: "Margaret Thatcher" },
    { points: 1200, question: "What was the name of the ship that sank after hitting an iceberg in 1912?", answer: "The Titanic" },
  ],
  Geography: [
    { points: 200, question: "What is the capital city of France?", answer: "Paris" },
    { points: 400, question: "Which is the longest river in the world?", answer: "The Nile" },
    { points: 600, question: "What country has the most natural lakes in the world?", answer: "Canada" },
    { points: 800, question: "What is the smallest country in the world by area?", answer: "Vatican City" },
    { points: 1000, question: "Which mountain range separates Europe from Asia?", answer: "The Ural Mountains" },
    { points: 1200, question: "What is the capital city of Australia?", answer: "Canberra" },
  ],
  Sports: [
    { points: 200, question: "How many players are on a soccer team on the field?", answer: "11 players" },
    { points: 400, question: "In which sport would you perform a slam dunk?", answer: "Basketball" },
    { points: 600, question: "How many Grand Slam tournaments are there in tennis?", answer: "4" },
    { points: 800, question: "What country hosted the 2022 FIFA World Cup?", answer: "Qatar" },
    { points: 1000, question: "How many rings are on the Olympic flag?", answer: "5 rings" },
    { points: 1200, question: "What is the maximum score in a perfect game of bowling?", answer: "300" },
  ],
  "Movies & TV": [
    { points: 200, question: "What movie features the line 'I'll be back'?", answer: "The Terminator" },
    { points: 400, question: "Which animated film features a character named Simba?", answer: "The Lion King" },
    { points: 600, question: "Who directed the movie Titanic (1997)?", answer: "James Cameron" },
    { points: 800, question: "In Breaking Bad, what is Walter White's drug of choice to produce?", answer: "Methamphetamine (meth)" },
    { points: 1000, question: "What is the highest-grossing film of all time (unadjusted for inflation)?", answer: "Avatar (2009)" },
    { points: 1200, question: "In which film does the character Forrest Gump famously say 'Life is like a box of chocolates'?", answer: "Forrest Gump" },
  ],
  Music: [
    { points: 200, question: "How many strings does a standard guitar have?", answer: "6 strings" },
    { points: 400, question: "What singer is known as the 'Queen of Pop'?", answer: "Madonna" },
    { points: 600, question: "Which band performed 'Bohemian Rhapsody'?", answer: "Queen" },
    { points: 800, question: "What is the name of Beyoncé's debut solo album?", answer: "Dangerously in Love" },
    { points: 1000, question: "Which composer wrote the 'Moonlight Sonata'?", answer: "Ludwig van Beethoven" },
    { points: 1200, question: "What is the best-selling album of all time?", answer: "Thriller by Michael Jackson" },
  ],
  Technology: [
    { points: 200, question: "What does 'WWW' stand for?", answer: "World Wide Web" },
    { points: 400, question: "What company created the iPhone?", answer: "Apple" },
    { points: 600, question: "What programming language is primarily used for web styling?", answer: "CSS (Cascading Style Sheets)" },
    { points: 800, question: "What does 'CPU' stand for?", answer: "Central Processing Unit" },
    { points: 1000, question: "In what year was the first version of the iPhone released?", answer: "2007" },
    { points: 1200, question: "What is the name of the world's first programmable electronic computer?", answer: "ENIAC" },
  ],
  Literature: [
    { points: 200, question: "Who wrote 'Romeo and Juliet'?", answer: "William Shakespeare" },
    { points: 400, question: "What is the first book of the Harry Potter series?", answer: "Harry Potter and the Philosopher's Stone" },
    { points: 600, question: "Who wrote '1984'?", answer: "George Orwell" },
    { points: 800, question: "In which novel would you find the character Atticus Finch?", answer: "To Kill a Mockingbird" },
    { points: 1000, question: "What classic novel begins with 'Call me Ishmael'?", answer: "Moby-Dick" },
    { points: 1200, question: "Who wrote 'One Hundred Years of Solitude'?", answer: "Gabriel García Márquez" },
  ],
  Art: [
    { points: 200, question: "Who painted the Mona Lisa?", answer: "Leonardo da Vinci" },
    { points: 400, question: "In which museum is the Mona Lisa displayed?", answer: "The Louvre, Paris" },
    { points: 600, question: "Who cut off his own ear?", answer: "Vincent van Gogh" },
    { points: 800, question: "What art movement did Salvador Dalí belong to?", answer: "Surrealism" },
    { points: 1000, question: "Who sculpted 'David'?", answer: "Michelangelo" },
    { points: 1200, question: "Which painter is known for his series of water lily paintings?", answer: "Claude Monet" },
  ],
  "Food & Drink": [
    { points: 200, question: "What is the main ingredient in guacamole?", answer: "Avocado" },
    { points: 400, question: "From which country does sushi originate?", answer: "Japan" },
    { points: 600, question: "What type of pastry is used to make a croissant?", answer: "Laminated (puff) pastry" },
    { points: 800, question: "What is the spice that gives turmeric its yellow color?", answer: "Curcumin" },
    { points: 1000, question: "What is the traditional base of a Ramen broth from Kyushu?", answer: "Tonkotsu (pork bone)" },
    { points: 1200, question: "What country produces the most coffee in the world?", answer: "Brazil" },
  ],
  Nature: [
    { points: 200, question: "What is the largest animal on Earth?", answer: "The blue whale" },
    { points: 400, question: "How many legs does a spider have?", answer: "8 legs" },
    { points: 600, question: "What is the tallest type of tree in the world?", answer: "The coast redwood (Sequoia sempervirens)" },
    { points: 800, question: "What do you call a group of lions?", answer: "A pride" },
    { points: 1000, question: "How long is a giraffe's tongue approximately?", answer: "Around 45–50 cm (18–20 inches)" },
    { points: 1200, question: "What is the scientific name for the process by which a caterpillar becomes a butterfly?", answer: "Metamorphosis" },
  ],
  Politics: [
    { points: 200, question: "How many branches of government does the United States have?", answer: "3 (Legislative, Executive, Judicial)" },
    { points: 400, question: "What does 'NATO' stand for?", answer: "North Atlantic Treaty Organization" },
    { points: 600, question: "Who is the head of state in the United Kingdom?", answer: "The King (currently King Charles III)" },
    { points: 800, question: "What is the name of the lower house of the Indian Parliament?", answer: "Lok Sabha" },
    { points: 1000, question: "In what year was the United Nations founded?", answer: "1945" },
    { points: 1200, question: "What political and economic document was signed in Maastricht in 1992?", answer: "The Maastricht Treaty (forming the European Union)" },
  ],
};
