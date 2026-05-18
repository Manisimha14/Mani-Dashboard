import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSoundFX } from '../hooks/useSoundFX';
import { Edit3, CheckCircle, Plus, Trash2, StickyNote, ListTodo } from 'lucide-react';

interface QuickTodo {
  id: string;
  text: string;
  completed: boolean;
}

export default function QuickScratchpad() {
  const { play } = useSoundFX();
  const [activeTab, setActiveTab] = useState<'notes' | 'todos'>('notes');
  
  // Note State
  const [noteText, setNoteText] = useState(() => {
    return localStorage.getItem('aura_scratchpad_note') || '';
  });

  // Todo State
  const [todos, setTodos] = useState<QuickTodo[]>(() => {
    const saved = localStorage.getItem('aura_scratchpad_todos');
    return saved ? JSON.parse(saved) : [
      { id: '1', text: 'Plan tomorrow\'s deep work chapters', completed: false },
      { id: '2', text: 'Solve 2 LeetCode medium problems', completed: false },
      { id: '3', text: 'Hydrate & complete evening stretches', completed: true },
    ];
  });
  const [newTodo, setNewTodo] = useState('');

  // Persist Note
  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setNoteText(text);
    localStorage.setItem('aura_scratchpad_note', text);
  };

  // Add Todo Item
  const addTodoItem = () => {
    if (!newTodo.trim()) return;
    play('click');
    const updated = [
      ...todos,
      { id: Date.now().toString(), text: newTodo.trim(), completed: false }
    ];
    setTodos(updated);
    localStorage.setItem('aura_scratchpad_todos', JSON.stringify(updated));
    setNewTodo('');
  };

  // Toggle Todo Item Completed State
  const toggleTodoItem = (id: string, currentlyCompleted: boolean) => {
    if (!currentlyCompleted) {
      play('success');
    } else {
      play('click');
    }
    const updated = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    setTodos(updated);
    localStorage.setItem('aura_scratchpad_todos', JSON.stringify(updated));
  };

  // Delete Todo Item
  const deleteTodoItem = (id: string) => {
    play('click');
    const updated = todos.filter(todo => todo.id !== id);
    setTodos(updated);
    localStorage.setItem('aura_scratchpad_todos', JSON.stringify(updated));
  };

  return (
    <div className="w-full glass-card p-6 border border-white/10 rounded-3xl bg-black/40 backdrop-blur-xl relative overflow-hidden shadow-[0_15px_40px_rgba(0,0,0,0.6)]">
      {/* Header and Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-4">
        <div>
          <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.25em]">Dashboard Console</h3>
          <p className="text-[10px] text-white/20 uppercase tracking-widest mt-1">Quick Scratchpad &amp; Sticky Tasks</p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 p-1 rounded-2xl self-start sm:self-auto">
          <button
            onClick={() => { play('click'); setActiveTab('notes'); }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'notes'
                ? 'bg-violet-500/20 border border-violet-500/30 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                : 'text-white/40 border border-transparent hover:text-white'
            }`}
          >
            <StickyNote size={14} />
            <span>Scratchpad</span>
          </button>
          <button
            onClick={() => { play('click'); setActiveTab('todos'); }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'todos'
                ? 'bg-violet-500/20 border border-violet-500/30 text-violet-400 shadow-[0_0_15px_rgba(139,92,246,0.15)]'
                : 'text-white/40 border border-transparent hover:text-white'
            }`}
          >
            <ListTodo size={14} />
            <span>Sticky Tasks</span>
          </button>
        </div>
      </div>

      {/* Main Panel Content */}
      <div className="relative min-h-[180px]">
        <AnimatePresence mode="wait">
          {activeTab === 'notes' ? (
            <motion.div
              key="notes-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col h-full gap-2"
            >
              <textarea
                value={noteText}
                onChange={handleNoteChange}
                placeholder="Type anything here... Your notes auto-save locally so they are always waiting for you when you return."
                className="w-full min-h-[130px] p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.04] transition-all resize-none leading-relaxed"
              />
              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-white/20 px-1">
                <span>Auto-saved to Local Storage</span>
                <span>{noteText.length} characters</span>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="todos-tab"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Input Form */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newTodo}
                  onChange={(e) => setNewTodo(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTodoItem()}
                  placeholder="Add a fast task..."
                  className="flex-1 px-4 py-2.5 rounded-2xl bg-white/[0.02] border border-white/5 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-violet-500/40 focus:bg-white/[0.04] transition-all"
                />
                <button
                  onClick={addTodoItem}
                  className="p-3.5 rounded-2xl bg-gradient-to-tr from-violet-500 to-fuchsia-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  <Plus size={16} strokeWidth={3} />
                </button>
              </div>

              {/* Todo List */}
              <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                {todos.length === 0 ? (
                  <div className="text-center py-6 text-white/20 text-xs uppercase font-bold tracking-widest">
                    All tasks completed! Enjoy the void.
                  </div>
                ) : (
                  todos.map((todo) => (
                    <motion.div
                      key={todo.id}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`p-3 rounded-2xl border flex items-center justify-between transition-all duration-300 ${
                        todo.completed
                          ? 'bg-emerald-500/5 border-emerald-500/10 text-white/30'
                          : 'bg-white/[0.02] border-white/5 text-white/80 hover:bg-white/[0.04]'
                      }`}
                    >
                      <button
                        onClick={() => toggleTodoItem(todo.id, todo.completed)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <CheckCircle
                          size={18}
                          className={`transition-colors ${
                            todo.completed ? 'text-emerald-500' : 'text-white/20 hover:text-white/40'
                          }`}
                        />
                        <span className={`text-xs font-bold leading-normal transition-all ${
                          todo.completed ? 'line-through decoration-emerald-500/40 decoration-2' : ''
                        }`}>
                          {todo.text}
                        </span>
                      </button>
                      
                      <button
                        onClick={() => deleteTodoItem(todo.id)}
                        className="p-1 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all ml-2"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
