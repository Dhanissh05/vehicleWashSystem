import express from 'express';
import { getEstimationData, generateEstimationHTML, generateEstimationCSV, generateEstimationPDF, getSystemSettings } from '../services/estimation-export.service';

const router = express.Router();

/**
 * GET /api/estimations/:id/export/pdf
 * Export estimation as PDF
 */
router.get('/:id/export/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const estimation = await getEstimationData(id);
    const pdfBuffer = await generateEstimationPDF(estimation);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="estimation-${estimation.estimationNumber}.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Error exporting estimation to PDF:', error);
    res.status(500).json({ error: error.message || 'Failed to export estimation' });
  }
});

/**
 * GET /api/estimations/:id/export/html
 * Export estimation as HTML
 */
router.get('/:id/export/html', async (req, res) => {
  try {
    const { id } = req.params;
    const estimation = await getEstimationData(id);
    const systemSettings = await getSystemSettings(estimation);
    const html = generateEstimationHTML(estimation, systemSettings);
    
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="estimation-${estimation.estimationNumber}.html"`);
    res.send(html);
  } catch (error: any) {
    console.error('Error exporting estimation to HTML:', error);
    res.status(500).json({ error: error.message || 'Failed to export estimation' });
  }
});

/**
 * GET /api/estimations/:id/export/csv
 * Export estimation as CSV (for Excel)
 */
router.get('/:id/export/csv', async (req, res) => {
  try {
    const { id } = req.params;
    const estimation = await getEstimationData(id);
    const systemSettings = await getSystemSettings(estimation);
    const csv = generateEstimationCSV(estimation, systemSettings);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="estimation-${estimation.estimationNumber}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Error exporting estimation to CSV:', error);
    res.status(500).json({ error: error.message || 'Failed to export estimation' });
  }
});

/**
 * GET /api/estimations/:id/preview
 * Preview estimation in browser
 */
router.get('/:id/preview', async (req, res) => {
  try {
    const { id } = req.params;
    const estimation = await getEstimationData(id);
    const systemSettings = await getSystemSettings(estimation);
    const html = generateEstimationHTML(estimation, systemSettings);
    
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    console.error('Error previewing estimation:', error);
    res.status(500).json({ error: error.message || 'Failed to preview estimation' });
  }
});

export default router;
