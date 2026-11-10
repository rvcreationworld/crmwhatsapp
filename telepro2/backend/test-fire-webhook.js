const axios = require('axios');

async function run() {
  const randomId = "random-" + Math.floor(Math.random() * 100000);
  const payload = {
    "data": {
      "message": {
        "id": randomId,
        "message": "Interested",
        "message_content_type": "Text"
      },
      "customer": {
        "id": "0a379051-7014-40f6-b2fe-faa447d4ba0c",
        "phone_number": "7507227964"
      }
    },
    "type": "message_received",
    "id": randomId,
    "timestamp": new Date().toISOString()
  };

  try {
    const res = await axios.post('http://localhost:5050/api/interakt/webhook', payload);
    console.log("Webhook fired:", res.data);
  } catch(e) {
    console.error(e.response ? e.response.data : e.message);
  }
}
run();
