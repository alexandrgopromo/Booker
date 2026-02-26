import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, LogIn, LogOut, Trash2, RefreshCw, User, Calendar, Clock } from 'lucide-react';

interface Slot {
  id: number;
  date: string;
  time: string;
  group_name: string;
  user_name: string | null;
}

export default function Admin() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('admin_token'));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) fetchSlots();
  }, [token]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      });
      if (!res.ok) throw new Error('Invalid credentials');
      const data = await res.json();
      setToken(data.token);
      localStorage.setItem('admin_token', data.token);
    } catch (err) {
      setError('Неверный логин или пароль');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    localStorage.removeItem('admin_token');
  };

  const fetchSlots = async () => {
    try {
      const res = await fetch('/api/admin/slots', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.status === 401) {
        handleLogout();
        return;
      }
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCancel = async (slotId: number) => {
    if (!confirm('Вы уверены, что хотите отменить эту запись?')) return;
    try {
      const res = await fetch('/api/admin/cancel', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ slotId }),
      });
      if (res.ok) fetchSlots();
    } catch (err) {
      alert('Ошибка отмены');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('ru-RU', { 
      day: 'numeric', month: 'short'
    }).format(new Date(dateStr));
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm"
        >
          <div className="flex justify-center mb-6">
            <div className="bg-stone-100 p-3 rounded-full">
              <Lock className="w-6 h-6 text-stone-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-center mb-6 text-stone-800">Вход для администратора</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">{error}</div>}
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Логин</label>
              <input 
                type="text" 
                value={login}
                onChange={e => setLogin(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-800 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase mb-1">Пароль</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-stone-800 outline-none"
              />
            </div>
            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-stone-900 text-white py-2 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // Group slots for display
  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {} as Record<string, Slot[]>);

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Панель администратора
          </h1>
          <div className="flex items-center gap-4">
            <button onClick={fetchSlots} className="p-2 hover:bg-stone-100 rounded-full text-stone-600">
              <RefreshCw className="w-5 h-5" />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 font-medium">
              <LogOut className="w-4 h-4" />
              Выйти
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid gap-8">
          {Object.entries(groupedSlots).sort().map(([date, dateSlots]) => (
            <div key={date} className="bg-white rounded-xl shadow-sm border border-stone-200 overflow-hidden">
              <div className="bg-stone-50 px-6 py-3 border-b border-stone-200 font-medium text-stone-700 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(date)}
              </div>
              <div className="divide-y divide-stone-100">
                {dateSlots.map(slot => (
                  <div key={slot.id} className="px-6 py-4 flex items-center justify-between hover:bg-stone-50/50 transition-colors">
                    <div className="flex items-center gap-6">
                      <div className="w-20 font-mono text-stone-600 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 opacity-50" />
                        {slot.time}
                      </div>
                      <div className="w-24 text-xs font-medium text-stone-400 uppercase tracking-wide">
                        {slot.group_name}
                      </div>
                      <div className="flex items-center gap-2">
                        {slot.user_name ? (
                          <div className="flex items-center gap-2 text-stone-900 font-medium">
                            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                            {slot.user_name}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-stone-400">
                            <div className="w-2 h-2 rounded-full bg-stone-300"></div>
                            Свободно
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {slot.user_name && (
                      <button 
                        onClick={() => handleCancel(slot.id)}
                        className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                        title="Отменить запись"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
