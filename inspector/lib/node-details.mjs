// Explanations describe the supplied implementation, never execute its code.
const services = {
  "C-03": [
    "OANDA historical exchange-rate service",
    "Retrieve AED exchange rates for the inpatient invoice's expected claim amount only, before MedNext+ upload.",
    "Prepared inpatient invoices and their currencies; claim treatment date (otherwise the first admission date); configured OANDA API key, whose value is withheld.",
    "The claim with fx_expected: per-currency rates, actual dates used, source/basis, request trace and success/error details. A separate FX output carries the same rate record. No payable amount is approved.",
  ],
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
    "Member, policy and payer record; eligibility/sanction information; validation summary and any unresolved identity issue or service failure. Separately, results for up to two other same-payer cards printed on the documents, for the later patient-identity check.",
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
    "Inpatient invoice headers and service lines, batch/member/provider references, diagnoses, dates, original-currency claimed amounts and notes. estimatedCost is the sum of all inpatient invoices converted to AED, repeated on each invoice; missing foreign-currency rates produce zero plus a manual-correction note. Approved quantities are zero, not approval.",
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
  "API-004": [
    "Prepare the email-originated claim for MEMS registration, preserving the supplied claim and document references.",
    "Format the Emirates ID from authoritative member evidence; select the member's contact email without using a provider role mailbox. For certain field refusals, rebuild supported values and retry once; retain MEMS's exact refusal if unresolved.",
    "Adopt the canonical UCRN/submission identifiers returned in MEMS's own response data, retaining the original references for traceability.",
  ],
  "API-004R": [
    "Reconcile the reviewed claim with MEMS, reusing or updating registration according to the previous result.",
    "Apply the same Emirates-ID and member-email safeguards as initial registration, retain returned canonical references, and expose refused fields instead of presenting them as successfully saved.",
  ],
  "API-101": [
    "Retrieve provider candidates, procedure identifiers and the dynamic amount-field map from MedNext+. Clean document-header words from facility names and keep looking when a record is inactive or in the wrong location.",
    "Resolve medicines by printed code or a bounded name/strength/generic/form/pack search. Keep candidate evidence and mark ambiguous matches for review rather than choosing an unsupported drug.",
    "Normalize physiotherapy to timed units from invoice minutes, using three units for an unspecified standard session. Apply explicit therapy-code defaults where coding is absent, then ask MedNext+ to resolve the codes. Resolve CPT/HCPCS against the configured 2021 tables.",
    "Search vaccine products under MedNext+'s pharmacy (PH) entries while retaining the original vaccine CPT code; administration and consultation remain services. If brand searches fail, try supported ingredient and partial-brand searches without selecting an ambiguous medicine.",
    "Resolve dental crosswalk candidates for the tooth type and first/additional X-ray images; the invoice builder chooses the supported code. A separately billed registration or file-opening fee uses REG001, not a consultation code.",
  ],
  "API-011": [
    "Create each inpatient invoice with its own lines and diagnoses, while reusing the claim's batch and preserving partial successes. MedNext+ creates the incident; the upload does not invent one.",
    "Sum inpatient totals by currency and use C-03's rates to set one AED expected claim amount on every inpatient invoice. If a foreign rate is missing, send zero with a manual-entry note; bill lines remain in their own currency.",
    "Send approved quantity zero on every line. Record the creation user and Fee Max returned by MedNext+; no final settlement is performed.",
    "Use service-specific procedure fallbacks and benefit-specific notes. Ayurveda medicines use ALT 0006; unmatched medicines can use PH 0001, while non-itemized services have a separate unlisted-service route. Keep fallback reasons visible for review.",
    "Use CPT21/HCP21 rather than older procedure tables; an unavailable 2021 service uses the configured unlisted fallback with its original code in a note. Try ICD21 for diagnoses, with the coded ICD-10 fallback when MedNext+ refuses it; the source explicitly says the ICD21 identifier still needs confirmation.",
    "Use the corrected patient's member number after a card change. Attach bill-specific review, treatment-course and possible-duplicate notes, and retain request attempts and refusal details.",
  ],
  "API-012": [
    "Create each outpatient invoice with its own bills, service lines, diagnoses and notes under the existing batch; preserve returned identifiers and partial failures.",
    "Keep original bill currency; this path does not run C-03. Send approved quantity zero on every line, and retain creation-user/Fee Max response evidence for the reviewer.",
    "Keep dental, optical and alternative-medicine invoice notes aligned with the actual billed benefit. Use the configured 2021 procedure tables and medicine/unlisted-service fallbacks, with reasons retained; these are not final payment decisions.",
    "Use CPT21/HCP21, including optical services, and try ICD21 with a recorded ICD-10 fallback on diagnosis refusal. The source does not establish that MedNext+ accepts the ICD21 identifier.",
    "Use the corrected patient's member number and keep diagnosis evidence, non-covered-item notes and supporting documents on the applicable bill. Preserve possible-duplicate reasons and each upload attempt for review.",
  ],
  "API-002": [
    "Obtain a usable download link or content for each submitted document, reusing supplied content when available and avoiding duplicate requests for the same claim/document pair.",
    "Record missing or unavailable documents separately. A hard request failure, or listed/attempted documents with no retrievable file at all, produces failure information; partial missing files can proceed for later review.",
  ],
  "API-003": [
    "Find the full member card in the claim or document evidence and use a valid treatment date for the member-policy lookup; record a warning when falling back to document dates, receipt date or the current date if none is available.",
    "Compare the returned card with the requested card, inspect eligibility on the date and check the payer sanction indicator. Missing/not-found/mismatched identity is recorded for resolution; sanctions or genuine service failures can record an exit.",
    "Fill missing policy, payer and member details from the returned record, keeping validation status and unresolved identity findings on the claim. A record already held for the same card can be reused by this implementation.",
    "Look up up to two alternate 18-digit cards printed on the documents, using the same treatment date and excluding another payer's card. Keep the results separately; this lookup does not itself change the claim's card, and alternate-lookup failure is recorded without stopping the claim.",
  ],
  "API-003R": [
    "Revalidate after a card, policy or treatment-date correction, including a patient-card switch made by R-02 without human review. Do not reuse a member record belonging to a different card.",
    "When the card changed, update the member number from the returned record or the reviewed card's member segment, preserving the old value and its source. The later reference lookup supplies further member evidence.",
  ],
  "API-013": [
    "Collect each returned invoice number once and synchronize MEMS with the claim, batch and invoice references. Use the MEMS claim number when available, otherwise the UCRN.",
    "Build the idempotency key from the actual claim, action, batch and invoice set. Retry a recognised idempotency conflict once with a run-specific key; a batch-number server error has a recorded alternate-payload attempt. Preserve failures rather than claiming that a resend succeeded.",
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
    "Recognize invoice identifiers in several European languages and distinguish provider role mailboxes from possible member email addresses.",
    "Carry the file manifest, extracted document facts and warnings with the same claim so downstream checks share the evidence.",
    "Do not treat identical OCR error messages as proof that two files are duplicate copies; preserve the original files for image reading.",
  ],
  "A-04": [
    "Translate selected content into English while preserving identifiers, dates, medical codes and numerical values.",
    "Keep every table header and value in its original column and row order, including right-to-left bills. A lens index, colour, model or medicine strength is not a price; check translated rows and totals against the source.",
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
        "Read diagnosis codes and signatures from the page image; cross-check amounts written in figures and words. Keep tax and stamp-duty rows separate and normalize the bill's number format.",
        "Read each billed figure under its actual column header, then reconcile quantities, prices, tax, discounts, totals and payment evidence. Do not pad or invent amounts to make a bill balance.",
        "Describe image-only clinical documents and transcribe stated report conclusions. Preserve tooth notation as printed alongside its FDI interpretation; record medicine names, strengths, forms and the agent's ingredient interpretation separately.",
        "Record genuinely unreadable critical values with their document/page and reading confidence. Values below 0.6 may need review if no other evidence supplies them; reconstructed readable values remain normal facts.",
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
    "Identify care categories from billed evidence: dental implants need dental context, home-exercise advice is not billed physiotherapy, and named Ayurvedic therapies/remedies can identify alternative medicine.",
    "Exclude licence, registration and health-authority identifiers before interpreting apparent procedure codes, so a provider's licence is not mistaken for dental treatment. Recognize vaccine names as well as vaccination wording.",
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
    "Reserve unusable-file findings for content that needs a replacement file. A readable document with a correctable value remains usable; spelling variations alone are not an identity conflict.",
    "Inspect the original page image when OCR supplies no useful text. Name the image type and what is visibly shown; a clear X-ray or ECG is not defective merely because it has no text, stamp or signature. Record an unusable image's actual defect without inventing a diagnosis.",
  ],
  "A-08": [
    "Apply payer and policy document requirements to the services actually billed, not merely the member's chosen category.",
    "Check itemized bills and proof of payment per bill, applicable claim forms, and care-specific support such as prescriptions, discharge summaries, reports or referrals.",
    "Return present/missing requirements and evidence. Later deterministic rules reconcile these findings before deciding the review path.",
    "A damaged page still proves whatever remains readable: a cut header does not erase itemized rows or a printed prescription. Match each pharmacy/optical bill to its own supporting prescription rather than sharing one across unrelated bills.",
    "Count clinical images already on file, including applicable pre/post-treatment dental X-rays and ECG tracings; distinguish an image from a required written report. Recognize FDI, Universal, quadrant/Palmer and written tooth descriptions instead of calling a stated tooth missing.",
  ],
  "R-02": [
    "Reconcile quality and completeness findings against the actual bill evidence, payer document matrix and permitted exceptions.",
    "Create specific, bill-scoped documentary rulings; discard demands for services that were not billed and retain missing-document notes.",
    "Separate issues needing human correction from documentation gaps that can continue as Not In Good Order. Configured test controls can force or bypass review.",
    "Respect the payer matrix's claim-form waiver, use image evidence for signatures, and keep readable parts of damaged documents. Reconcile shared payments only when their amounts support the bills, and bind each prescription to the bill it supports.",
    "If the bills name another patient, adopt that patient's printed card only when the alternate MedNext+ evidence satisfies the patient, policy and identity safeguards. Otherwise ask the reviewer for the correct card. Preserve the original card and trigger revalidation after a switch.",
    "An identified usable clinical image satisfies its applicable image requirement even with no OCR text. Ask about a truly unreadable critical value only below the 0.6 reading-confidence threshold and when other claim evidence cannot supply it.",
    "Keep documents belonging to the patient on file even while the card identity is being resolved. Rebuild missing-document notes after these checks and scope each finding to its own bill.",
  ],
  "C-OPR": [
    "Assemble the human-review package: claim header, documents/view links, identity and payer evidence, financial/bank details, duplicate findings and document checklist.",
    "Expose the issues to resolve and permitted editable fields; preserve the claim context needed to apply the response.",
    "Present plain-language questions using card number, bill number and insurance company code. Show identified images as documents on file, remove OCR-only complaints when the page image was read, and combine related identity differences into one patient-card question.",
  ],
  "A-09": [
    "Turn the reviewer's explicit structured values and free-text corrections into field overrides and document-scoped text patches.",
    "Keep escalations, unattributed corrections and unanswered issues separate. Do not invent values or treat reviewer silence as confirmation.",
  ],
  "T-04": [
    "Apply permitted reviewer corrections to their claim fields or document evidence, keeping original material and attribution.",
    "Retain rejected/unapplied changes and unresolved items. Handle an explicit exit or a missing decision after a requested review as such—not as silent approval.",
    "Normalize scoped field names and formats, ignore blank/null-like corrections rather than erasing existing facts, and enforce locked identity/provider/payment-currency fields. Digital-channel bank details remain locked; permitted email-channel bank corrections retain their history.",
    "Accept the review form's document-or-claim | field | value correction format. Carry an automatic patient-card switch forward as an identity change requiring API-003R revalidation.",
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
    "Create one entry per named benefit and setting, including explicit exclusions, frequency, waiting periods, network and pre-approval terms. Keep inpatient/outpatient alternative medicine and individual dental, optical and maternity sub-benefits separate.",
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
    "Treat documented day-theatre operations as inpatient episodes even without an overnight stay. Alternative-medicine programmes are inpatient only when there is evidence of a stay; repeated daily therapies alone remain outpatient.",
    "Use the page-image reading when OCR failed. Mark a scan containing admission papers plus separately billed visits outside the stay as mixed, so the admission and separate outpatient bills can be coded in their own channels.",
  ],
  "R-04": [
    "Use document assignments and deterministic overrides to build inpatient/outpatient text for the coding calls.",
    "Split a BOTH document by page into inpatient and outpatient evidence when possible, including admission-linked bill continuations. When page markers or a usable split are missing, send the whole document to inpatient with a warning. Documented day-theatre operations can also override an outpatient classification.",
    "Recover bills supported by page-image readings even when the classifier excluded them because OCR failed. Also split an IP-labelled scan when numbered bills inside and outside the admission can be separated by page; retain IP when the evidence does not support that separation.",
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
    "Match each service to its own benefit and care setting, such as frames versus lenses or inpatient versus outpatient Ayurveda. Later prompt sections request provisional payable arithmetic and line decisions, with the submission cut-off considered first; earlier restrictive instructions remain visible in the source.",
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
    "Reject inactive/stopped records, a different UAE emirate or a different facility kind. A shared generic word is not a match; the bill's footer or stamp can establish its actual location.",
  ],
  "C-PROV": [
    "Apply the configured reimbursement-provider rules using the facility evidence, payer, treatment territory and reference table.",
    "Keep the billing reference distinct from a matched facility record, retain the resolution trace and flag cases without a permitted default.",
    "Apply a final facility gate to both agent and scored candidates: active record, correct emirate and facility kind, and supported brand match. Prefer an unresolved facility to a wrong one.",
  ],
  "T-05": [
    "Build invoice groups and service/diagnosis data from the coded results and original bill facts, retaining patient, bill and admission associations.",
    "Use each bill's own currency and amounts at assembly. Preserve uncoded/unallocated billed information as visible gaps and do not duplicate copied bills. Later C-03/API-011 convert only the inpatient expected amount to AED, not these lines.",
    "Reconcile printed rows, section totals, international tax/stamp-duty rows, discounts and rounding against the bill's net total. Apply adjustments only when printed figures reconcile; keep unexplained differences visible.",
    "Bind coded lines to bill rows across languages and number formats; carry printed diagnosis evidence and scope diagnoses to each invoice's actual service. Optical invoices use refraction/eye evidence rather than unrelated cataract diagnoses; category selection follows billed lines.",
    "Repair supported wrong-column or ambiguous-digit readings against the bill's own rows, tax, receipts and totals, including bilingual tax labels. Keep unexplained gaps visible; do not invent tax on a bill that prints none.",
    "Keep diagnoses and supporting reports on the bill for the relevant care, favouring the treating clinician's stated diagnosis over unsupported scan-only findings. Request the missing diagnosis/medical report with S24 only when it is not already on file; existing uncoded evidence needs the agent, not a new member document.",
    "Normalize printed tooth notation and crosswalk supported foreign dental codes by tooth type. Separate the first periapical image from additional images without changing the billed total; retain the printed code and crosswalk reason for confirmation.",
    "Build per-invoice review notes covering bill arithmetic, tax, diagnoses and supporting evidence, plus patient/card and treatment-course context across bills.",
  ],
  "A-18": [
    "Propose explanation/attention notes from the supplied catalogue and claim evidence.",
    "Documentary rulings govern missing-document findings; a later verifier accepts or rejects the proposed notes rather than trusting the suggestion as final.",
  ],
  "C-16": [
    "Verify proposed note identifiers and text against the catalogue and the claim evidence; reject unsupported proposals.",
    "Derive documentation notes from the bill/claim rulings and keep other attention information separate. In Good Order/Not In Good Order describes documents, not payment approval.",
    "Scope non-medical-item notes to the bill that charged them: registration/file-opening fees use D69, thermometers D583, and the configured linen/toiletry items D582. Do not label a bed sheet as a thermometer.",
    "The current implementation adds a D19 frame-not-covered finding when no Table of Benefits grants frames, including when the ToB is unavailable, with an agent-confirmation note. This is a configured workflow rule, not a universal coverage rule.",
  ],
  "C-10": [
    "Inspect which prepared invoice channels are present and select the first upload path. This node routes work; it does not itself create invoices in MedNext+.",
  ],
  "C-03": [
    "Run only on the inpatient upload path. Read invoice currencies and the treatment date, falling back to the first available admission date; AED uses a rate of one.",
    "Request a historical daily-average midpoint, then a spot rate; try the inverse currency pair if needed. For today/future dates use yesterday; when no quote exists, try up to three earlier days and record the date actually used. Authentication refusal stops further attempts.",
    "Return rates and evidence to API-011 for estimatedCost in AED. On missing dates, credentials or quotes, retain an explanation and continue without inventing a rate. Although this node's warning says the amount is left empty, API-011 actually sends zero for missing foreign-currency rates, with a note asking the agent to enter the AED amount. Outpatient and bill-line amounts are not converted.",
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
