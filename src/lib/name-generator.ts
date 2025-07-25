const ADJECTIVES = [
  'Agile',
  'Happy',
  'Sly',
  'Wise',
  'Brave',
  'Mysterious',
  'Curious',
  'Witty',
  'Mischievous',
  'Kind',
  'Optimistic',
  'Creative',
  'Silent',
  'Brilliant',
  'Heroic',
  'Resilient',
  'Gentle',
  'Friendly',
];

const NOUNS = [
  'Lion',
  'Tiger',
  'Panther',
  'Eagle',
  'Shark',
  'Dragon',
  'Phoenix',
  'Wolf',
  'Bear',
  'Fox',
  'Hawk',
  'Unicorn',
  'Pirate',
  'Explorer',
  'Astronaut',
  'Warrior',
  'Wizard',
  'Knight',
  'Ninja',
];

export function generateRandomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj} ${noun}`;
}
