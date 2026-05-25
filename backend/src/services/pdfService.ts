import puppeteer from 'puppeteer';
import { IGeneratedPaper } from '../models/Assignment';

export async function generatePDF(paper: IGeneratedPaper): Promise<Buffer> {
  const htmlContent = getPaperHTML(paper);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate A4 PDF with standard margins
    const pdfBuffer = await page.pdf({
      format: 'A4',
      margin: {
        top: '20mm',
        bottom: '20mm',
        left: '20mm',
        right: '20mm',
      },
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: '<div></div>',
      footerTemplate: `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 9px; width: 100%; display: flex; justify-content: space-between; padding: 0 20mm; color: #555;">
          <span>VedaAI Assessment Creator</span>
          <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
        </div>
      `,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

function getPaperHTML(paper: IGeneratedPaper): string {
  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case 'easy': return '#10b981';
      case 'medium':
      case 'moderate': return '#f59e0b';
      case 'hard': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const sectionsHTML = paper.sections.map((section) => {
    const questionsHTML = section.questions.map((q) => {
      let optionsHTML = '';
      if (q.options && q.options.length > 0) {
        optionsHTML = `
          <div class="question-options">
            ${q.options.map((opt) => `<div class="option-item">${opt}</div>`).join('')}
          </div>
        `;
      }

      return `
        <div class="question-container">
          <div class="question-row">
            <div class="question-text">
              <span class="question-number">Q${q.questionNumber}.</span>
              ${q.text}
            </div>
            <div class="question-meta">
              <span class="difficulty-badge" style="border-color: ${getDifficultyColor(q.difficulty)}; color: ${getDifficultyColor(q.difficulty)};">
                ${q.difficulty}
              </span>
              <span class="question-marks">[${q.marks} Mark${q.marks > 1 ? 's' : ''}]</span>
            </div>
          </div>
          ${optionsHTML}
        </div>
      `;
    }).join('');

    return `
      <div class="section-container">
        <div class="section-header">
          <div class="section-title">${section.title}</div>
          <div class="section-total-marks">Total: ${section.totalMarks} Marks</div>
        </div>
        <div class="section-instruction">${section.instruction}</div>
        <div class="questions-list">
          ${questionsHTML}
        </div>
      </div>
    `;
  }).join('');

  const instructionsHTML = paper.generalInstructions && paper.generalInstructions.length > 0
    ? `
      <div class="instructions-container">
        <div class="instructions-title">General Instructions:</div>
        <ol class="instructions-list">
          ${paper.generalInstructions.map((inst) => `<li>${inst}</li>`).join('')}
        </ol>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>${paper.examTitle}</title>
      <style>
        @page {
          size: A4;
          margin: 20mm 20mm 20mm 20mm;
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          color: #111;
          line-height: 1.5;
          margin: 0;
          padding: 0;
          font-size: 14px;
          background-color: #fff;
        }
        .header-container {
          text-align: center;
          border-bottom: 3px double #111;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .institution-name {
          font-size: 22px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 4px;
        }
        .exam-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 12px;
        }
        .meta-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        .meta-table td {
          padding: 4px 0;
          font-size: 13px;
        }
        .meta-label {
          font-weight: bold;
        }
        .student-info-container {
          display: flex;
          justify-content: space-between;
          border: 1px solid #111;
          padding: 8px 12px;
          margin-bottom: 20px;
          font-size: 13px;
        }
        .info-field {
          display: flex;
          align-items: center;
          flex-grow: 1;
          margin-right: 16px;
        }
        .info-field:last-child {
          margin-right: 0;
        }
        .info-label {
          font-weight: bold;
          margin-right: 6px;
          white-space: nowrap;
        }
        .info-line {
          border-bottom: 1px dotted #111;
          flex-grow: 1;
          height: 14px;
        }
        .instructions-container {
          margin-bottom: 24px;
          font-size: 13px;
          background: #f9f9f9;
          border: 1px solid #ddd;
          padding: 10px 14px;
          border-radius: 4px;
        }
        .instructions-title {
          font-weight: bold;
          margin-bottom: 6px;
          text-decoration: underline;
        }
        .instructions-list {
          margin: 0;
          padding-left: 20px;
        }
        .instructions-list li {
          margin-bottom: 4px;
        }
        .section-container {
          margin-bottom: 24px;
          page-break-inside: avoid;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          border-bottom: 1.5px solid #111;
          padding-bottom: 4px;
          margin-bottom: 8px;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          text-transform: uppercase;
        }
        .section-total-marks {
          font-weight: bold;
          font-size: 14px;
        }
        .section-instruction {
          font-style: italic;
          margin-bottom: 12px;
          font-size: 13px;
          color: #444;
        }
        .question-container {
          margin-bottom: 16px;
          page-break-inside: avoid;
        }
        .question-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .question-text {
          flex-grow: 1;
          padding-right: 24px;
          text-align: justify;
        }
        .question-number {
          font-weight: bold;
          margin-right: 4px;
        }
        .question-meta {
          display: flex;
          align-items: center;
          white-space: nowrap;
          font-size: 12px;
        }
        .difficulty-badge {
          border: 1px solid;
          border-radius: 3px;
          padding: 1px 4px;
          font-size: 10px;
          text-transform: uppercase;
          font-weight: bold;
          margin-right: 8px;
          font-family: Arial, Helvetica, sans-serif;
        }
        .question-marks {
          font-weight: bold;
        }
        .question-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px 20px;
          padding-left: 28px;
          margin-top: 6px;
        }
        .option-item {
          font-size: 13px;
        }
        .paper-footer {
          text-align: center;
          margin-top: 40px;
          border-top: 1px solid #ddd;
          padding-top: 16px;
          font-size: 12px;
          color: #777;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="header-container">
        <div class="institution-name">${paper.institutionName}</div>
        <div class="exam-title">${paper.examTitle}</div>
        <table class="meta-table">
          <tr>
            <td width="33%"><span class="meta-label">Subject:</span> ${paper.subject}</td>
            <td width="33%" align="center"><span class="meta-label">Class/Grade:</span> ${paper.grade}</td>
            <td width="33%" align="right"><span class="meta-label">Date:</span> ${paper.date}</td>
          </tr>
          <tr>
            <td><span class="meta-label">Duration:</span> ${paper.duration}</td>
            <td></td>
            <td align="right"><span class="meta-label">Total Marks:</span> ${paper.totalMarks}</td>
          </tr>
        </table>
      </div>

      <div class="student-info-container">
        <div class="info-field" style="width: 50%;">
          <span class="info-label">Candidate Name:</span>
          <div class="info-line"></div>
        </div>
        <div class="info-field" style="width: 25%;">
          <span class="info-label">Roll Number:</span>
          <div class="info-line"></div>
        </div>
        <div class="info-field" style="width: 25%;">
          <span class="info-label">Section:</span>
          <div class="info-line"></div>
        </div>
      </div>

      ${instructionsHTML}

      <div class="paper-body">
        ${sectionsHTML}
      </div>

      <div class="paper-footer">
        ••• End of Question Paper •••
      </div>
    </body>
    </html>
  `;
}
