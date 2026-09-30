// Editorial business projection. Every technical node belongs to exactly one
// business step; only internal connections are collapsed. Source stays intact.
import { businessDetails } from "./business-details.mjs";
const definitions = [
  [
    "receive",
    "intake",
    "activity",
    "Receive the claim",
    "Collect the claim submission and its attached files.",
    [
      "Claim Submission",
      "TEST-00",
      "ENV-00",
      "C-00",
      "R-01",
      "LOG-01",
      "API-002",
    ],
    "Claim submission and attachments",
    "Submitted claim and file list",
  ],
  [
    "intake-ready",
    "intake",
    "decision",
    "Check the submission",
    "Check whether the submitted claim can proceed to document processing.",
    ["EXIT-02"],
    "Submitted claim",
    "Continue or exit outcome",
  ],
  [
    "read",
    "documents",
    "activity",
    "Read the documents",
    "Download the submitted documents and extract their text.",
    ["SUB-01", "X-01"],
    "Attached claim documents",
    "Extracted document text",
  ],
  [
    "language",
    "documents",
    "decision",
    "Check document language",
    "Determine whether any document text needs translation into English.",
    ["A-03"],
    "Extracted document text",
    "Translation requirement",
  ],
  [
    "translate",
    "documents",
    "activity",
    "Translate where needed",
    "Translate the selected content so the claim can be reviewed consistently.",
    ["A-04"],
    "Text requiring translation",
    "English document text",
  ],
  [
    "assemble-evidence",
    "documents",
    "activity",
    "Assemble readable evidence",
    "Combine original and translated text into the document evidence used by later checks.",
    ["T-02", "LOG-02"],
    "Original and translated text",
    "Consolidated document evidence",
  ],
  [
    "identify",
    "identity",
    "decision",
    "Identify the member and payer",
    "Read member and payer details, validate the member card and check that the claim is within the configured payer scope.",
    ["A-05", "C-01", "API-003", "TEMP-01", "EXIT-03"],
    "Document evidence and member details",
    "Identified member and payer, or an exit outcome",
  ],
  [
    "duplicate",
    "registration",
    "decision",
    "Check for an existing claim",
    "Compare claim evidence with previous claims and carry supported duplicate warnings forward for assessment.",
    ["SUB-02", "C-05"],
    "Claim details and previous claim information",
    "Duplicate decision",
  ],
  [
    "close-duplicate",
    "registration",
    "activity",
    "Close a duplicate claim",
    "Retained closure branch; the current duplicate-check code normally continues with a warning instead.",
    ["API-013-DUP", "LOG-05"],
    "Confirmed duplicate",
    "Recorded duplicate closure",
  ],
  [
    "identity-ready",
    "registration",
    "decision",
    "Check registration readiness",
    "Confirm the identity and duplicate-check outcome before proceeding with registration.",
    ["C-SLIM 1", "EXIT-04"],
    "Member, payer and duplicate-check results",
    "Continue or exit outcome",
  ],
  [
    "register",
    "registration",
    "activity",
    "Register the claim if required",
    "Follow the payer-specific registration route and assemble the resulting claim reference.",
    ["R-06", "API-004", "T-07"],
    "Validated claim and payer route",
    "Claim registration reference",
  ],
  [
    "document-check",
    "review",
    "decision",
    "Are the documents usable and complete?",
    "Assess document quality and required-document completeness. Claims needing correction are routed for human review.",
    ["A-07", "A-08", "R-02"],
    "Claim documents and document requirements",
    "Documentation result and review requirement",
  ],
  [
    "human-review",
    "review",
    "human",
    "Review and correct the claim",
    "A reviewer examines the documents and claim. Their feedback is interpreted for the subsequent update.",
    ["LOG-03", "C-OPR", "OPR-01", "A-09"],
    "Flagged claim, documents and review request",
    "Reviewer feedback and corrections",
  ],
  [
    "finalize-documents",
    "review",
    "decision",
    "Finalize the claim information",
    "Apply document corrections where supplied, revalidate the member, update the claim and check whether it can proceed.",
    ["T-04", "C-06", "LOG-04", "API-003R", "API-004R", "EXIT-06"],
    "Documentation result and any reviewer corrections",
    "Updated claim information, or an exit outcome",
  ],
  [
    "benefits",
    "policy",
    "decision",
    "Retrieve the policy and benefits",
    "Retrieve member, policy and benefit information. Read the benefit document when available and check the assembled references.",
    ["API-005", "API-006", "API-007", "C-02", "X-02", "T-03", "EXIT-05"],
    "Member and payer references",
    "Policy and benefit evidence, or an exit outcome",
  ],
  [
    "policy-check",
    "policy",
    "decision",
    "Assess policy requirements",
    "Combine claim and policy evidence and assess the configured policy checks. These checks do not constitute final payment approval.",
    ["A-06", "R-03", "EXIT-07", "C-SLIM 2"],
    "Claim details, policy and benefits",
    "Policy assessment and continuation decision",
  ],
  [
    "care-route",
    "clinical",
    "decision",
    "Choose the care review path",
    "Perform pre-checks and classify the claim as inpatient, outpatient, both, or neither. A claim containing both care types follows both coding paths.",
    ["A-10", "A-11", "R-04", "R-04B", "C-15"],
    "Claim and policy assessment",
    "Applicable care review paths",
  ],
  [
    "inpatient",
    "clinical",
    "activity",
    "Code inpatient care",
    "Request medical coding for inpatient care. The internal coding workflow was not included in the supplied material.",
    ["SUB-03a", "SUB-03b"],
    "Inpatient claim evidence",
    "Inpatient coding results",
  ],
  [
    "outpatient",
    "clinical",
    "activity",
    "Code outpatient care",
    "Request medical coding for outpatient care. The internal coding workflow was not included in the supplied material.",
    ["SUB-04a", "SUB-04b"],
    "Outpatient claim evidence",
    "Outpatient coding results",
  ],
  [
    "clinical-assessment",
    "clinical",
    "activity",
    "Prepare a clinical assessment",
    "Combine available coding results and generate an adjudication suggestion for review, not a final payment decision.",
    ["A-12B", "A-12", "A-13"],
    "Inpatient and/or outpatient coding results",
    "Consolidated coding and assessment suggestion",
  ],
  [
    "clinical-ready",
    "clinical",
    "decision",
    "Check the clinical result",
    "Check the clinical outcome and record completion before continuing to invoice preparation or taking an exit route.",
    ["EXIT-08", "LOG-06"],
    "Clinical assessment or no-care-channel result",
    "Continue or exit outcome",
  ],
  [
    "batch",
    "invoices",
    "decision",
    "Prepare the claim batch",
    "Create a claim batch where the payer route requires one and check registration readiness for the invoice work.",
    ["R-07", "API-010", "LOG-07", "EXIT-09"],
    "Claim and registration references",
    "Invoice preparation references, or an exit outcome",
  ],
  [
    "provider",
    "invoices",
    "activity",
    "Confirm the provider",
    "Read provider and billing terms, obtain additional reference information and resolve the provider to use.",
    ["A-PROV", "API-101", "A-SEL", "C-PROV"],
    "Provider details and reference information",
    "Resolved provider and billing information",
  ],
  [
    "prepare-invoices",
    "invoices",
    "decision",
    "Prepare invoices and review notes",
    "Assemble invoice information, select explanation notes, validate those notes and check invoice readiness.",
    ["T-05", "A-18", "C-16", "EXIT-11"],
    "Claim, provider and assessment information",
    "Prepared invoices and notes, or an exit outcome",
  ],
  [
    "upload",
    "invoices",
    "decision",
    "Upload the applicable invoices",
    "Upload inpatient and/or outpatient invoices as applicable, combine the upload results and check the outcome.",
    ["C-10", "C-12", "API-011", "API-012", "C-04", "EXIT-10"],
    "Prepared invoices",
    "Combined upload result, or an exit outcome",
  ],
  [
    "sync",
    "handoff",
    "activity",
    "Update the claim status",
    "Synchronize the resulting claim status and record that the status update completed.",
    ["API-013", "LOG-08"],
    "Invoice and processing outcome",
    "Synchronized claim status",
  ],
  [
    "stop",
    "handoff",
    "activity",
    "Record the exit outcome",
    "Collect the outcome when a checkpoint exits the main process, including a duplicate closure. The reason depends on the preceding check.",
    ["EXIT-01"],
    "Exit reason and current claim context",
    "Recorded exit outcome",
  ],
  [
    "outcome",
    "handoff",
    "outcome",
    "Return the claim outcome",
    "Return the processing result. The successful preparation route supports review-ready invoices; this workflow does not make a final payment decision.",
    ["OUT-00"],
    "Synchronized status or exit outcome",
    "Claim processing result",
  ],
];

function businessLabel(edge, source, target) {
  if (source === "duplicate" && target === "identity-ready")
    return "Continue with findings";
  if (source === "duplicate" && target === "close-duplicate")
    return "Closure branch (retained)";
  if (source === "care-route" && target === "inpatient")
    return "Includes inpatient care";
  if (source === "care-route" && target === "outpatient")
    return "Includes outpatient care";
  const labels = {
    "All EN? = true": "Already English",
    "All EN? = false": "Translation needed",
    "QC Pass? = true": "Ready to continue",
    "QC Pass? = false": "Human review needed",
    "drop = true": "Duplicate",
    "drop = false": "Not a duplicate",
    "no_channel = true": "Neither care type",
    "exit = true": "Exit this process",
    "Exit? = true": "Exit this process",
    "exit = false": "Continue",
    "Exit? = false": "Continue",
  };
  if (edge.label !== "Continue" && !labels[edge.label])
    throw new Error(`Untranslated business route: ${edge.label}`);
  return labels[edge.label] || "Continue";
}

export function buildBusinessCatalog(source) {
  const owner = new Map();
  const nodes = definitions.map(
    ([id, stage, type, title, summary, prefixes, input, output], index) => {
      const members = prefixes.map((prefix) => {
        const matches = source.nodes.filter(
          (n) => n.name === prefix || n.name.startsWith(prefix + " "),
        );
        if (matches.length !== 1)
          throw new Error(
            `Business grouping ${prefix}: expected one source node, got ${matches.length}`,
          );
        if (owner.has(matches[0].id))
          throw new Error(`Duplicate business owner: ${prefix}`);
        owner.set(matches[0].id, id);
        return matches[0];
      });
      return {
        id,
        stage,
        type,
        title,
        name: title,
        summary,
        order: index,
        role: {
          activity: "Business step",
          decision: "Decision",
          human: "Human review",
          outcome: "Outcome",
        }[type],
        businessInput: input,
        businessOutput: output,
        businessDetails: businessDetails[id],
        technicalNodeIds: members.map((n) => n.id),
        inputs: [],
        outputs: [],
        missingInternal: false,
        searchText: [
          title,
          summary,
          input,
          output,
          JSON.stringify(businessDetails[id]),
          source.stages.find((s) => s.id === stage).name,
        ]
          .join(" ")
          .toLowerCase(),
      };
    },
  );
  if (owner.size !== source.nodes.length)
    throw new Error("Some technical nodes are missing a business owner");
  const pairs = new Map();
  for (const original of source.edges) {
    const from = owner.get(original.source),
      to = owner.get(original.target);
    if (from === to) continue;
    const label = businessLabel(original, from, to),
      key = `${from}:${to}:${label}`;
    if (!pairs.has(key))
      pairs.set(key, {
        id: `business-${pairs.size}`,
        source: from,
        target: to,
        label,
        technicalEdgeIds: [],
      });
    pairs.get(key).technicalEdgeIds.push(original.id);
  }
  const edges = [...pairs.values()];
  return {
    nodes,
    edges,
    stages: source.stages,
    stats: { nodes: nodes.length, edges: edges.length },
    mappings: [],
    allFields: [],
    glossary: source.glossary,
    sourceHash: source.sourceHash,
  };
}
