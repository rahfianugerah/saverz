import { atom } from 'nanostores';

export type ActivePage = 'prompts' | 'links' | 'notes';

export const $activePage = atom<ActivePage>('prompts');
export const $sidebarOpen = atom<boolean>(false);
