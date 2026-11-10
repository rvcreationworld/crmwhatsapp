const fs = require('fs');

let content = fs.readFileSync('/Users/aniket/Downloads/crmwhatsapp/frontend/src/pages/admin/tabs/WhatsAppRecurringBroadcastsTab.jsx', 'utf8');

// Replace standard names
content = content.replace(/WhatsAppAutomationsTab/g, 'WhatsAppRecurringBroadcastsTab');
content = content.replace(/Automation Messages/g, 'Recurring Broadcasts');
content = content.replace(/automations/g, 'broadcasts');
content = content.replace(/automation/g, 'broadcast');
content = content.replace(/Automations/g, 'Broadcasts');
content = content.replace(/Automation/g, 'Broadcast');
content = content.replace(/\/api\/whatsapp-center\/broadcasts/g, '/api/whatsapp-center/recurring-broadcasts');

// We need to replace trigger_type and delays with schedule fields
content = content.replace(/trigger_type/g, 'schedule_type');
// We will replace delays with schedule_type, daily_time, week_day, month_day later using proper editor, but this saves 90% of the work.

fs.writeFileSync('/Users/aniket/Downloads/crmwhatsapp/frontend/src/pages/admin/tabs/WhatsAppRecurringBroadcastsTab.jsx', content);
