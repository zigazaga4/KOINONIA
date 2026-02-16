type SlideData = { title: string; html: string };

const SLIDE_WIDTH = 1920;
const SLIDE_HEIGHT = 1080;

function buildSlideHtml(slide: SlideData, themeCss: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=${SLIDE_WIDTH}, initial-scale=1">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: ${SLIDE_WIDTH}px; height: ${SLIDE_HEIGHT}px; overflow: hidden; }
${themeCss}
</style>
</head>
<body>
${slide.html}
</body>
</html>`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9 _-]/g, "").trim() || "Presentation";
}

async function renderSlideToCanvas(fullHtml: string): Promise<HTMLCanvasElement> {
  const html2canvas = (await import("html2canvas")).default;

  return new Promise((resolve, reject) => {
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "0";
    iframe.style.width = `${SLIDE_WIDTH}px`;
    iframe.style.height = `${SLIDE_HEIGHT}px`;
    iframe.style.border = "none";
    iframe.srcdoc = fullHtml;

    const cleanup = () => {
      if (iframe.parentNode) document.body.removeChild(iframe);
    };

    iframe.onload = async () => {
      try {
        // Wait for fonts to load inside the iframe
        await iframe.contentDocument?.fonts?.ready;
        // Small delay for rendering to settle
        await new Promise((r) => setTimeout(r, 200));

        const body = iframe.contentDocument?.body;
        if (!body) throw new Error("Could not access iframe content");

        const canvas = await html2canvas(body, {
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          windowWidth: SLIDE_WIDTH,
          windowHeight: SLIDE_HEIGHT,
          useCORS: true,
          scale: 1,
        });
        resolve(canvas);
      } catch (err) {
        reject(err);
      } finally {
        cleanup();
      }
    };

    iframe.onerror = () => {
      cleanup();
      reject(new Error("Failed to render slide"));
    };

    document.body.appendChild(iframe);
  });
}

/**
 * Export document presentation as PDF via browser print dialog.
 * Opens the HTML in a new window (avoids sandboxed iframe blocking print).
 */
export function exportDocumentPdf(html: string, title: string) {
  // Use a Blob URL so the new tab has real content (not about:blank)
  const fullHtml = html.includes("<!DOCTYPE") || html.includes("<html")
    ? html
    : `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
</head>
<body>
${html}
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (!win) {
    URL.revokeObjectURL(url);
    return;
  }
  // Once loaded, trigger print, then clean up the blob URL
  win.onload = () => {
    win.print();
    // Revoke after a delay so the print dialog can still access it
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };
}

/**
 * Export slides as a PowerPoint (.pptx) file.
 * Each slide is rendered as an image and placed on a PPTX slide.
 */
export async function exportSlidesPptx(
  slides: SlideData[],
  themeCss: string,
  title: string,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const PptxGenJS = (await import("pptxgenjs")).default;

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = title;

  for (let i = 0; i < slides.length; i++) {
    onProgress?.(i + 1, slides.length);
    const fullHtml = buildSlideHtml(slides[i], themeCss);
    const canvas = await renderSlideToCanvas(fullHtml);
    const imgData = canvas.toDataURL("image/png");

    const pptxSlide = pptx.addSlide();
    pptxSlide.addImage({
      data: imgData,
      x: 0,
      y: 0,
      w: "100%",
      h: "100%",
    });
  }

  await pptx.writeFile({ fileName: `${sanitizeFilename(title)}.pptx` });
}

/**
 * Export slides as PNG images bundled in a .zip file.
 */
export async function exportSlidesImages(
  slides: SlideData[],
  themeCss: string,
  title: string,
  onProgress?: (current: number, total: number) => void,
): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (let i = 0; i < slides.length; i++) {
    onProgress?.(i + 1, slides.length);
    const fullHtml = buildSlideHtml(slides[i], themeCss);
    const canvas = await renderSlideToCanvas(fullHtml);

    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b!), "image/png");
    });

    const num = (i + 1).toString().padStart(2, "0");
    const slideName = sanitizeFilename(slides[i].title);
    zip.file(`${num} - ${slideName}.png`, blob);
  }

  const zipBlob = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipBlob, `${sanitizeFilename(title)} - Slides.zip`);
}
