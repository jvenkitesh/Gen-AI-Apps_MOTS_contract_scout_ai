import pdfParse from "pdf-parse";

export interface ExtractedPdf {
  /** Full document text with [PAGE N] markers inserted at each page boundary. */
  text: string;
  pageCount: number;
  wordCount: number;
}

interface PdfTextContentItem {
  str: string;
  transform: number[];
}

interface PdfPageData {
  pageIndex: number;
  getTextContent(options: {
    normalizeWhitespace: boolean;
    disableCombineTextItems: boolean;
  }): Promise<{ items: PdfTextContentItem[] }>;
}

// pdf-parse concatenates page text with no page boundaries by default.
// This custom pagerender inserts a [PAGE N] marker (1-indexed) before each
// page's text, which engineering-doc.md's grounding strategy depends on for
// both key-term page attribution and chat page citation.
async function renderPageWithMarker(pageData: PdfPageData): Promise<string> {
  const textContent = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });

  let lastY: number | undefined;
  let text = "";
  for (const item of textContent.items) {
    if (lastY === item.transform[5] || lastY === undefined) {
      text += item.str;
    } else {
      text += "\n" + item.str;
    }
    lastY = item.transform[5];
  }

  const pageNumber = pageData.pageIndex + 1;
  return `\n[PAGE ${pageNumber}]\n${text}`;
}

export async function extractContractText(buffer: Buffer): Promise<ExtractedPdf> {
  const data = await pdfParse(buffer, { pagerender: renderPageWithMarker });
  const text = data.text.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  return { text, pageCount: data.numpages, wordCount };
}
