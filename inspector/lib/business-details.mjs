// Plain-language interpretation of the supplied configuration, not live results.
// Each entry is linked to the technical members in business.mjs. Preserve the
// distinction between extracted evidence, authoritative records and suggestions.
export const businessDetails = {
  receive: {
    purpose:
      "Put the submission into one consistent claim record and obtain references to the files that need to be read. This is intake, not a decision about insurance cover.",
    inputs: [
      [
        "Submission identity",
        "The unique claim reference (UCRN), submission identifier, receipt date, and whether the claim arrived through a digital channel or email.",
      ],
      [
        "Details already supplied",
        "Any member/card number, policy and insurer details, treatment date and country, claimed amount and currency, contact information, and bank/payment details. These may be incomplete.",
      ],
      [
        "Attachments",
        "The submitted document identifiers, names, declared types, and any existing file links or file content; for email claims, the email envelope and message.",
      ],
    ],
    checks: [
      "Unpack the submission, standardize equivalent field names, and preserve the supplied claim reference. A missing claim reference is recorded as an intake failure.",
      "Choose the digital or email route. An explicit channel flag takes priority; otherwise the submission's channel, source and shape are used, with a warning when the route must be inferred.",
      "Preserve the claim information already present. A missing member card is not, by itself, a reason to reject intake: it can be read from the documents later.",
      "Request the file references from the submission system. Keep each document's identifier and returned download link/content, avoid requesting the same document twice, and record missing files and failed requests.",
      "Record receipt of the submission so later activity can be tied back to the same claim.",
    ],
    outputs: [
      [
        "Common claim record",
        "The claim reference, submission channel, receipt time and available member, treatment, financial and contact details, with warnings about normalization.",
      ],
      [
        "File manifest",
        "A list of retrieved document references and their names/types, plus a separate list of unavailable documents and request failures.",
      ],
    ],
    outcomes: [
      "The next step checks whether the intake record contains a failure that prevents document processing.",
    ],
    caveats: [
      "Sample/test settings exist in the supplied workflow. This map does not represent an actual submitted claim or make any service calls.",
    ],
  },
  "intake-ready": {
    purpose:
      "Decide whether intake completed well enough to start reading the files. This checkpoint collects the results of the preceding intake and file-retrieval work; it does not read the medical documents itself.",
    inputs: [
      [
        "Claim reference and intake result",
        "The unique claim reference, standardized submission, and any failure recorded while accepting it. The intake rule explicitly checks that the claim reference exists.",
      ],
      [
        "File-retrieval result",
        "The document list, usable download links or file content, documents that could not be found, and any service/request errors.",
      ],
      [
        "Existing failure information",
        "Any recorded exit reason and any configured list of required upstream results.",
      ],
    ],
    checks: [
      "Was the claim accepted with a claim reference? If intake recorded that the reference was missing, this checkpoint takes the exit route.",
      "Did retrieving the submitted files suffer a hard service failure? If documents were listed or attempted but none has a usable download link or file content, the file-retrieval step records a failure for this checkpoint.",
      "Were only some files unavailable? Partial missing-file results are carried forward for later document checks; they are not automatically treated as total retrieval failure.",
      "Is there a real failure message or code, rather than an empty error-shaped object? Collect real failures. Also check any explicitly configured required results, if a list was supplied.",
    ],
    outputs: [
      [
        "Continue or exit decision",
        "Continue when no accumulated exit/failure remains; otherwise exit with the recorded reason and evidence.",
      ],
      [
        "Claim information for the next step",
        "The claim and retrieved file references. On exit, retain the claim reference and available member number, phone, email and Emirates ID so the issue can be traced.",
      ],
    ],
    outcomes: [
      "Continue → download and read the documents.",
      "Exit → record the intake/file-retrieval problem through the shared exit process.",
    ],
    caveats: [
      "This is not a check of required medical documents, document readability, membership eligibility or policy cover. Those checks happen later.",
      "The zero-download rule is conditional on files being listed or attempted. It is not a universal rule that every empty attachment list is rejected here.",
    ],
  },
  read: {
    purpose:
      "Turn the available claim attachments into text that later steps can examine, while keeping each piece of text linked to its source file.",
    inputs: [
      [
        "File references",
        "Document identifiers, names and the file links/content returned during intake, together with access needed to retrieve them.",
      ],
      [
        "Original files",
        "The submitted PDF/image documents, such as bills, claim forms, receipts and medical reports, where supplied.",
      ],
    ],
    checks: [
      "Call the connected download workflow to obtain the files. Its declared output includes the downloaded file, a digital file fingerprint and failure details.",
      "Send the retrieved files to the configured text-extraction service to read printed or handwritten content as machine-readable text.",
      "Retain the document/file association so a later question about a bill can be traced back to the evidence that produced it.",
    ],
    outputs: [
      [
        "Document text",
        "Extracted text associated with the submitted files, ready for language checking and fact extraction.",
      ],
      [
        "File evidence and problems",
        "Downloaded files, the declared file fingerprint, and available download/extraction error information.",
      ],
    ],
    outcomes: [
      "The text proceeds to language detection. Download or extraction failures remain relevant to later error handling.",
    ],
    caveats: [
      "The download sub-workflow's internal steps were not supplied. Text extraction can misread a scan; extracted text is not proof that a document is complete or accurate.",
    ],
  },
  language: {
    purpose:
      "Identify which documents need English translation by reading their meaningful filled-in content, not just the language of their headings.",
    inputs: [
      [
        "Text for each document",
        "The extracted text, grouped by document identifier, including any available page boundaries.",
      ],
    ],
    checks: [
      "Look at diagnoses, service descriptions, medication instructions and other substantive content. Ignore letterheads, addresses, logos and bilingual form labels when deciding the language.",
      "Separate English documents from those with substantial non-English or mixed-language content. Record the non-English language, or mark it undetermined when substantive text cannot be read reliably.",
      "Identify blank pages, logos and email-signature graphics as non-content attachments rather than sending them for unnecessary translation.",
    ],
    outputs: [
      [
        "Translation plan",
        "Lists of document identifiers that need translation, those already in English, and non-content attachments, with detected languages.",
      ],
      [
        "Overall routing answer",
        "Whether all substantive content is English, plus an error description if the supplied document set is empty.",
      ],
    ],
    outcomes: [
      "Already English → assemble the evidence directly.",
      "Translation needed → translate the selected documents first.",
    ],
    caveats: [
      "An Arabic heading on an English-filled invoice does not, by itself, require translation. Language detection does not validate medical content.",
    ],
  },
  translate: {
    purpose:
      "Provide English text for the selected documents without changing the factual values on which the claim depends.",
    inputs: [
      [
        "Translation plan",
        "Which document identifiers require translation and which are already English.",
      ],
      ["Source text", "The extracted text and pages for each document."],
    ],
    checks: [
      "Translate the selected documents into English. Copy already-English documents unchanged; a document absent from both plan lists is treated as needing translation.",
      "Preserve names, card/policy/invoice numbers, dates, quantities, amounts, currency codes and medical codes. Do not convert currencies or round figures.",
      "Keep document and page boundaries. Mark an uncertain or illegible segment as untranslated instead of inventing its meaning or a missing number.",
    ],
    outputs: [
      [
        "English reading copy",
        "One entry per document with page text, original language and whether it was translated.",
      ],
      [
        "Unresolved text",
        "The source segments that could not be translated confidently, and any input error.",
      ],
    ],
    outcomes: [
      "Original and translated text move to the evidence-assembly step.",
    ],
    caveats: [
      "A translated reading copy is not a certified translation or a correction of the source document.",
    ],
  },
  "assemble-evidence": {
    purpose:
      "Build one document-evidence set so later checks read the same material and retain its connection to the original attachments.",
    inputs: [
      [
        "Original extraction",
        "Text and identifiers from the claim files, together with the file manifest and shared claim record.",
      ],
      [
        "Translation result, when used",
        "English page text, translation status and unresolved segments.",
      ],
    ],
    checks: [
      "Reconcile original and translated results into text grouped by document; keep the claim reference and document associations.",
      "Carry available document facts and extraction warnings forward rather than replacing the whole claim with an isolated text result.",
      "Record that extraction completed for this claim. Recording completion is an audit event, not confirmation that every required document is present.",
    ],
    outputs: [
      [
        "Consolidated evidence",
        "The document text collection and manifest attached to the claim, including available extraction/translation warnings.",
      ],
      [
        "Traceable completion record",
        "An extraction audit event associated with the same claim.",
      ],
    ],
    outcomes: [
      "The consolidated evidence is used to identify the member/payer and read the claim facts.",
    ],
    caveats: [
      "Missing or unreadable facts remain unresolved; combining text does not make them known.",
    ],
  },
  identify: {
    purpose:
      "Find who received treatment, which insurer/policy applies, and the facts of each bill. Then look up the member in MedNext+ and check whether this payer is included in the configured pilot.",
    inputs: [
      [
        "Submission and contact details",
        "Any supplied full member card number, policy number, insurer code/name, patient name, date of birth, Emirates ID, treatment date/country, amount/currency, phone and email.",
      ],
      [
        "Documents and email evidence",
        "Claim forms, card images, bills, receipts and clinical reports, with their extracted/translated text and original files where provided. The email body can fill gaps but ranks below documentary evidence.",
      ],
      [
        "Reference information",
        "Configured payer-matching rules and payer profiles, followed by the authoritative member-policy record returned by MedNext+ for the selected card and date.",
      ],
    ],
    checks: [
      "Read the full member card and patient details from the evidence. Keep patient identity separate from the doctor, bank beneficiary and email sender. Do not infer a card number from an email address.",
      "Read policy/payer clues and normalize them against the configured reference information. Preserve where each value came from and any conflicting readings.",
      "Read each bill's own number, date, provider/facility, line descriptions, quantities, amounts and currency; also read treatment/admission dates, payment evidence and any stated bank details. Do not substitute a tax number or a payment-only receipt number for the bill number.",
      "Find the full 18-digit member card in the supplied fields or documents. Ask MedNext+ for that card on the treatment date. If no usable treatment date is available, use document care dates where possible, otherwise the submission receipt date and record the fallback warning.",
      "Check that the returned record is for the requested card, read its eligibility status on that date, and inspect the payer's sanction indicator. A missing card, no matching record, or a returned different card is an identity issue to resolve, not proof of medical-document incompleteness.",
      "Fill missing policy, payer and member details from the returned record. For the pilot-scope check, prefer its payer code over the inferred profile or submitted code. Check the explicit MetLife/Dubai Insurance exclusion lists and the Dubaicare inbox flag; a brand name alone is not the exclusion rule.",
    ],
    outputs: [
      [
        "Identified member and insurer",
        "Full card number, available patient identifiers, policy number, payer code/profile and the returned member-policy record, with validation status or an open identity issue.",
      ],
      [
        "Structured claim and bill facts",
        "Treatment dates/country, each invoice's reference, facility, currency and amount, billed services, payment evidence and available bank details, with document references and quoted evidence.",
      ],
      [
        "Exceptions and uncertainty",
        "Conflicting readings, missing facts, eligibility warnings, payer-scope exclusions, sanction findings or system failures. An extracted fact and a validated record are kept conceptually distinct.",
      ],
    ],
    outcomes: [
      "Continue with the facts gathered; unresolved identity information is carried toward the later human-review decision.",
      "A recorded sanction, configured pilot exclusion or actual service failure can take the shared exit route. The checkpoint here collects failures; the later registration-readiness checkpoint handles missing identity results.",
    ],
    caveats: [
      "This step does not approve payment. A successful member lookup is not a guarantee of coverage for the billed treatment.",
      "The pilot excludes MetLife payer codes 284, 405 and 501, a longer explicit Dubai Insurance code list, and the Dubaicare inbox. These are snapshot-specific configuration rules, not general insurer policy.",
    ],
  },
  duplicate: {
    purpose:
      "Look for evidence that this bill or care has already been claimed, and carry the previous claim references forward for the claims assessor.",
    inputs: [
      [
        "Current claim evidence",
        "The structured claim, member/treatment information, document text and original files.",
      ],
      [
        "Comparison result",
        "The connected duplicate-check workflow returns a verdict, matching records, the basis for each match and available claim-history information.",
      ],
    ],
    checks: [
      "Ask the connected workflow to compare the claim with history. The internal search and matching process was not included in this export.",
      "Interpret its returned match evidence, including document fingerprints, invoice-number correspondence or matched service lines. A repeated amount alone is not sufficient evidence of a duplicate; remove amount-only matches.",
      "Retain the unique claim reference of each surviving previous match and the reason it matched, so the assessor knows which earlier claim to examine.",
      "In the current code, even a hard-duplicate result is converted to a possible-duplicate flag and allowed to continue for invoice preparation and assessment.",
    ],
    outputs: [
      [
        "Duplicate evidence",
        "The returned verdict, surviving matching claims and their references/reasons, discarded amount-only matches, and available history summary.",
      ],
      [
        "Attention item",
        "A possible-duplicate warning identifying prior claims. A hard-match indicator is retained even though the automatic-close switch is turned off.",
      ],
    ],
    outcomes: [
      "The current verdict logic continues to registration readiness with any duplicate warning.",
      "The exported graph still contains a duplicate-close branch, but the current verdict code forces the normal duplicate-drop switch to false.",
    ],
    caveats: [
      "The graph shows configured connections, not proof that every branch is reachable. Do not read the retained close branch as automatic duplicate rejection in this version.",
    ],
  },
  "close-duplicate": {
    purpose:
      "Describe the duplicate-closure branch retained in the exported graph. It would synchronize a duplicate outcome and record the closure if this branch were reached.",
    inputs: [
      [
        "Duplicate claim context",
        "The claim/submission reference, available member and policy identifiers, and the duplicate result from the preceding step.",
      ],
    ],
    checks: [
      "Send the duplicate status update to the submission system, retaining the claim identifiers needed to associate the update with the original submission.",
      "Record whether the status update succeeded and write the duplicate-closure audit event.",
    ],
    outputs: [
      [
        "Closure result",
        "The status-synchronization response, success indicator and any failure details, plus the audit trail.",
      ],
    ],
    outcomes: ["This retained branch leads to the shared exit process."],
    caveats: [
      "Not the normal behavior of the current duplicate verdict: the preceding code changes hard duplicates into attention items and continues processing. This branch is shown because it exists in the supplied graph.",
    ],
  },
  "identity-ready": {
    purpose:
      "Bring identity and duplicate findings together before registration, keeping unresolved member details visible for review instead of silently dropping them.",
    inputs: [
      [
        "Identity record",
        "The full member card, policy number, payer profile and member-policy lookup result, or an open item explaining why identity is unresolved.",
      ],
      [
        "Duplicate and timing evidence",
        "Previous matching claim references, duplicate warnings, treatment date, receipt date and available payer submission-window rules.",
      ],
      [
        "Processing state",
        "Digital/email channel and accumulated failures from earlier work.",
      ],
    ],
    checks: [
      "Preserve the most complete claim record, including identity facts obtained on earlier steps and the duplicate history result.",
      "If identity results are missing or unresolved, record an issue for human review rather than automatically treating absent identity as a technical exit.",
      "Prepare submission-timing facts for the later reviewer using the claim dates and available payer rules.",
      "Collect actual recorded failures and inspect configured required results. Identify the digital/email registration route if processing can continue.",
    ],
    outputs: [
      [
        "Registration-ready context",
        "The merged claim with identity status, payer information, duplicate references, timing findings and any open review issues.",
      ],
      [
        "Routing result",
        "Continue on the applicable submission-channel route, or exit for an accumulated blocking failure.",
      ],
    ],
    outcomes: [
      "Continue → registration handling, with reviewable identity issues retained.",
      "Exit → shared failure handling for genuine recorded failures.",
    ],
    caveats: [
      "Readiness here does not mean that membership or documentation has passed every later check.",
    ],
  },
  register: {
    purpose:
      "Reuse an already registered digital claim or register an email-originated claim, then preserve the claim references returned by the submission system.",
    inputs: [
      [
        "Registration identity",
        "Submission channel, original claim reference, any existing claim/batch reference, and the available member, policy and payer information.",
      ],
      [
        "Claim contents",
        "Treatment details, claimed amounts/currencies, contacts, document manifest and available payment/bank information.",
      ],
    ],
    checks: [
      "Distinguish a digital submission that already has registration from an email-originated submission requiring the create-claim route.",
      "Build the registration request from the current claim information and submitted documents; keep the returned reference information rather than inventing a new claim identifier locally.",
      "Reconcile the response back into the shared claim, including any canonical reference or batch assigned by the submission system, and retain refusal/error details for subsequent handling.",
    ],
    outputs: [
      [
        "Registered claim references",
        "Available claim number, canonical claim reference and batch information returned or reused.",
      ],
      [
        "Registration status",
        "Whether registration was performed, reused, refused or failed, with the current claim record and explanatory details.",
      ],
    ],
    outcomes: [
      "Proceed to document quality/completeness checks with the registration result. Post-review handling can reconcile corrections or retry a claim that was not successfully registered.",
    ],
    caveats: [
      "Registration is administrative; it does not establish that the submitted treatment is covered or payable.",
    ],
  },
  "document-check": {
    purpose:
      "Check whether the evidence can be used and whether the documents required for the actual billed services are present. Keep document gaps separate from issues a person can correct now.",
    inputs: [
      [
        "Documents and extracted facts",
        "Original files/text, document identifiers and declared types, patient and bill details, treatment dates, service descriptions and payment evidence for each bill.",
      ],
      [
        "Requirements for this claim",
        "The payer's document rules, any applicable policy exceptions, the services actually billed, submission channel and available bank details.",
      ],
    ],
    checks: [
      "Assess legibility, cut-off or blank pages, whether the document is the declared type, and genuinely conflicting identity or financial facts. Different spellings of the same name, duplicate copies and harmless formatting differences are not new defects.",
      "Keep readable evidence from a partly cut or damaged document: a missing header does not erase readable bill rows, payment text or optical prescription values. Distinguish a value a reviewer can correct from a document that genuinely needs replacement.",
      "Check each bill for an itemized invoice and acceptable proof of payment. Payment evidence must relate to that bill; the payer's stricter receipt rules and configured threshold handling can change what is accepted.",
      "Apply the required-document matrix to billed care: for example, admission evidence calls for a discharge summary, dispensed medication may require a prescription, physiotherapy may require a specialist referral, and billed diagnostics may require investigation reports. Do not demand a document for care that was not billed.",
      "Match each pharmacy or optical bill to its own applicable prescription using references, purchased items and dates; one prescription does not automatically satisfy unrelated bills. One payment can cover several bills only when the evidence and amounts support that association.",
      "Check the claim-form rule and any required signatures/stamps across all pages, plus applicable bank-transfer information. A forwarding email containing identifiers alone is not automatically the member's claim statement.",
      "Separate missing-document notes from a resolvable problem needing a person, such as a card/identity issue or an unclear value. Record bill-specific documentary rulings and decide whether the human-review branch is needed.",
    ],
    outputs: [
      [
        "Document-by-document findings",
        "Readability/type assessments, evidence of stamps/signatures, precise missing requirements, conflicts and proposed issues for human correction—not invented corrected values.",
      ],
      [
        "Documentation and routing result",
        "Bill-specific missing-document rulings, attention notes and a decision to continue directly or request human review.",
      ],
    ],
    outcomes: [
      "A resolvable blocking issue → human review.",
      "No review-triggering issue → finalize the claim information. Missing required documents can still continue as Not In Good Order, with explicit invoice notes.",
    ],
    caveats: [
      "Not In Good Order describes documentation, not a denied insurance claim. Missing stamps or receipts are not automatically a request for a new file or a reason to pause this workflow.",
      "The source contains test controls that can force or bypass review; this is a description of the configured rules, not a live review decision.",
    ],
  },
  "human-review": {
    purpose:
      "Give a reviewer the complete claim and specific unresolved issues, then capture exactly what they decide and correct.",
    inputs: [
      [
        "Review package",
        "Claim reference and header; member/payer evidence; treatment, amount, currency and bank details; email information; every document with view links and quality findings; required-document checklist and duplicate history.",
      ],
      [
        "Questions to resolve",
        "The particular identity, document or field issues raised upstream, and a list of fields the reviewer is allowed to edit.",
      ],
    ],
    checks: [
      "Ask the reviewer to choose Proceed, Modify or Exit and identify themselves.",
      "For Modify, collect the explanatory note and each correction as a named field, new value and affected document or whole claim. For Exit, require a reason: unusable document, missing required document or other.",
      "Interpret explicit free-text corrections, retain escalations and list issues the reviewer did not address. Silence is not confirmation, and no additional values may be invented.",
    ],
    outputs: [
      [
        "Recorded human decision",
        "The reviewer identity, chosen decision, explanatory note and any exit reason.",
      ],
      [
        "Structured corrections",
        "Field overrides, document text corrections, unresolved issues and escalations, with the scope of each change.",
      ],
    ],
    outcomes: [
      "The next step applies permitted corrections and rechecks affected identity details. Exit or a timeout is handled there rather than interpreted as approval.",
    ],
    caveats: [
      "The review instructions specify 10 calendar days; the configured execution timeout is 11 days. These are different source settings.",
      "This review resolves claim/document information; it is not the final payment assessment.",
    ],
  },
  "finalize-documents": {
    purpose:
      "Carry the reviewed or directly accepted claim forward with traceable corrections, refreshed identity validation where needed, and updated registration information.",
    inputs: [
      [
        "Existing claim and document findings",
        "The current claim, source documents/text, registration result, quality/completeness findings and documentary rulings.",
      ],
      [
        "Review response, when requested",
        "Proceed/Modify/Exit, reviewer identity, field corrections, text patches, remaining issues and exit reason.",
      ],
    ],
    checks: [
      "Apply allowed changes to the correct claim field or document. Preserve the original evidence, record the reviewer correction, and keep unapplied or disallowed edits visible.",
      "Do not invent a Proceed decision if the human-review branch ran but no decision arrived; handle that as the review timeout case.",
      "Revalidate the member when corrected member/policy/treatment-date information requires it; reuse the applicable previous result when no revalidation is needed.",
      "Refresh access after the possible review wait and reconcile corrected information with the registered claim. If an earlier registration did not succeed, use the applicable post-review registration path.",
      "Collect remaining failures before policy-reference retrieval; retain documentary gaps and attention notes as part of the claim.",
    ],
    outputs: [
      [
        "Corrected claim",
        "Updated identity, treatment and other permitted fields; revised document evidence; provenance of corrections and remaining issues.",
      ],
      [
        "Revalidation and registration results",
        "The applicable member validation, current claim references, update result and any exit/failure reason.",
      ],
    ],
    outcomes: [
      "Continue → retrieve policy/member/benefit information.",
      "Exit → shared handling for an explicit review exit, timeout or blocking failure.",
    ],
    caveats: [
      "A reviewer-entered exchange rate is recorded but not used to convert amounts in this supplied implementation.",
    ],
  },
  benefits: {
    purpose:
      "Fetch the authoritative policy and member references and obtain the policy's Table of Benefits—the document describing benefits, limits and conditions.",
    inputs: [
      [
        "Validated references",
        "Available member card, policy number, payer information and the current claim context after document review.",
      ],
    ],
    checks: [
      "Request the policy information, member information and available Table of Benefits using the claim's references.",
      "When a benefit document is returned, turn its file content into a readable file and extract its text.",
      "Assemble the responses and benefit text into one reference set. Preserve the difference between a document that does not exist and a service request that failed.",
      "Inspect recorded retrieval failures and configured required results before proceeding.",
    ],
    outputs: [
      [
        "Reference evidence",
        "Returned policy and member records, available benefit-document text, and the payer/claim context needed to interpret them.",
      ],
      [
        "Availability status",
        "Whether the benefit document is available, unavailable or affected by a retrieval problem, plus relevant errors.",
      ],
    ],
    outcomes: [
      "Available reference evidence → policy assessment.",
      "A missing benefit document is carried as unavailable; a genuine blocking retrieval failure can use the exit route.",
    ],
    caveats: [
      "No benefit entitlement is invented when the Table of Benefits is absent. Retrieval does not calculate remaining balances or approved amounts.",
    ],
  },
  "policy-check": {
    purpose:
      "Compare the claim with member/policy evidence, make the relevant contractual findings explicit, and pass them to later assessment without presenting them as payment approval.",
    inputs: [
      [
        "Corrected claim facts",
        "Member identity, treatment date and country, receipt date, submission/resubmission type and the documentary findings already made.",
      ],
      [
        "Authoritative membership/policy evidence",
        "The returned member-policy record, effective/expiry and enrollment dates, payer profile and applicable submission-window rules.",
      ],
      [
        "Benefit wording",
        "The available Table of Benefits text, policy/member references and any stated limits, copays, deductibles, territory, emergency terms and exceptions.",
      ],
    ],
    checks: [
      "Structure the benefit wording without calculating entitlement: keep stated limits, conditions and currencies, and mark ambiguous clauses or unavailable benefits as unknown.",
      "Keep one entry per benefit and care setting: inpatient/outpatient alternative medicine, dental service types, optical frames/lenses and maternity visits/delivery have separate clauses where the policy distinguishes them. Carry explicit exclusions, waiting periods, frequency and pre-approval terms; silence is not cover.",
      "Compare patient identity with the member record. Genuine conflicts in date of birth or Emirates ID matter; transliteration, abbreviated names or name order alone do not prove a different person.",
      "Check policy dates and enrollment against treatment dates, including the documented five-day enrollment tolerance and payer card-delay conventions.",
      "Check treatment geography and emergency evidence, the submission interval against the applicable payer/policy window, and whether reimbursement is described as permitted. Missing evidence makes a finding indeterminate, not a pass.",
      "Reconcile the assessment with the record's dates. The current downstream code carries lateness, coverage questions and policy-period findings as attention notes; it can discard a not-in-force finding contradicted by the actual dates.",
    ],
    outputs: [
      [
        "Structured policy evidence",
        "Benefit categories and stated terms, member/policy summaries, unclear clauses and the quality/availability of the benefit evidence.",
      ],
      [
        "Six assessment findings",
        "Identity, policy period, enrollment timing, geography, submission timing and reimbursement permission, each with its evidence and pass/fail/flag/unknown interpretation.",
      ],
      [
        "Reconciled attention notes",
        "Findings carried for assessment, data warnings and any genuine processing failure that prevents continuation.",
      ],
    ],
    outcomes: [
      "Continue with contractual questions and missing benefit context recorded for assessment.",
      "Actual malformed-data/system failures or other accumulated blocking errors may exit; a late claim alone is not automatically rejected.",
    ],
    caveats: [
      "Some earlier prompt instructions say failed policy checks should stop the claim. Later instructions and the downstream code change that behavior. This explanation distinguishes the assessment from the implemented continuation rules.",
      "Missing benefit balances and final payable amounts are not calculated in this workflow.",
    ],
  },
  "care-route": {
    purpose:
      "Decide which documents belong to inpatient or outpatient care, and collect clinical/contractual issues the assessor should see.",
    inputs: [
      [
        "Clinical and billing evidence",
        "Document text, diagnoses and service descriptions, dates of care, admission/discharge evidence, patient and bill associations.",
      ],
      [
        "Context for attention items",
        "Payer notification/authorization rules, policy findings, documentary/payment rulings, available provider-network evidence and prior review corrections.",
      ],
    ],
    checks: [
      "Look for actual admissions and their date/patient boundaries. Group discharge summaries, inpatient bills and related care into the admission; assign separate consultations, pharmacy, therapy and other non-admission visits to outpatient care.",
      "A day-theatre operation counts as an inpatient episode even without an overnight stay. An Ayurveda programme needs evidence of a stay, such as room charges or admission/discharge dates; daily sessions or the word programme alone do not make it inpatient.",
      "Do not classify care as inpatient just because it is expensive or the member selected that label. Keep clinical content from physician-completed forms even when the template is a claim form.",
      "Avoid coding duplicate copies twice. Pure payment slips, bank/identity documents and non-clinical attachments are not themselves material for medical coding.",
      "Record available emergency, authorization, network, provider restriction and other attention evidence. Missing authorization or network confirmation is an assessment note, not an automatic denial.",
      "Prepare the text for the relevant coding path: inpatient only, outpatient only, both separate paths, or no coding channel.",
    ],
    outputs: [
      [
        "Care assignments",
        "Episodes and document-to-care-path assignments, with reasons and the text for each coding channel.",
      ],
      [
        "Clinical attention items",
        "Documented authorization/emergency/network or other concerns, including what remains unknown.",
      ],
    ],
    outcomes: [
      "Inpatient and/or outpatient material → the corresponding coding workflow(s).",
      "Neither care type → the clinical-result checkpoint.",
    ],
    caveats: [
      "Mixed documents are now split by page into both coding paths when the evidence allows. Without usable page markers or a reliable split, the entire mixed document falls back to inpatient with a warning. Some classifier wording still describes the older fallback-only behavior.",
    ],
  },
  inpatient: {
    purpose:
      "Send the inpatient clinical evidence to the connected medical-coding workflow and receive its structured result for the claim.",
    inputs: [
      [
        "Inpatient context",
        "The claim identity and treatment context plus the text selected for an admission and its related clinical/billed care.",
      ],
    ],
    checks: [
      "Pass the inpatient claim context and clinical note text to the referenced coding workflow, on either the inpatient-only or paired-care route.",
      "Receive the declared coding result for later consolidation, retaining unresolved items and errors rather than presenting all returned coding as verified.",
    ],
    outputs: [
      [
        "Declared coding result",
        "The supplied interface describes a channel, diagnoses, service lines, dates, unresolved items, confidence and any error.",
      ],
    ],
    outcomes: [
      "In a mixed-care claim the result is joined with outpatient coding; otherwise it goes directly to common coding consolidation.",
    ],
    caveats: [
      "The internal inpatient coding workflow was not supplied. Its exact coding rules, prompts, lookup tables and internal checks cannot be explained from this export.",
    ],
  },
  outpatient: {
    purpose:
      "Send outpatient clinical evidence to the connected coding workflow so it can return the result used in invoice preparation.",
    inputs: [
      [
        "Outpatient context",
        "Claim identifiers and treatment context, with the clinical note text selected for outpatient visits, services and bills.",
      ],
    ],
    checks: [
      "Call the referenced outpatient coding workflow using the prepared outpatient context and text, on either the single- or mixed-care route.",
      "Pass the returned consolidated coding result onward so the common consolidation step can preserve its bill, patient and service associations.",
    ],
    outputs: [
      [
        "Outpatient coding result",
        "The connected workflow declares a consolidated outpatient result for master processing. Downstream work consumes available diagnoses, service lines and unresolved findings.",
      ],
    ],
    outcomes: [
      "Join with inpatient results when both routes apply, or proceed to common coding consolidation.",
    ],
    caveats: [
      "The outpatient sub-workflow's internal prompts and implementation were not included. The available interface does not establish every internal check or guarantee complete coding.",
    ],
  },
  "clinical-assessment": {
    purpose:
      "Combine coding into a coherent claim view and prepare evidence-backed benefit suggestions and attention notes for the person who assesses the invoices.",
    inputs: [
      [
        "Coding evidence",
        "Inpatient and/or outpatient coding results, with diagnoses, service lines, dates and available bill/patient associations.",
      ],
      [
        "Claim and benefit context",
        "Original bill facts, corrected claim information, policy/benefit text, structured terms and accumulated documentary/clinical flags.",
      ],
    ],
    checks: [
      "Merge the two care channels when both exist, or normalize the single result. Preserve invoice groups, patients, billed lines and unresolved conflicts instead of silently discarding them.",
      "Relate coded/billed services to the available benefit evidence. Keep unsupported or ambiguous benefit conclusions explicit.",
      "Use the clause for the specific service and setting, not a broad heading: dental root canals, optical frames/lenses and inpatient/outpatient alternative medicine are assessed separately. Later instructions request provisional payable arithmetic after stated copays/caps and highlight an exceeded submission window first; this is not final approval.",
      "Collect concrete attention items such as inconsistent evidence, multiple patients, unfulfilled payer requirements or uncertain payer identification, with their reasons.",
      "Produce a suggestion only when the evidence supports one. A complete result may legitimately say that no suggestion can be made.",
    ],
    outputs: [
      [
        "Consolidated coding",
        "Diagnoses, service lines, invoice groups/counts, care channels and retained inconsistencies or unresolved items.",
      ],
      [
        "Assessment suggestion",
        "Available benefit-alignment suggestions, evidence and attention notes—or an explicit no-suggestion result.",
      ],
    ],
    outcomes: [
      "The clinical checkpoint decides whether the result contains enough usable service information to prepare invoices.",
    ],
    caveats: [
      "No final approval, settlement amount, remaining benefit balance or currency conversion is produced here. No suggestion is not, by itself, a rejected claim.",
    ],
  },
  "clinical-ready": {
    purpose:
      "Check that clinical processing left something usable for invoice preparation, and distinguish missing context from a failure to produce the needed work.",
    inputs: [
      [
        "Clinical result",
        "Consolidated diagnoses and service lines, invoice groups and the assessment suggestion or explicit no-suggestion result.",
      ],
      [
        "Problems and flags",
        "Pre-check findings, missing context, authorization/network concerns and any accumulated failures.",
      ],
    ],
    checks: [
      "Attach the coding and assessment outputs to the shared claim so later steps can read them.",
      "If coding produced diagnoses or a consolidated result but no service lines, record that there is nothing to invoice. An invoice cannot be created from diagnoses alone.",
      "Treat missing context and contractual authorization/network findings as attention items when the checks ran; do not equate them with a system malfunction.",
      "Collect real failures and check any configured required results, then record completion of this stage on the continuation route.",
    ],
    outputs: [
      [
        "Clinical package for invoicing",
        "Coding, suggestion, attention items and any retained errors on the claim.",
      ],
      [
        "Continuation decision",
        "Continue toward batch preparation, or exit with an explicit reason such as no coded service lines or a processing failure.",
      ],
    ],
    outcomes: [
      "Usable clinical result → prepare the batch.",
      "Blocking clinical result/failure → shared exit handling.",
    ],
    caveats: [
      "An audit event named adjudication completed is not proof of final insurance adjudication; the result remains suggestion-only.",
    ],
  },
  batch: {
    purpose:
      "Obtain or reuse the administrative batch that will hold the invoices, without creating a second batch when registration already provided one.",
    inputs: [
      [
        "Claim registration",
        "Claim/submission identifiers, digital/email channel, member and payer references, and any existing batch number with its source.",
      ],
      [
        "Invoice preparation context",
        "The expected invoice count or coding groups and claim receipt/submission information.",
      ],
    ],
    checks: [
      "Select the channel-specific batch route: email-originated processing uses the creation path where needed, while existing registration/batch information may be reused.",
      "Reuse a batch assigned at registration or a valid submission-supplied batch rather than creating another one for the same claim.",
      "When creation is required, supply the claim's references, submission method and invoice count; record a defaulted count if no count/grouping was available.",
      "Retain the returned batch number and service result, record the stage audit, and collect batch/registration failures at the checkpoint.",
    ],
    outputs: [
      [
        "Batch reference",
        "The reused or newly returned batch number, linked to the claim, plus its creation/reuse status.",
      ],
      [
        "Readiness result",
        "The claim ready for provider/invoice work, or a recorded failure and reason.",
      ],
    ],
    outcomes: [
      "Continue → resolve provider and billing information.",
      "Batch/registration failure → shared exit handling.",
    ],
    caveats: [
      "A created batch is an administrative container, not authorization to pay its invoices.",
    ],
  },
  provider: {
    purpose:
      "Identify the facility on each bill and choose the reimbursement billing reference using the configured provider rules. The real facility and the billing reference are not always the same thing.",
    inputs: [
      [
        "Facility evidence",
        "Each bill's letterhead, facility name/licence, address, country/city/emirate, branch/type and available stamps or identifiers—not just the treating doctor's name.",
      ],
      [
        "Reference and benefit information",
        "Provider candidates returned by MedNext+, the payer and treatment context, relevant benefit wording and the configured reimbursement-provider table.",
      ],
    ],
    checks: [
      "Read the facility and relevant treatment/benefit terms from the evidence; keep the facility licence separate from a practitioner's personal licence.",
      "Compare reference candidates per bill using facility type, treatment country/city, address, branch and official name. A similarly named clinic in another country is not a match.",
      "Use footer and stamp details as location evidence. Reject inactive candidates, wrong UAE emirates and the wrong facility kind; a shared generic name alone is not enough to identify the treating facility.",
      "Allow no facility match when the provider is not in the returned reference list, especially for treatment abroad. Never invent a facility identifier to fill the gap.",
      "Apply the configured reimbursement billing rules to the payer, territory and applicable facility facts. Retain the selected billing reference, available facility record, territory and the reason for the selection; flag cases where the rules provide no permitted default.",
    ],
    outputs: [
      [
        "Resolved provider information",
        "Reimbursement billing reference, any matched real facility, treatment territory/location and provider-resolution evidence.",
      ],
      [
        "Unresolved provider issues",
        "Unmatched reasons, rule-selection warnings or an escalation when a permitted billing code cannot be determined.",
      ],
    ],
    outcomes: [
      "The resolved information and outstanding warnings go to invoice assembly.",
    ],
    caveats: [
      "No facility match does not automatically mean no invoice can be filed: the configured billing reference may still support it. Provider matching does not prove network eligibility or payment entitlement.",
    ],
  },
  "prepare-invoices": {
    purpose:
      "Turn the coded bill evidence into invoice records, then attach only supported, correctly scoped documentation and attention notes.",
    inputs: [
      [
        "Bills and coded services",
        "Original bill numbers, patient/provider associations, dates/admission periods, quantities, line amounts, currencies, diagnoses and coded procedures.",
      ],
      [
        "Administrative references",
        "Claim/batch/member/payer references and resolved billing/facility information.",
      ],
      [
        "Evidence for notes",
        "Documentary rulings, duplicate/policy/clinical findings, assessment suggestions and the predefined explanation-note catalogue.",
      ],
    ],
    checks: [
      "Group services by the correct bill, patient and care episode. Preserve original bill references and avoid treating duplicate copies as separate charges.",
      "Consolidate supported bills for one inpatient admission while preserving the original bill references. Reconcile international taxes and stamp duty separately; allocate printed discounts, returns or rounding only when the evidence explains the bill total. Payments are not discounts.",
      "Separate inpatient-stay services from outpatient care outside the admission, retaining each bill's own currency and amounts. Identify uncoded or unallocated billed items as gaps rather than silently losing them.",
      "Build invoice details with applicable providers, diagnoses, services and dates. Keep claimed values distinct from amounts approved for payment.",
      "Reconcile printed diagnosis codes with coding results and scope them to the invoice's actual services, including optical/refraction evidence. Record unlisted medication or procedure fallbacks instead of presenting them as exact reference matches.",
      "Propose explanatory notes, then validate them against the actual claim evidence and the predefined catalogue. Documentary rulings determine missing-document notes and their bill/claim scope; unsupported proposed notes are rejected.",
      "Keep documentation status separate from other attention findings. Check that coded content produced at least one invoice object, and collect assembly failures before upload.",
    ],
    outputs: [
      [
        "Prepared invoices",
        "Inpatient/outpatient invoice objects with references, providers, patients, dates, diagnoses, service lines, quantities, claimed amounts and original bill currencies.",
      ],
      [
        "Verified notes and gaps",
        "Specific documentation notes, separate informational/assessment notes, rejected note proposals and any uncoded/unallocated bill information.",
      ],
    ],
    outcomes: [
      "Prepared invoice objects without a blocking failure → upload.",
      "Invoice assembly failure or missing required invoice objects → shared exit handling.",
    ],
    caveats: [
      "Invoice assembly preserves bill currencies. The later inpatient upload converts only the expected claim amount to AED. In Good Order/Not In Good Order is a documentation status—not approval, denial or a computed payment amount.",
    ],
  },
  upload: {
    purpose:
      "Create the applicable inpatient and outpatient invoice records in MedNext+ and keep a separate result for each attempted invoice.",
    inputs: [
      [
        "Information for the inpatient AED estimate",
        "The inpatient invoices' currencies, claim treatment date (or the first admission date), and configured OANDA authorization. Credential values are never displayed.",
      ],
      [
        "Prepared invoice packages",
        "Claim/batch/member references, providers, dates, diagnoses, coded service lines, amounts, currencies and verified notes for each inpatient/outpatient invoice.",
      ],
    ],
    checks: [
      "Choose the upload route from the invoice channels actually present. Upload inpatient invoices where applicable, then outpatient invoices where applicable.",
      "For inpatient invoices only, retrieve OANDA historical rates and convert the expected claim amount to AED. Use a daily average, then spot/inverse quotes if needed; today/future dates use yesterday, and missing quotes can use up to three earlier days. Record the actual rate date. Keep bill lines and outpatient amounts in their original currencies.",
      "If a foreign-currency rate is unavailable, the upload sends an expected amount of zero with a note asking the agent to enter the AED amount; this alone does not stop invoice creation. Earlier rate-step wording says empty, but zero is the implemented upload fallback. The expected amount is not an approved payment.",
      "Send approved quantity as zero on every invoice line, leaving approval to the agent. Use the configured procedure-table and medicine fallbacks, keep unmatched items visible, and retain returned Fee Max evidence rather than calculating the tariff locally.",
      "For each invoice, retain the returned invoice number and service success/failure information; do not describe a partial upload as complete success.",
      "Combine the two care-channel results and recover returned invoice numbers from successful per-invoice results if the combined list lost them.",
      "Inspect upload failures and configured required results before final claim-status synchronization.",
    ],
    outputs: [
      [
        "Inpatient exchange-rate evidence",
        "Per-currency OANDA rate, actual date and basis, request outcome, and any missing-rate warning; an AED expected amount when conversion succeeds.",
      ],
      [
        "Created invoice references",
        "The invoice numbers actually returned by MedNext+, separated from unsuccessful attempts.",
      ],
      [
        "Upload outcome",
        "Per-invoice results, combined inpatient/outpatient status and detailed errors or partial successes.",
      ],
    ],
    outcomes: [
      "Successful continuation → synchronize the claim status.",
      "Blocking upload failure → shared exit handling with any partial results retained.",
    ],
    caveats: [
      "Uploading an invoice is not payment approval. This local map never performs an upload.",
    ],
  },
  sync: {
    purpose:
      "Tell the original claim system which invoice records were created and record whether the final status update succeeded.",
    inputs: [
      [
        "Claim identity",
        "The submission/claim reference and available member, policy, payer and registration information.",
      ],
      [
        "Processing result",
        "Returned invoice numbers and the current claim outcome, with the information required by the status-update request.",
      ],
    ],
    checks: [
      "Collect invoice numbers from the combined result or successful individual upload results.",
      "Send the claim-status synchronization request to the submission system with the claim identifiers, invoice references and update timestamp.",
      "Record the response, whether synchronization succeeded, and any failure; write the final synchronization audit event.",
    ],
    outputs: [
      [
        "Synchronization confirmation",
        "A success indicator and the response/error details, associated with the same claim and invoice references.",
      ],
      [
        "Handoff record",
        "The updated processing context and final audit information used when returning the workflow result.",
      ],
    ],
    outcomes: [
      "Return the outcome, including whether synchronization actually succeeded.",
    ],
    caveats: [
      "A successful status update means systems were informed of the result—not that the claim has been settled or paid.",
    ],
  },
  stop: {
    purpose:
      "Make a stopped or exceptional claim traceable, including the specific reason, the available identifiers and any work already completed.",
    inputs: [
      [
        "Exit reason and evidence",
        "The checkpoint's failure/exit details, originating stage, error classification and available claim context.",
      ],
      [
        "Identifiers and partial work",
        "Available claim/member/contact references, registration information and any already-created invoice results carried with the exit.",
      ],
    ],
    checks: [
      "Collect the claim identifiers from the supplied exit package and available context; preserve partial results instead of assuming nothing was done.",
      "Attempt to synchronize an exception outcome to the submission system and retain the result of that attempt.",
      "Attempt to write a failure/exit audit event with the actual reason and evidence, retaining failures of the notification/audit work as well. This export does not prove the external audit store's durability.",
    ],
    outputs: [
      [
        "Traceable exit outcome",
        "The exit code/category and explanation, claim identifiers, available partial references and notification/audit results.",
      ],
    ],
    outcomes: [
      "Return the available processing result through the common workflow output.",
    ],
    caveats: [
      "Exiting this automation is not automatically an insurance denial. The reason may be an input problem, pilot-scope exclusion, review decision or technical failure.",
    ],
  },
  outcome: {
    purpose:
      "Expose the workflow's declared final result so the claim and any created invoices can be located and its processing state understood.",
    inputs: [
      [
        "Normal or exit result",
        "The final synchronization context or shared exit outcome, including the identifiers, suggestions and flags available on that route.",
      ],
    ],
    checks: [
      "Return the configured result fields; this final output step does not perform a new medical or financial assessment.",
      "Keep synchronization status separate from the assessment/verification information and from the existence of invoice references.",
    ],
    outputs: [
      [
        "Claim and invoice references",
        "Unique claim reference, claim number, batch number and the combined created invoice numbers, where the route produced them.",
      ],
      [
        "Assessment and flags",
        "The declared adjudication-summary and verification-decision fields, plus carried attention flags. Their labels do not turn a suggestion into a payment decision.",
      ],
      [
        "Synchronization status",
        "Whether the final claim-status synchronization completed, as supplied to the output.",
      ],
    ],
    outcomes: [
      "The workflow ends with its available processing result; downstream claims assessment and settlement are outside this map.",
    ],
    caveats: [
      "These are declared output fields, not populated values from a live claim. Early exits or missing/stale mappings can leave results unavailable; a field being declared does not prove it was produced.",
    ],
  },
};
