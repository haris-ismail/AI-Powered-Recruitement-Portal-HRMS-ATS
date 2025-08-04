import fetch from 'node-fetch';

async function testStatusUpdate() {
  try {
    console.log('Testing status update endpoint...');
    
    // First, let's get a list of applications to find one to test with
    const response = await fetch('http://localhost:5000/api/admin/applications/5', {
      headers: {
        'Cookie': 'jwt_token=test'
      }
    });
    
    if (!response.ok) {
      console.error('Failed to get applications:', response.status, await response.text());
      return;
    }
    
    const applications = await response.json();
    console.log('Found applications:', applications.length);
    
    if (applications.length === 0) {
      console.log('No applications found to test with');
      return;
    }
    
    // Test with the first application
    const testApp = applications[0];
    console.log('Testing with application:', testApp.id, 'current status:', testApp.status);
    
    // Try to update the status
    const updateResponse = await fetch(`http://localhost:5000/api/applications/${testApp.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'jwt_token=test'
      },
      body: JSON.stringify({ status: 'shortlisted' })
    });
    
    console.log('Update response status:', updateResponse.status);
    
    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log('Success! Updated application:', result);
    } else {
      const error = await updateResponse.text();
      console.error('Failed to update:', error);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testStatusUpdate(); 