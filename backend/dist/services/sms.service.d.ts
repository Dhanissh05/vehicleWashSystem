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
    PAYMENT_METHOD?: string;
}
/**
 * Send SMS using Fast2SMS Quick SMS API
 * Endpoint: POST https://www.fast2sms.com/dev/bulkV2
 */
export declare function sendSms(mobile: string, message: string): Promise<boolean>;
/**
 * Send templated SMS by template key
 */
export declare function sendTemplateSms(templateKey: string, mobile: string, params: SmsParams): Promise<boolean>;
/**
 * Send OTP SMS using Fast2SMS Quick SMS API
 * Using Quick SMS route with OTP message format
 */
export declare function sendOtpSms(mobile: string, otp: string): Promise<boolean>;
/**
 * Send vehicle received notification
 */
export declare function sendVehicleReceivedSms(mobile: string, customerName: string, vehicleNumber: string, shopName: string): Promise<boolean>;
/**
 * Send vehicle ready notification
 */
export declare function sendVehicleReadySms(mobile: string, customerName: string, vehicleNumber: string, shopName: string, amount: number): Promise<boolean>;
/**
 * Send worker credentials SMS
 */
export declare function sendWorkerCredentialsSms(mobile: string, password: string, workerCode: string, shopName: string): Promise<boolean>;
/**
 * Send payment success notification
 */
export declare function sendPaymentSuccessSms(mobile: string, customerName: string, vehicleNumber: string, amount: number, paymentMethod: string): Promise<boolean>;
export {};
//# sourceMappingURL=sms.service.d.ts.map