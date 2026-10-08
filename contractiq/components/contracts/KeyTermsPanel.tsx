import { KeyTermRow } from "./KeyTermRow";
import type { ContractTerm } from "@/lib/hooks/useContract";

export function KeyTermsPanel({
  contractId,
  terms,
  disabled,
}: {
  contractId: string;
  terms: ContractTerm[];
  disabled: boolean;
}) {
  if (terms.length === 0) {
    return (
      <p className="text-body-sm text-grey-500">
        No key terms found -- this may not be a standard NDA/MSA.
      </p>
    );
  }

  const standardTerms = terms.filter((t) => !t.is_manual);
  const customTerms = terms.filter((t) => t.is_manual);

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {standardTerms.map((term) => (
          <KeyTermRow key={term.id} contractId={contractId} term={term} disabled={disabled} />
        ))}
      </ul>
      {customTerms.length > 0 && (
        <>
          <h3 className="text-body-lg font-medium text-grey-900">Custom terms</h3>
          <ul className="flex flex-col gap-2">
            {customTerms.map((term) => (
              <KeyTermRow key={term.id} contractId={contractId} term={term} disabled={disabled} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
