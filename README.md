[![Astro](https://img.shields.io/badge/Astro-5.x-BC52EE?&logo=astro&logoColor=white)](https://astro.build)
[![React](https://img.shields.io/badge/React-19-61DAFB?&logo=react&logoColor=white)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB-4A154B?)](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
[![License](https://img.shields.io/badge/License-MIT-22c55e?)](LICENSE)

# Saverz

A minimalist, local-first productivity dashboard built with Astro and React.

### Overview

Saverz is a lightweight mini dashboard bookmark that runs entirely in the browser. All data is persisted locally using IndexedDB through Dexie.js. There is no server, no cloud dependency, and no account required. The application provides three core tools: a structured prompt builder for LLMs, a bookmark manager with favicon previews, and a Markdown-powered note editor.

### Features

#### Prompt Builder

- Template-based form that outputs structured LLM prompts.
- Configurable title, role, task, and rules fields.
- Toggle between free-write textarea and dynamic list input for tasks.
- Dynamic add/remove rule constraints.
- Live preview with one-click copy to clipboard.
- Persistent prompt library with saved entries.

#### Link Manager

- Simple CRUD interface for bookmarks.
- Automatic favicon retrieval via Google Favicon API.
- URL validation with automatic `https://` prefixing.
- Card-based layout with hover-to-reveal actions.

#### Note Manager

- Full Markdown support with live preview (GitHub Flavored Markdown).
- Toggleable grid and list views.
- Modal-based editor with Edit and Preview modes.
- Timestamp tracking for creation and last update.

### Tech Stack

| Category           | Technology                                                      |
| :----------------- | :-------------------------------------------------------------- |
| Framework          | [Astro](https://astro.build) with React integration             |
| UI Library         | [React 19](https://react.dev)                                   |
| Styling            | [Tailwind CSS 3](https://tailwindcss.com) (dark mode only)      |
| Icons              | [React Icons](https://react-icons.github.io/react-icons)       |
| Animations         | [Framer Motion](https://www.framer.com/motion)                  |
| Database           | [Dexie.js](https://dexie.org) (IndexedDB wrapper)              |
| State Management   | [Nano Stores](https://github.com/nanostores/nanostores)        |
| Markdown Rendering | [react-markdown](https://github.com/remarkjs/react-markdown)   |
| Language           | TypeScript (strict mode)                                        |

### Database Schema

Three IndexedDB object stores are defined via Dexie.js:

```
prompts:  ++id, title, role, taskType, taskContent, createdAt
links:    ++id, name, url, createdAt
notes:    ++id, title, content, updatedAt
```

### Getting Started

#### Prerequisites

- [Node.js](https://nodejs.org) version 18 or later
- npm, pnpm, or yarn

#### Installation

```sh
git clone https://github.com/rahfianugerah/saverz.git
cd saverz
npm install
```

#### Development

```sh
npm run dev
```

The development server starts at `http://localhost:4321`.

#### Production Build

```sh
npm run build
npm run preview
```

### Available Commands

| Command             | Description                                  |
| :------------------ | :------------------------------------------- |
| `npm run dev`       | Start the local development server           |
| `npm run build`     | Build the production site to `./dist/`       |
| `npm run preview`   | Preview the production build locally         |
| `npm run astro`     | Run Astro CLI commands directly              |

### Design System

- **Theme**: Deep Midnight palette with `#09090b` background and high-contrast borders.
- **Typography**: Inter for interface text, JetBrains Mono for code blocks.
- **Components**: Glassmorphism surfaces, `rounded-2xl` cards, subtle `border-muted` accents.
- **Dark mode only**: All styles target a single dark palette with no light theme toggle.
