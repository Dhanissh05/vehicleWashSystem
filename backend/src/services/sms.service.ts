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
 * Send SMS using configured SMS provider
 * This is a stub implementation - integrate with your SMS provider
 */
export async function sendSms(mobile: string, message: string): Promise<boolean> {
  try {
    // TODO: Integrate with SMS API provider (e.g., Twilio, MSG91, Fast2SMS)
    
    // Example integration with Fast2SMS:
    // const axios = require('axios');
    // const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
    //   authorization: process.env.SMS_API_KEY,
    //   route: 'q',
    //   message: message,
    //   numbers: mobile,
    // });
    
    // Example integration with Twilio:
    // const twilio = require('twilio');
    // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: `+91${mobile}`,
    // });

    // Log SMS for development
    console.log('\n📱 SMS SERVICE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${mobile}`);
    console.log(`Message: ${message}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    return true;
  } catch (error) {
    console.error('SMS sending failed:', error);
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
 * Send OTP SMS
 */
export async function sendOtpSms(mobile: string, otp: string): Promise<boolean> {
  const message = `Your Vehicle Wash OTP is: ${otp}. Valid for 10 minutes. Do not share this code.`;
  return await sendSms(mobile, message);
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
