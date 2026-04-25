/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Flame, 
  Plus, 
  History, 
  TrendingUp, 
  Coffee, 
  UtensilsCrossed, 
  Zap, 
  Trash2, 
  Loader2,
  ChevronRight,
  Info,
  QrCode,
  LogIn,
  LogOut,
  User as UserIcon,
  Book,
  Share2
} from 'lucide-react';
import { FoodItem, FoodSuggestion, UserStats, Recipe } from './types';
import { getHighCalorieSuggestions, estimateNutrients, lookupProductByQR, generateHighCalorieRecipe, generateRecipeImage } from './services/gemini';
import { Scanner } from './components/Scanner';
import { IntakeChart } from './components/IntakeChart';
import { SearchFilters, MacroFilters } from './components/SearchFilters';
import { PersonalDetailsForm } from './components/PersonalDetailsForm';
import { auth, db, loginWithGoogle, logout, OperationType, handleFirestoreError } from './services/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot, setDoc, collection, addDoc, deleteDoc, query, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { PersonalDetails } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'track' | 'find' | 'recipes' | 'profile'>('track');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [authUser, setAuthUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  
  const [stats, setStats] = useState<UserStats>(() => {
    const saved = localStorage.getItem('calorie_max_stats');
    return saved ? JSON.parse(saved) : { dailyGoal: 3500, consumed: 0, history: [], recipes: [] };
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<FoodSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [customFoodName, setCustomFoodName] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(stats.dailyGoal.toString());

  const [isGeneratingRecipe, setIsGeneratingRecipe] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);

  const [macroFilters, setMacroFilters] = useState<MacroFilters>({});
  const [isScanning, setIsScanning] = useState(false);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setAuthReady(true);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!authUser) return;

    // Syncing logs
    const logsQuery = query(
      collection(db, 'users', authUser.uid, 'logs'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribeLogs = onSnapshot(logsQuery, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FoodItem));
      setStats(prev => ({
        ...prev,
        history: logs,
        consumed: logs.reduce((acc, log) => acc + log.calories, 0)
      }));
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${authUser.uid}/logs`));

    // Syncing user profile
    const userDoc = doc(db, 'users', authUser.uid);
    const unsubscribeUser = onSnapshot(userDoc, (docSnap) => {
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setStats(prev => ({
          ...prev,
          dailyGoal: userData.dailyGoal,
          personalDetails: userData.personalDetails
        }));
      } else {
        // Initialize user doc if it doesn't exist
        setDoc(userDoc, {
          dailyGoal: 3500,
          email: authUser.email,
          displayName: authUser.displayName,
          personalDetails: {
            weight: 75,
            height: 180,
            age: 25,
            gender: 'male',
            activityLevel: 'moderate',
            bulkIntensity: 'standard'
          }
        }).catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${authUser.uid}`));
      }
    });

    const recipesQuery = query(
      collection(db, 'users', authUser.uid, 'recipes')
    );

    const unsubscribeRecipes = onSnapshot(recipesQuery, (snapshot) => {
      const recipes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
      setStats(prev => ({
        ...prev,
        recipes: recipes
      }));
    }, (error) => handleFirestoreError(error, OperationType.GET, `users/${authUser.uid}/recipes`));

    return () => {
      unsubscribeLogs();
      unsubscribeUser();
      unsubscribeRecipes();
    };
  }, [authUser]);

  useEffect(() => {
    if (!authUser) {
      localStorage.setItem('calorie_max_stats', JSON.stringify(stats));
    }
  }, [stats, authUser]);

  const addFood = async (item: Omit<FoodItem, 'id' | 'timestamp'>) => {
    const timestamp = Date.now();
    
    if (authUser) {
      try {
        await addDoc(collection(db, 'users', authUser.uid, 'logs'), {
          ...item,
          timestamp,
          userId: authUser.uid
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, `users/${authUser.uid}/logs`);
      }
    } else {
      const newItem: FoodItem = {
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        timestamp,
      };
      setStats(prev => ({
        ...prev,
        consumed: prev.consumed + newItem.calories,
        history: [newItem, ...prev.history].slice(0, 50),
      }));
    }
  };

  const deleteFood = async (id: string) => {
    if (authUser) {
      try {
        await deleteDoc(doc(db, 'users', authUser.uid, 'logs', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${authUser.uid}/logs/${id}`);
      }
    } else {
      const itemToDelete = stats.history.find(h => h.id === id);
      if (!itemToDelete) return;
      setStats(prev => ({
        ...prev,
        consumed: prev.consumed - itemToDelete.calories,
        history: prev.history.filter(h => h.id !== id),
      }));
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsLoadingSuggestions(true);
    const results = await getHighCalorieSuggestions(searchQuery, macroFilters);
    setSuggestions(results);
    setIsLoadingSuggestions(false);
  };

  const handleAddCustom = async () => {
    if (!customFoodName.trim()) return;
    setIsAddingCustom(true);
    const estimation = await estimateNutrients(customFoodName);
    if (estimation) {
      addFood({
        name: customFoodName,
        calories: estimation.calories || 0,
        protein: estimation.protein || 0,
        carbs: estimation.carbs || 0,
        fats: estimation.fats || 0,
      });
      setCustomFoodName('');
    }
    setIsAddingCustom(false);
  };

  const handleScan = async (qrData: string) => {
    setIsScannerOpen(false);
    setIsScanning(true);
    // Use a toast or notification in a real app, here we rely on the log update
    const product = await lookupProductByQR(qrData);
    if (product) {
      addFood({
        name: product.name || 'Unknown Product',
        calories: product.calories || 0,
        protein: product.protein || 0,
        carbs: product.carbs || 0,
        fats: product.fats || 0,
      });
    }
    setIsScanning(false);
  };

  const updateGoal = async (newGoal: number) => {
    if (authUser) {
      try {
        await setDoc(doc(db, 'users', authUser.uid), { dailyGoal: newGoal }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${authUser.uid}`);
      }
    } else {
      setStats(prev => ({ ...prev, dailyGoal: newGoal }));
    }
    setIsEditingGoal(false);
  };

  const handleSavePersonal = async (details: PersonalDetails, calculatedGoal: number) => {
    if (authUser) {
      try {
        await setDoc(doc(db, 'users', authUser.uid), { 
          personalDetails: details,
          dailyGoal: calculatedGoal
        }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${authUser.uid}`);
      }
    } else {
      setStats(prev => ({ 
        ...prev, 
        personalDetails: details,
        dailyGoal: calculatedGoal
      }));
    }
    setIsEditingPersonal(false);
  };

  const handleShare = async () => {
    const text = `I've consumed ${stats.consumed} / ${stats.dailyGoal} kcal today on BulkTrack! 🚀\nMacros: P: ${stats.history.reduce((a, b) => a + b.protein, 0).toFixed(0)}g | C: ${stats.history.reduce((a, b) => a + b.carbs, 0).toFixed(0)}g | F: ${stats.history.reduce((a, b) => a + b.fats, 0).toFixed(0)}g`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My BulkTrack Progress',
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Progress copied to clipboard!');
    }
  };

  const dailyProgress = useMemo(() => {
    return Math.min((stats.consumed / stats.dailyGoal) * 100, 100);
  }, [stats]);

  const handleGenerateRecipe = async () => {
    setIsGeneratingRecipe(true);
    try {
      const recipe = await generateHighCalorieRecipe(stats.dailyGoal, Math.max(0, stats.dailyGoal - stats.consumed));
      if (recipe) {
        const imageUrl = await generateRecipeImage(recipe.name || '');
        const newRecipe = {
          ...recipe,
          id: Math.random().toString(36).substr(2, 9),
          imageUrl: imageUrl || `https://picsum.photos/seed/${recipe.name}/800/800`,
        } as Recipe;

        setGeneratedRecipe(newRecipe);

        if (authUser) {
          try {
            await addDoc(collection(db, 'users', authUser.uid, 'recipes'), newRecipe);
          } catch (error) {
            handleFirestoreError(error, OperationType.CREATE, `users/${authUser.uid}/recipes`);
          }
        }
      }
    } catch (error) {
      console.error("Recipe Generation Error:", error);
    } finally {
      setIsGeneratingRecipe(false);
    }
  };

  const handleShareRecipe = async (recipe: Recipe) => {
    const text = `🔥 MUSCLE FUEL: ${recipe.name} 🔥\n🚀 ${recipe.calories} kcal | 💪 ${recipe.protein}g Protein | 🍞 ${recipe.carbs}g Carbs | 🥑 ${recipe.fats}g Fats\n\n"${recipe.description}"\n\nGet the full cooking instructions on BulkTrack!`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: recipe.name,
          text: text,
          url: window.location.href,
        });
      } catch (err) {
        console.error('Error sharing recipe:', err);
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('Recipe copied to clipboard!');
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full gap-10">
      {/* Brand */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center">
            <div className="w-5 h-5 bg-white rounded-full"></div>
          </div>
          <span className="text-xl font-bold tracking-tight uppercase">BulkTrack</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Navigation</span>
        <button 
          onClick={() => setActiveTab('track')} 
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'track' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <TrendingUp size={20} /> TRACK
        </button>
        <button 
          onClick={() => setActiveTab('find')} 
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'find' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Search size={20} /> FIND FUEL
        </button>
        <button 
          onClick={() => setActiveTab('recipes')} 
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'recipes' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Book size={20} /> AI RECIPES
        </button>
        <button 
          onClick={() => setActiveTab('profile')} 
          className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <UserIcon size={20} /> PROFILE
        </button>
      </nav>

      {/* User Section */}
      <div className="bg-slate-50 p-4 rounded-2xl flex flex-col gap-3">
        {authUser ? (
          <>
            <div className="flex items-center gap-3">
              {authUser.photoURL ? (
                <img src={authUser.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-brand" />
              ) : (
                <div className="w-10 h-10 bg-brand/20 text-brand rounded-full flex items-center justify-center"><UserIcon size={20} /></div>
              )}
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-bold truncate">{authUser.displayName}</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Synced to Cloud</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => {
                  setTempGoal(stats.dailyGoal.toString());
                  setIsEditingGoal(!isEditingGoal);
                }} 
                className="w-full py-2 bg-slate-200 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
              >
                EDIT DAILY GOAL
              </button>
              {isEditingGoal && (
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={tempGoal}
                    onChange={(e) => setTempGoal(e.target.value)}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1 text-xs focus:outline-none"
                  />
                  <button onClick={() => updateGoal(parseInt(tempGoal))} className="bg-brand text-white px-3 py-1 rounded-xl text-xs font-bold">SAVE</button>
                </div>
              )}
              <button onClick={handleShare} className="w-full py-2 bg-slate-200 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                SHARE PROGRESS
              </button>
              <button onClick={logout} className="w-full py-2 bg-slate-200 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                <LogOut size={14} /> LOGOUT
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-400"><UserIcon size={20} /></div>
              <div className="flex flex-col">
                <span className="text-sm font-bold">Guest User</span>
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Local storage only</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => {
                  setTempGoal(stats.dailyGoal.toString());
                  setIsEditingGoal(!isEditingGoal);
                }} 
                className="w-full py-2 bg-slate-200 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
              >
                EDIT DAILY GOAL
              </button>
              {isEditingGoal && (
                <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={tempGoal}
                    onChange={(e) => setTempGoal(e.target.value)}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3 py-1 text-xs focus:outline-none"
                  />
                  <button onClick={() => updateGoal(parseInt(tempGoal))} className="bg-brand text-white px-3 py-1 rounded-xl text-xs font-bold">SAVE</button>
                </div>
              )}
               <button onClick={handleShare} className="w-full py-2 bg-slate-200 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
                SHARE PROGRESS
              </button>
              <button onClick={loginWithGoogle} className="w-full py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2">
                <LogIn size={14} /> LOGIN WITH GOOGLE
              </button>
            </div>
          </>
        )}
      </div>

      {/* Progress */}
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Daily Progress</span>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-light">{stats.consumed.toLocaleString()}</span>
            <span className="text-slate-400 text-sm">/ {stats.dailyGoal} kcal</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${dailyProgress}%` }}
              className="bg-brand h-full"
            ></motion.div>
          </div>
        </div>

        {/* Macros */}
        <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-100">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Protein</span>
            <span className="font-medium">{stats.history.reduce((a, b) => a + b.protein, 0).toFixed(0)}g</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Carbs</span>
            <span className="font-medium">{stats.history.reduce((a, b) => a + b.carbs, 0).toFixed(0)}g</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase">Fats</span>
            <span className="font-medium">{stats.history.reduce((a, b) => a + b.fats, 0).toFixed(0)}g</span>
          </div>
        </div>
      </div>

      {/* Quick Add / History */}
      <div className="mt-auto flex flex-col gap-4 overflow-hidden">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Today's Log</span>
        <div className="flex flex-col gap-2 overflow-y-auto max-h-48 pr-1 custom-scrollbar">
          {stats.history.length === 0 ? (
            <p className="text-sm text-slate-400 italic">Nothing logged yet.</p>
          ) : (
            stats.history.map(item => (
              <div key={item.id} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center group">
                <span className="text-sm truncate mr-2">{item.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium text-slate-600">+{item.calories}</span>
                  <button onClick={() => deleteFood(item.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input 
            type="text" 
            value={customFoodName}
            onChange={(e) => setCustomFoodName(e.target.value)}
            placeholder="Quick entry..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCustom()}
          />
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleAddCustom} disabled={isAddingCustom} className="btn-secondary">
               {isAddingCustom ? <Loader2 className="animate-spin size-4" /> : <Plus size={16} />}
               Log
            </button>
            <button onClick={() => setIsScannerOpen(true)} className="btn-ghost">
               <QrCode size={16} />
               Scan
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (!authReady) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <Loader2 className="animate-spin text-brand" size={48} />
        <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Initializing BulkTrack...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 lg:flex lg:h-screen lg:overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-80 bg-slate-100 border-r border-slate-200 p-8 flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header / Nav */}
      <div className="lg:hidden p-6 bg-slate-100 border-b border-slate-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
            <span className="text-lg font-bold tracking-tight uppercase">BulkTrack</span>
          </div>
             <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
        <button 
          onClick={() => setActiveTab('track')} 
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'track' ? 'bg-brand text-white shadow-sm' : 'text-slate-400'}`}>TRACK</button>
        <button 
          onClick={() => setActiveTab('find')} 
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'find' ? 'bg-brand text-white shadow-sm' : 'text-slate-400'}`}>FIND</button>
        <button 
          onClick={() => setActiveTab('recipes')} 
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'recipes' ? 'bg-brand text-white shadow-sm' : 'text-slate-400'}`}>RECIPES</button>
        <button 
          onClick={() => setActiveTab('profile')} 
          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeTab === 'profile' ? 'bg-brand text-white shadow-sm' : 'text-slate-400'}`}>PROFILE</button>
             </div>
        </div>

        {activeTab === 'track' && (
           <div className="py-2">
              <SidebarContent />
           </div>
        )}
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-10 max-w-2xl"
            >
              <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-light text-slate-900 tracking-tight">Your Profile</h1>
                <p className="text-slate-500">Manage your goals and account settings.</p>
              </div>

              <div className="minimal-card flex flex-col gap-8 p-8">
                <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
                  {authUser?.photoURL ? (
                    <img src={authUser.photoURL} alt="Avatar" className="w-16 h-16 rounded-full border-4 border-brand/10" />
                  ) : (
                    <div className="w-16 h-16 bg-brand/10 text-brand rounded-full flex items-center justify-center"><UserIcon size={32} /></div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-xl font-bold">{authUser?.displayName || 'Guest User'}</span>
                    <span className="text-sm text-slate-400">{authUser?.email || 'Not signed in'}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                       <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Daily Calorie Goal</span>
                       <span className="text-2xl font-light">{stats.dailyGoal} kcal</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setIsEditingPersonal(true)}
                        className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold shadow-lg shadow-brand/20 hover:scale-105 transition-all"
                      >
                        CALCULATE
                      </button>
                      <button 
                        onClick={() => {
                          setTempGoal(stats.dailyGoal.toString());
                          setIsEditingGoal(!isEditingGoal);
                        }}
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all"
                      >
                        {isEditingGoal ? 'CANCEL' : 'MANUAL'}
                      </button>
                    </div>
                  </div>

                  {isEditingGoal && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-slate-50 rounded-2xl flex gap-3"
                    >
                      <input 
                        type="number" 
                        value={tempGoal}
                        onChange={(e) => setTempGoal(e.target.value)}
                        className="flex-1 bg-slate-200 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none"
                      />
                      <button onClick={() => updateGoal(parseInt(tempGoal))} className="bg-brand text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-brand/20">SAVE</button>
                    </motion.div>
                  )}
                </div>

                <div className="pt-6 border-t border-slate-100 space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Account Actions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleShare} className="btn-secondary w-full">
                      <Share2 size={16} /> Share Stats
                    </button>
                    {authUser ? (
                      <button onClick={logout} className="btn-ghost w-full">
                         <LogOut size={16} /> Logout
                      </button>
                    ) : (
                      <button onClick={loginWithGoogle} className="btn-primary w-full shadow-lg shadow-slate-900/10">
                         <LogIn size={16} /> Login
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-6">
                <div className="minimal-card p-6 flex flex-col items-center text-center gap-2">
                  <Flame className="text-orange-500" size={24} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logged Days</span>
                  <span className="text-xl font-bold">12</span>
                </div>
                <div className="minimal-card p-6 flex flex-col items-center text-center gap-2">
                  <Zap className="text-blue-500" size={24} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg Calories</span>
                  <span className="text-xl font-bold">3,120</span>
                </div>
                <div className="minimal-card p-6 flex flex-col items-center text-center gap-2">
                  <TrendingUp className="text-green-500" size={24} />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Streak</span>
                  <span className="text-xl font-bold">5</span>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'recipes' && (
            <motion.div 
              key="recipes"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-10"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="flex flex-col gap-1">
                  <h1 className="text-4xl font-light text-slate-900 tracking-tight">AI Recipes</h1>
                  <p className="text-slate-500">Custom meals generated to help you hit your {stats.dailyGoal} kcal goal.</p>
                </div>
                <button 
                  onClick={handleGenerateRecipe}
                  disabled={isGeneratingRecipe}
                  className="btn-primary bg-brand shadow-lg shadow-brand/20 px-8 py-4 text-base"
                >
                  {isGeneratingRecipe ? (
                    <><Loader2 className="animate-spin" size={20} /> CRAFTING RECIPE...</>
                  ) : (
                    <><Zap size={20} /> GENERATE MEAL</>
                  )}
                </button>
              </div>

              <div className="max-w-4xl">
                {!generatedRecipe && !isGeneratingRecipe && (
                  <div className="py-20 flex flex-col items-center text-center gap-4 border-2 border-dashed border-slate-200 rounded-[40px]">
                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center">
                      <Book className="text-slate-300" size={40} />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900">Hungry for more?</h2>
                      <p className="text-slate-500 max-w-sm mx-auto mt-1">Tap generate and our AI will dream up a high-calorie masterpiece tailored to your remaining {Math.max(0, stats.dailyGoal - stats.consumed)} calories.</p>
                    </div>
                  </div>
                )}

                {isGeneratingRecipe && (
                   <div className="py-20 flex flex-col items-center text-center gap-6">
                      <div className="relative">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          className="w-32 h-32 border-4 border-brand/10 border-t-brand rounded-full"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                           <Coffee className="text-brand animate-pulse" size={40} />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <h2 className="text-2xl font-light text-slate-900">Mixing ingredients...</h2>
                        <p className="text-slate-400 text-sm tracking-widest uppercase font-bold">Chef Gemini is at work</p>
                      </div>
                   </div>
                )}

                {generatedRecipe && (
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-100 border border-slate-200 rounded-[40px] overflow-hidden shadow-2xl shadow-slate-200/50 mb-12"
                  >
                    <div className="relative h-[400px] overflow-hidden">
                      <img 
                        src={generatedRecipe.imageUrl} 
                        alt={generatedRecipe.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
                      <div className="absolute inset-0 p-12 flex flex-col justify-end text-white">
                         <div className="space-y-4">
                           <div className="flex justify-between items-start">
                             <span className="px-4 py-1.5 bg-brand rounded-full text-xs font-bold tracking-widest uppercase text-white">LATEST MASTERPIECE</span>
                             <button onClick={() => handleShareRecipe(generatedRecipe)} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all backdrop-blur-md">
                                <Share2 size={20} />
                             </button>
                           </div>
                           <h2 className="text-5xl font-light tracking-tight">{generatedRecipe.name}</h2>
                           <p className="text-white/80 text-lg leading-relaxed max-w-2xl line-clamp-2">{generatedRecipe.description}</p>
                           
                           <div className="flex gap-8 pt-4">
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white/60 tracking-widest uppercase">Calories</span>
                                <span className="text-3xl font-light">{generatedRecipe.calories}</span>
                              </div>
                              <div className="flex flex-col text-white/40"> | </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white/60 tracking-widest uppercase">Protein</span>
                                <span className="text-3xl font-light">{generatedRecipe.protein}g</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white/60 tracking-widest uppercase">Carbs</span>
                                <span className="text-3xl font-light">{generatedRecipe.carbs}g</span>
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-white/60 tracking-widest uppercase">Fats</span>
                                <span className="text-3xl font-light">{generatedRecipe.fats}g</span>
                              </div>
                           </div>
                         </div>
                      </div>
                    </div>
                    
                    <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-12">
                      <div className="space-y-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Ingredients</h3>
                        <ul className="space-y-4">
                          {generatedRecipe.ingredients.map((ing, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <div className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                                <div className="w-1.5 h-1.5 bg-brand rounded-full" />
                              </div>
                              <span className="text-slate-700 leading-tight">{ing}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-6">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Instructions</h3>
                        <ol className="space-y-6">
                          {generatedRecipe.instructions.map((ins, i) => (
                            <li key={i} className="flex gap-4">
                              <span className="text-3xl font-light text-slate-200 leading-none">{i + 1}</span>
                              <span className="text-slate-700 leading-relaxed">{ins}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </motion.div>
                )}

                {stats.recipes && stats.recipes.length > 0 && (
                  <div className="space-y-8">
                    <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Saved Masterpieces</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {stats.recipes.filter(r => r.id !== generatedRecipe?.id).map((recipe) => (
                        <motion.div 
                          key={recipe.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="bg-white border border-slate-200 rounded-[32px] overflow-hidden group cursor-pointer"
                          onClick={() => setGeneratedRecipe(recipe)}
                        >
                          <div className="aspect-video relative overflow-hidden">
                            <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500" />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-all" />
                          </div>
                          <div className="p-6">
                            <h3 className="font-bold text-lg text-slate-900 group-hover:text-brand transition-colors">{recipe.name}</h3>
                            <div className="flex gap-4 mt-2 text-xs font-bold text-slate-400">
                              <span>{recipe.calories} KCAL</span>
                              <span>{recipe.protein}G P</span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {(activeTab === 'track' || activeTab === 'find') && (
            <motion.div
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col h-full"
            >
              {activeTab === 'track' && (
                <div className="flex flex-col gap-10 mb-10">
                  <h2 className="text-4xl font-light tracking-tight text-slate-900">Your Progress</h2>
                  <IntakeChart history={stats.history} />
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div className="flex flex-col gap-1">
                  <h1 className="text-4xl font-light tracking-tight text-slate-900">Find Fuel</h1>
                  <p className="text-slate-500">Discover nutrient-dense foods to hit your targets.</p>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <SearchFilters 
                    filters={macroFilters} 
                    onChange={setMacroFilters} 
                    onClear={() => setMacroFilters({})} 
                  />
                  <form onSubmit={handleSearch} className="relative w-full md:w-auto">
                    <input 
                      type="text" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search food by goal..." 
                      className="w-full md:w-80 pl-10 pr-4 py-3 bg-slate-100/50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all font-medium"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 pointer-events-none" size={16} />
                  </form>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {suggestions.map((food, idx) => (
                    <motion.div 
                      key={food.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="minimal-card flex flex-col gap-4 group cursor-pointer"
                    >
                      <div className="w-full aspect-video bg-slate-100 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-[1.02] transition-transform">
                        {food.category === 'Meal' ? '🥩' : food.category === 'Shake' ? '🥤' : food.category === 'Snack' ? '🥜' : '🥦'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-900">{food.name}</h3>
                        <p className="text-sm text-slate-500 mt-1 line-clamp-2">{food.description}</p>
                      </div>
                      <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-50">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Density</span>
                          <span className="font-bold text-brand">{food.caloriesPer100g} <span className="text-[10px] text-slate-500 font-medium">kcal/100g</span></span>
                        </div>
                        <button 
                          onClick={() => addFood({
                            name: food.name,
                            calories: food.caloriesPer100g,
                            protein: food.protein,
                            carbs: food.carbs,
                            fats: food.fats
                          })}
                          className="text-brand font-bold flex items-center gap-1 group-hover:translate-x-1 transition-transform"
                        >
                          + Add
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {suggestions.length === 0 && !isLoadingSuggestions && (
                  <div className="col-span-full py-20 flex flex-col items-center text-center gap-4 border-2 border-dashed border-slate-200 rounded-3xl">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center">
                        <Zap className="text-slate-300" size={32} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-400">Search for healthy weight gain</p>
                        <p className="text-sm text-slate-400 max-w-xs mx-auto mt-1">Try "pre-workout meals" or "high protein snacks" to see suggestions.</p>
                      </div>
                  </div>
                )}

                {isLoadingSuggestions && (
                  <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
                    <Loader2 className="animate-spin text-brand" size={40} />
                    <p className="text-sm font-medium text-slate-400 tracking-widest uppercase">Consulting AI Nutritionist...</p>
                  </div>
                )}
              </div>

              {/* Tip Box */}
              <div className="mt-10 bg-orange-100 rounded-3xl p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-col gap-1 text-center md:text-left">
                  <h2 className="text-xl font-bold text-orange-900">Struggling to hit your goal?</h2>
                  <p className="text-orange-800/70 text-sm">Try adding 20g of Macadamia nuts or Olive Oil to your meals for an easy density boost.</p>
                </div>
                <div className="flex items-center gap-3">
                  <Info className="text-orange-500 hidden md:block" size={24} />
                  <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">Nutrient Dense Fuel</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #334155; }
      `}</style>

      <AnimatePresence>
        {isScannerOpen && (
          <Scanner 
            onScan={handleScan} 
            onClose={() => setIsScannerOpen(false)} 
          />
        )}
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-900/60 backdrop-blur-md flex flex-col items-center justify-center p-6"
          >
            <div className="bg-slate-800 p-10 rounded-[40px] border border-slate-700 flex flex-col items-center gap-6 shadow-2xl">
              <Loader2 className="text-brand animate-spin" size={48} />
              <div className="text-center">
                <p className="text-white font-bold text-lg tracking-tight">ANALYZING CODE</p>
                <p className="text-slate-400 text-xs mt-1 tracking-widest uppercase font-bold">Chef Gemini is identifying your food...</p>
              </div>
            </div>
          </motion.div>
        )}
        {isEditingPersonal && (
          <PersonalDetailsForm 
            initialData={stats.personalDetails}
            onSave={handleSavePersonal}
            onClose={() => setIsEditingPersonal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

