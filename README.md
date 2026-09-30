# MedNet Workflow Inspector

Interactive, local-only business and technical workflow maps for MedNet UC1.

## Run locally

Requires Node.js 22 or later. Obtain the following confidential source files through your approved internal channel and place them at the repository root (alongside this README):

- `mednetstructure.json`
- `MedNet - PDD - V4.pdf`
- `MedNet_Workflow_Visual_Guide.docx`

These inputs are intentionally excluded from Git. The JSON is required to start the app; the PDF and Word document support source-document links and the complete test suite. Do not upload credentials or real claim data to this repository.

```sh
cd inspector
npm ci
npm start
```

Open http://127.0.0.1:4317. The server is read-only, listens on loopback only, and makes no production API calls.

## Checks

With the local source files present:

```sh
cd inspector
npm test
npx playwright install chromium
npm run test:browser
```

See [the app documentation](inspector/README.md) for map navigation, source limitations and implementation details.
