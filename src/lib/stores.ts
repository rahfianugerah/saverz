import { atom } from 'nanostores';

export type ActivePage =
	| 'prompts'
	| 'links'
	| 'notes'
	| 'tokenizer'
	| 'data-formatter'
	| 'toon-formatter'
	| 'password-vault';

export const $activePage = atom<ActivePage>('prompts');
export const $sidebarOpen = atom<boolean>(false);
export const $desktopSidebarOpen = atom<boolean>(true);
