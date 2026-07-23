const db = require('../config/db');
const dashboardController = require('../controllers/dashboardController');

async function test() {
  const req = {
    user: { id: 1 },
    query: { month: '2026-07' }
  };
  const res = {
    status: (code) => ({
      json: (data) => console.log('STATUS JSON', code, data)
    }),
    json: (data) => console.log('JSON', JSON.stringify(data).slice(0, 100))
  };

  await dashboardController.getTelecallerLeadSourceDaily(req, res);
  process.exit();
}

test();
