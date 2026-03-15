// TODO: Delete this file once the speaking page is wired to the real API.

export interface SpeakingMistake {
  word: string;
  expected: string;
  spoken: string;
  ipa: string;
  feedback: string;
}

export interface FeedbackResult {
  score: number;
  spokenText: string;
  ipaSentence: string;
  mistakes: SpeakingMistake[];
}

export const MOCK_GENERATED_TEXT =
  'The morning light filtered through the curtains as she prepared her bag for the language class.';

export const MOCK_FEEDBACK: FeedbackResult = {
  score: 74,
  spokenText: 'The morning light filterd through the cortens as she prepaired her bag.',
  ipaSentence: 'ðə ˈmɔːnɪŋ laɪt ˈfɪltərd θruː ðə ˈkɜːtənz æz ʃiː prɪˈpeərd hər bæɡ',
  mistakes: [
    {
      word: 'filtered',
      expected: 'filtered',
      spoken: 'filterd',
      ipa: '/ˈfɪltərd/',
      feedback: 'The final /d/ sound was dropped — make sure to close the syllable.',
    },
    {
      word: 'curtains',
      expected: 'curtains',
      spoken: 'cortens',
      ipa: '/ˈkɜːtənz/',
      feedback: '/ɜː/ vowel was shortened — hold the vowel longer.',
    },
    {
      word: 'prepared',
      expected: 'prepared',
      spoken: 'prepaired',
      ipa: '/prɪˈpeərd/',
      feedback: 'Use a schwa /ə/ in the unstressed syllable.',
    },
  ],
};
