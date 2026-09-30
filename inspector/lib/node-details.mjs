// Explanations describe the supplied implementation, never execute its code.
const services = {
  "C-00": [
    "Gateway authentication",
    "Obtain authorization for later service calls.",
    "Configured service address and client authentication settings (credential values are withheld).",
    "An access token and token/status metadata, or a structured authentication failure.",
  ],
  "C-06": [
    "Gateway authentication",
    "Refresh authorization after the possible human-review wait.",
    "Current claim context and configured authentication settings (credential values are withheld).",
    "Refreshed authorization/status information with the claim context, or a failure.",
  ],
  "API-002": [
    "MEMS submission document service",
    "Retrieve usable links or content for the claim's submitted documents.",
    "Unique claim reference and each document identifier, or a usable file reference already supplied.",
    "Document identifiers, file names/types, download links or content, per-document results and missing-file/error information.",
  ],
  "API-003": [
    "MedNext+ member-policy lookup",
    "Find the authoritative member and policy record for a card on a specific date.",
    "Full member card number and a valid treatment date; document care dates or the receipt date may be used with a warning when the treatment date is unavailable.",
    "Member, policy and payer record; eligibility/sanction information; validation summary and any unresolved identity issue or service failure.",
  ],
  "API-003R": [
    "MedNext+ member-policy lookup",
    "Recheck identity after reviewer corrections when revalidation is needed.",
    "The corrected member/policy/treatment information, previous validation and review context.",
    "The applicable revalidated or reused member-policy result and any validation/error findings.",
  ],
  "API-004": [
    "MEMS claim registration",
    "Register the email-originated claim using the information gathered so far.",
    "Claim/submission reference, member/payer details, treatment and financial information, contacts, available payment details and document references.",
    "Registration response and returned claim/canonical reference or batch information, with success/refusal/error details.",
  ],
  "API-004R": [
    "MEMS post-review claim reconciliation",
    "Update the registered claim with corrections or register it if the earlier attempt did not succeed.",
    "Reviewed claim fields, revalidation result, document manifest and the previous registration outcome.",
    "Updated/reused registration information and claim references, plus synchronization or registration failures.",
  ],
  "API-005": [
    "MedNext+ policy reference service",
    "Retrieve the policy record used by the policy assessment.",
    "Policy number from the claim or validated member-policy record.",
    "Returned policy reference data and request status/error details, carried with the claim.",
  ],
  "API-006": [
    "MedNext+ member reference service",
    "Retrieve the member reference under the identified policy.",
    "Policy number and full member card number.",
    "Returned member reference data and request status/error details, carried with the claim.",
  ],
  "API-007": [
    "Content Manager Table of Benefits service",
    "Obtain the policy's benefit document, when the service holds one.",
    "Policy number, full member card number and the country parameter used by the configured request.",
    "Available benefit-document content/file representation or an explicit unavailable state, with request details and errors.",
  ],
  "API-010": [
    "MedNext+ claim-batch service",
    "Create an administrative batch only when an appropriate batch was not already supplied or assigned.",
    "Claim/member/payer references, submission channel/method, expected invoice count and batch-date information.",
    "Created batch number and service status, or confirmation of a reused batch; failures are retained.",
  ],
  "API-101": [
    "MedNext+ additional-information service",
    "Get the provider and reference information needed to prepare invoice data.",
    "Provider names read from bills, payer/claim context, and available procedure references. The implementation can try alternate printed facility names when needed.",
    "Billing/service-provider candidates, available procedure and amount-position/reference information, insurer information and the trace of provider names tried.",
  ],
  "API-011": [
    "MedNext+ inpatient invoice service",
    "Create the prepared inpatient invoice records.",
    "Inpatient invoice headers and service lines, batch/member/provider references, diagnoses, dates, claimed amounts/currencies and verified notes.",
    "A per-invoice result containing returned invoice references and success/failure details, retained on the claim.",
  ],
  "API-012": [
    "MedNext+ outpatient invoice service",
    "Create the prepared outpatient invoice records.",
    "Outpatient invoice headers and service lines, batch/member/provider references, diagnoses, dates, claimed amounts/currencies and verified notes.",
    "A per-invoice result containing returned invoice references and success/failure details, retained on the claim.",
  ],
  "API-013": [
    "MEMS claim-status synchronization",
    "Update the original claim system with the processing outcome and created invoice references.",
    "Submission/claim identifiers, available member/registration details, returned invoice numbers and the status-update timestamp.",
    "Status-update response, a synchronized success indicator, and any service error. This is not payment confirmation.",
  ],
  "API-013-DUP": [
    "MEMS claim-status synchronization",
    "Perform the duplicate-closure status update on the retained duplicate branch.",
    "The duplicate claim context and available submission/member/policy references.",
    "Closure synchronization response, success indicator and error details. The current upstream duplicate verdict normally bypasses this branch.",
  ],
  "EXIT-01": [
    "MEMS exception synchronization and audit service",
    "Record an exit reason and attempt to notify the claim system of the exception.",
    "Failure/exit details, originating stage, claim identifiers and available partial results.",
    "Exception synchronization and audit outcomes, including failures of those attempts, with the available claim/exit context.",
  ],
};

const actions = {
  "API-002": [
    "Obtain a usable download link or content for each submitted document, reusing supplied content when available and avoiding duplicate requests for the same claim/document pair.",
    "Record missing or unavailable documents separately. A hard request failure, or listed/attempted documents with no retrievable file at all, produces failure information; partial missing files can proceed for later review.",
  ],
  "API-003": [
    "Find the full member card in the claim or document evidence and use a valid treatment date for the member-policy lookup; record a warning when falling back to document dates, receipt date or the current date if none is available.",
    "Compare the returned card with the requested card, inspect eligibility on the date and check the payer sanction indicator. Missing/not-found/mismatched identity is recorded for resolution; sanctions or genuine service failures can record an exit.",
    "Fill missing policy, payer and member details from the returned record, keeping validation status and unresolved identity findings on the claim. A record already held for the same card can be reused by this implementation.",
  ],
  "API-007": [
    "Request the policy's benefit document using the member, policy and country references; keep the returned document representation for conversion and text extraction.",
    "Distinguish a benefit document that is unavailable from a service malfunction. Unavailable benefits remain unknown rather than being invented or automatically treated as a rejected claim.",
  ],
  "Claim Submission": [
    "Receive the declared Submission Object and digital-channel flag. These are starting inputs, not a populated real claim in this viewer.",
  ],
  "TEST-00": [
    "Shape the supplied input for the configured scenario/test path and pass the scenario information onward. Test payload values are deliberately withheld in this viewer.",
  ],
  "ENV-00": [
    "Supply environment and reference configuration used downstream. Credentials and unreviewed configured values remain withheld; this node is not a claim assessment.",
  ],
  "R-01": [
    "Unpack and standardize the inbound submission while retaining its claim reference, member/treatment/payment data and attachment manifest.",
    "Choose the digital/email channel, prioritizing an explicit channel flag. Record a missing claim reference as failure; missing member identity alone is deferred to document reading and review.",
  ],
  "T-02": [
    "Reconcile extraction and optional English translation into text grouped by document identifier.",
    "Carry the file manifest, extracted document facts and warnings with the same claim so downstream checks share the evidence.",
  ],
  "A-05": [
    {
      title: "Read facts from the submitted documents",
      items: [
        "Member facts",
        "Payer facts",
        "Treatment facts",
        "Bill facts",
        "Provider facts",
        "Payment facts",
        "Bank facts",
      ],
      note: "Keep the source of each field and any conflicting readings. These are extracted facts, not authoritative member validation.",
    },
    {
      title: "Check the original evidence and distinguish similar information",
      items: [
        "Use original bill/image evidence for printed identifiers and amounts, where provided.",
        "Distinguish the patient from doctors and payees.",
        "Distinguish the invoice number from unrelated identifiers.",
      ],
    },
    {
      title: "Return the extracted information",
      items: ["Payer identification", "The full fact-extraction result"],
      note: "This agent does not perform the authoritative member lookup.",
    },
  ],
  "C-01": [
    "Normalize extracted claim fields, dates and payer information against the configured references.",
    "Adopt supported facts into the carried claim and preserve source/conflict warnings; prepare the full card and treatment context for the member lookup.",
  ],
  "TEMP-01": [
    "Choose the payer code from the member-policy record first, then the payer profile, then the submitted code.",
    "Check explicit excluded MetLife and Dubai Insurance code lists and the Dubaicare inbox flag. Add a pilot-scope exit reason if excluded; a brand-name similarity alone does not decide scope.",
  ],
  "C-05": [
    "Interpret the returned duplicate verdict and keep prior claim references with their match evidence; remove matches based on amount alone.",
    "The current code changes a hard duplicate into a possible-duplicate warning and forces the drop switch off, allowing the claim to be prepared for assessment.",
  ],
  "C-SLIM 1": [
    "Trim the carried claim to the fields selected in the implementation, reducing the information passed downstream. This is a context-shaping step, not a fresh eligibility or duplicate decision.",
  ],
  "C-SLIM 2": [
    "Trim the enriched claim context to the selected downstream fields. Keep this separate from policy approval: the node reduces a data structure, not the insurer's obligations.",
  ],
  "R-06": [
    "Distinguish the already-registered digital route from the email-originated registration route and return the applicable route flags with the claim.",
  ],
  "T-07": [
    "Reconcile existing or newly returned registration information into the current claim.",
    "Preserve usable claim/canonical references and batch information, and retain registration problems rather than treating a returned structure as guaranteed success.",
  ],
  "A-07": [
    "Assess each real claim document for readability, type, cut-off content, stamps/signatures and genuine factual conflicts.",
    "Separate a value a person could correct from a genuinely unusable file. Duplicate copies and email logos are not additional defective claim documents.",
    "Record issues with evidence; this quality assessment is distinct from deciding which required documents are absent.",
  ],
  "A-08": [
    "Apply payer and policy document requirements to the services actually billed, not merely the member's chosen category.",
    "Check itemized bills and proof of payment per bill, applicable claim forms, and care-specific support such as prescriptions, discharge summaries, reports or referrals.",
    "Return present/missing requirements and evidence. Later deterministic rules reconcile these findings before deciding the review path.",
  ],
  "R-02": [
    "Reconcile quality and completeness findings against the actual bill evidence, payer document matrix and permitted exceptions.",
    "Create specific, bill-scoped documentary rulings; discard demands for services that were not billed and retain missing-document notes.",
    "Separate issues needing human correction from documentation gaps that can continue as Not In Good Order. Configured test controls can force or bypass review.",
  ],
  "C-OPR": [
    "Assemble the human-review package: claim header, documents/view links, identity and payer evidence, financial/bank details, duplicate findings and document checklist.",
    "Expose the issues to resolve and permitted editable fields; preserve the claim context needed to apply the response.",
  ],
  "A-09": [
    "Turn the reviewer's explicit structured values and free-text corrections into field overrides and document-scoped text patches.",
    "Keep escalations, unattributed corrections and unanswered issues separate. Do not invent values or treat reviewer silence as confirmation.",
  ],
  "T-04": [
    "Apply permitted reviewer corrections to their claim fields or document evidence, keeping original material and attribution.",
    "Retain rejected/unapplied changes and unresolved items. Handle an explicit exit or a missing decision after a requested review as such—not as silent approval.",
  ],
  "C-02": [
    "Convert the returned benefit-document representation into a file the text-extraction service can accept.",
    "Keep an unavailable benefit document distinct from a valid readable file; do not manufacture benefit content.",
  ],
  "T-03": [
    "Join policy/member reference responses and the extracted benefit text into the enrichment input.",
    "Preserve their availability state and carried claim context so downstream assessment knows what was actually retrieved.",
  ],
  "A-06": [
    "Extract stated benefit categories, limits, copays, deductibles, conditions, territory and submission terms, preserving the policy wording and currencies.",
    "Carry policy/member references through. Ambiguity stays explicit; missing benefit text yields an unavailable/unknown state, not invented limits or remaining balances.",
  ],
  "R-03": [
    "Assess six areas: identity, policy dates, enrollment timing, geography, submission timing and reimbursement permission, with evidence for each.",
    "Missing evidence is indeterminate rather than a pass. Later prompt instructions make lateness an attention item. The downstream policy checkpoint reconciles this agent's findings and determines continuation.",
  ],
  "A-10": [
    "Read clinical and payer evidence for care setting, emergencies, authorization, network, provider restrictions, payment and other attention items.",
    "Keep unknown facts unknown. Later instructions make absent prior approval/network evidence a note, not an automatic denial; failure information is reserved for a check that could not run.",
  ],
  "A-11": [
    "Assign every document to inpatient, outpatient, neither or mixed content based on actual admissions, care episodes and billed services.",
    "Keep clinical content even on a claim-form template, exclude duplicate copies from repeat coding, and do not infer inpatient care from cost or the declared claim type.",
  ],
  "R-04": [
    "Use document assignments and deterministic overrides to build inpatient/outpatient text for the coding calls.",
    "An individual document labeled BOTH is routed to inpatient in this implementation; separate inpatient and outpatient documents can still create two claim-level paths.",
  ],
  "R-04B": [
    "Check whether both inpatient and outpatient channels are present. Route both to the paired coding path; otherwise continue to the single-channel splitter.",
  ],
  "C-15": [
    "Use the prepared channel flags to choose the single inpatient or outpatient coding call; do not make a new clinical classification.",
  ],
  "A-12B": [
    "Merge inpatient and outpatient coding results while retaining invoice groups, patient/line associations, diagnoses, dates and unresolved findings.",
  ],
  "A-12": [
    "Normalize a single coding result or the merged result into common diagnoses, service lines and invoice groups.",
    "Preserve bill/patient associations and expose conflicts instead of silently dropping evidence.",
  ],
  "A-13": [
    "Relate available coded services to the claim's actual benefit evidence and generate suggestion-only findings with attention notes.",
    "A complete NO_SUGGESTION result is permitted. Do not calculate final payment, invent remaining benefit balances or convert currencies.",
  ],
  "R-07": [
    "Choose the batch route from the submission channel. Batch creation/reuse is performed by the following service step, not by this router.",
  ],
  "A-PROV": [
    "Read the actual facility's identity, location/licence and relevant benefit wording from the documents.",
    "Separate the facility from the treating practitioner and preserve evidence. This agent does not choose the final reimbursement billing code.",
  ],
  "A-SEL": [
    "Select a real facility candidate per invoice using type, country/city, address, branch and name evidence.",
    "Reject a same-name provider in a different country. Return no match rather than inventing an identifier when the reference list lacks the facility.",
  ],
  "C-PROV": [
    "Apply the configured reimbursement-provider rules using the facility evidence, payer, treatment territory and reference table.",
    "Keep the billing reference distinct from a matched facility record, retain the resolution trace and flag cases without a permitted default.",
  ],
  "T-05": [
    "Build invoice groups and service/diagnosis data from the coded results and original bill facts, retaining patient, bill and admission associations.",
    "Use each bill's own currency and amounts; no currency conversion is applied. Preserve uncoded/unallocated billed information as visible gaps and do not duplicate copied bills.",
  ],
  "A-18": [
    "Propose explanation/attention notes from the supplied catalogue and claim evidence.",
    "Documentary rulings govern missing-document findings; a later verifier accepts or rejects the proposed notes rather than trusting the suggestion as final.",
  ],
  "C-16": [
    "Verify proposed note identifiers and text against the catalogue and the claim evidence; reject unsupported proposals.",
    "Derive documentation notes from the bill/claim rulings and keep other attention information separate. In Good Order/Not In Good Order describes documents, not payment approval.",
  ],
  "C-10": [
    "Inspect which prepared invoice channels are present and select the first upload path. This node routes work; it does not itself create invoices in MedNext+.",
  ],
  "C-12": [
    "Check whether outpatient invoices need uploading after the preceding path and return the appropriate route flag with the claim.",
  ],
  "C-04": [
    "Combine inpatient and outpatient upload results, retaining returned invoice numbers, partial successes and per-invoice failures.",
  ],
};

const checkpoints = {
  "EXIT-02": [
    "Collect intake/file-retrieval failures and any configured missing upstream results. Continue only when no accumulated exit remains.",
    "A missing claim reference or total retrieval failure can stop processing; partial missing files can proceed. This checkpoint does not judge document completeness or cover.",
  ],
  "EXIT-03": [
    "Collect recorded extraction/payer-scope failures and expose the continue/exit decision.",
    "This implementation deliberately ignores its required-products list for identity checking. Missing identity is addressed at the later identity checkpoint/review, not invented as a new failure here.",
  ],
  "EXIT-04": [
    "Merge identity and duplicate context, prepare submission-window facts, and preserve unresolved identity as a review issue.",
    "Collect genuine accumulated failures and configured required results; do not automatically stop just because the member record is absent.",
  ],
  "EXIT-05": [
    "Collect reference-retrieval failures and inspect configured required products before policy enrichment.",
    "Preserve an explicitly unavailable Table of Benefits as a distinct state rather than treating its contents as known.",
  ],
  "EXIT-06": [
    "Collect document/review-stage failures before reference retrieval, retaining corrected claim information and the exit evidence when processing cannot continue.",
  ],
  "EXIT-07": [
    "Reconcile the agent's policy findings and structured benefit information with the actual claim and member-record dates.",
    "The current code carries lateness, coverage and policy-period findings as attention notes, and can drop not-in-force findings contradicted by record dates. Actual processing failures still use the exit mechanism.",
  ],
  "EXIT-08": [
    "Attach coding and suggestion outputs to the claim. Record a nothing-to-invoice problem when coding produced a result/diagnoses but no service lines.",
    "Keep missing context, authorization and network findings as attention items when checks ran; collect actual failures before invoice preparation.",
  ],
  "EXIT-09": [
    "Collect batch/registration failures and check configured required results, returning a continuation decision and preserving claim/batch references.",
  ],
  "EXIT-10": [
    "Reconcile uploaded invoice numbers from successful individual results before checking the combined outcome.",
    "Preserve partial successes and collect failures/required-result gaps before final status synchronization.",
  ],
  "EXIT-11": [
    "Check the assembled inpatient/outpatient invoice collections. Coded content must produce at least one invoice object.",
    "Collect assembly failures and configured required results before allowing upload.",
  ],
};

function prefixOf(n) {
  return n.name === "Claim Submission"
    ? n.name
    : n.name.startsWith("C-SLIM")
      ? n.name
      : n.name.split(" ")[0];
}

export function addNodeDetails(catalog, business) {
  for (const n of catalog.nodes) {
    const prefix = prefixOf(n);
    const step = business.nodes.find((b) => b.technicalNodeIds.includes(n.id));
    let external = services[prefix];
    let steps = actions[prefix] || checkpoints[prefix];
    if (prefix.startsWith("LOG-")) {
      external = [
        "Claim audit service",
        "Record this node's named workflow event, not an insurance decision.",
        "Claim/correlation references, event stage/type, timestamp and applicable outcome or error information.",
        "Audit response/status and available failure information, with the claim context retained.",
      ];
      steps = [
        n.summary,
        "Associate the audit event with the same claim so receipt, review, registration or completion activity can be traced. An audit event alone does not prove a business check passed.",
      ];
    }
    if (n.type === "integration") {
      external = [
        "Opus OCR text-extraction integration",
        "Read text from the supplied PDF/image files.",
        prefix === "X-02"
          ? "The available Table of Benefits file prepared for reading."
          : "Downloaded claim files, such as bills, forms, reports and receipts.",
        "A mapping from file identifiers to extracted page text. OCR can misread a document; later steps must interpret the evidence.",
      ];
    }
    if (n.missingInternal) {
      external = [
        "Referenced sub-workflow",
        "Delegate the work to a separate workflow definition; its internal implementation was not supplied.",
        step.businessDetails.inputs
          .map(([label, value]) => `${label}: ${value}`)
          .join(" "),
        step.businessDetails.outputs
          .map(([label, value]) => `${label}: ${value}`)
          .join(" "),
      ];
      steps = step.businessDetails.checks;
    }
    if (n.type === "human" || prefix === "OUT-00")
      steps = step.businessDetails.checks;
    if (!steps && step.technicalNodeIds.length === 1)
      steps = step.businessDetails.checks;
    if (!steps && external)
      steps = [
        external[1],
        "Preserve the returned result and any failure/status information with the claim. The declared input/output fields below are the node interface, not a list of populated runtime values.",
      ];
    if (!steps) throw new Error(`Missing node explanation: ${n.name}`);
    n.explanation = {
      actions: steps,
      external: external
        ? {
            service: external[0],
            purpose: external[1],
            sends: external[2],
            returns: external[3],
          }
        : null,
      businessStepId: step.id,
      caveats: n.missingInternal
        ? [
            "Only the call boundary is documented. Its internal prompts and rules cannot be verified from the supplied export.",
          ]
        : n.type === "agent"
          ? [
              "AI output is an intermediate interpretation. Downstream rules may change how its findings affect the claim.",
            ]
          : [],
    };
    n.searchText += " " + JSON.stringify(n.explanation).toLowerCase();
  }
  return catalog;
}
