# Supabase Setup for QR Game

This document explains how Supabase has been configured in your AstroJS QR Game project.

## Installation

Supabase has been installed with:
```bash
pnpm add @supabase/supabase-js
```

## Configuration

### Environment Variables

The following environment variables are configured in `.env`:

- `PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous/public API key

⚠️ **Security Note**: The `.env` file is already included in `.gitignore` to prevent committing sensitive data.

### Supabase Client

The Supabase client is configured in `/src/lib/supabase.ts` and can be imported anywhere in your project:

```typescript
import { supabase } from '../lib/supabase';
```

## Usage Examples

### Authentication

```typescript
// Sign up with display name
const { error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: {
    data: {
      display_name: 'John Doe',
      full_name: 'John Doe'
    }
  }
});

// Sign up (basic)
const { error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Sign in
const { error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Sign out
const { error } = await supabase.auth.signOut();

// Get current user with metadata
const { data: { user } } = await supabase.auth.getUser();
console.log(user?.user_metadata?.display_name); // Access display name
```

### Database Operations

```typescript
// Insert data
const { data, error } = await supabase
  .from('your_table')
  .insert({ column: 'value' });

// Select data
const { data, error } = await supabase
  .from('your_table')
  .select('*');

// Update data
const { data, error } = await supabase
  .from('your_table')
  .update({ column: 'new_value' })
  .eq('id', userId);

// Delete data
const { error } = await supabase
  .from('your_table')
  .delete()
  .eq('id', userId);
```

## Example Page

Visit `/supabase-example` to see a working example of:
- User authentication (sign up, sign in, sign out)
- Database connection testing
- Real-time auth state management

## Next Steps

1. **Set up your database schema** in the Supabase dashboard
2. **Configure Row Level Security (RLS)** for your tables
3. **Create database functions** if needed for complex operations
4. **Set up real-time subscriptions** for live data updates

## Supabase Dashboard

Access your Supabase dashboard at: https://supabase.com/dashboard/project/qeukexybvytxydziczah

## TypeScript Support

The setup includes TypeScript definitions. You can generate types from your database schema:

```bash
npx supabase gen types typescript --project-id qeukexybvytxydziczah > src/types/supabase.ts
```

Then import and use them:

```typescript
import type { Database } from '../types/supabase';

const supabase = createClient<Database>(url, key);
```