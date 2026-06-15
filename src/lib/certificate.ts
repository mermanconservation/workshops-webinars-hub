import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface CertificateData {
  certificateText: string;
  participantName?: string;
  presenterName?: string;
  presenterNames?: string[];
  workshopTitle: string;
  workshopDate: string;
  signerName: string;
  signatureUrl?: string;
  companyName: string;
  companyLogoUrl?: string;
  partnerLogos?: string[];
  type: 'participant' | 'presenter' | 'course_completion';
  verificationCode?: string;
  verificationUrl?: string;
  certificateTitle?: string;
  templateUrl?: string;
}

export async function generateCertificatePDF(data: CertificateData) {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();

  // Background
  pdf.setFillColor(252, 253, 255);
  pdf.rect(0, 0, width, height, 'F');

  let useTemplateBackground = false;
  if (data.templateUrl && !/\.pdf($|\?)/i.test(data.templateUrl)) {
    try {
      const bg = await loadImage(data.templateUrl);
      pdf.addImage(bg, 'PNG', 0, 0, width, height);
      useTemplateBackground = true;
    } catch (e) {
      console.warn('Could not load certificate template, falling back to default design', e);
    }
  }

  if (!useTemplateBackground) {
    // Ocean blue border - double line
    pdf.setDrawColor(15, 76, 129);
    pdf.setLineWidth(2.5);
    pdf.rect(8, 8, width - 16, height - 16);
    pdf.setDrawColor(56, 149, 211);
    pdf.setLineWidth(0.8);
    pdf.rect(12, 12, width - 24, height - 24);

    // Subtle decorative lines at top
    pdf.setDrawColor(56, 149, 211);
    for (let i = 0; i < 3; i++) {
      const y = 16 + i * 1.5;
      pdf.setLineWidth(0.3 * (1 - i * 0.3));
      pdf.line(20, y, width - 20, y);
    }
  }

  // Company logo
  let yPos = 28;
  if (data.companyLogoUrl) {
    try {
      const img = await loadImage(data.companyLogoUrl);
      pdf.addImage(img, 'PNG', width / 2 - 15, yPos, 30, 30);
      yPos += 35;
    } catch (e) {
      console.warn('Could not load logo');
    }
  }

  // Company name
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.setTextColor(15, 76, 129);
  pdf.text(data.companyName.toUpperCase(), width / 2, yPos, { align: 'center' });
  yPos += 14;

  // Title
  pdf.setFontSize(30);
  pdf.setTextColor(15, 76, 129);
  const title = data.certificateTitle
    || (data.type === 'presenter' ? 'CERTIFICATE OF PRESENTATION'
        : data.type === 'course_completion' ? 'CERTIFICATE OF COURSE COMPLETION'
        : 'CERTIFICATE OF PARTICIPATION');
  pdf.text(title, width / 2, yPos, { align: 'center' });
  yPos += 10;

  // Decorative line under title
  pdf.setDrawColor(56, 149, 211);
  pdf.setLineWidth(0.8);
  pdf.line(width / 2 - 60, yPos, width / 2 + 60, yPos);
  yPos += 12;

  // "This certifies that"
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(80, 80, 80);
  pdf.text('This certifies that', width / 2, yPos, { align: 'center' });
  yPos += 10;

  // Recipient name
  const recipientName = data.type === 'presenter' ? data.presenterName : data.participantName;
  pdf.setFontSize(24);
  pdf.setTextColor(15, 76, 129);
  pdf.setFont('helvetica', 'bold');
  pdf.text(recipientName || '', width / 2, yPos, { align: 'center' });
  yPos += 4;

  // Name underline
  const nameWidth = pdf.getTextWidth(recipientName || '');
  pdf.setDrawColor(56, 149, 211);
  pdf.setLineWidth(0.5);
  pdf.line(width / 2 - nameWidth / 2 - 5, yPos, width / 2 + nameWidth / 2 + 5, yPos);
  yPos += 10;

  // Certificate body text
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10.5);
  pdf.setTextColor(60, 60, 60);
  const lines = pdf.splitTextToSize(data.certificateText, width - 80);
  pdf.text(lines, width / 2, yPos, { align: 'center' });
  yPos += lines.length * 5.5 + 8;

  // Workshop title
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(13);
  pdf.setTextColor(15, 76, 129);
  pdf.text(`"${data.workshopTitle}"`, width / 2, yPos, { align: 'center' });
  yPos += 7;

  // Date
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(new Date(data.workshopDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  }), width / 2, yPos, { align: 'center' });
  yPos += 8;

  // Presenter names (only show on presenter certificates)
  if (data.type === 'presenter') {
    const presentersList = (data.presenterNames || []).filter(Boolean);
    if (presentersList.length > 0) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`Presented by: ${presentersList.join(', ')}`, width / 2, yPos, { align: 'center' });
    }
  }

  // === BOTTOM SECTION ===
  const bottomY = height - 40;

  // BOTTOM-LEFT: Partner logos
  const partnerLogos = (data.partnerLogos || []).filter(Boolean);
  if (partnerLogos.length > 0) {
    const logoSize = 14;
    let logoX = 20;
    for (const logoUrl of partnerLogos) {
      try {
        const img = await loadImage(logoUrl);
        pdf.addImage(img, 'PNG', logoX, bottomY - 5, logoSize, logoSize);
      } catch (e) {
        console.warn('Could not load partner logo');
      }
      logoX += logoSize + 6;
    }
  }

  // BOTTOM-RIGHT: Signature + date
  const sigX = width - 55;
  if (data.signatureUrl) {
    try {
      const sigImg = await loadImage(data.signatureUrl);
      pdf.addImage(sigImg, 'PNG', sigX - 5, bottomY - 18, 40, 15);
    } catch (e) {
      console.warn('Could not load signature');
    }
  }

  pdf.setDrawColor(15, 76, 129);
  pdf.setLineWidth(0.4);
  pdf.line(sigX - 10, bottomY, sigX + 40, bottomY);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 76, 129);
  pdf.text(data.signerName, sigX + 15, bottomY + 6, { align: 'center' });

  // Date of signature below signer name
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 100);
  pdf.text(new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), sigX + 15, bottomY + 11, { align: 'center' });

  // Verification code + QR code inside frame (bottom center)
  if (data.verificationCode) {
    const verifUrl = data.verificationUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/verify?code=${data.verificationCode}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(verifUrl, { margin: 0, width: 200 });
      pdf.addImage(qrDataUrl, 'PNG', width / 2 - 9, height - 36, 18, 18);
    } catch (e) {
      console.warn('Could not generate QR code', e);
    }
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Verify: ${data.verificationCode}`, width / 2, height - 17, { align: 'center' });
  }

  // Bottom decorative lines
  pdf.setDrawColor(56, 149, 211);
  for (let i = 0; i < 3; i++) {
    const y = height - 16 - i * 1.5;
    pdf.setLineWidth(0.3 * (1 - i * 0.3));
    pdf.line(20, y, width - 20, y);
  }

  // Download
  const fileName = `certificate-${(recipientName || 'certificate').replace(/\s+/g, '-').toLowerCase()}.pdf`;
  pdf.save(fileName);
}

function loadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}