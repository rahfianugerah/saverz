import React from 'react';
import { useStore } from '@nanostores/react';
import { $activePage } from '../lib/stores';
import Sidebar from './Sidebar';
import PromptBuilder from './PromptBuilder';
import LinkManager from './LinkManager';
import NoteManager from './NoteManager';
import Tokenizer from './Tokenizer';
import DataFormatter from './DataFormatter';
import ToonFormatter from './ToonFormatter';
import PasswordVault from './PasswordVault';
import SqlFormatter from './SqlFormatter';
import CredentialVault from './CredentialVault';
import ApiEndpointArchitect from './ApiEndpointArchitect';
import MarkdownCsvConverter from './MarkdownCsvConverter';
import LocalSchemaCanvas from './LocalSchemaCanvas';
import CommandVault from './CommandVault';
import HashCryptoGenerator from './HashCryptoGenerator';
import JwtDebugger from './JwtDebugger';
import Base64UrlEncoderDecoder from './Base64UrlEncoderDecoder';

export default function AppShell() {
  const activePage = useStore($activePage);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col md:ml-0 mt-14 md:mt-0 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-6 md:py-10 w-full flex-1">
          <div key={activePage}>
            {activePage === 'api-endpoint-architect' && <ApiEndpointArchitect />}
            {activePage === 'schema-canvas' && <LocalSchemaCanvas />}
            {activePage === 'command-vault' && <CommandVault />}
            {activePage === 'hash-crypto-generator' && <HashCryptoGenerator />}
            {activePage === 'markdown-csv-converter' && <MarkdownCsvConverter />}
            {activePage === 'jwt-debugger' && <JwtDebugger />}
            {activePage === 'base64-url-encoder-decoder' && <Base64UrlEncoderDecoder />}
            {activePage === 'credential-vault' && <CredentialVault />}
            {activePage === 'prompts' && <PromptBuilder />}
            {activePage === 'data-formatter' && <DataFormatter />}
            {activePage === 'toon-formatter' && <ToonFormatter />}
            {activePage === 'links' && <LinkManager />}
            {activePage === 'notes' && <NoteManager />}
            {activePage === 'tokenizer' && <Tokenizer />}
            {activePage === 'sql-formatter' && <SqlFormatter />}
            {activePage === 'password-vault' && <PasswordVault />}
          </div>
        </div>
      </main>
    </div>
  );
}
