import { supabase } from './supabase';

export interface Quiz {
  id: string;
  title: string;
  description: string;
  trick_title: string;
  trick_content: string;
  treat_title: string;
  treat_content: string;
  created_at: string;
}

export interface UserSelectedQuiz {
  id: string;
  user_id: string;
  quiz_id: string;
  choice: 'trick' | 'treat';
  completed: boolean;
  deserted?: boolean; // New field for deserting tricks
  created_at: string;
  quiz?: Quiz;
}

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  
  return user;
}

/**
 * Get all active tricks for the current user (not completed and not deserted)
 */
export async function getActiveTricks(userId: string): Promise<UserSelectedQuiz[]> {
  const { data, error } = await supabase
    .from('user_selected_quizzes')
    .select(`
      *,
      quiz:quizzes(*)
    `)
    .eq('user_id', userId)
    .eq('choice', 'trick')
    .eq('completed', false)
    .is('deserted', null) // Only get non-deserted tricks
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting active tricks:', error);
    return [];
  }

  return data || [];
}

/**
 * Get the most recent active trick for the current user (for backward compatibility)
 * @deprecated Use getActiveTricks instead for multiple tricks support
 */
export async function getActiveTrick(userId: string): Promise<UserSelectedQuiz | null> {
  const tricks = await getActiveTricks(userId);
  return tricks.length > 0 ? tricks[0] : null;
}

/**
 * Get all active treats for the current user (not completed)
 */
export async function getActiveTreats(userId: string): Promise<UserSelectedQuiz[]> {
  const { data, error } = await supabase
    .from('user_selected_quizzes')
    .select(`
      *,
      quiz:quizzes(*)
    `)
    .eq('user_id', userId)
    .eq('choice', 'treat')
    .eq('completed', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting active treats:', error);
    return [];
  }

  return data || [];
}

/**
 * Get the most recent active treat for the current user (for backward compatibility)
 */
export async function getActiveTreat(userId: string): Promise<UserSelectedQuiz | null> {
  const treats = await getActiveTreats(userId);
  return treats.length > 0 ? treats[0] : null;
}

/**
 * Mark a treat as completed
 */
export async function markTreatAsCompleted(treatId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_selected_quizzes')
    .update({ completed: true })
    .eq('id', treatId)
    .eq('user_id', userId)
    .eq('choice', 'treat');

  if (error) {
    console.error('Error marking treat as completed:', error);
    return false;
  }

  return true;
}

/**
 * Mark a trick as deserted - the trick will no longer count for points
 */
export async function markTrickAsDeserted(trickId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('user_selected_quizzes')
    .update({ deserted: true })
    .eq('id', trickId)
    .eq('user_id', userId)
    .eq('choice', 'trick');

  if (error) {
    console.error('Error marking trick as deserted:', error);
    return false;
  }

  return true;
}

/**
 * Get a random quiz that the user hasn't seen before
 */
export async function getRandomUnseenQuiz(userId: string): Promise<Quiz | null> {
  // First, get all quiz IDs that the user has already selected
  const { data: seenQuizzes, error: seenError } = await supabase
    .from('user_selected_quizzes')
    .select('quiz_id')
    .eq('user_id', userId);

  if (seenError) {
    console.error('Error getting seen quizzes:', seenError);
    return null;
  }

  const seenQuizIds = seenQuizzes?.map(sq => sq.quiz_id) || [];

  // Get all quizzes that haven't been seen
  let query = supabase
    .from('quizzes')
    .select('*');

  // If there are seen quizzes, exclude them
  if (seenQuizIds.length > 0) {
    query = query.not('id', 'in', `(${seenQuizIds.join(',')})`);
  }

  const { data: availableQuizzes, error: quizzesError } = await query;

  if (quizzesError) {
    console.error('Error getting available quizzes:', quizzesError);
    return null;
  }

  if (!availableQuizzes || availableQuizzes.length === 0) {
    return null;
  }

  // Return a random quiz from the available ones
  const randomIndex = Math.floor(Math.random() * availableQuizzes.length);
  return availableQuizzes[randomIndex];
}

/**
 * Save a user's quiz selection
 */
export async function saveUserSelection(
  userId: string, 
  quizId: string, 
  choice: 'trick' | 'treat'
): Promise<boolean> {
  const { error } = await supabase
    .from('user_selected_quizzes')
    .insert({
      user_id: userId,
      quiz_id: quizId,
      choice: choice
    });

  if (error) {
    console.error('Error saving user selection:', error);
    return false;
  }

  return true;
}

/**
 * Check if there are available quizzes for the user
 */
export async function hasAvailableQuizzes(userId: string): Promise<boolean> {
  // Get count of seen quizzes
  const { count: seenCount, error: seenError } = await supabase
    .from('user_selected_quizzes')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (seenError) {
    console.error('Error counting seen quizzes:', seenError);
    return false;
  }

  // Get total count of quizzes
  const { count: totalCount, error: totalError } = await supabase
    .from('quizzes')
    .select('*', { count: 'exact', head: true });

  if (totalError) {
    console.error('Error counting total quizzes:', totalError);
    return false;
  }

  return (totalCount || 0) > (seenCount || 0);
}

/**
 * Get user's quiz statistics
 */
export async function getUserStats(userId: string) {
  const { data, error } = await supabase
    .from('user_selected_quizzes')
    .select('choice, completed, deserted')
    .eq('user_id', userId);

  if (error) {
    console.error('Error getting user stats:', error);
    return {
      totalQuizzes: 0,
      tricksCompleted: 0,
      treatsCompleted: 0,
      tricksDeserted: 0
    };
  }

  // Count tricks that are not deserted (tricks don't need to be "completed" - they count when selected and not deserted)
  const tricksCompleted = data?.filter(item => item.choice === 'trick' && !item.deserted).length || 0;
  
  // Count deserted tricks for informational purposes
  const tricksDeserted = data?.filter(item => item.choice === 'trick' && item.deserted === true).length || 0;
  
  // Count only completed treats for ranking purposes
  const treatsCompleted = data?.filter(item => item.choice === 'treat' && item.completed === true).length || 0;

  return {
    totalQuizzes: data?.length || 0,
    tricksCompleted,
    treatsCompleted,
    tricksDeserted
  };
}

/**
 * Get user's quiz selections with quiz details
 */
export async function getUserSelections(userId: string): Promise<UserSelectedQuiz[]> {
  const { data, error } = await supabase
    .from('user_selected_quizzes')
    .select(`
      *,
      quiz:quizzes(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error getting user selections:', error);
    return [];
  }

  return data || [];
}

export interface UserStats {
  totalQuizzes: number;
  tricksCompleted: number;
  treatsCompleted: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  email: string;
  displayName?: string;
  tricksCompleted: number;
  treatsCompleted: number;
  totalQuizzes: number;
}

/**
 * Get the leaderboard with all users ranked by tricks first, then treats for tie-breaking
 */
export async function getLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    // Get all user selections and group by user
    const { data: allSelections, error: selectionsError } = await supabase
      .from('user_selected_quizzes')
      .select('user_id, choice, completed, deserted');
    
    if (selectionsError) {
      console.error('Error getting user selections:', selectionsError);
      return [];
    }

    // Group selections by user_id
    const userStatsMap = new Map<string, { tricksCompleted: number; treatsCompleted: number; totalQuizzes: number }>();
    
    allSelections?.forEach(selection => {
      const userId = selection.user_id;
      const current = userStatsMap.get(userId) || { tricksCompleted: 0, treatsCompleted: 0, totalQuizzes: 0 };
      
      current.totalQuizzes++;
      if (selection.choice === 'trick' && !selection.deserted) {
        // Only count tricks that are not deserted for ranking
        current.tricksCompleted++;
      } else if (selection.choice === 'treat' && selection.completed === true) {
        // Only completed treats count for ranking
        current.treatsCompleted++;
      }
      
      userStatsMap.set(userId, current);
    });

    // Create leaderboard entries with simplified user info
    const leaderboardEntries: Omit<LeaderboardEntry, 'rank'>[] = [];
    
    for (const [userId, stats] of userStatsMap.entries()) {
      // For now, use a simplified approach - in a production app you'd have a users table
      // or use Supabase RLS to get user details
      leaderboardEntries.push({
        userId: userId,
        email: `Usuario ${userId.slice(0, 8)}...`, // Show first 8 chars of UUID
        displayName: `Jugador ${leaderboardEntries.length + 1}`,
        tricksCompleted: stats.tricksCompleted,
        treatsCompleted: stats.treatsCompleted,
        totalQuizzes: stats.totalQuizzes
      });
    }

    // Sort by tricks first (descending), then by treats (descending)
    leaderboardEntries.sort((a, b) => {
      if (a.tricksCompleted !== b.tricksCompleted) {
        return b.tricksCompleted - a.tricksCompleted;
      }
      return b.treatsCompleted - a.treatsCompleted;
    });

    // Assign ranks, handling ties
    const rankedEntries: LeaderboardEntry[] = [];
    let currentRank = 1;
    
    for (let i = 0; i < leaderboardEntries.length; i++) {
      const currentEntry = leaderboardEntries[i];
      
      if (i > 0) {
        const previousEntry = leaderboardEntries[i - 1];
        // If current entry has different scores than previous, update rank
        if (currentEntry.tricksCompleted !== previousEntry.tricksCompleted || 
            currentEntry.treatsCompleted !== previousEntry.treatsCompleted) {
          currentRank = i + 1;
        }
        // If they have the same scores, they keep the same rank
      }
      
      rankedEntries.push({
        ...currentEntry,
        rank: currentRank
      });
    }

    return rankedEntries;
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

/**
 * Reset all user data - deletes all user selections and completions
 * WARNING: This is irreversible!
 */
export async function resetUserData(userId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Delete all user selected quizzes (both tricks and treats)
    const { error: deleteError } = await supabase
      .from('user_selected_quizzes')
      .delete()
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting user selections:', deleteError);
      return {
        success: false,
        message: `Error deleting user data: ${deleteError.message}`
      };
    }

    return {
      success: true,
      message: 'All user data has been successfully reset! You can now start fresh.'
    };
  } catch (error) {
    console.error('Error in resetUserData:', error);
    return {
      success: false,
      message: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}