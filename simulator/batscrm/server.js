const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Simple in-memory data store
const db = {
  shipments: [],
  customers: [],
  carriers: [],
  vehicles: [],
  quotes: [],
  users: [
    { username: 'admin', password: 'password', apiKey: 'test_api_key' }
  ],
  tokens: []
};

// Initialize with some sample data
function initializeData() {
  // Sample customers
  db.customers = [
    { id: 'CUST-001', firstName: 'John', lastName: 'Doe', email: 'john@example.com', phone: '555-123-4567', company: 'ABC Corp' },
    { id: 'CUST-002', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com', phone: '555-987-6543', company: 'XYZ Inc' }
  ];

  // Sample carriers
  db.carriers = [
    { 
      id: 'CAR-001', 
      name: 'Express Auto Transport',
      rating: 4.8,
      basePrice: 950,
      availability: 'high',
      estimatedPickupDate: '2025-04-20',
      phone: '555-111-2222',
      insuranceLevel: '$1M',
      status: 'available',
      specialties: ['standard', 'expedited']
    },
    { 
      id: 'CAR-002', 
      name: 'Premium Car Shipping',
      rating: 4.9,
      basePrice: 1250,
      availability: 'medium',
      estimatedPickupDate: '2025-04-21',
      phone: '555-333-4444',
      insuranceLevel: '$2M',
      status: 'available',
      specialties: ['enclosed', 'exotic']
    }
  ];

  // Sample shipments
  db.shipments = [
    {
      id: 'BT-47293',
      customerId: 'CUST-001',
      carrier: db.carriers[0],
      origin: {
        address: '123 Main St',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
        contactName: 'John Doe',
        contactPhone: '555-123-4567'
      },
      destination: {
        address: '456 Peachtree St',
        city: 'Atlanta',
        state: 'GA',
        zipCode: '30303',
        contactName: 'Mike Johnson',
        contactPhone: '555-789-0123'
      },
      serviceLevel: 'standard',
      status: 'in_transit',
      vehicles: [
        {
          id: 'VEH-001',
          year: '2019',
          make: 'Audi',
          model: 'A4',
          vin: '1A2B3C4D5E6F7G8H9',
          condition: 'running'
        }
      ],
      targetPickupDate: '2025-04-12',
      actualPickupDate: '2025-04-12',
      estimatedDelivery: '2025-04-18',
      notes: 'Ring doorbell on arrival'
    }
  ];

  // Sample quotes
  db.quotes = [
    {
      id: 'QUOTE-001',
      shipmentId: 'BT-47293',
      cost: 1100,
      currency: 'USD',
      serviceLevel: 'standard',
      validUntil: '2025-05-01'
    }
  ];
}

initializeData();

// Auth endpoint
app.post('/auth/login', (req, res) => {
  const { username, password, apiKey } = req.body;
  
  // Check API key
  if (apiKey && db.users.some(user => user.apiKey === apiKey)) {
    const token = `token_${Date.now()}`;
    db.tokens.push({ token, expiry: new Date(Date.now() + 24 * 60 * 60 * 1000) });
    return res.json({ token, expiresIn: 86400 });
  }
  
  // Check username/password
  const user = db.users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  const token = `token_${Date.now()}`;
  db.tokens.push({ token, expiry: new Date(Date.now() + 24 * 60 * 60 * 1000) });
  res.json({ token, expiresIn: 86400 });
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

// Shipment endpoints
app.get('/shipments', checkAuth, (req, res) => {
  const { status, customerId, page = 1, limit = 10 } = req.query;
  
  let filteredShipments = [...db.shipments];
  
  if (status) {
    filteredShipments = filteredShipments.filter(s => s.status === status);
  }
  
  if (customerId) {
    filteredShipments = filteredShipments.filter(s => s.customerId === customerId);
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const results = filteredShipments.slice(startIndex, endIndex);
  
  res.json({
    total: filteredShipments.length,
    page: parseInt(page),
    limit: parseInt(limit),
    shipments: results
  });
});

app.get('/shipments/:id', checkAuth, (req, res) => {
  const shipment = db.shipments.find(s => s.id === req.params.id);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }
  res.json(shipment);
});

app.post('/shipments', checkAuth, (req, res) => {
  const { customerId, origin, destination, serviceLevel, targetPickupDate, notes } = req.body;
  
  // Generate new shipment ID
  const shipmentId = `BT-${Math.floor(10000 + Math.random() * 90000)}`;
  
  const newShipment = {
    id: shipmentId,
    customerId,
    origin,
    destination,
    serviceLevel,
    targetPickupDate,
    notes,
    status: 'pending',
    vehicles: [],
    createdAt: new Date().toISOString()
  };
  
  db.shipments.push(newShipment);
  res.status(201).json(newShipment);
});

app.put('/shipments/:id', checkAuth, (req, res) => {
  const index = db.shipments.findIndex(s => s.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Shipment not found' });
  }
  
  db.shipments[index] = { ...db.shipments[index], ...req.body };
  res.json(db.shipments[index]);
});

app.get('/shipments/:id/tracking', checkAuth, (req, res) => {
  const shipment = db.shipments.find(s => s.id === req.params.id);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }
  
  // Generate tracking info based on shipment status
  const trackingInfo = {
    shipmentId: shipment.id,
    currentStatus: shipment.status,
    statusUpdateTime: new Date().toISOString(),
    currentLocation: shipment.status === 'in_transit' ? 'Indianapolis, IN' : (
      shipment.status === 'delivered' ? shipment.destination.city : shipment.origin.city
    ),
    estimatedDelivery: shipment.estimatedDelivery,
    statusHistory: [
      {
        status: 'pending',
        location: 'System',
        timestamp: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      },
      {
        status: 'assigned',
        location: 'System',
        timestamp: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString()
      },
      {
        status: 'pickup_scheduled',
        location: shipment.origin.city,
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  };
  
  // Add status history based on current status
  if (shipment.status === 'in_transit' || shipment.status === 'delivered') {
    trackingInfo.statusHistory.push({
      status: 'picked_up',
      location: shipment.origin.city,
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
    });
    
    trackingInfo.statusHistory.push({
      status: 'in_transit',
      location: 'En route',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
    });
  }
  
  if (shipment.status === 'delivered') {
    trackingInfo.statusHistory.push({
      status: 'delivered',
      location: shipment.destination.city,
      timestamp: new Date().toISOString()
    });
  }
  
  res.json(trackingInfo);
});

app.post('/shipments/:id/assign', checkAuth, (req, res) => {
  const { carrierId, price, pickupDate, deliveryDate, notes } = req.body;
  
  const shipment = db.shipments.find(s => s.id === req.params.id);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }
  
  const carrier = db.carriers.find(c => c.id === carrierId);
  if (!carrier) {
    return res.status(404).json({ error: 'Carrier not found' });
  }
  
  shipment.carrier = carrier;
  shipment.status = 'assigned';
  shipment.price = price;
  shipment.scheduledPickupDate = pickupDate;
  shipment.estimatedDelivery = deliveryDate;
  shipment.carrierNotes = notes;
  
  res.json({
    success: true,
    shipment,
    carrier
  });
});

// Customer endpoints
app.get('/customers', checkAuth, (req, res) => {
  const { query, page = 1, limit = 10 } = req.query;
  
  let filteredCustomers = [...db.customers];
  
  if (query) {
    const searchQuery = query.toLowerCase();
    filteredCustomers = filteredCustomers.filter(c => 
      c.firstName.toLowerCase().includes(searchQuery) ||
      c.lastName.toLowerCase().includes(searchQuery) ||
      c.email.toLowerCase().includes(searchQuery) ||
      (c.company && c.company.toLowerCase().includes(searchQuery))
    );
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const results = filteredCustomers.slice(startIndex, endIndex);
  
  res.json({
    total: filteredCustomers.length,
    page: parseInt(page),
    limit: parseInt(limit),
    customers: results
  });
});

app.get('/customers/:id', checkAuth, (req, res) => {
  const customer = db.customers.find(c => c.id === req.params.id);
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json(customer);
});

app.post('/customers', checkAuth, (req, res) => {
  const { firstName, lastName, email, phone, company } = req.body;
  
  // Generate new customer ID
  const customerId = `CUST-${Math.floor(100 + Math.random() * 900)}`;
  
  const newCustomer = {
    id: customerId,
    firstName,
    lastName,
    email,
    phone,
    company,
    createdAt: new Date().toISOString()
  };
  
  db.customers.push(newCustomer);
  res.status(201).json(newCustomer);
});

// Carrier endpoints
app.get('/carriers', checkAuth, (req, res) => {
  const { status, region, page = 1, limit = 10 } = req.query;
  
  let filteredCarriers = [...db.carriers];
  
  if (status) {
    filteredCarriers = filteredCarriers.filter(c => c.status === status);
  }
  
  if (region) {
    // Simulate regional filtering
    if (region === 'west') {
      filteredCarriers = filteredCarriers.filter(c => c.id === 'CAR-001');
    } else if (region === 'east') {
      filteredCarriers = filteredCarriers.filter(c => c.id === 'CAR-002');
    }
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const results = filteredCarriers.slice(startIndex, endIndex);
  
  res.json({
    total: filteredCarriers.length,
    page: parseInt(page),
    limit: parseInt(limit),
    carriers: results
  });
});

// Vehicle endpoints
app.get('/vehicles', checkAuth, (req, res) => {
  const { customerId, shipmentId, page = 1, limit = 10 } = req.query;
  
  // Get vehicles from shipments
  const vehicles = [];
  db.shipments.forEach(shipment => {
    if ((!customerId || shipment.customerId === customerId) && 
        (!shipmentId || shipment.id === shipmentId)) {
      shipment.vehicles.forEach(vehicle => {
        vehicles.push({
          ...vehicle,
          shipmentId: shipment.id
        });
      });
    }
  });
  
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const results = vehicles.slice(startIndex, endIndex);
  
  res.json({
    total: vehicles.length,
    page: parseInt(page),
    limit: parseInt(limit),
    vehicles: results
  });
});

app.post('/vehicles', checkAuth, (req, res) => {
  const { shipmentId, year, make, model, vin, condition, type, modifications } = req.body;
  
  const shipment = db.shipments.find(s => s.id === shipmentId);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }
  
  // Generate new vehicle ID
  const vehicleId = `VEH-${Math.floor(100 + Math.random() * 900)}`;
  
  const newVehicle = {
    id: vehicleId,
    year,
    make,
    model,
    vin,
    condition,
    type,
    modifications,
    createdAt: new Date().toISOString()
  };
  
  shipment.vehicles.push(newVehicle);
  
  res.status(201).json({
    ...newVehicle,
    shipmentId
  });
});

// Quote endpoints
app.post('/quotes', checkAuth, (req, res) => {
  const { shipmentId, serviceLevel } = req.body;
  
  const shipment = db.shipments.find(s => s.id === shipmentId);
  if (!shipmentId || !shipment) {
    // Generate generic quote
    const cost = serviceLevel === 'standard' ? 1100 : 
                 serviceLevel === 'expedited' ? 1500 : 1800;
    
    const quoteId = `QUOTE-${Math.floor(100 + Math.random() * 900)}`;
    
    const newQuote = {
      id: quoteId,
      cost,
      currency: 'USD',
      serviceLevel,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString()
    };
    
    db.quotes.push(newQuote);
    return res.status(201).json(newQuote);
  }
  
  // Calculate based on shipment details
  const baseCost = serviceLevel === 'standard' ? 1100 : 
                  serviceLevel === 'expedited' ? 1500 : 1800;
  
  // Generate new quote ID
  const quoteId = `QUOTE-${Math.floor(100 + Math.random() * 900)}`;
  
  const newQuote = {
    id: quoteId,
    shipmentId,
    cost: baseCost,
    currency: 'USD',
    serviceLevel,
    validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString()
  };
  
  db.quotes.push(newQuote);
  res.status(201).json(newQuote);
});

// Notification endpoints
app.post('/notifications/email', checkAuth, (req, res) => {
  const { shipmentId, customerId, type, message } = req.body;
  
  res.json({
    success: true,
    notificationType: 'email',
    shipmentId,
    customerId,
    type,
    sentAt: new Date().toISOString()
  });
});

app.post('/notifications/sms', checkAuth, (req, res) => {
  const { shipmentId, customerId, type, message } = req.body;
  
  res.json({
    success: true,
    notificationType: 'sms',
    shipmentId,
    customerId,
    type,
    sentAt: new Date().toISOString()
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`BatsCRM API simulator running on port ${PORT}`);
  console.log(`Use test credentials: username: admin, password: password, or API key: test_api_key`);
});
