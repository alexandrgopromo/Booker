import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, Calendar, CheckCircle, AlertCircle, Users, ArrowRightLeft, Search } from 'lucide-react';

interface Slot {
  id: number;
  date: string;
  time: string;
  group_name: string;
  is_booked: boolean | number; // API returns 0 or 1
}

interface MyBooking {
  id: number;
  date: string;
  time: string;
  group_name: string;
  user_name: string;
  secret_code: string;
}

export default function Schedule() {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [myBooking, setMyBooking] = useState<MyBooking | null>(null);
  
  // Form states
  const [userName, setUserName] = useState('');
  const [secretCode, setSecretCode] = useState('');
  const [searchCode, setSearchCode] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'manage'>('list');

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      const res = await fetch('/api/slots');
      const data = await res.json();
      setSlots(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlot) return;
    
    setIsSubmitting(true);
    setError(null);

    try {
      let res;
      if (myBooking) {
        // Move logic
        res = await fetch('/api/move', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            oldSlotId: myBooking.id, 
            newSlotId: selectedSlot.id, 
            secretCode: myBooking.secret_code 
          }),
        });
      } else {
        // New booking logic
        res = await fetch('/api/book', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            slotId: selectedSlot.id, 
            userName, 
            secretCode 
          }),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Operation failed');
      }

      await fetchSlots();
      setSelectedSlot(null);
      setUserName('');
      setSecretCode('');
      setMyBooking(null); // Reset managed booking after move
      setView('list');
      alert(myBooking ? 'Запись успешно перенесена!' : 'Вы успешно записаны!');
    } catch (err: any) {
      setError(err.message);
      fetchSlots();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFindBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/my-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretCode: searchCode }),
      });
      
      if (!res.ok) throw new Error('Запись не найдена. Проверьте код.');
      
      const booking = await res.json();
      setMyBooking(booking);
      setSearchCode('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('ru-RU', { 
      day: 'numeric', 
      month: 'long', 
      weekday: 'long' 
    }).format(date);
  };

  // Group slots by Date -> Group
  const groupedSlots = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = {};
    if (!acc[slot.date][slot.group_name]) acc[slot.date][slot.group_name] = [];
    acc[slot.date][slot.group_name].push(slot);
    return acc;
  }, {} as Record<string, Record<string, Slot[]>>);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stone-800"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-20">
      <header className="bg-white border-b border-stone-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-semibold tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-stone-600" />
              Запись на встречи
            </h1>
            <p className="text-stone-500 text-xs mt-0.5">Время московское (MSK)</p>
          </div>
          
          {view === 'list' && !myBooking && (
            <button 
              onClick={() => setView('manage')}
              className="text-sm font-medium text-stone-600 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-lg transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              Моя запись
            </button>
          )}
          
          {(view === 'manage' || myBooking) && (
            <button 
              onClick={() => {
                setView('list');
                setMyBooking(null);
                setError(null);
              }}
              className="text-sm font-medium text-stone-500 hover:text-stone-800"
            >
              Назад к расписанию
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Manage View: Find Booking */}
        {view === 'manage' && !myBooking && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto bg-white p-8 rounded-2xl shadow-sm border border-stone-200 text-center"
          >
            <h2 className="text-lg font-semibold mb-2">Найти мою запись</h2>
            <p className="text-stone-500 text-sm mb-6">Введите код доступа, который вы указали при записи, чтобы управлять своим временем.</p>
            
            <form onSubmit={handleFindBooking} className="space-y-4">
              <input
                type="text"
                value={searchCode}
                onChange={e => setSearchCode(e.target.value)}
                placeholder="Код доступа"
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:ring-2 focus:ring-stone-900 outline-none text-center text-lg tracking-widest"
              />
              {error && <p className="text-red-500 text-sm">{error}</p>}
              <button 
                type="submit"
                disabled={isSubmitting || !searchCode.trim()}
                className="w-full bg-stone-900 text-white py-3 rounded-xl font-medium hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Поиск...' : 'Найти запись'}
              </button>
            </form>
          </motion.div>
        )}

        {/* Manage View: Booking Found */}
        {myBooking && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6"
          >
            <div>
              <div className="flex items-center gap-2 text-emerald-800 font-semibold mb-1">
                <CheckCircle className="w-5 h-5" />
                Ваша текущая запись найдена
              </div>
              <p className="text-emerald-700">
                {formatDate(myBooking.date)} в <span className="font-mono font-bold">{myBooking.time}</span>
              </p>
              <p className="text-emerald-600/80 text-sm mt-1">{myBooking.user_name}</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setView('list')}
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-2"
              >
                <ArrowRightLeft className="w-4 h-4" />
                Перенести время
              </button>
            </div>
          </motion.div>
        )}

        {/* List View */}
        {(view === 'list' || myBooking) && (
          <div className="space-y-12">
            {myBooking && (
              <div className="text-center text-stone-500 text-sm animate-pulse">
                Выберите новый свободный слот для переноса записи
              </div>
            )}
            
            {Object.entries(groupedSlots).sort().map(([date, groups]) => (
              <section key={date} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px flex-1 bg-stone-200"></div>
                  <h2 className="text-lg font-medium uppercase tracking-wider text-stone-500">
                    {formatDate(date)}
                  </h2>
                  <div className="h-px flex-1 bg-stone-200"></div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  {Object.entries(groups).map(([groupName, groupSlots]) => (
                    <div key={groupName} className="bg-white rounded-xl p-6 shadow-sm border border-stone-100">
                      <div className="flex items-center gap-2 mb-4 text-stone-800 font-medium">
                        <Users className="w-4 h-4" />
                        {groupName}
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {groupSlots.map(slot => {
                          const isBooked = Boolean(slot.is_booked);
                          // Hide occupied slots completely in user view, OR show as disabled/occupied
                          // Prompt says: "User... allows... to simply select... from the given free ones"
                          // "User... does not have a general view of the occupied table"
                          // So we should probably hide them or make them very subtle/uninformative.
                          // I'll make them subtle "Occupied" blocks without names.
                          
                          return (
                            <button
                              key={slot.id}
                              onClick={() => !isBooked && setSelectedSlot(slot)}
                              disabled={isBooked}
                              className={`
                                relative p-3 rounded-lg text-sm font-medium transition-all duration-200 border
                                flex flex-col items-center justify-center gap-1
                                ${isBooked 
                                  ? 'bg-stone-50 border-stone-100 text-stone-300 cursor-default' 
                                  : 'bg-white border-stone-200 text-stone-700 hover:border-stone-400 hover:shadow-md active:scale-95'
                                }
                              `}
                            >
                              <span className="font-mono text-base flex items-center gap-1.5">
                                <Clock className={`w-3.5 h-3.5 ${isBooked ? 'opacity-20' : 'opacity-50'}`} />
                                {slot.time}
                              </span>
                              {isBooked ? (
                                <span className="text-[10px] uppercase tracking-wide truncate w-full text-center px-1">
                                  Занято
                                </span>
                              ) : (
                                <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-wide">
                                  Свободно
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Booking Modal */}
      <AnimatePresence>
        {selectedSlot && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSlot(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-stone-100 bg-stone-50/50">
                <h3 className="text-xl font-semibold text-stone-900">
                  {myBooking ? 'Перенос записи' : 'Новая запись'}
                </h3>
                <p className="text-stone-500 text-sm mt-1">
                  {formatDate(selectedSlot.date)} • {selectedSlot.time}
                </p>
              </div>
              
              <form onSubmit={handleBook} className="p-6 space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}

                {myBooking ? (
                  <div className="bg-stone-50 p-4 rounded-lg text-sm text-stone-600 mb-4">
                    <p>Вы переносите запись с:</p>
                    <p className="font-medium text-stone-900 mt-1">
                      {formatDate(myBooking.date)} • {myBooking.time}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label htmlFor="name" className="text-sm font-medium text-stone-700">
                        Ваше ФИО <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="name"
                        type="text"
                        required
                        value={userName}
                        onChange={e => setUserName(e.target.value)}
                        placeholder="Иванов Иван Иванович"
                        className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none transition-all"
                        autoFocus
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="code" className="text-sm font-medium text-stone-700">
                        Придумайте код доступа <span className="text-red-500">*</span>
                      </label>
                      <input
                        id="code"
                        type="text"
                        required
                        value={secretCode}
                        onChange={e => setSecretCode(e.target.value)}
                        placeholder="Например: 1234"
                        className="w-full px-4 py-2 rounded-lg border border-stone-300 focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none transition-all"
                      />
                      <p className="text-xs text-stone-500">
                        Этот код понадобится для переноса или отмены записи.
                      </p>
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSlot(null)}
                    className="flex-1 px-4 py-2 rounded-lg border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || (!myBooking && (!userName.trim() || !secretCode.trim()))}
                    className="flex-1 px-4 py-2 rounded-lg bg-stone-900 text-white font-medium hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        {myBooking ? 'Подтвердить перенос' : 'Записаться'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
