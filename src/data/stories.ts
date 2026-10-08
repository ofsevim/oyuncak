import { adventureStories } from './stories/adventure';
import { animalStories } from './stories/animals';
import { sleepStories } from './stories/sleep';
import { learningStories } from './stories/learning';
import { friendshipStories } from './stories/friendship';

export type StoryCategory = 'adventure' | 'animal' | 'sleep' | 'education' | 'friendship';
export type StoryScene = 'forest' | 'shore' | 'space' | 'garden' | 'snow' | 'savanna' | 'night' | 'town' | 'workshop' | 'kitchen' | 'school';
export type StoryArtwork = 'map' | 'sailboat' | 'rocket' | 'submarine' | 'trees' | 'cat' | 'bee' | 'penguin' | 'elephant' | 'fairy' | 'star' | 'rabbit' | 'cloud' | 'city' | 'robot' | 'fruit' | 'numbers' | 'friends' | 'houses' | 'dove' | 'gift' | 'flower' | 'rainbow' | 'turtle' | 'crow' | 'shell' | 'bird' | 'palette' | 'fish' | 'letter' | 'ball' | 'lantern';
export type StoryChoice = { label: string; nextPageIndex: number };
export type StoryPage = {
  title: string;
  text: string;
  illustration: StoryScene;
  choices?: StoryChoice[];
  nextPageIndex?: number;
};
export type Story = {
  id: string;
  title: string;
  tagline: string;
  category: StoryCategory;
  artwork: StoryArtwork;
  coverScene: StoryScene;
  reflection: string;
  pages: StoryPage[];
};
export const STORY_CATEGORIES = [
  { id:'all', label:'Tümü' },
  { id:'adventure', label:'Macera' },
  { id:'animal', label:'Hayvanlar' },
  { id:'sleep', label:'Uyku' },
  { id:'education', label:'Keşif ve öğrenme' },
  { id:'friendship', label:'Arkadaşlık' },
] as const;
// IDs remain stable so existing reading positions can be migrated locally.
export const STORIES: Story[] = [...adventureStories, ...animalStories, ...sleepStories, ...learningStories, ...friendshipStories];

/** Upper estimate of one reading route; alternate scenes are not counted twice. */
export function storyReadingMinutes(story: Story): number {
  const count = (index: number, visited: Set<number>): number => {
    if (visited.has(index) || !story.pages[index]) return 0;
    const page = story.pages[index];
    const words = page.text.trim().split(/\s+/).length;
    const next = page.choices?.map(choice => choice.nextPageIndex) ?? [page.nextPageIndex ?? index + 1];
    return words + Math.max(0, ...next.map(target => count(target, new Set([...visited, index]))));
  };
  return Math.max(1, Math.ceil(count(0, new Set()) / 85));
}
