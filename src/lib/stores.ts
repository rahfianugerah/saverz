import { atom } from 'nanostores';

export type ActivePage =
	| 'api-endpoint-architect'
	| 'schema-canvas'
	| 'command-vault'
	| 'hash-crypto-generator'
	| 'markdown-csv-converter'
	| 'jwt-debugger'
	| 'base64-url-encoder-decoder'
	| 'credential-vault'
	| 'prompts'
	| 'links'
	| 'notes'
	| 'tokenizer'
	| 'data-formatter'
	| 'sql-formatter'
	| 'toon-formatter'
	| 'password-vault';

export const $activePage = atom<ActivePage>('prompts');
export const $sidebarOpen = atom<boolean>(false);
