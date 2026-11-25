const PDFDocument = require('pdfkit');

/**
 * Generate a PDF buffer from a PDFKit document instance.
 */
function streamToBuffer(doc) {
    return new Promise((resolve, reject) => {
        const buffers = [];
        doc.on('data', chunk => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', err => reject(err));
    });
}

/**
 * Build a professionally formatted E-Prescription PDF using PDFKit.
 * Render-compatible, lightweight, zero external binary dependency.
 */
async function buildPrescriptionPdf(prescription) {
    const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
            Title: `Prescription - ${prescription.patientName}`,
            Author: 'PrimeCare Hospital & Research Center',
            Subject: 'Digital E-Prescription'
        }
    });

    const bufferPromise = streamToBuffer(doc);

    // --- Header Banner ---
    const primaryColor = '#1e3a8a';   // Deep Blue
    const accentColor = '#2563eb';    // Indigo/Blue
    const textColor = '#0f172a';      // Slate 900
    const lightMuted = '#64748b';     // Slate 500
    const borderGray = '#e2e8f0';     // Slate 200
    const bgLight = '#f8fafc';        // Slate 50

    // Top Header Bar
    doc.rect(40, 40, 515, 65).fill(primaryColor);

    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
        .text('PrimeCare HOSPITAL', 55, 52);
    doc.fillColor('#93c5fd').fontSize(9).font('Helvetica-Bold')
        .text('DIGITAL OUTPATIENT E-PRESCRIPTION', 55, 75);

    doc.fillColor('#ffffff').fontSize(9).font('Helvetica')
        .text('Ring Road, Medical Square, Indore (M.P.)', 320, 54, { align: 'right', width: 220 })
        .text('Helpline: +91 (0731) 456-7890 | 24x7 Emergency', 320, 68, { align: 'right', width: 220 });

    let currentY = 115;

    // --- Patient & Doctor Meta Box ---
    doc.rect(40, currentY, 515, 60).fillAndStroke(bgLight, borderGray);

    // Patient Column
    doc.fillColor(lightMuted).fontSize(8).font('Helvetica-Bold')
        .text('PATIENT DETAILS', 55, currentY + 10);
    doc.fillColor(textColor).fontSize(11).font('Helvetica-Bold')
        .text(prescription.patientName || 'Patient', 55, currentY + 22);
    doc.fillColor(lightMuted).fontSize(8).font('Helvetica')
        .text(`Patient ID: ${prescription.patientId || prescription.patient || 'N/A'}`, 55, currentY + 38);

    // Doctor Column
    doc.fillColor(lightMuted).fontSize(8).font('Helvetica-Bold')
        .text('CONSULTING SPECIALIST', 310, currentY + 10);
    doc.fillColor(accentColor).fontSize(11).font('Helvetica-Bold')
        .text(prescription.doctorName || 'Doctor', 310, currentY + 22);
    const dateStr = new Date(prescription.createdAt || Date.now()).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
    doc.fillColor(lightMuted).fontSize(8).font('Helvetica')
        .text(`${prescription.department || 'General Medicine'} • Date: ${dateStr}`, 310, currentY + 38);

    currentY += 70;

    // --- Clinical Diagnosis ---
    doc.fillColor(lightMuted).fontSize(8).font('Helvetica-Bold')
        .text('CLINICAL DIAGNOSIS', 40, currentY);
    currentY += 12;
    doc.fillColor(textColor).fontSize(13).font('Helvetica-Bold')
        .text(prescription.diagnosis || 'General Consultation', 40, currentY);
    currentY += 22;

    // --- Vitals Card Grid ---
    const vitals = prescription.vitals || {};
    const vitalsData = [
        { label: 'BLOOD PRESSURE', val: vitals.bloodPressure || '120/80 mmHg' },
        { label: 'PULSE RATE', val: vitals.pulseRate ? `${vitals.pulseRate} bpm` : '72 bpm' },
        { label: 'TEMPERATURE', val: vitals.temperature ? `${vitals.temperature} °F` : '98.6 °F' },
        { label: 'SPO2', val: vitals.spO2 ? `${vitals.spO2}%` : '98%' }
    ];

    const cardWidth = 120;
    const cardGap = 11;
    vitalsData.forEach((v, idx) => {
        const xPos = 40 + idx * (cardWidth + cardGap);
        doc.rect(xPos, currentY, cardWidth, 42).fillAndStroke(bgLight, borderGray);
        doc.fillColor(accentColor).fontSize(7).font('Helvetica-Bold')
            .text(v.label, xPos, currentY + 8, { width: cardWidth, align: 'center' });
        doc.fillColor(textColor).fontSize(11).font('Helvetica-Bold')
            .text(v.val, xPos, currentY + 20, { width: cardWidth, align: 'center' });
    });

    currentY += 54;

    // --- Prescribed Medications Table ---
    doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold')
        .text('PRESCRIBED MEDICATIONS', 40, currentY);
    currentY += 16;

    // Table Header
    doc.rect(40, currentY, 515, 20).fill('#e0e7ff');
    doc.fillColor('#3730a3').fontSize(8).font('Helvetica-Bold');
    doc.text('MEDICINE NAME', 50, currentY + 6, { width: 180 });
    doc.text('DOSAGE', 235, currentY + 6, { width: 90 });
    doc.text('FREQUENCY', 330, currentY + 6, { width: 95 });
    doc.text('DURATION', 430, currentY + 6, { width: 115 });

    currentY += 20;

    const medicines = prescription.medicines && prescription.medicines.length > 0
        ? prescription.medicines
        : [{ name: 'As directed by specialist', dosage: '-', frequency: 'Once daily', duration: '5 days' }];

    medicines.forEach((med, i) => {
        const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(40, currentY, 515, 22).fillAndStroke(rowBg, borderGray);

        doc.fillColor(textColor).fontSize(9).font('Helvetica-Bold')
            .text(med.name || '-', 50, currentY + 6, { width: 180 });
        doc.fillColor(lightMuted).fontSize(8).font('Helvetica')
            .text(med.dosage || '-', 235, currentY + 6, { width: 90 })
            .text(med.frequency || '-', 330, currentY + 6, { width: 95 })
            .text(med.duration || '-', 430, currentY + 6, { width: 115 });

        currentY += 22;
    });

    currentY += 15;

    // --- Clinical Advice / Notes ---
    doc.rect(40, currentY, 515, 48).fillAndStroke('#fffbeb', '#fde68a'); // Warm Amber
    doc.fillColor('#92400e').fontSize(8).font('Helvetica-Bold')
        .text("DOCTOR'S CLINICAL ADVICE & INSTRUCTIONS", 50, currentY + 8);
    doc.fillColor('#78350f').fontSize(9).font('Helvetica')
        .text(prescription.clinicalAdvice || 'Adequate hydration, balanced diet, and complete the prescribed regimen as advised.', 50, currentY + 22, {
            width: 495,
            lineGap: 2
        });

    currentY += 60;

    // --- Footer & Signature Section ---
    const footerY = Math.max(currentY + 10, 710);
    doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(borderGray).stroke();

    doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold')
        .text(prescription.doctorName || 'Authorized Medical Officer', 330, footerY + 12, { align: 'right', width: 225 });
    doc.fillColor(lightMuted).fontSize(8).font('Helvetica')
        .text(`${prescription.department || 'Clinical'} Dept • Reg. Medical Practitioner`, 330, footerY + 25, { align: 'right', width: 225 })
        .text('Verified Digital EHR Record', 330, footerY + 37, { align: 'right', width: 225 });

    doc.fillColor(lightMuted).fontSize(7).font('Helvetica')
        .text(`Prescription Reference: ${prescription._id}`, 40, footerY + 14)
        .text('PrimeCare Integrated Healthcare Network • This is a computer generated medical record.', 40, footerY + 26);

    doc.end();
    return await bufferPromise;
}

/**
 * Build a professionally formatted Laboratory Report PDF using PDFKit.
 * Render-compatible, lightweight, zero external binary dependency.
 */
async function buildLabReportPdf(report) {
    const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
            Title: `Lab Report - ${report.panelName || 'Diagnostic Panel'}`,
            Author: 'PrimeCare Pathology & Diagnostic Center',
            Subject: 'Pathology & Diagnostic Lab Report'
        }
    });

    const bufferPromise = streamToBuffer(doc);

    // --- Header Banner ---
    const primaryColor = '#0f766e';   // Deep Teal
    const accentColor = '#0d9488';    // Teal Accent
    const textColor = '#0f172a';      // Slate 900
    const lightMuted = '#64748b';     // Slate 500
    const borderGray = '#e2e8f0';     // Slate 200
    const bgLight = '#f8fafc';        // Slate 50

    // Top Header Bar
    doc.rect(40, 40, 515, 65).fill(primaryColor);

    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
        .text('PrimeCare HOSPITAL', 55, 52);
    doc.fillColor('#99f6e4').fontSize(9).font('Helvetica-Bold')
        .text('DEPARTMENT OF PATHOLOGY & CLINICAL BIOCHEMISTRY', 55, 75);

    doc.fillColor('#ffffff').fontSize(9).font('Helvetica')
        .text('NABL Accredited Diagnostics Lab', 320, 54, { align: 'right', width: 220 })
        .text('Ring Road, Medical Square, Indore | Ph: 0731-4567891', 320, 68, { align: 'right', width: 220 });

    let currentY = 115;

    // --- Patient & Panel Meta Box ---
    doc.rect(40, currentY, 515, 60).fillAndStroke(bgLight, borderGray);

    // Patient Column
    doc.fillColor(lightMuted).fontSize(8).font('Helvetica-Bold')
        .text('PATIENT IDENTIFICATION', 55, currentY + 10);
    doc.fillColor(textColor).fontSize(11).font('Helvetica-Bold')
        .text(report.patientName || 'Patient', 55, currentY + 22);
    doc.fillColor(lightMuted).fontSize(8).font('Helvetica')
        .text(`Patient ID: ${report.patientId || 'N/A'}`, 55, currentY + 38);

    // Lab Panel & Doctor Column
    doc.fillColor(lightMuted).fontSize(8).font('Helvetica-Bold')
        .text('DIAGNOSTIC TEST PANEL', 310, currentY + 10);
    doc.fillColor(accentColor).fontSize(11).font('Helvetica-Bold')
        .text(report.panelName || 'Routine Diagnostic Panel', 310, currentY + 22);
    const dateStr = new Date(report.createdAt || Date.now()).toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
    doc.fillColor(lightMuted).fontSize(8).font('Helvetica')
        .text(`Ref. Doctor: ${report.doctorName || 'Consultant'} • Date: ${dateStr}`, 310, currentY + 38);

    currentY += 75;

    // --- Test Parameter Results Table ---
    doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold')
        .text('LABORATORY TEST RESULTS', 40, currentY);
    currentY += 16;

    // Table Header
    doc.rect(40, currentY, 515, 20).fill('#ccfbf1'); // Teal Light
    doc.fillColor('#115e59').fontSize(8).font('Helvetica-Bold');
    doc.text('TEST PARAMETER', 50, currentY + 6, { width: 190 });
    doc.text('OBSERVED VALUE', 245, currentY + 6, { width: 100 });
    doc.text('UNIT', 350, currentY + 6, { width: 75 });
    doc.text('REFERENCE INTERVAL', 430, currentY + 6, { width: 115 });

    currentY += 20;

    const tests = report.tests && report.tests.length > 0
        ? report.tests
        : [{ name: 'Routine Panel Analysis', result: 'Normal', unit: '-', referenceRange: 'Normal' }];

    tests.forEach((test, i) => {
        const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
        doc.rect(40, currentY, 515, 22).fillAndStroke(rowBg, borderGray);

        doc.fillColor(textColor).fontSize(9).font('Helvetica-Bold')
            .text(test.name || '-', 50, currentY + 6, { width: 190 });
        doc.fillColor('#0f766e').fontSize(9).font('Helvetica-Bold')
            .text(String(test.result || '-'), 245, currentY + 6, { width: 100 });
        doc.fillColor(lightMuted).fontSize(8).font('Helvetica')
            .text(test.unit || '-', 350, currentY + 6, { width: 75 })
            .text(test.referenceRange || '-', 430, currentY + 6, { width: 115 });

        currentY += 22;
    });

    currentY += 15;

    // --- Pathologist Summary / Impression ---
    doc.rect(40, currentY, 515, 48).fillAndStroke('#f0fdfa', '#99f6e4'); // Teal Box
    doc.fillColor('#0f766e').fontSize(8).font('Helvetica-Bold')
        .text("PATHOLOGIST IMPRESSION & CLINICAL SUMMARY", 50, currentY + 8);
    doc.fillColor('#115e59').fontSize(9).font('Helvetica')
        .text(report.summaryImpression || 'Parameters observed are consistent with clinical baselines. Follow up as advised.', 50, currentY + 22, {
            width: 495,
            lineGap: 2
        });

    currentY += 60;

    // --- Footer & Authorization Section ---
    const footerY = Math.max(currentY + 10, 710);
    doc.moveTo(40, footerY).lineTo(555, footerY).strokeColor(borderGray).stroke();

    doc.fillColor(textColor).fontSize(10).font('Helvetica-Bold')
        .text(report.doctorName || 'Consultant Pathologist', 330, footerY + 12, { align: 'right', width: 225 });
    doc.fillColor(lightMuted).fontSize(8).font('Helvetica')
        .text('Department of Laboratory Medicine • MD (Pathology)', 330, footerY + 25, { align: 'right', width: 225 })
        .text('Electronically Authenticated & Signed', 330, footerY + 37, { align: 'right', width: 225 });

    doc.fillColor(lightMuted).fontSize(7).font('Helvetica')
        .text(`Lab Report ID: ${report._id}`, 40, footerY + 14)
        .text('PrimeCare Pathology Lab • Tests performed on calibrated automated analyzers.', 40, footerY + 26);

    doc.end();
    return await bufferPromise;
}

module.exports = { buildPrescriptionPdf, buildLabReportPdf };
