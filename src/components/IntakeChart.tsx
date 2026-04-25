import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { FoodItem } from '../types';

interface IntakeChartProps {
  history: FoodItem[];
}

export const IntakeChart = ({ history }: IntakeChartProps) => {
  const chartData = useMemo(() => {
    const days = 7;
    const data = [];
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString(undefined, { weekday: 'short' });
      const dayStart = new Date(d.setHours(0, 0, 0, 0)).getTime();
      const dayEnd = new Date(d.setHours(23, 59, 59, 999)).getTime();
      
      const dayLogs = history.filter(h => h.timestamp >= dayStart && h.timestamp <= dayEnd);
      
      data.push({
        name: dateStr,
        calories: dayLogs.reduce((acc, h) => acc + h.calories, 0),
        protein: dayLogs.reduce((acc, h) => acc + (h.protein || 0), 0),
        carbs: dayLogs.reduce((acc, h) => acc + (h.carbs || 0), 0),
        fats: dayLogs.reduce((acc, h) => acc + (h.fats || 0), 0),
      });
    }
    return data;
  }, [history]);

  return (
    <div className="w-full h-80 min-h-[320px] bg-slate-100/50 border border-slate-200/50 rounded-3xl p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">7-Day Activity</h3>
      </div>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
          />
          <Tooltip 
            contentStyle={{ 
              borderRadius: '16px', 
              border: 'none', 
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)', 
              padding: '12px',
              backgroundColor: '#0f172a',
              color: '#f8fafc'
            }}
            cursor={{ fill: '#1e293b' }}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle"
            wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', color: '#94a3b8' }}
          />
          <Bar dataKey="calories" name="Calories" fill="#f97316" radius={[4, 4, 0, 0]} barSize={24} />
          <Bar dataKey="protein" name="Protein (g)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={8} />
          <Bar dataKey="carbs" name="Carbs (g)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={8} />
          <Bar dataKey="fats" name="Fats (g)" fill="#eab308" radius={[4, 4, 0, 0]} barSize={8} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
