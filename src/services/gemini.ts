import { GoogleGenAI, Type } from "@google/genai";
import { FoodSuggestion, Recipe } from "../types";
import { MacroFilters } from "../components/SearchFilters";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function getHighCalorieSuggestions(query: string, filters?: MacroFilters): Promise<FoodSuggestion[]> {
  const filterContext = filters ? `
    Additionally, try to respect these minimum targets if possible:
    ${filters.proteinMin ? `- Minimum Protein: ${filters.proteinMin}g` : ''}
    ${filters.carbsMin ? `- Minimum Carbs: ${filters.carbsMin}g` : ''}
    ${filters.fatsMin ? `- Minimum Fats: ${filters.fatsMin}g` : ''}
    ${filters.densityMin ? `- Minimum Calorie Density: ${filters.densityMin} kcal/100g` : ''}
  ` : '';

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 5 high-calorie, nutrient-dense foods related to: ${query}. Focus on healthy fats and proteins for weight gain. ${filterContext}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              caloriesPer100g: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fats: { type: Type.NUMBER },
              description: { type: Type.STRING },
              category: { type: Type.STRING, enum: ['Snack', 'Meal', 'Shake', 'Nutrient-Dense'] }
            },
            required: ['name', 'caloriesPer100g', 'protein', 'carbs', 'fats', 'description', 'category']
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  } catch (error) {
    console.error("AI Fetch Error:", error);
    return [];
  }
}

export async function estimateNutrients(foodName: string): Promise<Partial<FoodSuggestion> | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Estimate nutritional values for: ${foodName}. Return a single object with calories, protein, carbs, and fats per standard serving.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fats: { type: Type.NUMBER }
          },
          required: ['calories', 'protein', 'carbs', 'fats']
        }
      }
    });

    return JSON.parse(response.text || 'null');
  } catch (error) {
    console.error("Nutrient Estimation Error:", error);
    return null;
  }
}

export async function lookupProductByQR(qrData: string): Promise<Partial<FoodSuggestion> | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Look up the food product associated with this QR code data or barcode numeric: ${qrData}. If it's a food item, provide its nutritional info per serving. Return a single object with name, calories, protein, carbs, and fats.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fats: { type: Type.NUMBER }
          },
          required: ['name', 'calories', 'protein', 'carbs', 'fats']
        }
      }
    });

    return JSON.parse(response.text || 'null');
  } catch (error) {
    console.error("QR Lookup Error:", error);
    return null;
  }
}

export async function generateHighCalorieRecipe(dailyGoal: number, remainingCalories: number): Promise<Partial<Recipe> | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a high-calorie, nutrient-dense recipe suited for a person with a daily goal of ${dailyGoal} kcal, who still needs ${remainingCalories} kcal today. Focus on healthy weight gain.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fats: { type: Type.NUMBER },
            ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
            instructions: { type: Type.ARRAY, items: { type: Type.STRING } },
            description: { type: Type.STRING }
          },
          required: ['name', 'calories', 'protein', 'carbs', 'fats', 'ingredients', 'instructions', 'description']
        }
      }
    });

    return JSON.parse(response.text || 'null');
  } catch (error) {
    console.error("Recipe Generation Error:", error);
    return null;
  }
}

export async function generateRecipeImage(recipeName: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `Generate a high-quality, delicious-looking photorealistic food photography image of: ${recipeName}. Centered composition, depth of field, warm lighting.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Recipe Image Generation Error:", error);
    return null;
  }
}
