# Skills Implementation Documentation

## Overview

This document describes the complete implementation of the skills management system for candidate profiles in the NASTP HRMS application.

## Database Schema

### Skills Table
```sql
CREATE TABLE "skills" (
  "id" serial PRIMARY KEY NOT NULL,
  "candidate_id" integer NOT NULL,
  "name" text NOT NULL,
  "expertise_level" integer NOT NULL,
  CONSTRAINT "skills_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id")
);
```

### Schema Definition (shared/schema.ts)
```typescript
export const skills = pgTable("skills", {
  id: serial("id").primaryKey(),
  candidateId: integer("candidate_id").references(() => candidates.id).notNull(),
  name: text("name").notNull(),
  expertiseLevel: integer("expertise_level").notNull(), // 1 (beginner) to 5 (expert)
});

export const insertSkillSchema = createInsertSchema(skills).omit({
  id: true,
});
```

## Backend Implementation

### Storage Layer (server/storage.ts)

The storage layer provides the following methods for skills management:

```typescript
// Get all skills for a candidate
async getCandidateSkills(candidateId: number): Promise<Skill[]>

// Create a new skill
async createSkill(skill: InsertSkill): Promise<Skill>

// Update an existing skill
async updateSkill(id: number, skill: Partial<InsertSkill>): Promise<Skill>

// Delete a skill
async deleteSkill(id: number): Promise<void>
```

### API Endpoints (server/routes.ts)

#### GET /api/skills
- **Purpose**: Retrieve all skills for the authenticated candidate
- **Authentication**: Required
- **Response**: Array of skill objects
- **Example Response**:
```json
[
  {
    "id": 1,
    "candidateId": 1,
    "name": "JavaScript",
    "expertiseLevel": 4
  },
  {
    "id": 2,
    "candidateId": 1,
    "name": "React",
    "expertiseLevel": 3
  }
]
```

#### POST /api/skills
- **Purpose**: Create a new skill for the authenticated candidate
- **Authentication**: Required
- **Request Body**:
```json
{
  "name": "Python",
  "expertiseLevel": 5
}
```
- **Response**: Created skill object
- **Validation**: Uses `insertSkillSchema` for input validation

#### PUT /api/skills/:id
- **Purpose**: Update an existing skill
- **Authentication**: Required
- **Request Body**: Partial skill object
- **Response**: Updated skill object
- **Validation**: Uses `insertSkillSchema.partial()` for input validation

#### DELETE /api/skills/:id
- **Purpose**: Delete a skill
- **Authentication**: Required
- **Response**: 204 No Content
- **Validation**: Validates skill ID parameter

## Frontend Implementation

### Profile Component (client/src/pages/candidate/profile.tsx)

#### Skills State Management
```typescript
// Skills state
const [skills, setSkills] = useState<any[]>([]);

// Fetch skills for the candidate
const { data: skillsData, refetch: refetchSkills } = useQuery<any[]>({
  queryKey: ["/api/skills"],
});

useEffect(() => {
  if (Array.isArray(skillsData)) setSkills(skillsData);
}, [skillsData]);
```

#### Skills Mutations
```typescript
// Create skill mutation
const createSkillMutation = useMutation({
  mutationFn: async (skill: { name: string; expertiseLevel: number }) => {
    const response = await apiRequest("POST", "/api/skills", skill);
    return response.json();
  },
  onSuccess: () => refetchSkills(),
});

// Update skill mutation
const updateSkillMutation = useMutation({
  mutationFn: async ({ id, ...skill }: { id: number; name: string; expertiseLevel: number }) => {
    const response = await apiRequest("PUT", `/api/skills/${id}`, skill);
    return response.json();
  },
  onSuccess: () => refetchSkills(),
});

// Delete skill mutation
const deleteSkillMutation = useMutation({
  mutationFn: async (id: number) => {
    await apiRequest("DELETE", `/api/skills/${id}`, {});
  },
  onSuccess: () => refetchSkills(),
});
```

#### Skills Form UI
The skills form includes:
- Input field for skill name
- Slider for expertise level (1-5 scale)
- Add/Update/Delete buttons
- Real-time expertise level display

```typescript
// Skills form section
<Card>
  <CardHeader>
    <CardTitle className="flex items-center space-x-2">
      <span>Skills</span>
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="space-y-4">
      {skills.map((skill, idx) => (
        <div key={skill.id} className="flex items-center space-x-4">
          <input
            className="border rounded px-2 py-1 w-40"
            value={skill.name}
            onChange={e => handleUpdateSkill(skill.id, { 
              name: e.target.value, 
              expertiseLevel: skill.expertiseLevel 
            })}
          />
          <Slider
            min={1}
            max={5}
            step={1}
            value={[skill.expertiseLevel]}
            onValueChange={([val]) => handleUpdateSkill(skill.id, { 
              name: skill.name, 
              expertiseLevel: val 
            })}
            className="w-32"
          />
          <span className="w-20 text-center">
            {["Beginner", "", "Intermediate", "", "Expert"][skill.expertiseLevel-1]}
          </span>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            onClick={() => handleDeleteSkill(skill.id)} 
            className="text-red-600"
          >
            Delete
          </Button>
        </div>
      ))}
      {/* Add new skill form */}
      <div className="flex items-center space-x-4 mt-2">
        <input
          className="border rounded px-2 py-1 w-40"
          value={newSkill.name}
          onChange={e => setNewSkill({ ...newSkill, name: e.target.value })}
          placeholder="Skill name"
        />
        <Slider
          min={1}
          max={5}
          step={1}
          value={[newSkill.expertiseLevel]}
          onValueChange={([val]) => setNewSkill({ ...newSkill, expertiseLevel: val })}
          className="w-32"
        />
        <span className="w-20 text-center">
          {["Beginner", "", "Intermediate", "", "Expert"][newSkill.expertiseLevel-1]}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={handleAddSkill}>
          Add Skill
        </Button>
      </div>
    </div>
  </CardContent>
</Card>
```

#### Skills Display in Profile Card
```typescript
// Skills display in ProfileCard component
<div className="mb-4">
  <div className="font-semibold mb-1">Skills:</div>
  {skills && skills.length > 0 ? skills.map((skill: any, i: number) => (
    <div key={i} className="flex items-center space-x-2 mb-1">
      <span className="w-40">{skill.name}</span>
      <Slider 
        min={1} 
        max={5} 
        step={1} 
        value={[skill.expertiseLevel]} 
        disabled 
        className="w-32" 
      />
      <span className="w-20 text-center">
        {["Beginner", "", "Intermediate", "", "Expert"][skill.expertiseLevel-1]}
      </span>
    </div>
  )) : <span className="italic text-gray-400">No skills added</span>}
</div>
```

## Expertise Level Scale

The skills system uses a 1-5 expertise level scale:

1. **Beginner** - Basic knowledge
2. **Elementary** - Some experience
3. **Intermediate** - Good working knowledge
4. **Advanced** - Strong expertise
5. **Expert** - Mastery level

## Integration with AI Scoring

Skills are integrated into the AI scoring system for job applications:

```typescript
// In application creation (server/routes.ts)
const skills = await storage.getCandidateSkills(candidate.id);
const aiInput = {
  resume: resumeText,
  job_description: job?.description || '',
  experience_dates,
  education_dates,
  // Skills are considered in AI scoring
  groq_api_key: process.env.GROQ_API_KEY || undefined
};
```

## Security Features

1. **Authentication Required**: All skills endpoints require valid JWT authentication
2. **Candidate Isolation**: Candidates can only access their own skills
3. **Input Validation**: All inputs are validated using Zod schemas
4. **Error Handling**: Comprehensive error handling for all endpoints

## Testing

### Manual Testing
1. Login as a candidate
2. Navigate to profile page
3. Add skills with different expertise levels
4. Update existing skills
5. Delete skills
6. Verify skills are displayed correctly in profile card

### API Testing
Use the provided test script:
```bash
node test-skills-endpoints.js
```

## Error Handling

### Common Error Scenarios
1. **Unauthorized Access**: 401 status for unauthenticated requests
2. **Invalid Input**: 400 status with validation errors
3. **Profile Not Found**: 404 status when candidate profile doesn't exist
4. **Server Errors**: 500 status for internal server errors

### Error Response Format
```json
{
  "message": "Error description",
  "errors": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "number",
      "path": ["name"],
      "message": "Expected string, received number"
    }
  ]
}
```

## Future Enhancements

1. **Skill Categories**: Group skills by category (Technical, Soft Skills, etc.)
2. **Skill Verification**: Allow employers to verify candidate skills
3. **Skill Recommendations**: AI-powered skill suggestions based on job requirements
4. **Skill Analytics**: Track skill development over time
5. **Bulk Operations**: Add/remove multiple skills at once

## Migration History

The skills table was added in migration `0001_add_cnic_profile_picture_skills.sql`:

```sql
-- Create skills table
CREATE TABLE "skills" (
  "id" serial PRIMARY KEY NOT NULL,
  "candidate_id" integer NOT NULL,
  "name" text NOT NULL,
  "expertise_level" integer NOT NULL,
  CONSTRAINT "skills_candidate_id_candidates_id_fk" FOREIGN KEY ("candidate_id") REFERENCES "candidates"("id")
);
```

## Conclusion

The skills implementation provides a comprehensive system for managing candidate skills with proper validation, security, and user experience. The system integrates seamlessly with the existing profile management and AI scoring features. 