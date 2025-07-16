# Final Deployment Checklist for Assessments Module

## 1. Run Database Migrations
- [ ] Ensure your production database is provisioned and accessible.
- [ ] Set the correct `DATABASE_URL` in your environment.
- [ ] Run:
  ```sh
  npm run db:push
  ```
- [ ] Verify all tables (including assessments) exist in production DB.

## 2. Add Necessary Environment Variables
- [ ] Create a `.env.production` file or set environment variables in your deployment platform.
- [ ] Required variables:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `NODE_ENV=production`
  - (Optional) Email, storage, or third-party service keys
- [ ] Example:
  ```env
  DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>
  JWT_SECRET=your-production-jwt-secret
  NODE_ENV=production
  # EMAIL_API_KEY=your-email-api-key
  # S3_BUCKET=your-bucket
  # S3_ACCESS_KEY=your-access-key
  # S3_SECRET_KEY=your-secret-key
  ```

## 3. Ensure Upload/Storage Support for Media in Assessments
- [ ] Ensure the `uploads/` directory exists and is writable by the server.
- [ ] If using cloud storage (S3, etc.), set up credentials and update your storage logic.
- [ ] Test uploading and accessing media files in production.
- [ ] Confirm `/uploads` is served as static files in production.

## 4. Set Up Monitoring and Error Tracking
- [ ] Choose a monitoring/error tracking service (e.g., Sentry, LogRocket, New Relic).
- [ ] Add the relevant SDK to your backend (and frontend if needed).
- [ ] Set the required environment variables (e.g., `SENTRY_DSN`).
- [ ] Test by triggering a test error and confirming it appears in your dashboard.
- [ ] Set up server monitoring (uptime, CPU, memory) as needed.

---

**Ready to deploy? Double-check this list!** 