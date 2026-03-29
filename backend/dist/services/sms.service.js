"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendSms = sendSms;
exports.sendTemplateSms = sendTemplateSms;
exports.sendOtpSms = sendOtpSms;
exports.sendVehicleReceivedSms = sendVehicleReceivedSms;
exports.sendVehicleReadySms = sendVehicleReadySms;
exports.sendWorkerCredentialsSms = sendWorkerCredentialsSms;
exports.sendPaymentSuccessSms = sendPaymentSuccessSms;
const prisma_1 = __importDefault(require("../lib/prisma"));
/**
 * Send SMS using Fast2SMS Quick SMS API
 * Endpoint: POST https://www.fast2sms.com/dev/bulkV2
 */
async function sendSms(mobile, message) {
    try {
        const axios = require('axios');
        // Log SMS for development
        console.log('\n📱 SMS SERVICE');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`To: ${mobile}`);
        console.log(`Message: ${message}`);
        console.log(`API Key Present: ${!!process.env.FAST2SMS_API_KEY}`);
        console.log(`API Key Length: ${process.env.FAST2SMS_API_KEY?.length || 0}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        // If no SMS API key configured, just log (for development)
        if (!process.env.FAST2SMS_API_KEY) {
            console.log('⚠️  FAST2SMS_API_KEY not configured - SMS not sent');
            return true;
        }
        // Send via Fast2SMS Quick SMS API
        // Documentation: https://docs.fast2sms.com/reference/get_new-endpoint
        const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', null, {
            params: {
                route: 'q', // Quick SMS route
                message: message,
                numbers: mobile,
                flash: '0', // 0 = normal message, 1 = flash message
            },
            headers: {
                'authorization': process.env.FAST2SMS_API_KEY,
                'Content-Type': 'application/json',
            },
        });
        console.log('✅ SMS sent successfully:', response.data);
        return response.data.return === true || response.status === 200;
    }
    catch (error) {
        console.error('❌ SMS sending failed:', error.response?.data || error.message);
        return false;
    }
}
/**
 * Send templated SMS by template key
 */
async function sendTemplateSms(templateKey, mobile, params) {
    try {
        // Fetch SMS template from database
        const template = await prisma_1.default.smsTemplate.findUnique({
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
    }
    catch (error) {
        console.error('Template SMS sending failed:', error);
        return false;
    }
}
/**
 * Send OTP SMS using Fast2SMS Quick SMS API
 * Using Quick SMS route with OTP message format
 */
async function sendOtpSms(mobile, otp) {
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
        // Create OTP message
        const message = `Your OTP for SandTell's Vehicle Wash System is: ${otp}. Valid for 5 minutes. Do not share with anyone.`;
        // Send via Fast2SMS Quick SMS API
        const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', null, {
            params: {
                route: 'q', // Quick SMS route
                message: message,
                numbers: mobile,
                flash: '0',
            },
            headers: {
                'authorization': process.env.FAST2SMS_API_KEY,
                'Content-Type': 'application/json',
            },
        });
        console.log('✅ OTP sent successfully:', response.data);
        return response.data.return === true || response.status === 200;
    }
    catch (error) {
        console.error('❌ OTP sending failed:', error.response?.data || error.message);
        return false;
    }
}
/**
 * Send vehicle received notification
 */
async function sendVehicleReceivedSms(mobile, customerName, vehicleNumber, shopName) {
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
async function sendVehicleReadySms(mobile, customerName, vehicleNumber, shopName, amount) {
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
async function sendWorkerCredentialsSms(mobile, password, workerCode, shopName) {
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
 * Send payment success notification
 */
async function sendPaymentSuccessSms(mobile, customerName, vehicleNumber, amount, paymentMethod) {
    return await sendTemplateSms('PAYMENT_SUCCESS', mobile, {
        CUSTOMER_NAME: customerName,
        VEHICLE_NUMBER: vehicleNumber,
        AMOUNT: amount.toString(),
        PAYMENT_METHOD: paymentMethod,
    });
}
/**
 * Get Play Store link from system config
 */
async function getPlayStoreLink() {
    try {
        const config = await prisma_1.default.systemConfig.findUnique({
            where: { key: 'PLAY_STORE_URL' },
        });
        return config?.value || 'https://play.google.com/store/apps/details?id=com.vehiclewash.customer';
    }
    catch (error) {
        return 'https://play.google.com/store/apps/details?id=com.vehiclewash.customer';
    }
}
//# sourceMappingURL=sms.service.js.map