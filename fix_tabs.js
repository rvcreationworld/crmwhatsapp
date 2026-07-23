const fs = require('fs');
let free = fs.readFileSync('frontend/src/pages/telecaller/FreeLeads.jsx', 'utf8');
free = free.replace("import React, { useState } from 'react';", "import React, { useState } from 'react';\nimport { useSearchParams } from 'react-router-dom';");
free = free.replace('const [selectedLead, setSelectedLead] = useState(null);', 'const [selectedLead, setSelectedLead] = useState(null);\n  const [searchParams] = useSearchParams();\n  const period = searchParams.get("period");');
free = free.replace("queryKey: ['telecallerMyFreeLeads']", "queryKey: ['telecallerMyFreeLeads', period]");
free = free.replace("api.get('/api/telecaller/free-leads/my')", "api.get(`/api/telecaller/free-leads/my${period ? '?period=' + period : ''}`)");
fs.writeFileSync('frontend/src/pages/telecaller/FreeLeads.jsx', free);

let trans = fs.readFileSync('frontend/src/pages/telecaller/TransferredLeads.jsx', 'utf8');
trans = trans.replace('import React, { useState, useEffect } from "react";', 'import React, { useState, useEffect } from "react";\nimport { useSearchParams } from "react-router-dom";');
trans = trans.replace('const [loading, setLoading] = useState(false);', 'const [loading, setLoading] = useState(false);\n  const [searchParams] = useSearchParams();\n  const period = searchParams.get("period");');
trans = trans.replace('const res = await api.get("/api/telecaller/transferred-leads");', 'const res = await api.get(`/api/telecaller/transferred-leads${period ? "?period=" + period : ""}`);');
trans = trans.replace('fetchLeads();\n  }, []);', 'fetchLeads();\n  }, [period]);');
fs.writeFileSync('frontend/src/pages/telecaller/TransferredLeads.jsx', trans);
console.log('Fixed React query params');
