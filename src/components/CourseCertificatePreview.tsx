import { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { FileText, Download, ExternalLink, FileDown, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  templateUrl: string | null | undefined;
  courseTitle: string;
}

/**
 * Shows the uploaded certificate template (image inline, PDF via iframe)
 * with sample placeholder values overlaid for: recipient name, issue date,
 * and verification code, so admins can verify layout before issuing.
 */
export function CourseCertificatePreview({ open, onClose, templateUrl, courseTitle }: Props) {
  const isPdf = !!templateUrl && /\.pdf($|\?)/i.test(templateUrl);
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const sampleName = 'Sample Recipient Name';
  const sampleCode = 'CR-PREVIEW1';
  const previewRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const { toast } = useToast();

  const exportPdf = async () => {
    if (!previewRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        useCORS: true,
        backgroundColor: '#ffffff',
        scale: 2,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const w = pdf.internal.pageSize.getWidth();
      const h = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, w, h);
      const slug = courseTitle.replace(/\s+/g, '-').toLowerCase().slice(0, 60) || 'course';
      pdf.save(`certificate-preview-${slug}.pdf`);
      toast({ title: 'Preview exported', description: 'Certificate preview PDF downloaded.' });
    } catch (e: any) {
      toast({ title: 'Export failed', description: e?.message || 'Could not export PDF.', variant: 'destructive' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" /> Certificate preview — {courseTitle}
          </DialogTitle>
          <DialogDescription>
            Sample placeholders show where the recipient name, issue date, and verification code will appear on issued certificates.
          </DialogDescription>
        </DialogHeader>

        {!templateUrl && (
          <div className="bg-muted/40 border border-dashed border-border rounded-md p-6 text-center text-sm text-muted-foreground">
            No template uploaded yet. The default certificate design will be used.
          </div>
        )}

        {templateUrl && (
          <div ref={previewRef} className="relative rounded-md overflow-hidden border border-border bg-[#fcfdff]" style={{ aspectRatio: '297/210' }}>
            {isPdf ? (
              <iframe src={templateUrl + '#toolbar=0&navpanes=0'} className="absolute inset-0 w-full h-full" title="Certificate template" />
            ) : (
              <img src={templateUrl} alt="Certificate template" crossOrigin="anonymous" className="absolute inset-0 w-full h-full object-contain" />
            )}

            {/* Placeholder overlays */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center px-12 text-center">
              <div className="bg-white/70 backdrop-blur-sm rounded px-4 py-1 mb-3 border border-dashed border-[#0f4c81]">
                <p className="text-[10px] uppercase tracking-widest text-[#0f4c81]/70 font-semibold">Recipient name</p>
                <p className="text-xl md:text-2xl font-bold text-[#0f4c81]">{sampleName}</p>
              </div>
            </div>
            <div className="absolute bottom-6 left-6 bg-white/70 backdrop-blur-sm rounded px-2 py-1 border border-dashed border-[#0f4c81]">
              <p className="text-[9px] uppercase tracking-widest text-[#0f4c81]/70 font-semibold">Issue date</p>
              <p className="text-xs font-semibold text-[#0f4c81]">{today}</p>
            </div>
            <div className="absolute bottom-6 right-6 bg-white/70 backdrop-blur-sm rounded px-2 py-1 border border-dashed border-[#0f4c81]">
              <p className="text-[9px] uppercase tracking-widest text-[#0f4c81]/70 font-semibold">Verification code</p>
              <p className="text-xs font-mono font-semibold text-[#0f4c81]">{sampleCode}</p>
            </div>
          </div>
        )}

        {templateUrl && (
          <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
            {isPdf && (
              <span className="text-muted-foreground italic mr-auto">PDF templates can't be exported as a flattened preview — open the original to inspect.</span>
            )}
            <button
              onClick={exportPdf}
              disabled={exporting || isPdf}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-accent text-accent-foreground hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
            >
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              Export preview as PDF
            </button>
            <a href={templateUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-accent hover:underline">
              <ExternalLink className="w-3 h-3" /> Open original
            </a>
            <a href={templateUrl} download className="inline-flex items-center gap-1 text-accent hover:underline">
              <Download className="w-3 h-3" /> Download template
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
