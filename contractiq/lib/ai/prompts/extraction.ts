// Few-shot examples for the extraction prompt. PRD §8 specifies "3 NDA + 3
// MSA labelled examples"; this ships 2 compact, multi-term worked examples
// per type instead (covers the same term variety -- dates/parties/clauses/
// monetary terms -- at a meaningfully smaller fixed prompt-token cost per
// call). Expand toward the full 3+3 if the offline eval suite (PRD §10)
// shows accuracy gains justify the added cost.

const NDA_FEWSHOT = `--- NDA EXAMPLE 1 ---
Contract excerpt:
[PAGE 1]
MUTUAL NON-DISCLOSURE AGREEMENT
This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of March 1, 2024 (the "Effective Date") by and between Northwind Robotics, Inc., a Delaware corporation ("Northwind"), and Bluehaven Analytics LLC, a California limited liability company ("Bluehaven"), each a "Party" and together the "Parties".
1. Confidentiality Obligations. Each Party agrees to hold the other's Confidential Information in strict confidence and not to disclose it to any third party without prior written consent.
2. Term. This Agreement shall remain in effect for a period of three (3) years from the Effective Date.
[PAGE 2]
3. Governing Law. This Agreement shall be governed by the laws of the State of Delaware, without regard to its conflict of laws principles.
4. Jurisdiction. The Parties consent to the exclusive jurisdiction of the state and federal courts located in Wilmington, Delaware.

Expected output:
{"terms":[
  {"term_name":"Parties","value":"Northwind Robotics, Inc. and Bluehaven Analytics LLC","page_number":1,"confidence_score":0.97,"source_sentence":"This Mutual Non-Disclosure Agreement (\\"Agreement\\") is entered into as of March 1, 2024 (the \\"Effective Date\\") by and between Northwind Robotics, Inc., a Delaware corporation (\\"Northwind\\"), and Bluehaven Analytics LLC, a California limited liability company (\\"Bluehaven\\"), each a \\"Party\\" and together the \\"Parties\\"."},
  {"term_name":"Effective Date","value":"March 1, 2024","page_number":1,"confidence_score":0.98,"source_sentence":"This Mutual Non-Disclosure Agreement (\\"Agreement\\") is entered into as of March 1, 2024 (the \\"Effective Date\\") by and between Northwind Robotics, Inc., a Delaware corporation (\\"Northwind\\"), and Bluehaven Analytics LLC, a California limited liability company (\\"Bluehaven\\"), each a \\"Party\\" and together the \\"Parties\\"."},
  {"term_name":"Confidentiality Obligations","value":"Each Party must hold the other's Confidential Information in strict confidence and not disclose it to third parties without prior written consent.","page_number":1,"confidence_score":0.93,"source_sentence":"Each Party agrees to hold the other's Confidential Information in strict confidence and not to disclose it to any third party without prior written consent."},
  {"term_name":"Term & Duration","value":"3 years from the Effective Date","page_number":1,"confidence_score":0.95,"source_sentence":"This Agreement shall remain in effect for a period of three (3) years from the Effective Date."},
  {"term_name":"Governing Law","value":"State of Delaware","page_number":2,"confidence_score":0.96,"source_sentence":"This Agreement shall be governed by the laws of the State of Delaware, without regard to its conflict of laws principles."},
  {"term_name":"Jurisdiction","value":"State and federal courts located in Wilmington, Delaware","page_number":2,"confidence_score":0.94,"source_sentence":"The Parties consent to the exclusive jurisdiction of the state and federal courts located in Wilmington, Delaware."}
]}

--- NDA EXAMPLE 2 ---
Contract excerpt:
[PAGE 1]
This Agreement does not restrict either Party from disclosing information that: (a) is already public; (b) was independently developed; or (c) is required to be disclosed by law.
Neither Party shall solicit for employment any employee of the other Party for a period of twelve (12) months following termination of this Agreement.
In the event of a breach of this Agreement, the non-breaching Party shall be entitled to seek injunctive relief and damages.

Expected output:
{"terms":[
  {"term_name":"Permitted Disclosures","value":"Information that is already public, independently developed, or required by law","page_number":1,"confidence_score":0.9,"source_sentence":"This Agreement does not restrict either Party from disclosing information that: (a) is already public; (b) was independently developed; or (c) is required to be disclosed by law."},
  {"term_name":"Non-Solicitation","value":"12 months post-termination","page_number":1,"confidence_score":0.92,"source_sentence":"Neither Party shall solicit for employment any employee of the other Party for a period of twelve (12) months following termination of this Agreement."},
  {"term_name":"Breach & Remedy","value":"Injunctive relief and damages","page_number":1,"confidence_score":0.91,"source_sentence":"In the event of a breach of this Agreement, the non-breaching Party shall be entitled to seek injunctive relief and damages."}
]}`;

const MSA_FEWSHOT = `--- MSA EXAMPLE 1 ---
Contract excerpt:
[PAGE 1]
MASTER SERVICES AGREEMENT
This Master Services Agreement is entered into between Cascade Consulting Group, Inc. ("Provider") and Fernwood Retail Corp. ("Client").
1. Services. Provider shall perform software implementation and support services as described in each Statement of Work.
2. Fees. Client shall pay Provider at the rates set forth in each applicable Statement of Work, invoiced monthly in arrears.
3. Late Payment. Any invoice not paid within thirty (30) days shall accrue interest at 1.5% per month.
[PAGE 2]
4. Limitation of Liability. Provider's total liability under this Agreement shall not exceed the fees paid by Client in the twelve (12) months preceding the claim.
5. Indemnification. Provider shall indemnify Client against third-party claims arising from Provider's gross negligence or willful misconduct.

Expected output:
{"terms":[
  {"term_name":"Parties","value":"Cascade Consulting Group, Inc. (Provider) and Fernwood Retail Corp. (Client)","page_number":1,"confidence_score":0.97,"source_sentence":"This Master Services Agreement is entered into between Cascade Consulting Group, Inc. (\\"Provider\\") and Fernwood Retail Corp. (\\"Client\\")."},
  {"term_name":"Service Scope","value":"Software implementation and support services per each Statement of Work","page_number":1,"confidence_score":0.93,"source_sentence":"Provider shall perform software implementation and support services as described in each Statement of Work."},
  {"term_name":"Payment Terms","value":"Rates per Statement of Work, invoiced monthly in arrears","page_number":1,"confidence_score":0.92,"source_sentence":"Client shall pay Provider at the rates set forth in each applicable Statement of Work, invoiced monthly in arrears."},
  {"term_name":"Late Payment Penalty","value":"1.5% per month interest after 30 days","page_number":1,"confidence_score":0.94,"source_sentence":"Any invoice not paid within thirty (30) days shall accrue interest at 1.5% per month."},
  {"term_name":"Liability Cap","value":"Fees paid in the preceding 12 months","page_number":2,"confidence_score":0.95,"source_sentence":"Provider's total liability under this Agreement shall not exceed the fees paid by Client in the twelve (12) months preceding the claim."},
  {"term_name":"Indemnification","value":"Provider indemnifies Client for third-party claims from Provider's gross negligence or willful misconduct","page_number":2,"confidence_score":0.9,"source_sentence":"Provider shall indemnify Client against third-party claims arising from Provider's gross negligence or willful misconduct."}
]}

--- MSA EXAMPLE 2 ---
Contract excerpt:
[PAGE 1]
Either Party may terminate this Agreement for convenience upon sixty (60) days' prior written notice to the other Party.
All intellectual property developed by Provider specifically for Client under a Statement of Work shall be owned by Client upon full payment.
Any dispute arising under this Agreement shall be resolved by binding arbitration under the rules of the American Arbitration Association.
Either Party may terminate for cause, with thirty (30) days' written notice specifying the breach.

Expected output:
{"terms":[
  {"term_name":"Termination Clause","value":"60 days' notice for convenience; 30 days' notice for cause","page_number":1,"confidence_score":0.91,"source_sentence":"Either Party may terminate this Agreement for convenience upon sixty (60) days' prior written notice to the other Party."},
  {"term_name":"IP Ownership","value":"Client owns IP developed specifically for it under a SOW, upon full payment","page_number":1,"confidence_score":0.89,"source_sentence":"All intellectual property developed by Provider specifically for Client under a Statement of Work shall be owned by Client upon full payment."},
  {"term_name":"Dispute Resolution","value":"Binding arbitration under AAA rules","page_number":1,"confidence_score":0.93,"source_sentence":"Any dispute arising under this Agreement shall be resolved by binding arbitration under the rules of the American Arbitration Association."},
  {"term_name":"Notice Period","value":"30 days for termination for cause","page_number":1,"confidence_score":0.88,"source_sentence":"Either Party may terminate for cause, with thirty (30) days' written notice specifying the breach."}
]}`;

interface BuildPromptArgs {
  contractType: "NDA" | "MSA";
  standardTerms: string[];
  customTermNames: string[];
}

export function buildExtractionSystemPrompt({
  contractType,
  standardTerms,
  customTermNames,
}: BuildPromptArgs): string {
  const allTargetTerms = [...standardTerms, ...customTermNames];
  const fewShot = contractType === "NDA" ? NDA_FEWSHOT : MSA_FEWSHOT;

  return `You are a precise contract analysis assistant for ContractIQ. You extract specific key terms from ${contractType} contracts, always citing the page number and the exact verbatim source sentence, and self-reporting your confidence in each extraction.

Target terms to extract from this ${contractType}:
${allTargetTerms.map((t) => `- ${t}`).join("\n")}

For each target term you can find evidence for in the contract text, return one object. If a term genuinely cannot be found anywhere in the document, omit it entirely -- do not guess or fabricate a value.

Return ONLY a JSON object (no prose, no markdown fences) in exactly this shape:
{
  "terms": [
    {
      "term_name": "must exactly match one of the target terms listed above",
      "value": "the extracted value, concise",
      "page_number": 1,
      "confidence_score": 0.0,
      "source_sentence": "the exact verbatim sentence from the contract that supports this value"
    }
  ]
}

Rules:
- "page_number" is the page where the value was found (1-indexed), determined by the nearest preceding [PAGE N] marker in the contract text.
- "confidence_score" is a float between 0.0 and 1.0 reflecting your genuine confidence this extraction is correct and complete.
- "source_sentence" must be copied verbatim from the contract text, not paraphrased.
- Never invent a page number, value, or source sentence that isn't actually in the text.

${fewShot}

Now extract the target terms from the following real contract (the two worked examples above are illustrative and smaller than this one -- extract every target term you can find evidence for, not just the subset shown in the examples):`;
}

// PRD §8 specifies this retry text verbatim but says "JSON array" -- adjusted
// to "JSON object" since response_format: json_object requires a top-level
// object ({"terms": [...]}), not a bare array; the PRD's wording predates
// that constraint being made explicit.
export const JSON_RETRY_PROMPT =
  "Your previous response was not valid JSON. Return only the JSON object described, no explanation.";
