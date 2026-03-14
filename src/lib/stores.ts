import { atom } from 'nanostores';

export type ActivePage = 'prompts' | 'links' | 'notes' | 'tokenizer';

export const $activePage = atom<ActivePage>('prompts');
export const $sidebarOpen = atom<boolean>(false);
export const $desktopSidebarOpen = atom<boolean>(true);
