// Standard key term lists per contract type, verbatim from docs/ContractIQ_PRD.md §4.
export const STANDARD_TERMS: Record<"NDA" | "MSA", string[]> = {
  NDA: [
    "Parties",
    "Effective Date",
    "Confidentiality Obligations",
    "Permitted Disclosures",
    "Term & Duration",
    "Governing Law",
    "Jurisdiction",
    "IP Ownership",
    "Non-Solicitation",
    "Breach & Remedy",
  ],
  MSA: [
    "Parties",
    "Service Scope",
    "Payment Terms",
    "Invoice Schedule",
    "Late Payment Penalty",
    "Liability Cap",
    "Indemnification",
    "IP Ownership",
    "Termination Clause",
    "Governing Law",
    "Dispute Resolution",
    "Notice Period",
  ],
};
