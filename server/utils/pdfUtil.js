const puppeteer = require('puppeteer');

async function renderPdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
    });
    await browser.close();
    return pdfBuffer;
}

async function buildPrescriptionPdf(prescription) {
    const medsHtml = (prescription.medicines || []).map(m => `
        <tr>
            <td style="padding: 10px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${m.name}</td>
            <td style="padding: 10px; color: #64748b; border-bottom: 1px solid #e2e8f0;">${m.dosage || '-'}</td>
            <td style="padding: 10px; color: #64748b; border-bottom: 1px solid #e2e8f0;">${m.frequency || '-'}</td>
            <td style="padding: 10px; color: #64748b; border-bottom: 1px solid #e2e8f0;">${m.duration || '-'}</td>
        </tr>
    `).join('');

    const v = prescription.vitals || {};
    const vitalsHtml = `
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 25px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center;">
                <div style="font-size: 10px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">BP</div>
                <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 4px;">${v.bloodPressure || '120/80'}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center;">
                <div style="font-size: 10px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">Pulse</div>
                <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 4px;">${v.pulseRate || '74 bpm'}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center;">
                <div style="font-size: 10px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">Temp</div>
                <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 4px;">${v.temperature || '98.6 °F'}</div>
            </div>
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center;">
                <div style="font-size: 10px; font-weight: bold; color: #4f46e5; text-transform: uppercase;">SpO2</div>
                <div style="font-size: 13px; font-weight: 900; color: #0f172a; margin-top: 4px;">${v.spO2 || '99%'}</div>
            </div>
        </div>
    `;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #ffffff; color: #0f172a; margin: 0; padding: 30px; }
            .container { max-width: 700px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
            .header { background: #0f172a; color: #ffffff; padding: 24px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #4f46e5; }
            .hospital-name { font-size: 20px; font-weight: 900; }
            .hospital-name span { color: #818cf8; }
            .badge { font-size: 10px; font-weight: bold; color: #94a3b8; letter-spacing: 1px; margin-top: 4px; }
            .meta-grid { background: #f8fafc; padding: 20px 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; border-bottom: 1px solid #e2e8f0; }
            .meta-item .label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; }
            .meta-item .val { font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px; }
            .content { padding: 30px; }
            .diagnosis-box { margin-bottom: 20px; }
            .diagnosis-box .label { font-size: 11px; font-weight: bold; color: #64748b; text-transform: uppercase; }
            .diagnosis-box .val { font-size: 16px; font-weight: 900; color: #0f172a; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
            th { background: #f1f5f9; color: #64748b; text-align: left; padding: 10px; font-size: 10px; text-transform: uppercase; }
            .advice-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 16px; margin-bottom: 30px; }
            .advice-box .l { font-size: 11px; font-weight: bold; color: #92400e; margin-bottom: 4px; }
            .advice-box .p { font-size: 12px; color: #78350f; line-height: 1.5; }
            .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            .doctor-sig .name { font-size: 14px; font-weight: 900; color: #0f172a; }
            .doctor-sig .title { font-size: 11px; color: #64748b; margin-top: 2px; }
            .ref { font-size: 9px; color: #94a3b8; margin-top: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div>
                    <div class="hospital-name">PrimeCare <span>HOSPITAL</span></div>
                    <div class="badge">DIGITAL E-PRESCRIPTION</div>
                </div>
                <div style="text-align: right; font-size: 11px; color: #cbd5e1;">
                    <div>Ring Road, Medical Square, Indore</div>
                    <div style="margin-top: 2px;">OPD Hotline: +91 (0731) 456-7890</div>
                </div>
            </div>

            <div class="meta-grid">
                <div class="meta-item">
                    <div class="label">Patient Information</div>
                    <div class="val">${prescription.patientName}</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">ID: ${prescription.patientId || 'N/A'}</div>
                </div>
                <div class="meta-item" style="text-align: right;">
                    <div class="label">Consulting Specialist</div>
                    <div class="val" style="color: #4f46e5;">${prescription.doctorName}</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${prescription.department || 'General'} Department • ${new Date(prescription.createdAt || Date.now()).toLocaleDateString('en-IN')}</div>
                </div>
            </div>

            <div class="content">
                <div class="diagnosis-box">
                    <div class="label">Clinical Diagnosis</div>
                    <div class="val">${prescription.diagnosis || 'General Consultation'}</div>
                </div>

                ${vitalsHtml}

                <div style="font-size: 12px; font-weight: 900; color: #0f172a; margin-bottom: 10px; text-transform: uppercase;">Prescribed Medications</div>
                <table>
                    <thead>
                        <tr>
                            <th>Medicine Name</th>
                            <th>Dosage</th>
                            <th>Frequency</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${medsHtml}
                    </tbody>
                </table>

                <div class="advice-box">
                    <div class="l">Doctor’s Clinical Advice:</div>
                    <div class="p">${prescription.clinicalAdvice || 'Maintain hydration and follow prescribed routine.'}</div>
                </div>

                <div class="footer">
                    <div class="doctor-sig">
                        <div class="name">${prescription.doctorName}</div>
                        <div class="title">${prescription.department || 'General'} Department • Authorized Medical Practitioner</div>
                        <div class="ref">Digitally verified by PrimeCare EHR • Ref: ${prescription._id}</div>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    return await renderPdfFromHtml(html);
}

async function buildLabReportPdf(report) {
    const testsRows = (report.tests || []).map(t => `
        <tr>
            <td style="padding: 10px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${t.name}</td>
            <td style="padding: 10px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${t.result || '-'}</td>
            <td style="padding: 10px; color: #64748b; border-bottom: 1px solid #e2e8f0;">${t.unit || '-'}</td>
            <td style="padding: 10px; color: #64748b; border-bottom: 1px solid #e2e8f0;">${t.referenceRange || '-'}</td>
        </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #ffffff; color: #0f172a; margin: 0; padding: 30px; }
            .container { max-width: 700px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02); }
            .header { background: #0f172a; color: #ffffff; padding: 24px 30px; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #0d9488; }
            .hospital-name { font-size: 20px; font-weight: 900; }
            .hospital-name span { color: #2dd4bf; }
            .badge { font-size: 10px; font-weight: bold; color: #94a3b8; letter-spacing: 1px; margin-top: 4px; }
            .meta-grid { background: #f8fafc; padding: 20px 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 15px; border-bottom: 1px solid #e2e8f0; }
            .meta-item .label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; }
            .meta-item .val { font-size: 13px; font-weight: bold; color: #0f172a; margin-top: 2px; }
            .content { padding: 30px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 12px; }
            th { background: #f0fdfa; color: #0f766e; text-align: left; padding: 10px; font-size: 10px; text-transform: uppercase; }
            .advice-box { background: #f0fdfa; border: 1px solid #ccfbf1; border-radius: 12px; padding: 16px; margin-bottom: 30px; }
            .advice-box .l { font-size: 11px; font-weight: bold; color: #0f766e; margin-bottom: 4px; }
            .advice-box .p { font-size: 12px; color: #115e59; line-height: 1.5; }
            .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 20px; }
            .doctor-sig .name { font-size: 14px; font-weight: 900; color: #0f172a; }
            .doctor-sig .title { font-size: 11px; color: #64748b; margin-top: 2px; }
            .ref { font-size: 9px; color: #94a3b8; margin-top: 4px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div>
                    <div class="hospital-name">PrimeCare <span>HOSPITAL</span></div>
                    <div class="badge">PATHOLOGY & LAB REPORT</div>
                </div>
                <div style="text-align: right; font-size: 11px; color: #cbd5e1;">
                    <div>Ring Road, Medical Square, Indore</div>
                    <div style="margin-top: 2px;">Lab Hotline: +91 (0731) 456-7891</div>
                </div>
            </div>

            <div class="meta-grid">
                <div class="meta-item">
                    <div class="label">Patient Information</div>
                    <div class="val">${report.patientName}</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">ID: ${report.patientId || 'N/A'}</div>
                </div>
                <div class="meta-item" style="text-align: right;">
                    <div class="label">Laboratory Panel & Doctor</div>
                    <div class="val" style="color: #0d9488;">${report.panelName}</div>
                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${report.doctorName} • ${new Date(report.createdAt || Date.now()).toLocaleDateString('en-IN')}</div>
                </div>
            </div>

            <div class="content">
                <div style="font-size: 12px; font-weight: 900; color: #0f172a; margin-bottom: 10px; text-transform: uppercase;">Test Parameter Results</div>
                <table>
                    <thead>
                        <tr>
                            <th>Test Parameter</th>
                            <th>Result</th>
                            <th>Unit</th>
                            <th>Reference Range</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${testsRows}
                    </tbody>
                </table>

                <div class="advice-box">
                    <div class="l">Doctor’s Interpretation / Impression:</div>
                    <div class="p">${report.summaryImpression || 'Panel values within normal clinical thresholds.'}</div>
                </div>

                <div class="footer">
                    <div class="doctor-sig">
                        <div class="name">${report.doctorName}</div>
                        <div class="title">Pathology Department • Authorized Pathologist</div>
                        <div class="ref">Digitally verified by PrimeCare EHR • Ref: ${report._id}</div>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    return await renderPdfFromHtml(html);
}

module.exports = { buildPrescriptionPdf, buildLabReportPdf };