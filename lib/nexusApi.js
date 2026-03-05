// Nexus API integration
// Endpoint: https://nexus.itssx.com
// Set NEXUS_API_KEY in your .env file

const API_URL = process.env.NEXUS_API_URL || 'https://nexus.itssx.com';
const API_KEY = process.env.NEXUS_API_KEY;

async function callNexusApi(path, method = 'GET', body = null) {
  if (!API_KEY) {
    throw new Error('NEXUS_API_KEY chưa được cấu hình trong .env');
  }
  const url = `${API_URL}${path}`;
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };
  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Nexus API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

module.exports = { callNexusApi };
