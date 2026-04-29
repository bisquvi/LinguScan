export interface OCRBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface WordResult {
    text: string;
    box: OCRBox;
}

export interface OCRResult {
    text: string;
    box: OCRBox;
    words: WordResult[];
}

export type ViewMode = 'words' | 'sentences' | 'fulltext';
