export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  timestamp: number;
}

export interface FoodSuggestion {
  name: string;
  caloriesPer100g: number;
  calories?: number;
  protein: number;
  carbs: number;
  fats: number;
  description: string;
  category: 'Snack' | 'Meal' | 'Shake' | 'Nutrient-Dense';
}

export interface Recipe {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  instructions: string[];
  description: string;
  imageUrl?: string;
}

export interface PersonalDetails {
  weight: number; // kg
  height: number; // cm
  age: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  bulkIntensity: 'clean' | 'standard' | 'aggressive';
}

export interface UserStats {
  dailyGoal: number;
  consumed: number;
  history: FoodItem[];
  recipes?: Recipe[];
  personalDetails?: PersonalDetails;
}
