const { sendEmail } = require('./server/gmailService');

async function testEmail() {
  try {
    console.log('🧪 Testing Gmail Email Integration...');
    
    const emailData = {
      from: 'harisismail68@gmail.com',
      to: 'harisismail68@gmail.com', // Send to yourself for testing
      subject: 'Test Email from NASTP HRMS',
      body: `
        <h2>🎉 Gmail Integration Test Successful!</h2>
        <p>This email was sent via Gmail API from your NASTP HRMS application.</p>
        <p><strong>Features:</strong></p>
        <ul>
          <li>✅ OAuth 2.0 authentication</li>
          <li>✅ Gmail API integration</li>
          <li>✅ Email logging and tracking</li>
          <li>✅ Template-based email system</li>
        </ul>
        <p>Sent at: ${new Date().toLocaleString()}</p>
      `
    };

    console.log('📧 Sending test email...');
    await sendEmail(emailData);
    console.log('✅ Test email sent successfully!');
    
  } catch (error) {
    console.error('❌ Error sending test email:', error.message);
  }
}

testEmail(); 