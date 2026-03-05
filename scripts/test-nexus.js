// Example usage of Nexus API integration
const { callNexusApi } = require('../lib/nexusApi');

async function testNexus() {
  try {
    // Thay đổi path theo endpoint bạn muốn gọi, ví dụ '/v1/test' hoặc endpoint thực tế
    const result = await callNexusApi('/v1/test');
    console.log('Nexus API result:', result);
  } catch (error) {
    console.error('Nexus API error:', error.message);
  }
}

testNexus();
