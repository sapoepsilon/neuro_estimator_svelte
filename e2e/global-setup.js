import { chromium } from '@playwright/test';

async function checkBackendHealth() {
  console.log('Checking backend API availability...');
  
  try {
    // Check if the backend API is running by trying to fetch from a health endpoint
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8080';
    const response = await fetch(`${backendUrl}/api/agent`, {
      method: 'OPTIONS', // Use OPTIONS to avoid authentication requirements
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // If we get any response (even 4xx/5xx), the backend is at least running
    console.log(`Backend API responded with status: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Backend API is not responding:', error.message);
    return false;
  }
}

async function globalSetup() {
  // Check if backend is running
  const backendAvailable = await checkBackendHealth();
  
  if (!backendAvailable) {
    const backendUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8080';
    console.error('\n❌ Backend API is not running!');
    console.error('Please start the backend server before running tests.');
    console.error(`The tests expect the API to be available at ${backendUrl}/api/agent`);
    console.error('You can set a custom backend URL with VITE_BACKEND_URL environment variable.\n');
    process.exit(1);
  }
  
  console.log('✅ Backend API is available\n');
  
  // You can also add browser context setup here if needed
  const browser = await chromium.launch();
  await browser.close();
}

export default globalSetup;