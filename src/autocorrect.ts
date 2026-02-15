const COMMON_REPLACEMENTS: Record<string, string> = {
  teh: 'the',
  recieve: 'receive',
  adress: 'address',
  seperate: 'separate',
  occured: 'occurred',
  definately: 'definitely',
  goverment: 'government',
  wich: 'which',
  becuase: 'because',
  langauge: 'language',
};

function preserveCase(original: string, replacement: string): string {
  if (original.toUpperCase() === original) {
    return replacement.toUpperCase();
  }
  if (original[0]?.toUpperCase() === original[0]) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function autoCorrectEnglishText(input: string): string {
  let corrected = input;

  corrected = corrected.replace(/\s+/g, ' ').trim();
  corrected = corrected.replace(/\s+([,.!?;:])/g, '$1');
  corrected = corrected.replace(/([,.!?;:])([^\s])/g, '$1 $2');

  corrected = corrected.replace(/\b([A-Za-z']+)\b/g, (word) => {
    const replacement = COMMON_REPLACEMENTS[word.toLowerCase()];
    return replacement ? preserveCase(word, replacement) : word;
  });

  corrected = corrected.replace(/(^|[.!?]\s+)([a-z])/g, (match, prefix, letter) => {
    return `${prefix}${letter.toUpperCase()}`;
  });

  return corrected;
}
