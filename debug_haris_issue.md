# Debug Guide: Fix Haris's AI Scoring Issue

## Problem
Haris's application shows "applied" status but no AI score, while Awais and Ellie have AI scores generated successfully.

## Root Cause
The most likely cause is that Haris's resume text was not properly extracted from his uploaded resume file. The batch AI scoring process skips applications that don't have `resumeText` in their profile.

## Solution Steps

### Step 1: Check Haris's Resume Text Status
1. Go to the admin pipeline page
2. Select the "Machine Learning Engineer" job
3. Click "Debug Resume Status" button
4. Check if Haris's application shows `hasResumeText: false`

### Step 2: Extract Haris's Resume Text
If Haris's resume text is missing:
1. Go to Haris's candidate profile page
2. Click "Edit Profile"
3. If a resume is uploaded, click "Extract Resume Text" button
4. Wait for the extraction to complete
5. Save the profile

### Step 3: Alternative - Batch Extract All Resume Text
If the above doesn't work:
1. Go to admin pipeline page
2. Select the job
3. Click "Batch Extract Resume Text" button
4. This will extract resume text for all candidates who have uploaded resumes

### Step 4: Re-run Batch AI Scoring
After ensuring Haris has resume text:
1. Go to admin pipeline page
2. Select the job
3. Click "Apply Weights" button to re-run batch AI scoring
4. Haris should now get an AI score

## Verification
After completing the steps:
1. Check that Haris's application now shows an AI score
2. Verify that the AI score breakdown is visible
3. Confirm that all three applicants (Awais, Haris, Ellie) have AI scores

## Technical Details
The batch AI scoring process in `server/routes.ts` (lines 1064-1310) checks for:
```javascript
if (!profile.resumeText) {
  console.log(`Skipping application ${application.id} - no resume text`);
  skipped++;
  continue;
}
```

This is why Haris's application is being skipped - it doesn't have extracted resume text. 