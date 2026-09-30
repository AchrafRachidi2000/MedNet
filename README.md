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

## Protected Vercel deployment

The hosted app is a prebuilt, read-only snapshot. It does not run the localhost server or need the original documents at runtime. Source files and generated snapshots stay out of Git.

1. In the existing `med-net` Vercel project, keep **Vercel Authentication → All Deployments** enabled, including production and custom domains. Do not use Standard Protection for this confidential viewer.
2. From `inspector/`, link the existing project with `npx vercel link --project med-net --scope achrafs-projects-47af29e0`.
3. With the approved local source JSON present, run `npm run build:hosted` and `npm test`.
4. Verify protection is still enabled, then run `npx vercel deploy --prebuilt --prod --scope achrafs-projects-47af29e0`.
5. Verify signed-out requests to the app and `/api/catalog` require Vercel sign-in before sharing the link.

Only explicitly allowed UI assets and credential-scrubbed catalog/layout/business snapshots are included in `.vercel/output`. The original PDF, Word document, and raw JSON are not deployed. Original-document links are disabled in the hosted map. Prompts and business workflow details remain confidential even after credentials are scrubbed.

Automatic Git deployments are disabled by `inspector/vercel.json`: a Git checkout deliberately lacks the confidential inputs. Rebuild locally and deploy the prebuilt artifact after code or workflow changes. The production site continues serving its last successful snapshot until a new one is deployed.
