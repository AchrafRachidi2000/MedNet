// Editorial explanations, kept separate from the unmodified exported definitions.
export const stages = [
  ["intake", "Receive the claim", "Intake, authentication and submitted files"],
  ["documents", "Read the evidence", "OCR, language and document facts"],
  ["identity", "Identify member & payer", "Card validation and payer scope"],
  [
    "registration",
    "Duplicates & registration",
    "History checks and claim registration",
  ],
  [
    "review",
    "Check documentation",
    "Quality, completeness and human corrections",
  ],
  ["policy", "Understand the policy", "Member, policy and Table of Benefits"],
  [
    "clinical",
    "Code & assess care",
    "IP / OP coding and suggestion-only assessment",
  ],
  [
    "invoices",
    "Prepare the invoices",
    "Provider resolution, notes, assembly and upload",
  ],
  [
    "handoff",
    "Sync & hand off",
    "Status synchronization, audit and shared exit handling",
  ],
].map(([id, name, description], i) => ({
  id,
  name,
  description,
  number: i + 1,
}));

// Prefixes resolve against exported names; source UUIDs remain the canonical identity.
const entries = [
  [
    "Claim Submission",
    "intake",
    "Receive the submitted claim",
    "Starting fields supplied to this workflow. The export is a contract, not a record of a real claim.",
  ],
  [
    "TEST-00",
    "intake",
    "Apply the scenario harness",
    "Test and scenario configuration before intake. Sample payload values are withheld in this inspector.",
  ],
  [
    "ENV-00",
    "intake",
    "Prepare environment configuration",
    "Provide configuration and reference material used by later nodes. Credentials are withheld.",
  ],
  [
    "C-00",
    "intake",
    "Obtain an access token",
    "Prepare authentication for gateway requests. The inspector never requests or refreshes tokens.",
  ],
  [
    "R-01",
    "intake",
    "Normalize and route the submission",
    "Establish a common claim context and distinguish TP1 digital submissions from TP2 email-originated submissions.",
  ],
  [
    "LOG-01",
    "intake",
    "Record submission received",
    "Write the intake audit event; an audit event is not a claim decision.",
  ],
  [
    "API-002",
    "intake",
    "Retrieve the submitted file list",
    "Request the files associated with the MEMS claim reference. File downloading happens in the next sub-workflow.",
  ],
  [
    "EXIT-02",
    "intake",
    "Check the intake result",
    "Inspect accumulated failure information and route toward continuation or shared exit handling.",
  ],
  [
    "SUB-01",
    "documents",
    "Download claim files",
    "Call the referenced file-download workflow. Its internal nodes and implementation are not present in this export.",
  ],
  [
    "X-01",
    "documents",
    "Read text from claim files",
    "Use the configured OCR integration to extract text from PDF or image files.",
  ],
  [
    "A-03",
    "documents",
    "Identify documents needing translation",
    "Assess substantive content language, rather than assuming a bilingual heading means a document needs translation.",
  ],
  [
    "A-04",
    "documents",
    "Translate selected content to English",
    "Translate selected non-English content while preserving identifiers, amounts and document boundaries.",
  ],
  [
    "T-02",
    "documents",
    "Assemble the document text",
    "Reconcile extraction and translation outputs into the document corpus and shared claim context.",
  ],
  [
    "LOG-02",
    "documents",
    "Record extraction completed",
    "Write the extraction audit event with the claim correlation information.",
  ],
  [
    "A-05",
    "identity",
    "Read member, payer and document facts",
    "Lift claim facts and page evidence from the submitted materials, with provenance and conflicts. It does not itself validate membership in MedNext+.",
  ],
  [
    "C-01",
    "identity",
    "Normalize payer and claim facts",
    "Apply deterministic normalization and reference matching to extracted facts; carry the resulting claim state forward.",
  ],
  [
    "API-003",
    "identity",
    "Validate the member card",
    "Request the authoritative member record using the full card number and treatment date. Distinguish missing identity from coverage findings.",
  ],
  [
    "TEMP-01",
    "identity",
    "Apply the configured payer scope",
    "Check whether the payer is inside the configured workflow scope. Inspect the code for the exact exclusions.",
  ],
  [
    "EXIT-03",
    "identity",
    "Check extraction and payer identification",
    "Collect failures at the extraction/member-identification boundary and expose the continuation or exit route.",
  ],
  [
    "SUB-02",
    "registration",
    "Compare against previous claims",
    "Call the deduplication workflow. Historical matching internals require its separate export.",
  ],
  [
    "C-05",
    "registration",
    "Interpret the duplicate result",
    "Normalize the deduplication verdict and distinguish a hard duplicate from a possible duplicate that needs attention.",
  ],
  [
    "API-013-DUP",
    "registration",
    "Synchronize a duplicate closure",
    "Write the duplicate outcome back to the external claim system on the hard-duplicate branch.",
  ],
  [
    "LOG-05",
    "registration",
    "Record duplicate closed",
    "Record the audit event for the duplicate-closure branch.",
  ],
  [
    "C-SLIM 1",
    "registration",
    "Reduce the carried context",
    "Implementation-support step that trims the claim context passed downstream. Consult its code for retained fields.",
  ],
  [
    "EXIT-04",
    "registration",
    "Check identity and duplicate processing",
    "Evaluate accumulated failure information before registration and documentation review.",
  ],
  [
    "R-06",
    "registration",
    "Choose the registration path",
    "Distinguish an already registered TP1 claim from the TP2 registration path.",
  ],
  [
    "API-004",
    "registration",
    "Register the claim",
    "Call MEMS to create/register the claim where required and preserve its response for review.",
  ],
  [
    "T-07",
    "registration",
    "Reconcile registration results",
    "Join the bypass and registration paths into the shared claim context.",
  ],
  [
    "A-07",
    "review",
    "Assess document usability",
    "Assess quality and readability. Document quality and the presence of required document types are separate checks.",
  ],
  [
    "A-08",
    "review",
    "Assess required documents",
    "Apply payer and billed-service requirements to identify present and missing documents. R-02 performs additional checks afterward.",
  ],
  [
    "R-02",
    "review",
    "Verify documentation and decide review needs",
    "Apply deterministic documentary checks, retain bill-specific rulings and decide whether a resolvable blocker needs human review. Missing documents can continue as NIGO.",
  ],
  [
    "LOG-03",
    "review",
    "Record human review requested",
    "Write the audit event when the review branch is taken.",
  ],
  [
    "C-OPR",
    "review",
    "Shape the human-review request",
    "Prepare the review contract: claim context, issues and the fields the reviewer may correct.",
  ],
  [
    "OPR-01",
    "review",
    "Review the claim and documents",
    "The human-review node accepts PROCEED, MODIFY or EXIT and structured corrections. The configured SLA and timeout are separate values.",
  ],
  [
    "A-09",
    "review",
    "Structure reviewer feedback",
    "Interpret explicit reviewer instructions and corrections without inventing information that the reviewer did not provide.",
  ],
  [
    "T-04",
    "review",
    "Apply permitted corrections",
    "Reconcile review results with the claim, apply allowed changes and retain rejected or disallowed edits as evidence.",
  ],
  [
    "C-06",
    "review",
    "Refresh authentication",
    "Refresh authentication after the potential human-review wait.",
  ],
  [
    "LOG-04",
    "review",
    "Record the review response",
    "Write the audit event for the human response.",
  ],
  [
    "API-003R",
    "review",
    "Revalidate corrected member information",
    "Recheck member identity when the corrected claim requires it; otherwise use the applicable existing validation.",
  ],
  [
    "API-004R",
    "review",
    "Update registration after review",
    "Synchronize corrected claim information and handle the post-review registration path.",
  ],
  [
    "EXIT-06",
    "review",
    "Check the reviewed documents",
    "Inspect failures before moving to policy and member reference retrieval.",
  ],
  [
    "API-005",
    "policy",
    "Retrieve policy information",
    "Fetch the policy reference information used by benefit and policy assessment.",
  ],
  [
    "API-006",
    "policy",
    "Retrieve member information",
    "Fetch member reference information for enrichment.",
  ],
  [
    "API-007",
    "policy",
    "Retrieve the Table of Benefits",
    "Fetch the policy benefit document where it is available. Absence is a distinct state, not invented coverage.",
  ],
  [
    "C-02",
    "policy",
    "Prepare the benefit document for reading",
    "Convert the returned document representation into a file usable by OCR where applicable.",
  ],
  [
    "X-02",
    "policy",
    "Read the Table of Benefits",
    "Extract text from the benefit document using the configured OCR integration.",
  ],
  [
    "T-03",
    "policy",
    "Assemble policy reference inputs",
    "Reconcile reference responses and benefit text into the shared enrichment inputs.",
  ],
  [
    "EXIT-05",
    "policy",
    "Check reference retrieval",
    "Inspect accumulated reference failures and the presence of required products.",
  ],
  [
    "A-06",
    "policy",
    "Structure policy and benefit information",
    "Turn available benefit text and reference data into structured enrichment. Unknown information must remain unknown.",
  ],
  [
    "R-03",
    "policy",
    "Assess six policy checks",
    "An AI agent, despite its R-prefix. Assess identity, policy dates, enrollment, geography, submission timing and reimbursement permission. EXIT-07 processes its findings.",
  ],
  [
    "EXIT-07",
    "policy",
    "Reconcile policy findings",
    "Normalize the agent result and distinguish attention findings from technical failures. The exported code, not its older comments alone, determines routing.",
  ],
  [
    "C-SLIM 2",
    "policy",
    "Reduce enriched context",
    "Implementation-support step that trims the enriched claim context passed to clinical processing.",
  ],
  [
    "A-10",
    "clinical",
    "Collect clinical and coverage attention items",
    "Read authorization, network and other evidence relevant to downstream assessment. Later prompt instructions can override earlier wording.",
  ],
  [
    "A-11",
    "clinical",
    "Identify care episodes and settings",
    "Classify document content into inpatient, outpatient or non-coding material. The channel gate can adjust this classification.",
  ],
  [
    "R-04",
    "clinical",
    "Prepare the coding channels",
    "Split mixed inpatient/outpatient documents by page where possible, and apply admission/day-operation overrides. Unsplit mixed documents fall back to inpatient with a warning.",
  ],
  [
    "R-04B",
    "clinical",
    "Choose single or dual coding",
    "Route claims with both IP and OP content through the paired coding path, or send a single channel to its splitter.",
  ],
  [
    "C-15",
    "clinical",
    "Route a single coding channel",
    "Select the single IP or OP coding call based on the channel information.",
  ],
  [
    "SUB-03a",
    "clinical",
    "Code inpatient care · paired path",
    "Call the IP medical-coding workflow on the dual-channel branch. Its internal prompts are not included.",
  ],
  [
    "SUB-03b",
    "clinical",
    "Code inpatient care · single path",
    "Call the same referenced IP coding workflow on the single-channel branch.",
  ],
  [
    "SUB-04a",
    "clinical",
    "Code outpatient care · paired path",
    "Call the OP medical-coding workflow on the dual-channel branch. Its internal prompts are not included.",
  ],
  [
    "SUB-04b",
    "clinical",
    "Code outpatient care · single path",
    "Call the same referenced OP coding workflow on the single-channel branch.",
  ],
  [
    "A-12B",
    "clinical",
    "Merge the two coding channels",
    "Consolidate IP and OP results while retaining line bindings, invoice grouping and flags.",
  ],
  [
    "A-12",
    "clinical",
    "Normalize the consolidated coding",
    "Normalize a single-channel result or the merged result. Preserve source invoice and patient associations; expose conflicts rather than silently dropping fields.",
  ],
  [
    "A-13",
    "clinical",
    "Prepare a benefit-assessment suggestion",
    "Map billed lines to available benefit evidence. This is suggestion-only; NO_SUGGESTION can be a legitimate result and is not a payment decision.",
  ],
  [
    "EXIT-08",
    "clinical",
    "Check clinical processing",
    "Inspect clinical-stage products and accumulated failures before batch and invoice preparation.",
  ],
  [
    "LOG-06",
    "clinical",
    "Record suggestion processing completed",
    "Write the audit event. The exported name says adjudication, but UC1 output remains a suggestion.",
  ],
  [
    "R-07",
    "invoices",
    "Choose the batch path",
    "Decide whether to create a batch or use the existing batch information.",
  ],
  [
    "API-010",
    "invoices",
    "Create a claim batch",
    "Request a MedNext+ batch on the applicable registration path.",
  ],
  [
    "EXIT-09",
    "invoices",
    "Check batch registration",
    "Verify batch-stage products and accumulated failures before invoice assembly.",
  ],
  [
    "LOG-07",
    "invoices",
    "Record TP2 registration",
    "Write the audit event for the registration/batch stage.",
  ],
  [
    "A-PROV",
    "invoices",
    "Read the facility and benefit terms",
    "Extract the provider identity, treatment location and relevant benefit wording with evidence. It does not select the final billing code.",
  ],
  [
    "API-101",
    "invoices",
    "Retrieve additional reference information",
    "Fetch provider and other reference information used by resolution and invoice preparation.",
  ],
  [
    "A-SEL",
    "invoices",
    "Select the matching provider",
    "Assess reference candidates against the document facility and country; do not invent a provider identifier when no match exists.",
  ],
  [
    "C-PROV",
    "invoices",
    "Resolve provider billing information",
    "Apply deterministic provider-code rules to the available evidence and selection.",
  ],
  [
    "T-05",
    "invoices",
    "Build invoice objects",
    "Assemble invoice groups, services, diagnoses and original bill currencies. AED conversion of the inpatient expected amount happens later, before upload.",
  ],
  [
    "A-18",
    "invoices",
    "Propose catalogue-based attention notes",
    "Read the EOP catalogue and claim state. Later prompt instructions reserve documentary notes for the ruling registry; C-16 verifies the proposal.",
  ],
  [
    "C-16",
    "invoices",
    "Verify the invoice notes",
    "Validate proposed notes against claim state and the catalogue, and derive documentary notes from rulings. Separate IGO/NIGO documentation from attention findings.",
  ],
  [
    "EXIT-11",
    "invoices",
    "Check assembled invoices",
    "Inspect invoice-assembly products and failures before uploading.",
  ],
  [
    "C-10",
    "invoices",
    "Choose the first upload path",
    "Choose the upload path according to the invoice channels present.",
  ],
  [
    "C-03",
    "invoices",
    "Get the inpatient exchange rate",
    "Look up the treatment-date OANDA rate for the inpatient expected amount in AED. Bill lines are not converted; missing rates are flagged for the reviewer.",
  ],
  [
    "API-011",
    "invoices",
    "Upload inpatient invoices",
    "Write inpatient invoice data to MedNext+ and retain per-invoice results. This inspector never calls the endpoint.",
  ],
  [
    "C-12",
    "invoices",
    "Check whether outpatient upload is needed",
    "Route to outpatient upload where OP invoices are present.",
  ],
  [
    "API-012",
    "invoices",
    "Upload outpatient invoices",
    "Write outpatient invoice data to MedNext+ and retain per-invoice results.",
  ],
  [
    "C-04",
    "invoices",
    "Combine invoice-upload results",
    "Join the upload results while retaining partial successes and failed invoice details.",
  ],
  [
    "EXIT-10",
    "invoices",
    "Check upload outcomes",
    "Evaluate upload results and accumulated failure information before final synchronization.",
  ],
  [
    "API-013",
    "handoff",
    "Synchronize the claim status",
    "Synchronize the prepared claim for the downstream review handoff. This is not settlement or payment.",
  ],
  [
    "EXIT-01",
    "handoff",
    "Handle shared exits",
    "Shared failure/closure handling reached from multiple checkpoints. Retain claim identifiers and partial results where available.",
  ],
  [
    "LOG-08",
    "handoff",
    "Record final status synchronized",
    "Write the final synchronization audit event.",
  ],
  [
    "OUT-00",
    "handoff",
    "Return the workflow result",
    "Expose final references, invoice numbers, suggestion/verification information, flags and synchronization state.",
  ],
];
export function annotation(name) {
  const row = [...entries]
    .sort((a, b) => b[0].length - a[0].length)
    .find(([prefix]) => name.startsWith(prefix));
  return row
    ? {
        stage: row[1],
        title: row[2],
        summary: row[3],
        basis: "Editorial explanation of supplied sources",
      }
    : null;
}
export const findings = [
  {
    id: "fx",
    level: "difference",
    title: "Currency conversion differs across sources",
    nodes: ["C-03", "API-011", "API-012", "T-05"],
    detail:
      "The updated export retrieves OANDA rates only on the inpatient upload path. API-011 converts the expected claim amount (estimatedCost) to AED; invoice lines and outpatient amounts keep their bill currencies. This is narrower than the PDD's conversion requirement for all claim types.",
    evidence:
      "PDD sections 5.1 and 11.5; C-03 main() and _rate(); API-011 estimatedCost handling; T-05 bill-currency handling.",
  },
  {
    id: "overrides",
    level: "review",
    title: "Prompts contain overlapping instructions",
    nodes: ["A-08", "A-12", "A-13", "A-18", "R-03"],
    detail:
      "Later sections marked FINAL AUTHORITY coexist with earlier instructions and user-template wording. The inspector preserves the supplied text; it does not silently resolve or rewrite these conflicts.",
    evidence:
      "Exported system_prompt and user_prompt properties. Inspect the full text alongside downstream code.",
  },
  {
    id: "timing",
    level: "context",
    title: "Review SLA and timeout are different settings",
    nodes: ["OPR-01"],
    detail:
      "OPR-01 has a configured SLA of 10 and timeout of 11 days. The review instructions describe 10 calendar days. A service target and the execution timeout are not necessarily the same.",
    evidence: "OPR-01 process.instructions and public_execution_settings.",
  },
  {
    id: "both",
    level: "difference",
    title: "Mixed-document routing needs precise wording",
    nodes: ["A-11", "R-04"],
    detail:
      "The updated channel gate splits a BOTH document into inpatient and outpatient pages when page markers and evidence allow. It falls back to inpatient with a warning when it cannot separate the pages. Some agent wording still describes the older whole-document rule.",
    evidence:
      "R-04 _split_both() and main(); compare A-11's instruction for a BOTH document.",
  },
  {
    id: "registration-order",
    level: "difference",
    title: "Duplicate checking and registration order",
    nodes: ["SUB-02", "R-06", "API-004"],
    detail:
      "The supplied top-level graph checks duplicates before the TP2 create-claim call. PDD descriptions and amendments discuss registration and duplicate checks differently; MEMS already owns the UCRN. This needs version-aware interpretation.",
    evidence:
      "Exported SUB-02 → C-05 → … → R-06 → API-004 connections; PDD addenda.",
  },
];
export const glossary = [
  ["TP1", "Digital submission channel"],
  ["TP2", "Email-originated submission channel"],
  ["UCRN", "Unique claim reference owned by MEMS"],
  ["PIC", "Payer identification/profile used for payer-specific handling"],
  ["ToB", "Table of Benefits: the policy’s benefit document"],
  ["IP", "Inpatient care"],
  [
    "OP",
    "Outpatient care; note that invoice place-of-service codes use their own meanings",
  ],
  ["IGO", "In Good Order: documentation status, not payment approval"],
  ["NIGO", "Not In Good Order: documentation requires attention"],
  ["EOP", "Predefined explanation/note catalogue used on invoices"],
  ["HITL", "Human in the loop: a review step"],
  [
    "_claim",
    "The shared claim object carried and enriched through the workflow",
  ],
  [
    "Truth node",
    "A step that reconciles or validates upstream results before passing them onward",
  ],
  ["Mapping", "A configured link from a source field to a node input"],
  ["Exit rail", "Shared handling for workflow exits and failures"],
  [
    "UC1",
    "Claim preparation and handoff; final computation and settlement are outside this inspector’s workflow",
  ],
];
