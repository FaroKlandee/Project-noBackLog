PROJECT CONTEXT: NoBacklog MVP Development

Continuing development of NoBacklog (AI-powered task management app). Reference my CV uploaded in project files for technical depth calibration.

COMPLETED WORK:
Complete Board API (5/5 CRUD operations) - fully tested
Complete List API (5/5 CRUD operations) - fully tested
Project README documentation created

CURRENT POSITION:
build Card API (Part 11)

TECH STACK:
- Backend: Node.js + Express.js + MongoDB (Mongoose)
- Models: Board, List, Card, TimeLog (all models created with relationships)
- Testing: Thunder Client
- Database: MongoDB local + Atlas cloud

ESTABLISHED PATTERNS:
- router.route() syntax for routes
- Two-tier validation (field + reference validation)
- Manual validation approach (check fields before DB operations)
- Async/await exclusively
- Consistent response format: { success: boolean, message/data: ... }
- HTTP status codes: 200, 201, 400, 404, 500
- Using .populate() for parent relationships
- Optional filtering via query parameters

CARD MODEL STRUCTURE (already exists):
- title: String (required)
- description: String
- listId: ObjectId reference to List
- position: Number

NEXT TASK:
Build Card API following same pattern as List API:
1. Create cardController.js with 5 CRUD functions
2. Create cardRoutes.js
3. Register routes in server.js
4. Test all endpoints

Key difference from List API: Cards reference Lists (validate listId exists)

PREFERENCES:
- Guide with explanations, not direct code solutions
- Step-by-step numbered instructions (max 5 steps, pause for confirmation)
- Reference credible documentation sources
- Real-world examples and analogies
- Technical depth appropriate to my CV experience
