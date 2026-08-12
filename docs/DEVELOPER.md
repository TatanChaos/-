# Developer Guide

## What is this

Yizhen Shufang is an open-source cultural research tool. It translates Chinese stem-branch symbols, sixty Jiazi, Nayin, relationships, and life situations into verifiable structural language. It is not fortune-telling and does not pretend to be a master.

## Quick start

```bash
node server.js
```

Open:

- `http://127.0.0.1:8780/入口.html`
- `http://127.0.0.1:8780/index.html`

## Architecture

### Content layer

- `assets/deep-data.js`: 22 stem-branch deep interpretations
- `assets/jiazi-deep.js`: 60 Jiazi deep interpretations
- `assets/nayin-deep.js`: 30 Nayin deep interpretations
- `docs/`: source texts, audits, deployment and testing notes

### Code layer

- `assets/combination-engine.js`: shared combination engine for browser and Node
- `index.html`: main sandbox
- `translator.html`: terminology translator
- `tests/`: verification scripts

### Service layer

- `server.js`: static server and APIs
- APIs:
  - `GET /api/status`
  - `GET /api/audit`
  - `POST /api/combine`
  - `GET /api/bazi`
  - `GET /api/huangli`
  - `POST /api/ai`
  - `POST /api/samples`
  - `GET /api/samples/export`

### UI layer

- `index.html`: standard sandbox
- `入口.html`: public entry
- `ai.html`: AI deep explanation
- `huangli.html`: Chinese almanac
- `稽古.html`: source audit
- `samples.html`: real samples

## Testing

```bash
npm run all
```

Includes:

- content integrity
- service smoke tests
- source audit

## Principles

- Every interpretation must trace to a source or be clearly marked as a draft.
- Nothing is verified before real samples are collected.
- No name, phone, WeChat, or address collection.
- No fake samples, no fake evolution, no fake mastery.

## Contribution areas

- source text verification
- real sample organization
- combination rule expansion
- UI readability
- translation
- deployment

## License

Content is CC BY-NC-SA 4.0. Code and original assets may be studied and used for non-commercial sharing with attribution. See LICENSE.
