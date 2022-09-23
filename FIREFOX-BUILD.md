# Build instructions for the Firefox review team

Requirements:

- NodeJS 18
- npm

Run these commands in the root of the extension files:

```bash
npm install
npm run build:firefox
```

After the build is done, the raw contents will be placed in `/build/firefox-mv2-dev` and the compacted zip will be placed in `/build/firefox-mv2-prod.zip`.
