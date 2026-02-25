import jsPDF from 'jspdf';

interface CertificateData {
  certificateText: string;
  participantName?: string;
  presenterName?: string;
  workshopTitle: string;
  workshopDate: string;
  signerName: string;
  signatureUrl?: string;
  companyName: string;
  companyLogoUrl?: string;
  partnerLogos?: string[];
  type: 'participant' | 'presenter';
  verificationCode?: string;
  verificationUrl?: string;
}

export async function generateCertificatePDF(data: CertificateData) {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const width = pdf.internal.pageSize.getWidth();
  const height = pdf.internal.pageSize.getHeight();

  // Background - soft white
  pdf.setFillColor(252, 253, 255);
  pdf.rect(0, 0, width, height, 'F');

  // Ocean blue border - double line
  pdf.setDrawColor(15, 76, 129); // deep ocean blue
  pdf.setLineWidth(2.5);
  pdf.rect(8, 8, width - 16, height - 16);
  pdf.setDrawColor(56, 149, 211); // lighter ocean blue
  pdf.setLineWidth(0.8);
  pdf.rect(12, 12, width - 24, height - 24);

  // Subtle wave decoration at top
  pdf.setDrawColor(56, 149, 211);
  pdf.setLineWidth(0.3);
  for (let i = 0; i < 3; i++) {
    const y = 16 + i * 1.5;
    const alpha = 1 - i * 0.3;
    pdf.setDrawColor(56, 149, 211);
    pdf.setLineWidth(0.3 * alpha);
    // Simple decorative horizontal line
    pdf.line(20, y, width - 20, y);
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
  const title = data.type === 'presenter' ? 'CERTIFICATE OF PRESENTATION' : 'CERTIFICATE OF PARTICIPATION';
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

  // Signature section at bottom
  const sigY = height - 45;

  if (data.signatureUrl) {
    try {
      const sigImg = await loadImage(data.signatureUrl);
      pdf.addImage(sigImg, 'PNG', width / 2 - 20, sigY - 15, 40, 15);
    } catch (e) {
      console.warn('Could not load signature');
    }
  }

  pdf.setDrawColor(15, 76, 129);
  pdf.setLineWidth(0.4);
  pdf.line(width / 2 - 35, sigY + 2, width / 2 + 35, sigY + 2);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(15, 76, 129);
  pdf.text(data.signerName, width / 2, sigY + 8, { align: 'center' });

  // Partner logos row at bottom
  const partnerLogos = (data.partnerLogos || []).filter(Boolean);
  if (partnerLogos.length > 0) {
    const logoY = height - 28;
    const logoSize = 14;
    const totalWidth = partnerLogos.length * (logoSize + 6) - 6;
    let logoX = width / 2 - totalWidth / 2;

    for (const logoUrl of partnerLogos) {
      try {
        const img = await loadImage(logoUrl);
        pdf.addImage(img, 'PNG', logoX, logoY, logoSize, logoSize);
      } catch (e) {
        console.warn('Could not load partner logo');
      }
      logoX += logoSize + 6;
    }
  }

  // Verification code at bottom-right
  if (data.verificationCode) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.setTextColor(150, 150, 150);
    pdf.text(`Verify: ${data.verificationCode}`, width - 15, height - 13, { align: 'right' });
    if (data.verificationUrl) {
      pdf.text(data.verificationUrl, width - 15, height - 10, { align: 'right' });
    }
  }

  // Bottom decorative wave lines
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
