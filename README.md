# QR Game - Multiplayer Sessions

A party-style QR code game built with AstroJS, React, and Supabase. Features centralized multiplayer game sessions where a single host manages turn-based gameplay with multiple players.

## 🎮 Features

- **Centralized Sessions**: Single host manages game for multiple players
- **Turn-Based Gameplay**: Automatic turn rotation with manual override
- **Real-time Leaderboards**: Live scoring and rankings per session
- **Session Persistence**: Resume interrupted games
- **Player Management**: Add/remove players during gameplay
- **Modern UI**: Clean, responsive interface built with React

## 🚀 Quick Start

1. **Clone and Install**
   ```sh
   git clone <repository-url>
   cd qr-game
   pnpm install
   ```

2. **Database Setup**
   - Create a Supabase project
   - Run the migration script: `MIGRATION_MULTIPLAYER_SESSIONS.sql`

3. **Environment Configuration**
   ```sh
   cp .env.example .env
   # Add your Supabase credentials to .env
   ```

4. **Start Development Server**
   ```sh
   pnpm dev
   ```

5. **Access Game Interface**
   Navigate to: `http://localhost:4321/sessions`

## 📁 Project Structure

```text
/
├── public/                 # Static assets
├── src/
│   ├── components/        # React components
│   │   ├── SessionApp.tsx      # Main app container
│   │   ├── SessionSetup.tsx    # Session creation
│   │   └── SessionControls.tsx # Game management
│   ├── hooks/             # Custom React hooks
│   │   └── useGameSession.ts   # Session state hook
│   ├── lib/               # Core libraries
│   │   ├── supabase.ts         # Database client
│   │   └── gameSessionService.ts # Session API
│   ├── stores/            # State management
│   │   └── gameSessionStore.ts # Global session store
│   ├── types/             # TypeScript definitions
│   │   └── session.ts          # Session interfaces
│   ├── pages/             # Astro pages
│   │   ├── index.astro         # Home page
│   │   └── sessions.astro      # Multiplayer interface
│   └── layouts/           # Page layouts
│       └── Layout.astro        # Base layout
├── MIGRATION_MULTIPLAYER_SESSIONS.sql # Database schema
├── MULTIPLAYER_SESSIONS_GUIDE.md     # Detailed documentation
└── package.json
```

## 🎯 How to Play

### Authentication Flow

1. **Access the Game**: Visit the homepage and click "Multiplayer Sessions"
2. **Login/Sign Up**: Use the modern authentication interface
3. **Auto-Redirect**: After successful login, you'll be automatically redirected to the sessions page
4. **Protected Access**: Sessions page requires authentication to access

### Game Session Management

1. **Create Session**: Host enters session name and initial players
2. **Manage Players**: Add or remove players during the game
3. **Turn Management**: Use automatic rotation or manual control
4. **Track Progress**: View real-time leaderboard and scores
5. **Session Control**: Pause, resume, or end games as needed

### Pages & Navigation

- **`/`**: Homepage with game navigation
- **`/login`**: Modern authentication interface
- **`/sessions`**: Protected multiplayer session management
- **`/supabase-example`**: Legacy authentication example

## 🛠️ Commands

| Command                | Action                                        |
| :--------------------- | :-------------------------------------------- |
| `pnpm install`         | Installs dependencies                         |
| `pnpm dev`             | Starts local dev server at `localhost:4321`  |
| `pnpm build`           | Build your production site to `./dist/`      |
| `pnpm preview`         | Preview your build locally, before deploying |

## 🏗️ Technology Stack

- **Framework**: AstroJS v5.15.3 with React integration
- **Language**: TypeScript
- **Database**: Supabase (PostgreSQL with RLS)
- **Styling**: Tailwind CSS + Component-scoped styles
- **State Management**: Custom React store with hooks
- **Package Manager**: pnpm

## 📖 Architecture

### Multiplayer Session System

The game uses a **centralized session architecture**:

- **Game Sessions**: Host-managed game rooms
- **Players**: Multiple participants per session
- **Turn Management**: Automatic rotation with manual override
- **Persistence**: Sessions saved to localStorage and database
- **Real-time Updates**: Live synchronization via Supabase

### Key Components

- **SessionApp**: Main React application container
- **SessionSetup**: Form for creating new game sessions
- **SessionControls**: Interface for managing active games
- **GameSessionService**: API layer for all session operations
- **useGameSession**: React hook for state management

## � Configuration

### Environment Variables

```env
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Schema

The system uses these main tables:
- `game_sessions`: Session metadata and configuration
- `players`: Player information within sessions
- `turns`: Current turn tracking and rotation
- `session_leaderboard_view`: Real-time scoring view

## 📚 Documentation

- **[MULTIPLAYER_SESSIONS_GUIDE.md](./MULTIPLAYER_SESSIONS_GUIDE.md)**: Complete implementation guide
- **[MIGRATION_MULTIPLAYER_SESSIONS.sql](./MIGRATION_MULTIPLAYER_SESSIONS.sql)**: Database setup script

## 🎨 Features in Detail

### Session Management
- Create multi-player game sessions
- Host-controlled session lifecycle
- Automatic session persistence
- Resume interrupted games

### Turn-Based Gameplay
- Automatic player rotation
- Manual turn assignment
- Turn history tracking
- Player order management

### Real-time Leaderboards
- Live score updates
- Session-specific rankings
- Player progress tracking
- Dynamic statistics

## 🚀 Deployment

Built for static deployment on platforms like:
- Vercel
- Netlify
- Cloudflare Pages
- Any static hosting service

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Run the development server
4. Test your changes thoroughly
5. Submit a pull request

## 📄 License

This project is open source and available under the MIT License.
