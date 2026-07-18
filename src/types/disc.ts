export type DiscCategory = 'D' | 'I' | 'S' | 'C';

export interface Choice {
  id: string; // e.g., 'a', 'b', 'c', 'd'
  text: string; // Indonesian text choice
  indicator: DiscCategory; // 'D' | 'I' | 'S' | 'C'
}

export interface Question {
  id: number;
  choices: Choice[];
}

export interface DiscScore {
  D: number;
  I: number;
  S: number;
  C: number;
}

export interface DiscResult {
  most: DiscScore;
  least: DiscScore;
  diff: DiscScore;
}
