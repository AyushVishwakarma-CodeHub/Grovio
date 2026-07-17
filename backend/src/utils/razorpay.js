import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const isRazorpayConfigured = 
  process.env.RAZORPAY_KEY_ID && 
  process.env.RAZORPAY_KEY_SECRET;

let razorpayInstance = null;

if (isRazorpayConfigured) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
} else {
  console.warn('WARNING: Razorpay credentials not configured in backend/.env. Running in payment simulation mode.');
}

/**
 * Create a new Razorpay order
 * @param {number} amount - Amount in INR (not paise, we multiply inside)
 * @param {string} receiptId - Unique receipt identifier
 * @returns {Promise<{id: string, amount: number, status: string}>}
 */
export const createRazorpayOrder = async (amount, receiptId) => {
  const amountInPaise = Math.round(amount * 100);

  if (!isRazorpayConfigured) {
    // Simulate Razorpay order creation
    return {
      id: `order_mock_${Math.random().toString(36).substring(2, 11)}`,
      amount: amountInPaise,
      currency: 'INR',
      receipt: receiptId,
      status: 'created',
      mock: true
    };
  }

  return await razorpayInstance.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: receiptId
  });
};

/**
 * Verify Razorpay payment signature
 * @param {string} razorpayOrderId 
 * @param {string} razorpayPaymentId 
 * @param {string} razorpaySignature 
 * @returns {boolean}
 */
export const verifyRazorpaySignature = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  if (!isRazorpayConfigured) {
    // In simulation mode, accept mock order signature checks
    return razorpayOrderId && razorpayPaymentId && razorpaySignature === 'mock_verified_signature';
  }

  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  return generatedSignature === razorpaySignature;
};

/**
 * Refund a captured Razorpay payment
 * @param {string} paymentId 
 * @param {number} amount - Amount in INR
 * @returns {Promise<{id: string, status: string}>}
 */
export const refundRazorpayPayment = async (paymentId, amount) => {
  const amountInPaise = Math.round(amount * 100);

  if (!isRazorpayConfigured || paymentId.startsWith('pay_mock_')) {
    // Simulate refund success
    return {
      id: `rfnd_mock_${Math.random().toString(36).substring(2, 11)}`,
      payment_id: paymentId,
      amount: amountInPaise,
      status: 'processed',
      mock: true
    };
  }

  return await razorpayInstance.payments.refund(paymentId, {
    amount: amountInPaise
  });
};
