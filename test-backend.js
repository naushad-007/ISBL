
(async () => {
  console.log('🔍 Testing ISBL Backend Connectivity\n');
  
  const backend = 'https://isbl.onrender.com';
  
  // Test 1: Health check
  console.log('1️⃣  Testing /api/health endpoint...');
  try {
    const response = await fetch(`${backend}/api/health`);
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data)}\n`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}\n`);
  }
  
  // Test 2: Admin login (wrong credentials first)
  console.log('2️⃣  Testing /api/auth/admin-login endpoint...');
  try {
    const response = await fetch(`${backend}/api/auth/admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://isblportal.netlify.app'
      },
      body: JSON.stringify({
        email: 'wrong@example.com',
        password: 'wrongpassword'
      })
    });
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    console.log(`   Response: ${JSON.stringify(data)}\n`);
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}\n`);
  }
  
  // Test 3: Admin login with correct credentials
  console.log('3️⃣  Testing admin login with CORRECT credentials...');
  try {
    const response = await fetch(`${backend}/api/auth/admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://isblportal.netlify.app'
      },
      body: JSON.stringify({
        email: 'amitdas@dbeb.iitd.ac.in',
        password: 'Password123'
      })
    });
    console.log(`   Status: ${response.status}`);
    const data = await response.json();
    if (data.token) {
      console.log(`   ✅ Login successful! Token received.`);
      console.log(`   User: ${data.user.name} (${data.user.role})\n`);
    } else {
      console.log(`   Response: ${JSON.stringify(data)}\n`);
    }
  } catch (e) {
    console.log(`   ❌ Error: ${e.message}\n`);
  }
  
  console.log('✨ Backend connectivity test complete!');
})();
