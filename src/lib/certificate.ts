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
  type: 'participant' | 'presenter';
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
  pdf.setFillColor(250, 247, 240); // cream
  pdf.rect(0, 0, width, height, 'F');

  // Border
  pdf.setDrawColor(200, 165, 90); // gold
  pdf.setLineWidth(2);
  pdf.rect(10, 10, width - 20, height - 20);
  pdf.setLineWidth(0.5);
  pdf.rect(13, 13, width - 26, height - 26);

  // Corner decorations
  const cornerSize = 15;
  const corners = [
    [15, 15], [width - 15, 15], [15, height - 15], [width - 15, height - 15]
  ];
  pdf.setDrawColor(26, 58, 42); // forest
  corners.forEach(([x, y]) => {
    pdf.setLineWidth(1);
    pdf.line(x - cornerSize / 2, y, x + cornerSize / 2, y);
    pdf.line(x, y - cornerSize / 2, x, y + cornerSize / 2);
  });

  // Company logo
  if (data.companyLogoUrl) {
    try {
      const img = await loadImage(data.companyLogoUrl);
      pdf.addImage(img, 'PNG', width / 2 - 15, 20, 30, 30);
    } catch (e) {
      console.warn('Could not load logo');
    }
  }

  let yPos = data.companyLogoUrl ? 58 : 35;

  // Company name
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.setTextColor(26, 58, 42);
  pdf.text(data.companyName.toUpperCase(), width / 2, yPos, { align: 'center' });
  yPos += 12;

  // Title
  pdf.setFontSize(28);
  pdf.setTextColor(200, 165, 90);
  const title = data.type === 'presenter' ? 'CERTIFICATE OF PRESENTATION' : 'CERTIFICATE OF PARTICIPATION';
  pdf.text(title, width / 2, yPos, { align: 'center' });
  yPos += 12;

  // Decorative line
  pdf.setDrawColor(200, 165, 90);
  pdf.setLineWidth(0.5);
  pdf.line(width / 2 - 50, yPos, width / 2 + 50, yPos);
  yPos += 10;

  // Name
  const recipientName = data.type === 'presenter' ? data.presenterName : data.participantName;
  pdf.setFontSize(22);
  pdf.setTextColor(26, 58, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.text(recipientName || '', width / 2, yPos, { align: 'center' });
  yPos += 12;

  // Certificate text
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(60, 60, 60);
  const lines = pdf.splitTextToSize(data.certificateText, width - 80);
  pdf.text(lines, width / 2, yPos, { align: 'center' });
  yPos += lines.length * 6 + 10;

  // Workshop title
  pdf.setFont('helvetica', 'italic');
  pdf.setFontSize(13);
  pdf.setTextColor(26, 58, 42);
  pdf.text(`"${data.workshopTitle}"`, width / 2, yPos, { align: 'center' });
  yPos += 8;

  // Date
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text(new Date(data.workshopDate).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric'
  }), width / 2, yPos, { align: 'center' });

  // Signature section at bottom
  const sigY = height - 40;
  
  if (data.signatureUrl) {
    try {
      const sigImg = await loadImage(data.signatureUrl);
      pdf.addImage(sigImg, 'PNG', width / 2 - 20, sigY - 15, 40, 15);
    } catch (e) {
      console.warn('Could not load signature');
    }
  }

  pdf.setDrawColor(26, 58, 42);
  pdf.setLineWidth(0.3);
  pdf.line(width / 2 - 30, sigY + 2, width / 2 + 30, sigY + 2);
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.setTextColor(26, 58, 42);
  pdf.text(data.signerName, width / 2, sigY + 8, { align: 'center' });

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
