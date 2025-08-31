# SmartCT Backend API

Backend API server for the SmartCT AI-Powered Abdominal Trauma Detection System.

## Features

- **Authentication & Authorization**: JWT-based auth with role-based access control
- **User Management**: Complete CRUD operations for users with admin controls
- **File Upload**: Secure medical image upload with validation
- **AI Integration**: Mock AI processing with realistic results simulation
- **Admin Dashboard**: Comprehensive admin features and analytics
- **Database**: MongoDB with Mongoose ODM
- **Security**: Password hashing, rate limiting, input validation

## Quick Start

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn

### Installation

1. **Clone and navigate to backend directory**
   \`\`\`bash
   cd backend
   \`\`\`

2. **Install dependencies**
   \`\`\`bash
   npm install
   \`\`\`

3. **Environment Setup**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

4. **Start MongoDB**
   \`\`\`bash
   # If using local MongoDB
   mongod
   
   # Or use MongoDB Atlas (cloud)
   # Update MONGODB_URI in .env
   \`\`\`

5. **Seed the database**
   \`\`\`bash
   npm run seed
   \`\`\`

6. **Start the server**
   \`\`\`bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   \`\`\`

The server will start on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### User Management
- `GET /api/user/profile` - Get user profile
- `PUT /api/user/profile` - Update user profile

### Scans
- `POST /api/scans/upload` - Upload CT scan
- `GET /api/scans` - Get user's scans
- `GET /api/scans/:id` - Get specific scan details

### Admin Routes
- `GET /api/admin/users` - Get all users (admin only)
- `POST /api/admin/users` - Create new user (admin only)
- `PUT /api/admin/users/:id` - Update user (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)
- `GET /api/admin/stats` - Get system statistics (admin only)

## Demo Credentials

After running the seed script, you can use these credentials:

**Admin Account:**
- Email: `admin@example.com`
- Password: `password123`

**Regular User:**
- Email: `user@example.com`
- Password: `password123`

## File Upload

The API accepts medical image files in the following formats:
- DICOM (.dcm)
- NIfTI (.nii, .nii.gz)
- Maximum file size: 500MB

## Database Schema

### User Model
- Personal information (name, email, phone)
- Authentication (password, JWT tokens)
- Role-based permissions (Doctor, Radiologist, Nurse, Technician, Admin)
- Account status and preferences

### Scan Model
- File information and metadata
- Processing status and results
- AI analysis findings
- Quality control and annotations

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Authentication**: Secure token-based auth
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Mongoose schema validation
- **File Upload Security**: Type and size validation
- **CORS Configuration**: Controlled cross-origin access

## Development

### Project Structure
\`\`\`
backend/
├── server.js              # Main server file
├── models/                 # Database models
│   ├── User.js
│   └── Scan.js
├── middleware/             # Custom middleware
│   └── auth.js
├── scripts/                # Utility scripts
│   └── seedDatabase.js
├── uploads/                # File upload directory
└── package.json
\`\`\`

### Scripts
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm run seed` - Seed database with demo data
- `npm test` - Run tests (when implemented)

### Environment Variables
\`\`\`env
MONGODB_URI=mongodb://localhost:27017/smartct
JWT_SECRET=your-super-secret-jwt-key
PORT=5000
NODE_ENV=development
MAX_FILE_SIZE=524288000
\`\`\`

## API Testing

You can test the API using tools like Postman or curl:

\`\`\`bash
# Health check
curl http://localhost:5000/api/health

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get user profile (with token)
curl -X GET http://localhost:5000/api/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
\`\`\`

## Production Deployment

1. **Environment Setup**
   - Set `NODE_ENV=production`
   - Use strong JWT secret
   - Configure MongoDB Atlas or production database
   - Set up proper CORS origins

2. **Security Considerations**
   - Enable HTTPS
   - Set up rate limiting
   - Configure proper CORS
   - Use environment variables for secrets
   - Set up monitoring and logging

3. **Deployment Options**
   - Heroku
   - AWS EC2/ECS
   - DigitalOcean
   - Vercel (for serverless)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
