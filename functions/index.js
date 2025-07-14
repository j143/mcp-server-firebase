import { onRequest } from 'firebase-functions/v2/https';
import { setGlobalOptions } from 'firebase-functions/v2';
import express from 'express';
import { CalendarMCPHandler } from './src/calendar-mcp.js';

// Set global options
setGlobalOptions({
  region: 'us-central1',
  maxInstances: 10,
});

const app = express();
app.use(express.json());

// Enable CORS for Claude Desktop
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const mcpHandler = new CalendarMCPHandler();

// MCP Protocol endpoints
app.get('/mcp/tools', async (req, res) => {
  try {
    const tools = await mcpHandler.listTools();
    res.json(tools);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/mcp/tools/:toolName', async (req, res) => {
  try {
    const { toolName } = req.params;
    const args = req.body;
    
    const result = await mcpHandler.callTool(toolName, args);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export const mcpCalendar = onRequest(app);