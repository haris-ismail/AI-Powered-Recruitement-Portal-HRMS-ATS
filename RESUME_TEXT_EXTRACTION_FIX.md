# Resume Text Extraction Fix

## Problem Description

When candidates uploaded a resume and clicked "Save Profile", the resume text extraction was not working properly. The text extraction only happened during the initial upload process, but if a user had already uploaded a resume and wanted to trigger text extraction again, there was no mechanism for that.

## Root Cause

1. **Resume upload process**: Text extraction only occurred during the initial file upload
2. **Profile save process**: No automatic text extraction when saving profile
3. **Missing manual trigger**: No way to manually trigger text extraction for existing resumes
4. **Missing Python dependencies**: The `pdfplumber` module was not installed, causing extraction failures

## Solution Implemented

### 1. **Fixed Python Dependencies**

Updated `server/resume_parser/requirements.txt` with all necessary dependencies:

```txt
groq
pdfplumber
python-docx
PyPDF2
pypdf
pytesseract
pdf2image
Pillow
```

**Installation Command:**
```bash
pip install -r server/resume_parser/requirements.txt
```

### 2. **New API Endpoint** (`POST /api/extract-resume-text`)

Added a dedicated endpoint to extract text from existing resumes:

```typescript
// Extract resume text from existing resume
app.post('/api/extract-resume-text', authenticateToken, async (req: any, res) => {
  try {
    const candidate = await storage.getCandidate(req.user.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    if (!candidate.resumeUrl) {
      return res.status(400).json({ message: 'No resume uploaded' });
    }

    const resumePath = `./uploads/${candidate.resumeUrl.split('/').pop()}`;
    
    // Call Python script to extract resume text
    let resumeText = '';
    try {
      const python = spawn('python', [
        './server/resume_parser/extract_resume_text.py',
        resumePath
      ], {
        env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
      });
      let output = '';
      let errorOutput = '';
      python.stdout.on('data', (data) => {
        output += data.toString();
      });
      python.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });
      await new Promise((resolve) => {
        python.on('close', (code) => {
          if (code === 0) {
            resumeText = output;
            resolve(null);
          } else {
            console.error('Resume parsing error:', errorOutput);
            resumeText = '';
            resolve(null);
          }
        });
      });
    } catch (err) {
      console.error('Failed to parse resume:', err);
      resumeText = '';
    }

    if (resumeText) {
      await storage.updateCandidate(candidate.id, { resumeText });
      res.json({ resumeText, message: 'Resume text extracted successfully' });
    } else {
      res.status(400).json({ message: 'Failed to extract resume text' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});
```

### 3. **Enhanced Profile Update Endpoint**

Modified the profile update endpoint to automatically extract resume text if a resume URL exists but no resume text:

```typescript
app.put('/api/profile', authenticateToken, async (req: any, res) => {
  try {
    const candidate = await storage.getCandidate(req.user.id);
    if (!candidate) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const profileData = insertCandidateSchema.partial().parse(req.body);
    
    // If CNIC is being updated, check uniqueness
    if (profileData.cnic && profileData.cnic !== candidate.cnic) {
      const existingCnic = await storage.getCandidateByCnic(profileData.cnic);
      if (existingCnic) {
        return res.status(400).json({ message: 'CNIC already exists' });
      }
    }

    // If resume URL exists but no resume text, try to extract text
    if (candidate.resumeUrl && !candidate.resumeText && !profileData.resumeText) {
      try {
        const resumePath = `./uploads/${candidate.resumeUrl.split('/').pop()}`;
        const python = spawn('python', [
          './server/resume_parser/extract_resume_text.py',
          resumePath
        ], {
          env: { ...process.env, PYTHONIOENCODING: 'utf-8' }
        });
        let output = '';
        let errorOutput = '';
        python.stdout.on('data', (data) => {
          output += data.toString();
        });
        python.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        await new Promise((resolve) => {
          python.on('close', (code) => {
            if (code === 0 && output.trim()) {
              profileData.resumeText = output;
            } else {
              console.error('Resume parsing error:', errorOutput);
            }
            resolve(null);
          });
        });
      } catch (err) {
        console.error('Failed to parse resume during profile update:', err);
      }
    }

    const updatedCandidate = await storage.updateCandidate(candidate.id, profileData);
    res.json(updatedCandidate);
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid input', errors: error.errors });
    }
    res.status(500).json({ message: 'Server error' });
  }
});
```

### 4. **Frontend Enhancements**

#### A. **Extract Resume Text Mutation**

Added a new mutation to handle resume text extraction:

```typescript
// Extract resume text mutation
const extractResumeTextMutation = useMutation({
  mutationFn: async () => {
    const response = await fetch("/api/extract-resume-text", {
      method: "POST",
      credentials: "include"
    });
    if (!response.ok) throw new Error("Failed to extract resume text");
    return response.json();
  },
  onSuccess: (data) => {
    toast({
      title: "Success",
      description: "Resume text extracted successfully",
    });
    setProfileData(prev => ({ ...prev, resumeText: data.resumeText }));
    setResumeText(data.resumeText || "");
    queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
  },
  onError: (error: any) => {
    toast({
      title: "Error",
      description: error.message || "Failed to extract resume text",
      variant: "destructive",
    });
  },
});
```

#### B. **Manual Extract Button**

Added a button in the resume upload section to manually trigger text extraction:

```typescript
{profile?.resumeUrl && (
  <div className="mt-2 space-y-2">
    <a 
      href={profile.resumeUrl} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-primary hover:underline text-sm block"
    >
      View Current Resume
    </a>
    <Button 
      type="button" 
      variant="outline" 
      size="sm"
      onClick={() => extractResumeTextMutation.mutate()}
      disabled={extractResumeTextMutation.isPending}
    >
      {extractResumeTextMutation.isPending ? "Extracting..." : "Extract Resume Text"}
    </Button>
  </div>
)}
```

#### C. **Visual Warning**

Added a warning in the profile card when resume is uploaded but text is not extracted:

```typescript
{profile.resumeUrl && !profile.resumeText && (
  <div className="mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
    ⚠️ Resume uploaded but text not extracted. Click "Extract Resume Text" in edit mode.
  </div>
)}
```

## How It Works Now

### **Automatic Extraction**
1. When a user uploads a resume, text extraction happens automatically
2. When a user saves their profile and has a resume URL but no resume text, automatic extraction is triggered
3. The extracted text is saved to the database

### **Manual Extraction**
1. Users can click the "Extract Resume Text" button in edit mode
2. This triggers the extraction process for existing resumes
3. Success/error messages are shown via toast notifications

### **Visual Feedback**
1. Warning message appears when resume is uploaded but text is not extracted
2. Loading state during extraction process
3. Success/error notifications

## Testing

### **Manual Testing Steps**
1. Login as a candidate
2. Upload a resume file (PDF or DOCX)
3. Verify text extraction happens automatically
4. If text extraction fails, click "Extract Resume Text" button
5. Save profile and verify automatic extraction works
6. Check that extracted text appears in the profile

### **Edge Cases Handled**
- No resume uploaded
- Resume file not found
- Python script execution errors
- Network errors during extraction
- Invalid file formats
- Missing Python dependencies

## Benefits

1. **Improved User Experience**: Users can manually trigger text extraction if automatic extraction fails
2. **Automatic Recovery**: Profile save triggers text extraction for existing resumes
3. **Better Feedback**: Clear visual indicators and notifications
4. **Robust Error Handling**: Graceful handling of extraction failures
5. **Backward Compatibility**: Existing functionality remains unchanged
6. **Dependency Management**: Proper Python environment setup

## Future Enhancements

1. **Batch Processing**: Extract text for multiple resumes at once
2. **Progress Indicators**: Show extraction progress for large files
3. **Format Support**: Support for more resume formats
4. **Retry Mechanism**: Automatic retry on extraction failure
5. **Extraction History**: Track extraction attempts and results
6. **OCR Support**: Better OCR support for scanned documents (requires Tesseract installation) 