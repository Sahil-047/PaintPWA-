import puppeteer from 'puppeteer';

type PdfSize = {
  width?: number;
  height?: number;
};

const generatePdfBuffer = async (html: string, size?: PdfSize): Promise<Buffer> => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

    const pdfOptions: Parameters<typeof page.pdf>[0] = {
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    };

    if (size?.width && size?.height) {
      pdfOptions.width = `${size.width}px`;
      pdfOptions.height = `${size.height}px`;
    } else {
      pdfOptions.format = 'A4';
    }

    return Buffer.from(await page.pdf(pdfOptions));
  } finally {
    await browser.close();
  }
};

export default generatePdfBuffer;
