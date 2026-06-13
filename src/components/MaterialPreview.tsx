import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, File as FileIcon, Presentation, Image as ImageIcon, Eye, X } from 'lucide-react';

type Material = { title: string; url: string; type?: string };

function isImage(t = '') { return t.startsWith('image'); }
function isPdf(t = '', url = '') { return t.includes('pdf') || /\.pdf($|\?)/i.test(url); }
function isPpt(t = '') { return t.includes('presentation') || t.includes('powerpoint') || t.includes('keynote'); }

function iconFor(m: Material) {
  if (isImage(m.type)) return ImageIcon;
  if (isPdf(m.type, m.url)) return FileText;
  if (isPpt(m.type)) return Presentation;
  return FileIcon;
}

// Lazy pdf.js loader; only ran when we hit a PDF
let pdfjsPromise: Promise<any> | null = null;
async function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then(async (mod: any) => {
      const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
      mod.GlobalWorkerOptions.workerSrc = workerSrc;
      return mod;
    });
  }
  return pdfjsPromise;
}

function PdfThumb({ url }: { url: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pdfjs = await loadPdfjs();
        const pdf = await pdfjs.getDocument(url).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1 });
        const canvas = ref.current;
        if (!canvas || cancelled) return;
        const scale = Math.min(400 / viewport.width, 240 / viewport.height);
        const v = page.getViewport({ scale });
        canvas.width = v.width;
        canvas.height = v.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport: v, canvas }).promise;
      } catch (e) {
        if (!cancelled) setError(true);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/50 text-muted-foreground">
        <FileText className="w-10 h-10" />
      </div>
    );
  }
  return <canvas ref={ref} className="max-w-full max-h-full object-contain" />;
}

function MaterialCard({ m, onPreview }: { m: Material; onPreview: () => void }) {
  const Icon = iconFor(m);
  const previewable = isImage(m.type) || isPdf(m.type, m.url);
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden flex flex-col group hover:shadow-forest transition-shadow">
      <button
        onClick={previewable ? onPreview : undefined}
        className="aspect-[4/3] bg-muted/30 flex items-center justify-center overflow-hidden relative"
        title={previewable ? 'Preview' : m.title}
      >
        {isImage(m.type) ? (
          <img src={m.url} alt={m.title} loading="lazy" className="w-full h-full object-cover" />
        ) : isPdf(m.type, m.url) ? (
          <PdfThumb url={m.url} />
        ) : (
          <Icon className="w-12 h-12 text-muted-foreground" />
        )}
        {previewable && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Eye className="w-6 h-6 text-white" />
          </div>
        )}
      </button>
      <div className="p-3 flex items-center gap-2 border-t border-border">
        <Icon className="w-4 h-4 text-accent flex-shrink-0" />
        <span className="text-sm text-foreground truncate flex-1" title={m.title}>{m.title}</span>
        <a
          href={m.url}
          download
          target="_blank"
          rel="noopener"
          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
}

export function MaterialPreviewGrid({ materials }: { materials: Material[] }) {
  const [active, setActive] = useState<Material | null>(null);
  if (!materials || materials.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {materials.map((m, i) => (
          <MaterialCard key={i} m={m} onPreview={() => setActive(m)} />
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[85vh] p-0 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card">
            <span className="text-sm font-medium text-foreground truncate">{active?.title}</span>
            <div className="flex items-center gap-1">
              {active && (
                <a href={active.url} download target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-accent text-accent-foreground hover:opacity-90">
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
              )}
              <button onClick={() => setActive(null)} className="p-1 hover:bg-muted rounded">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div className="flex-1 bg-black/5 overflow-auto">
            {active && isImage(active.type) && (
              <img src={active.url} alt={active.title} className="w-full h-full object-contain" />
            )}
            {active && isPdf(active.type, active.url) && (
              <iframe
                src={`${active.url}#toolbar=1&navpanes=1`}
                title={active.title}
                className="w-full h-full bg-white"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
