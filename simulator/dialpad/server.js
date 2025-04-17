const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 9000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Simple in-memory data store
const db = {
  calls: [],
  contacts: [],
  users: [
    { apiKey: 'test_api_key', apiSecret: 'test_api_secret', accountId: 'test_account_id' }
  ],
  tokens: []
};

// Initialize with some sample data
function initializeData() {
  // Sample contacts
  db.contacts = [
    { 
      id: 'CONT-001', 
      name: 'John Doe', 
      phone: '555-123-4567', 
      email: 'john@example.com',
      company: 'ABC Corp',
      type: 'customer' 
    },
    { 
      id: 'CONT-002', 
      name: 'Express Auto Transport', 
      phone: '555-111-2222', 
      email: 'dispatch@expressauto.com',
      company: 'Express Auto Transport',
      type: 'carrier' 
    },
    { 
      id: 'CONT-003', 
      name: 'Premium Car Shipping', 
      phone: '555-333-4444', 
      email: 'ops@premiumcarshipping.com',
      company: 'Premium Car Shipping',
      type: 'carrier' 
    }
  ];

  // Sample calls
  db.calls = [
    {
      id: 'CALL-001',
      from: '555-987-6543',
      to: '555-123-4567',
      status: 'completed',
      duration: 245, // seconds
      recordingUrl: 'https://example.com/recordings/call-001.mp3',
      direction: 'outbound',
      startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 24 * 60 * 60 * 1000 + 245 * 1000).toISOString(),
      notes: 'Confirmed pickup details for tomorrow'
    },
    {
      id: 'CALL-002',
      from: '555-111-2222',
      to: '555-987-6543',
      status: 'completed',
      duration: 178,
      recordingUrl: 'https://example.com/recordings/call-002.mp3',
      direction: 'inbound',
      startTime: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 12 * 60 * 60 * 1000 + 178 * 1000).toISOString(),
      notes: 'Carrier called to confirm ETAs'
    }
  ];
}

initializeData();

// Auth endpoint
app.post('/oauth/token', (req, res) => {
  const { grant_type, client_id, client_secret } = req.body;
  
  if (grant_type !== 'client_credentials') {
    return res.status(400).json({ error: 'Invalid grant type' });
  }
  
  const user = db.users.find(u => u.apiKey === client_id && u.apiSecret === client_secret);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = `dp_token_${Date.now()}`;
  db.tokens.push({ token, expiry: new Date(Date.now() + 60 * 60 * 1000) });
  
  res.json({
    access_token: token,
    token_type: 'bearer',
    expires_in: 3600
  });
});

// Middleware to check auth
const checkAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.split(' ')[1];
  const validToken = db.tokens.find(t => t.token === token && t.expiry > new Date());
  if (!validToken) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  next();
};

// Call endpoints
app.get(`/accounts/:accountId/calls`, checkAuth, (req, res) => {
  const { limit = 20, offset = 0 } = req.query;
  
  const startIndex = parseInt(offset);
  const endIndex = startIndex + parseInt(limit);
  const results = db.calls.slice(startIndex, endIndex);
  
  res.json({
    total: db.calls.length,
    offset: parseInt(offset),
    limit: parseInt(limit),
    calls: results
  });
});

app.post(`/accounts/:accountId/calls`, checkAuth, (req, res) => {
  const { to_number, from_number } = req.body;
  const accountId = req.params.accountId;
  
  if (!to_number) {
    return res.status(400).json({ error: 'Phone number required' });
  }
  
  // Generate a new call ID
  const callId = `CALL-${Math.floor(100 + Math.random() * 900)}`;
  
  const newCall = {
    id: callId,
    from: from_number || '555-987-6543', // Default number if not provided
    to: to_number,
    status: 'ringing',
    direction: 'outbound',
    startTime: new Date().toISOString(),
    accountId
  };
  
  db.calls.push(newCall);
  
  // Simulate the call going through and being answered after a delay
  setTimeout(() => {
    const callIndex = db.calls.findIndex(c => c.id === callId);
    if (callIndex !== -1) {
      db.calls[callIndex].status = 'in_progress';
    }
  }, 2000);
  
  res.status(201).json(newCall);
});

app.post('/calls/:id/end', checkAuth, (req, res) => {
  const callId = req.params.id;
  
  const callIndex = db.calls.findIndex(c => c.id === callId);
  if (callIndex === -1) {
    return res.status(404).json({ error: 'Call not found' });
  }
  
  if (db.calls[callIndex].status === 'completed') {
    return res.status(400).json({ error: 'Call already ended' });
  }
  
  // Update call status
  db.calls[callIndex].status = 'completed';
  db.calls[callIndex].endTime = new Date().toISOString();
  
  // Calculate duration
  const startTime = new Date(db.calls[callIndex].startTime);
  const endTime = new Date(db.calls[callIndex].endTime);
  db.calls[callIndex].duration = Math.floor((endTime - startTime) / 1000);
  
  res.json({
    success: true,
    call: db.calls[callIndex]
  });
});

app.post('/calls/:id/dtmf', checkAuth, (req, res) => {
  const callId = req.params.id;
  const { digits } = req.body;
  
  const call = db.calls.find(c => c.id === callId);
  if (!call) {
    return res.status(404).json({ error: 'Call not found' });
  }
  
  if (call.status !== 'in_progress') {
    return res.status(400).json({ error: 'Call must be in progress to send DTMF' });
  }
  
  if (!digits) {
    return res.status(400).json({ error: 'Digits required' });
  }
  
  res.json({
    success: true,
    call_id: callId,
    digits,
    timestamp: new Date().toISOString()
  });
});

// Contact endpoints
app.get('/accounts/:accountId/contacts', checkAuth, (req, res) => {
  const { query, limit = 20, offset = 0 } = req.query;
  
  let filteredContacts = [...db.contacts];
  
  if (query) {
    const searchQuery = query.toLowerCase();
    filteredContacts = filteredContacts.filter(c => 
      c.name.toLowerCase().includes(searchQuery) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery)) ||
      (c.company && c.company.toLowerCase().includes(searchQuery))
    );
  }
  
  const startIndex = parseInt(offset);
  const endIndex = startIndex + parseInt(limit);
  const results = filteredContacts.slice(startIndex, endIndex);
  
  res.json({
    total: filteredContacts.length,
    offset: parseInt(offset),
    limit: parseInt(limit),
    contacts: results
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Dialpad API simulator running on port ${PORT}`);
  console.log(`Use test credentials: client_id: test_api_key, client_secret: test_api_secret`);
});
