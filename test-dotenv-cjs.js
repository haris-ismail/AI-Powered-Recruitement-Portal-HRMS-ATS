const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'test.env') });
console.log('DATABASE_URL:', process.env.DATABASE_URL); 