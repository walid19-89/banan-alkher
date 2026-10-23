import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";

/**
 * Render a React document off-screen, rasterize it (Arabic-safe via html2canvas-pro),
 * and save it as an A4 PDF with automatic page breaks.
 */
export async function exportNodeToPdf(node: ReactNode, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const holder = document.createElement("div");
  holder.dir = "rtl";
  holder.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;background:#ffffff;z-index:-1;";
  document.body.appendChild(holder);

  const root = createRoot(holder);
  try {
    root.render(node);
    // Let React commit + fonts/images settle before rasterizing.
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 120)));
    try {
      await (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
    } catch {
      /* fonts API not available */
    }

    const canvas = await html2canvas(holder, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
      useCORS: true,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const pageW = 210;
    const pageH = 297;
    const margin = 10;
    const imgW = pageW - margin * 2;
    const imgH = (canvas.height * imgW) / canvas.width;
    const contentH = pageH - margin * 2;
    const pxPerMm = canvas.width / imgW;
    const sliceH = Math.floor(contentH * pxPerMm);

    let y = 0;
    let page = 0;
    while (y < canvas.height - 2 && page < 40) {
      const h = Math.min(sliceH, canvas.height - y);
      const slice = document.createElement("canvas");
      slice.width = canvas.width;
      slice.height = h;
      const ctx = slice.getContext("2d");
      if (!ctx) break;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
      if (page > 0) pdf.addPage();
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", margin, margin, imgW, h / pxPerMm);
      y += h;
      page++;
    }

    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } finally {
    try {
      root.unmount();
    } catch {
      /* ignore */
    }
    holder.remove();
  }
}
