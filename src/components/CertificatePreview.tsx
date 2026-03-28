import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';

interface CertificatePreviewProps {
  open: boolean;
  onClose: () => void;
  onDownload: () => void;
  data: {
    recipientName: string;
    certificateText: string;
    workshopTitle: string;
    workshopDate: string;
    signerName: string;
    companyName: string;
    type: 'participant' | 'presenter';
    presenterNames?: string[];
    partnerLogos?: string[];
    companyLogoUrl?: string;
  } | null;
  downloading?: boolean;
}

export function CertificatePreview({ open, onClose, onDownload, data, downloading }: CertificatePreviewProps) {
  if (!data) return null;

  const title = data.type === 'presenter' ? 'CERTIFICATE OF PRESENTATION' : 'CERTIFICATE OF PARTICIPATION';
  const formattedDate = new Date(data.workshopDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-3xl p-0 overflow-hidden border-none bg-transparent shadow-none [&>button]:hidden">
        {/* Certificate card */}
        <div className="relative bg-[#fcfdff] rounded-lg overflow-hidden mx-auto" style={{ aspectRatio: '297/210' }}>
          {/* Borders */}
          <div className="absolute inset-2 border-[2.5px] border-[#0f4c81] rounded" />
          <div className="absolute inset-3 border border-[#3895d3] rounded" />

          {/* Content */}
          <div className="relative flex flex-col items-center justify-between h-full px-12 py-8">
            {/* Top section */}
            <div className="flex flex-col items-center text-center space-y-2 flex-1 justify-center">
              {data.companyLogoUrl && (
                <img src={data.companyLogoUrl} alt="Logo" className="h-10 w-10 object-contain mb-1" />
              )}
              <p className="text-[#0f4c81] font-bold text-xs tracking-widest uppercase">{data.companyName}</p>
              
              <h2 className="text-[#0f4c81] font-bold text-xl md:text-2xl tracking-wide mt-2">{title}</h2>
              
              <div className="w-32 h-px bg-[#3895d3] my-1" />
              
              <p className="text-[#505050] text-xs">This certifies that</p>
              
              <p className="text-[#0f4c81] font-bold text-lg md:text-xl">{data.recipientName}</p>
              <div className="w-40 h-px bg-[#3895d3]" />

              {/* Body text */}
              <p className="text-[#3c3c3c] text-xs md:text-sm leading-relaxed max-w-lg mt-2">
                {data.certificateText}
              </p>

              {/* Workshop title */}
              <p className="text-[#0f4c81] italic text-sm mt-1">"{data.workshopTitle}"</p>

              {/* Date */}
              <p className="text-[#646464] text-xs">{formattedDate}</p>

              {/* Presenter names for presenter certs */}
              {data.type === 'presenter' && data.presenterNames && data.presenterNames.length > 0 && (
                <p className="text-[#505050] text-[10px]">Presented by: {data.presenterNames.join(', ')}</p>
              )}
            </div>

            {/* Bottom section */}
            <div className="w-full flex items-end justify-between mt-4">
              {/* Partner logos */}
              <div className="flex gap-2">
                {(data.partnerLogos || []).filter(Boolean).map((logo, i) => (
                  <img key={i} src={logo} alt="Partner" className="h-8 w-8 object-contain" />
                ))}
              </div>

              {/* Signer */}
              <div className="text-center">
                <div className="w-24 h-px bg-[#0f4c81] mb-1" />
                <p className="text-[#0f4c81] font-bold text-xs">{data.signerName}</p>
                <p className="text-[#646464] text-[9px]">{new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions below */}
        <div className="flex justify-center gap-3 mt-4">
          <Button variant="outline" onClick={onClose} className="gap-1 bg-card">
            <X className="w-4 h-4" /> Close
          </Button>
          <Button onClick={onDownload} disabled={downloading} className="gap-1 bg-accent text-accent-foreground">
            <Download className="w-4 h-4" /> {downloading ? 'Downloading...' : 'Download PDF'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
