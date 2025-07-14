// Netlify function to initiate payment
const axios = require('axios');

// PayHero API credentials from environment variables
const API_USERNAME = process.env.PAYHERO_API_USERNAME;
const API_PASSWORD = process.env.PAYHERO_API_PASSWORD;
const CHANNEL_ID = 2852;
const BANK_SHORT_CODE = 714777;
const BANK_ACCOUNT_NUMBER = 440200149026;
const BANK_DESCRIPTION = "bank payment";

// Generate Basic Auth Token
const generateBasicAuthToken = () => {
  const credentials = `${API_USERNAME}:${API_PASSWORD}`;
  return 'Basic ' + Buffer.from(credentials).toString('base64');
};

exports.handler = async (event, context) => {
  // Check for required environment variables
  if (!process.env.PAYHERO_API_USERNAME || !process.env.PAYHERO_API_PASSWORD) {
    console.error('Missing PayHero API credentials in environment variables');
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: 'Server configuration error: Missing API credentials.' })
    };
  }

  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }
  
  // Process POST request
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ success: false, message: 'Method not allowed' })
    };
  }
  
  try {
    const requestBody = JSON.parse(event.body);
    const { phoneNumber, userId, amount = 150, description = 'SurvayPay Account Activation' } = requestBody;
    
    if (!phoneNumber) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, message: 'Phone number is required' })
      };
    }
    
    // Generate a unique reference for this payment
    const externalReference = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Define the callback URL - use Netlify function URL
    const callbackUrl = `${process.env.URL || 'https://survaypay75new.netlify.app'}/.netlify/functions/payment-callback`;
    
    const payload = {
      amount: amount,
      phone_number: phoneNumber,
      channel_type: "bank",
      channel_id: CHANNEL_ID,
      short_code: BANK_SHORT_CODE,
      account_number: BANK_ACCOUNT_NUMBER,
      description: BANK_DESCRIPTION,
      provider: "sasapay",
      network_code: "63902",
      external_reference: externalReference,
      callback_url: callbackUrl
    };
    
    const response = await axios({
      method: 'post',
      url: 'https://backend.payhero.co.ke/api/v2/payments',
      data: payload,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': generateBasicAuthToken()
      }
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Payment initiated successfully',
        data: {
          externalReference,
          checkoutRequestId: response.data.CheckoutRequestID
        }
      })
    };
  } catch (error) {
    console.error('Payment initiation error:', error.response?.data || error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: 'Failed to initiate payment',
        error: error.response?.data || error.message
      })
    };
  }
};
