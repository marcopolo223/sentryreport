import { renderToBuffer } from "@react-pdf/renderer";
import JSZip from "jszip";
import { createElement } from "react";

import type { PdfBundle } from "@/lib/pdf/bundle";
import { CustomReportPdf } from "@/lib/pdf/custom-document";
import { DefaultReportPdf } from "@/lib/pdf/default-document";

export async function renderReportPdf(bundle: PdfBundle): Promise<Buffer> {
  const document = bundle.layout
    ? createElement(CustomReportPdf, { bundle })
    : createElement(DefaultReportPdf, { bundle });
  const output = await renderToBuffer(
    document as Parameters<typeof renderToBuffer>[0]
  );
  return Buffer.isBuffer(output) ? output : Buffer.from(output);
}

export async function zipReportExport(bundle: PdfBundle, pdf: Buffer) {
  const zip = new JSZip();
  zip.file(`${bundle.report.report_number}.pdf`, pdf);
  for (const video of bundle.videos) {
    zip.file(video.filename, video.bytes);
  }
  return zip.generateAsync({ type: "nodebuffer" });
}

export async function zipBulkReportExport(
  items: { folder: string; pdf: Buffer; videos: PdfBundle["videos"] }[]
) {
  const zip = new JSZip();
  for (const item of items) {
    zip.file(`${item.folder}/${item.folder}.pdf`, item.pdf);
    for (const video of item.videos) {
      zip.file(`${item.folder}/${video.filename}`, video.bytes);
    }
  }
  return zip.generateAsync({ type: "nodebuffer" });
}
