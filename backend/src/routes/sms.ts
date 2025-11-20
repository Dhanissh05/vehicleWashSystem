import { Router } from 'express';
import { sendSms, sendTemplateSms } from '../services/sms.service';

const router = Router();

/**
 * POST /api/send-sms
 * Send SMS to a mobile number
 * Body: { mobile: string, message: string }
 */
router.post('/send-sms', async (req, res) => {
  try {
    const { mobile, message } = req.body;

    if (!mobile || !message) {
      return res.status(400).json({ error: 'Mobile and message are required' });
    }

    const success = await sendSms(mobile, message);

    if (success) {
      res.json({ success: true, message: 'SMS sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send SMS' });
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/send-template-sms
 * Send templated SMS to a mobile number
 * Body: { mobile: string, templateKey: string, params: object }
 */
router.post('/send-template-sms', async (req, res) => {
  try {
    const { mobile, templateKey, params } = req.body;

    if (!mobile || !templateKey) {
      return res.status(400).json({ error: 'Mobile and templateKey are required' });
    }

    const success = await sendTemplateSms(templateKey, mobile, params || {});

    if (success) {
      res.json({ success: true, message: 'Template SMS sent successfully' });
    } else {
      res.status(500).json({ error: 'Failed to send template SMS' });
    }
  } catch (error) {
    console.error('Error sending template SMS:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export { router as smsRouter };
