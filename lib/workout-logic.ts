import { supabase } from './supabase';

export interface UserProfile {
    id: string;
    workout_reason: string;
    focus_area: string;
    fitness_level: string;
    activity_level: string;
    gender: string;
    age: number;
    height: number;
    weight: number;
    target_weight: number;
    workout_days: string[];
    workout_time: string;
}

export const calculateExp = (difficulty: string, sets: number, reps: number): number => {
    let baseExp = 10;
    if (difficulty === 'Intermediate') baseExp = 20;
    if (difficulty === 'Advanced') baseExp = 30;

    return baseExp * sets; // Simple formula: base * sets
};

export const generateWorkoutPlan = async (userId: string, profile: UserProfile) => {
    try {
        // 1. Create the plan container
        const { data: planData, error: planError } = await supabase
            .from('workout_plans')
            .insert({
                user_id: userId,
                name: 'System Generated Plan',
                is_active: true,
            })
            .select()
            .single();

        if (planError) throw planError;

        // 2. Select exercises based on profile
        // This is a simplified rule-based system
        let muscleGroups: string[] = [];

        if (profile.focus_area === 'Full Body') {
            muscleGroups = ['Chest', 'Legs', 'Back', 'Core', 'Full Body'];
        } else if (profile.focus_area === 'Upper Body') {
            muscleGroups = ['Chest', 'Back', 'Core'];
        } else if (profile.focus_area === 'Lower Body') {
            muscleGroups = ['Legs', 'Core'];
        } else if (profile.focus_area === 'Cardio') {
            muscleGroups = ['Full Body', 'Legs']; // Assuming cardio involves these
        } else {
            muscleGroups = ['Full Body'];
        }

        // Fetch exercises that match the muscle groups and difficulty (roughly)
        // For now, we just fetch all and filter in memory or fetch by muscle group if possible.
        // Supabase 'in' filter works well.

        const { data: exercises, error: exercisesError } = await supabase
            .from('exercises')
            .select('*')
            .in('muscle_group', muscleGroups);

        if (exercisesError) throw exercisesError;

        if (!exercises || exercises.length === 0) {
            console.warn('No exercises found for the criteria.');
            // Return the empty plan so the app doesn't crash
            return planData;
        }

        // 3. Create plan items
        const planItems = exercises.slice(0, 5).map((ex, index) => ({
            plan_id: planData.id,
            exercise_id: ex.id,
            sets: profile.fitness_level === 'Beginner' ? 3 : 4,
            reps: profile.fitness_level === 'Beginner' ? 10 : 12,
            rest_seconds: 60,
            order_index: index,
            day_of_week: null, // Flexible for now, or assign based on workout_days
        }));

        const { error: itemsError } = await supabase
            .from('plan_exercises')
            .insert(planItems);

        if (itemsError) throw itemsError;

        return planData;

    } catch (error) {
        console.error('Error generating workout plan:', error);
        throw error;
    }
};
