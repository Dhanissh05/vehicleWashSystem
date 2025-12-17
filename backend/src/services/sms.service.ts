import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SmsParams {
  CUSTOMER_NAME?: string;
  VEHICLE_NUMBER?: string;
  SHOP_NAME?: string;
  TIMESTAMP?: string;
  PLAY_STORE_LINK?: string;
  AMOUNT?: string | number;
  PAYMENT_LINK?: string;
  MOBILE?: string;
  PASSWORD?: string;
  WORKER_CODE?: string;
}

/**
 * Send SMS using Fast2SMS
 */
export async function sendSms(mobile: string, message: string): Promise<boolean> {
  try {
    const axios = require('axios');
    
    // Log SMS for development
    console.log('\n📱 SMS SERVICE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${mobile}`);
    console.log(`Message: ${message}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // If no SMS API key configured, just log (for development)
    if (!process.env.FAST2SMS_API_KEY) {
      console.log('⚠️  FAST2SMS_API_KEY not configured - SMS not sent');
      return true;
    }

    // Send via Fast2SMS
    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'q',
        message: message,
        language: 'english',
        flash: 0,
        numbers: mobile,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ SMS sent successfully:', response.data);
    return true;
  } catch (error) {
    console.error('❌ SMS sending failed:', error);
    return false;
  }
}

/**
 * Send templated SMS by template key
 */
export async function sendTemplateSms(
  templateKey: string,
  mobile: string,
  params: SmsParams
): Promise<boolean> {
  try {
    // Fetch SMS template from database
    const template = await prisma.smsTemplate.findUnique({
      where: { key: templateKey },
    });

    if (!template || !template.isActive) {
      console.error(`SMS template not found or inactive: ${templateKey}`);
      return false;
    }

    // Replace placeholders in template
    let message = template.template;
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        message = message.replace(new RegExp(`{${key}}`, 'g'), String(value));
      }
    });

    // Send SMS
    return await sendSms(mobile, message);
  } catch (error) {
    console.error('Template SMS sending failed:', error);
    return false;
  }
}

/**
 * Send OTP SMS using Fast2SMS OTP route
 */
export async function sendOtpSms(mobile: string, otp: string): Promise<boolean> {
  try {
    const axios = require('axios');
    
    // Log OTP for development
    console.log('\n📱 OTP SMS SERVICE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${mobile}`);
    console.log(`OTP: ${otp}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // If no SMS API key configured, just log (for development)
    if (!process.env.FAST2SMS_API_KEY) {
      console.log('⚠️  FAST2SMS_API_KEY not configured - OTP logged above');
      return true;
    }

    // Send via Fast2SMS OTP route
    const response = await axios.post(
      'https://www.fast2sms.com/dev/bulkV2',
      {
        route: 'otp',
        variables_values: otp,
        numbers: mobile,
      },
      {
        headers: {
          authorization: process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('✅ OTP sent successfully:', response.data);
    return true;
  } catch (error) {
    console.error('❌ OTP sending failed:', error);
    return false;
  }
}

/**
 * Send vehicle received notification
 */
export async function sendVehicleReceivedSms(
  mobile: string,
  customerName: string,
  vehicleNumber: string,
  shopName: string
): Promise<boolean> {
  const playStoreLink = await getPlayStoreLink();
  const timestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return await sendTemplateSms('VEHICLE_RECEIVED', mobile, {
    CUSTOMER_NAME: customerName,
    VEHICLE_NUMBER: vehicleNumber,
    SHOP_NAME: shopName,
    TIMESTAMP: timestamp,
    PLAY_STORE_LINK: playStoreLink,
  });
}

/**
 * Send vehicle ready notification
 */
export async function sendVehicleReadySms(
  mobile: string,
  customerName: string,
  vehicleNumber: string,
  shopName: string,
  amount: number
): Promise<boolean> {
  const paymentLink = process.env.PAYMENT_LINK || 'Contact center for payment';

  return await sendTemplateSms('VEHICLE_READY', mobile, {
    CUSTOMER_NAME: customerName,
    VEHICLE_NUMBER: vehicleNumber,
    SHOP_NAME: shopName,
    AMOUNT: amount.toString(),
    PAYMENT_LINK: paymentLink,
  });
}

/**
 * Send worker credentials SMS
 */
export async function sendWorkerCredentialsSms(
  mobile: string,
  password: string,
  workerCode: string,
  shopName: string
): Promise<boolean> {
  const playStoreLink = await getPlayStoreLink();

  return await sendTemplateSms('WORKER_CREDENTIALS', mobile, {
    MOBILE: mobile,
    PASSWORD: password,
    WORKER_CODE: workerCode,
    SHOP_NAME: shopName,
    PLAY_STORE_LINK: playStoreLink,
  });
}

/**
 * Get Play Store link from system config
 */
async function getPlayStoreLink(): Promise<string> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'PLAY_STORE_URL' },
    });
    return config?.value || 'https://play.google.com/store/apps/details?id=com.vehiclewash.customer';
  } catch (error) {
    return 'https://play.google.com/store/apps/details?id=com.vehiclewash.customer';
  }
}
