# QR Game - Multiplayer Sessions System

## Overview

The QR Game has been refactored from an individual user system to a **centralized multiplayer game session** architecture. This allows for party-style gameplay where a single host manages a game session with multiple players.

## Key Changes

### From Individual Users → Centralized Sessions
- **Before**: Each player had their own account and data was isolated by RLS policies
- **After**: Single host authentication with shared game sessions containing multiple players

### New Architecture Components

1. **Game Sessions**: Central game rooms managed by a host
2. **Players**: Multiple participants within each session
3. **Turns**: Turn-based gameplay with automatic rotation
4. **Leaderboards**: Session-specific scoring and rankings

## Database Schema

### Core Tables

- `game_sessions`: Session metadata and configuration
- `players`: Player information within sessions
- `turns`: Current turn tracking and rotation
- `session_leaderboard_view`: Real-time leaderboard per session

### Key Features
- **RLS Policies**: Ensure data isolation between sessions
- **Automatic Turn Rotation**: Built-in turn management
- **Session Persistence**: Resume interrupted games
- **Real-time Updates**: Live synchronization across players

## Usage Guide

### 1. Setup Database

Execute the migration script in your Supabase dashboard:

```sql
-- Run the complete migration in: MIGRATION_MULTIPLAYER_SESSIONS.sql
```

### 2. Configure Environment

Create `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Add your Supabase credentials:

```env
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Start Development Server

```bash
pnpm install
pnpm dev
```

### 4. Access Multiplayer Interface

Navigate to: `http://localhost:4321/sessions`

## How to Play

### Creating a Session

1. **Session Setup**: Enter session name and player names
2. **Host Authentication**: Only the host needs to authenticate with Supabase
3. **Player Management**: Add/remove players during the game
4. **Turn Management**: Automatic turn rotation or manual control

### Game Flow

1. **Create Session**: Host sets up game with initial players
2. **Turn-Based Play**: Players take turns in defined order
3. **Score Tracking**: Automatic scoring and leaderboard updates
4. **Session Persistence**: Games can be paused and resumed
5. **End Game**: Host ends session when complete

### Session Controls

- **Next Turn**: Advance to next player
- **Set Current Player**: Jump to specific player
- **Add Player**: Include new players mid-game
- **Pause/Resume**: Control game state
- **End Session**: Complete the game

## Technical Implementation

### State Management

- **GameSessionStore**: Centralized state using React patterns
- **useGameSession Hook**: React hook for component integration
- **Local Persistence**: Session data saved to localStorage

### Service Layer

- **GameSessionService**: Complete session management API
- **Supabase Integration**: Database operations and real-time updates
- **Error Handling**: Comprehensive error management

### Components

- **SessionApp**: Main application container
- **SessionSetup**: New session creation form
- **SessionControls**: Game management interface
- **RankList**: Updated for session-based leaderboards

## API Reference

### GameSessionService Methods

```typescript
// Session Management
createSession(name: string, players: string[]): Promise<GameSession>
getActiveSession(sessionId: string): Promise<ActiveGameSession>
endSession(sessionId: string): Promise<void>

// Player Management
addPlayer(sessionId: string, name: string): Promise<Player>
getSessionPlayers(sessionId: string): Promise<Player[]>

// Turn Management
nextTurn(sessionId: string): Promise<Player>
setCurrentPlayer(sessionId: string, playerId: string): Promise<void>
getCurrentTurn(sessionId: string): Promise<Turn>

// Scoring & Leaderboards
processQuizAction(action: QuizAction): Promise<void>
getSessionLeaderboard(sessionId: string): Promise<SessionLeaderboard[]>
```

### React Hooks

```typescript
// Main hook for session management
const {
  session, players, currentPlayer, leaderboard,
  createSession, nextTurn, addPlayer, endSession
} = useGameSession();

// Specific data hooks
const session = useCurrentSession();
const players = useSessionPlayers();
const currentPlayer = useCurrentPlayer();
const leaderboard = useSessionLeaderboard();
```

## Migration Notes

### Breaking Changes

1. **Authentication**: Single host instead of individual user accounts
2. **Data Structure**: Session-based instead of user-based
3. **Components**: Updated to use session context
4. **Routing**: New `/sessions` page for game management

### Benefits

1. **Simplified UX**: One person manages the entire game
2. **Party Gaming**: Perfect for group activities
3. **Turn Management**: Built-in turn rotation logic
4. **Persistence**: Resume games across sessions
5. **Real-time Updates**: Live synchronization

## Troubleshooting

### Common Issues

1. **RLS Policies**: Ensure migration script ran completely
2. **Environment Variables**: Verify Supabase credentials
3. **Session Persistence**: Check localStorage for session data
4. **Turn Logic**: Verify turn rotation is working correctly

### Debug Tools

- **Session State**: Use React DevTools to inspect state
- **Database**: Check Supabase dashboard for data integrity
- **Console**: Monitor browser console for errors
- **Network**: Verify API calls in browser dev tools

## Future Enhancements

- **Real-time Multiplayer**: WebSocket integration for live updates
- **Session Sharing**: QR codes or links to join sessions
- **Game Templates**: Pre-configured game types
- **Player Avatars**: Visual player identification
- **Game Statistics**: Detailed analytics and history