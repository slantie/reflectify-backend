/**
 * @file test-service-endpoints.js
 * @description Test script to verify service-to-service authentication endpoints
 * Run with: node test-service-endpoints.js
 */

const fetch = require('node-fetch');

// Configuration
const BASE_URL = 'http://localhost:4000/api/v1/service';
const API_KEY =
  'sk_service_1234567890abcdef1234567890abcdef_secure_random_key_here'; // Use your actual API key

async function testServiceEndpoint(endpoint, description) {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`📍 Endpoint: GET ${endpoint}`);

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY,
        Accept: 'application/json',
      },
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Success! Response:`, JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log(`❌ Error Response:`, errorText);
    }
  } catch (error) {
    console.log(`💥 Network Error:`, error.message);
  }
}

async function testWithoutApiKey() {
  try {
    console.log(`\n🧪 Testing: Authentication failure (no API key)`);
    console.log(`📍 Endpoint: GET /faculties/abbreviations`);

    const response = await fetch(`${BASE_URL}/faculties/abbreviations`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        // No API key header
      },
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);
    const errorData = await response.text();
    console.log(`Expected 401 Error:`, errorData);
  } catch (error) {
    console.log(`💥 Network Error:`, error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting Service-to-Service Authentication Tests');
  console.log('=' * 60);

  // Test authentication failure first
  await testWithoutApiKey();

  // Test successful endpoints
  await testServiceEndpoint(
    '/faculties/abbreviations',
    'Get all faculty abbreviations'
  );
  await testServiceEndpoint(
    '/subjects/abbreviations',
    'Get all subject abbreviations'
  );

  console.log('\n' + '=' * 60);
  console.log('🏁 Tests completed!');
  console.log('\nNext steps:');
  console.log('1. Add SERVICE_API_KEY to your .env file');
  console.log('2. Update Flask server to use this API key for authentication');
  console.log(
    '3. Use these endpoints from Flask: /api/v1/service/faculties/abbreviations'
  );
}

// Run the tests
runTests().catch(console.error);
