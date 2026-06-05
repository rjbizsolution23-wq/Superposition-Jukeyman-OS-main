const axios = require('axios');
const MCP_URL = 'https://services.leadconnectorhq.com/mcp/';

(async () => {
  const r = await axios.post(MCP_URL, {
    jsonrpc: '2.0', id: 1, method: 'tools/list', params: {},
  }, {
    headers: {
      Authorization: 'Bearer pit-1432f7f2-17e9-44c4-9324-5f0f3b645f9c',
      locationId: 'hlRn1Yt9hn34B6Z9hNqp',
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    responseType: 'text', timeout: 30000,
  });

  // Parse SSE data
  const lines = r.data.split('\n');
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const parsed = JSON.parse(line.substring(6));
        const tools = parsed.result.tools;
        console.log('Total tools:', tools.length);
        console.log('\n=== ALL TOOL NAMES ===');
        tools.forEach(t => console.log(' -', t.name));
      } catch (e) {
        // skip non-JSON lines
      }
    }
  }
})();