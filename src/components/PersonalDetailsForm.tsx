import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Scale, Ruler, Calendar, Activity, Zap, TrendingUp } from 'lucide-react';
import { PersonalDetails } from '../types';

interface PersonalDetailsFormProps {
  initialData?: PersonalDetails;
  onSave: (details: PersonalDetails, calculatedGoal: number) => void;
  onClose: () => void;
}

export const PersonalDetailsForm: React.FC<PersonalDetailsFormProps> = ({ initialData, onSave, onClose }) => {
  const [formData, setFormData] = useState<PersonalDetails>(initialData || {
    weight: 75,
    height: 180,
    age: 25,
    gender: 'male',
    activityLevel: 'moderate',
    bulkIntensity: 'standard'
  });

  const calculateTDEE = (data: PersonalDetails) => {
    // Mifflin-St Jeor Equation
    let bmr = (10 * data.weight) + (6.25 * data.height) - (5 * data.age);
    if (data.gender === 'male') {
      bmr += 5;
    } else {
      bmr -= 161;
    }

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9
    };

    const maintenance = bmr * activityMultipliers[data.activityLevel];

    const surplusMap = {
      clean: 250,
      standard: 500,
      aggressive: 750
    };

    return Math.round(maintenance + surplusMap[data.bulkIntensity]);
  };

  const currentGoal = calculateTDEE(formData);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData, currentGoal);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-slate-100 border border-slate-200 rounded-[40px] w-full max-w-lg overflow-hidden shadow-2xl"
      >
        <div className="p-8 border-b border-slate-200 flex justify-between items-center bg-white">
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold tracking-tight">Personal Metrics</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Smart Calorie Calculator</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Scale size={10} /> Weight (kg)
              </label>
              <input 
                type="number" 
                value={formData.weight}
                onChange={(e) => setFormData({...formData, weight: parseFloat(e.target.value)})}
                className="w-full bg-slate-200/50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Ruler size={10} /> Height (cm)
              </label>
              <input 
                type="number" 
                value={formData.height}
                onChange={(e) => setFormData({...formData, height: parseFloat(e.target.value)})}
                className="w-full bg-slate-200/50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <Calendar size={10} /> Age
              </label>
              <input 
                type="number" 
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
                className="w-full bg-slate-200/50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gender</label>
              <div className="flex bg-slate-200/50 rounded-xl p-1 gap-1">
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, gender: 'male'})}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.gender === 'male' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >MALE</button>
                <button 
                  type="button"
                  onClick={() => setFormData({...formData, gender: 'female'})}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${formData.gender === 'female' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                >FEMALE</button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Activity size={10} /> Activity Level
            </label>
            <select 
              value={formData.activityLevel}
              onChange={(e) => setFormData({...formData, activityLevel: e.target.value as any})}
              className="w-full bg-slate-200/50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all appearance-none"
            >
              <option value="sedentary">Sedentary (Office job, no exercise)</option>
              <option value="light">Light (Exercise 1-3 days/week)</option>
              <option value="moderate">Moderate (Exercise 3-5 days/week)</option>
              <option value="active">Active (Exercise 6-7 days/week)</option>
              <option value="very_active">Very Active (Hard exercise, physical job)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Zap size={10} /> Bulk Intensity
            </label>
            <div className="grid grid-cols-3 bg-slate-200/50 rounded-xl p-1 gap-1">
              {(['clean', 'standard', 'aggressive'] as const).map(intensity => (
                <button 
                  key={intensity}
                  type="button"
                  onClick={() => setFormData({...formData, bulkIntensity: intensity})}
                  className={`py-1.5 rounded-lg text-[10px] font-bold transition-all uppercase ${formData.bulkIntensity === intensity ? 'bg-brand text-white shadow-sm' : 'text-slate-400'}`}
                >{intensity}</button>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200">
            <div className="bg-brand/5 p-6 rounded-3xl flex justify-between items-center mb-6 border border-brand/10">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-brand uppercase tracking-widest">Recommended Target</span>
                <span className="text-3xl font-light text-slate-900">{currentGoal} <span className="text-sm font-medium text-slate-400">kcal/day</span></span>
              </div>
              <div className="w-12 h-12 bg-brand rounded-2xl flex items-center justify-center text-white shadow-lg shadow-brand/20">
                <TrendingUp size={24} />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-xl"
            >
              APPLY SETTINGS
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
