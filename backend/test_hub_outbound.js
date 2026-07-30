require("dotenv").config();
const { sendTemplateMessage } = require('./services/hubService');

async function test() {
    console.log("Testing TelePro -> Communication Hub outbound...");
    const res = await sendTemplateMessage({
        phoneNumber: '+917507227964',
        templateName: 'form_submission_acknowledgement',
        bodyValues: ['Aniket'],
        headerValues: ['https://telepro.shareshaala.com/uploads/whatsapp/templates/videos/new1_ee482df5_1784393204887.mp4']
    });
    console.log(res);
}
test();
