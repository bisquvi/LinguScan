export type RootStackParamList = {
    Upload: undefined;
    Decks: undefined;
    DeckDetail: { deckId: number; deckName: string };
    SentenceDecks: undefined;
    SentenceDeckDetail: { deckId: number; deckName: string };
    QuizMode: { deckId: number; deckName: string };
    Quiz: { deckId: number; sessionId: number; quizType: 'recall' | 'multiple_choice'; cards: any[] };
    QuizResult: { result: any };
    Dashboard: undefined;
    Settings: undefined;
    ProfileDetails: undefined;
};
