# 🌾 Hardini - Agricultural Technology Platform

A modern full-stack platform that bridges technology and farming experiences to create sustainable agricultural solutions with YouTube integration and AI-powered farming tools.

## 🚀 Features

### Frontend
- 🌐 Modern, responsive web design
- 🎥 Instagram-style farming reels (autoplay muted)
- 🛍️ Comprehensive agricultural marketplace
- 🤖 AI-powered farming chatbot
- 📞 Interactive contact forms with maps
- 📱 Mobile-first responsive layout

### Backend
- 📺 YouTube API integration for farming videos
- 🔍 Advanced content filtering and search
- 🌐 RESTful API architecture
- 📊 Real-time data processing
- 🔒 CORS-enabled secure communication

### Development
- ⚡ Concurrent frontend/backend development server
- 🔄 Hot reload capabilities
- 📊 Auto-restart server with nodemon
- 🛠️ Cross-platform compatibility

## 🛠️ Technologies Used

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with animations
- **JavaScript ES6+** - Interactive functionality
- **Google Fonts (Poppins)** - Typography
- **Font Awesome** - Icons

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **YouTube Data API v3** - Video content
- **Axios** - HTTP client
- **CORS** - Cross-origin resource sharing

### Development Tools
- **npm** - Package management
- **concurrently** - Parallel process execution
- **nodemon** - Auto-restart development server

## 📋 Setup & Installation

### Prerequisites
- Node.js (v14+ recommended)
- npm (comes with Node.js)
- Modern web browser

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hardini-app
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Start the development servers**
   ```bash
   npm start
   ```
   Or
   ```bash
   npm run dev
   ```

4. **Access the application**
   - Frontend: `http://localhost:8000`
   - Backend API: `http://localhost:3001`
   - API Health Check: `http://localhost:3001/api/health`

### Manual Commands

**Start both servers concurrently:**
```bash
npm run dev
```

**Start backend only:**
```bash
npm run backend
```

**Start backend with hot reload (development):**
```bash
npm run backend:dev
```

**Start frontend only:**
```bash
npm run frontend
```

## 📁 Project Structure

```
hardini-app/
├── index.html              # Main homepage
├── styles.css             # Global styles
├── script.js             # Main script
├── reels.html            # Reels page
├── reels.js             # Reels functionality
├── connect.html         # Connect page
├── supply-chain.html    # Supply chain page
├── package.json         # Root package.json
├── backend/             # Backend application
│   ├── server.js        # Express server
│   ├── package.json     # Backend dependencies
│   └── .env            # Environment variables
├── assets/              # Static assets
│   └── seed-icon.svg
├── images/              # Image assets
└── README.md           # This file
```

## 🔧 Environment Configuration

Create `backend/.env` file:

```env
YOUTUBE_API_KEY=your_youtube_api_key_here
PORT=3001
```

**Note:** Get YouTube API key from [Google Cloud Console](https://console.cloud.google.com/)

## 🎯 Usage

### Browsing Reels
- Reels autoplay muted on the homepage
- Click any reel to open it with sound
- Use navigation arrows or swipe to browse
- Auto-scroll through reels every 8 seconds

### Marketplace
- Browse agricultural products by category
- Interactive product cards with ordering
- Equipment rental with detailed terms

### Learning Platform
- Connect with experienced farmers
- Access mentorship programs
- AI-powered chatbot for queries

### API Endpoints
- `GET /api/health` - Server health check
- `GET /api/reels?limit=N` - Fetch farming videos
- `GET /api/reels/:videoId` - Get specific video details

## 🚀 Deployment

### Production Build
```bash
# Backend (consider using PM2)
npm run backend

# Frontend can be served statically or through Node.js
```

### Docker (Optional)
Create a `Dockerfile` for containerized deployment.

## 🔐 Supabase Authentication Setup

### 1. Create Supabase Project

1. Go to [Supabase](https://supabase.com)
2. Sign up/Login to your account
3. Click "New Project"
4. Choose your organization
5. Fill in project details:
   - **Name**: Hardini (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Choose the closest region to your users

### 2. Get Project Keys

After project creation, go to Settings > API and copy:

- **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)
- **Anon Public Key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### 3. Configure Authentication

In your project dashboard:

1. **Enable Authentication Providers**:
   - Go to Settings > Authentication
   - Enable Email Auth
   - Optionally enable Google OAuth (for Google login)

2. **Configure Google OAuth** (optional):
   - Go to Settings > Authentication > Providers
   - Click "Google"
   - Add your Google OAuth credentials
   - Set redirect URL to your domain + /auth/callback

### 4. Set Up Database Tables

Run these SQL commands in the Supabase SQL Editor:

```sql
-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  phone TEXT,
  user_type TEXT DEFAULT 'customer',
  farming_experience TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  items JSONB,
  total_amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  payment_method TEXT,
  delivery_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Farms table (for farmer users)
CREATE TABLE farms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  farm_name TEXT,
  location TEXT,
  land_size DECIMAL(10,2),
  crop_types TEXT[],
  farming_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE farms ENABLE ROW LEVEL SECURITY;

-- Create policies (users can only access their own data)
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own farms" ON farms
  FOR SELECT USING (auth.uid() = user_id);
```

### 5. Update Configuration

In `index.html`, find and replace these placeholders in the Supabase script:

```javascript
const SUPABASE_URL = 'https://abcdefghijklmnop.supabase.co'; // Replace with your actual URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'; // Replace with your actual key
```

### 6. Enable Email Confirmation (Optional)

In Supabase Dashboard > Settings > Authentication:
- Enable "Enable email confirmations" if you want users to verify emails
- Set Site URL to your domain
- Set Redirect URLs for OAuth

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 📞 Contact

Hardini Technologies
- Website: [Coming Soon]
- Email: info@hardini.com
- Support: support@hardini.com

---

**Built with ❤️ for sustainable agriculture** 🌱🚀
