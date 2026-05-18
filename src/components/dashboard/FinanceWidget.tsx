import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  TrendingUp, DollarSign, Plus, Trash2, 
  Wallet, ArrowUpRight, ArrowDownRight, Activity 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAppStore } from '../../store/useAppStore';
import { useUpdateProfile } from '../../hooks/useProfileQuery';
import { useSoundFX } from '../../hooks/useSoundFX';

interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  date: string;
  category: string;
}

export default function FinanceWidget() {
  const { play } = useSoundFX();
  const { userSettings } = useAppStore();
  const { mutate: updateProfile } = useUpdateProfile();
  
  // Memoize transactions and budgetLimit directly from database-synced profile
  const transactions = useMemo<Transaction[]>(() => {
    try {
      const parsed = JSON.parse(userSettings.financeTransactions || '[]');
      if (parsed.length > 0) return parsed;
    } catch (e) { /* ignore */ }
    
    // Beautiful default transactions
    return [
      { id: '1', title: 'Consulting Income', amount: 1250, type: 'income', date: '2026-05-18', category: 'Salary' },
      { id: '2', title: 'Tech Hardware Upgrade', amount: 350, type: 'expense', date: '2026-05-17', category: 'Work' },
      { id: '3', title: 'S&P 500 Dividend', amount: 80, type: 'income', date: '2026-05-16', category: 'Investment' },
      { id: '4', title: 'Premium Subscription', amount: 20, type: 'expense', date: '2026-05-15', category: 'Software' },
    ];
  }, [userSettings.financeTransactions]);

  const budgetLimit = userSettings.financeBudgetLimit ?? 1000;

  // Modal / Form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('General');

  // Derived financials
  const { totalIncome, totalExpense, netBalance } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    transactions.forEach(t => {
      if (t.type === 'income') inc += t.amount;
      else exp += t.amount;
    });
    return {
      totalIncome: inc,
      totalExpense: exp,
      netBalance: inc - exp
    };
  }, [transactions]);

  const budgetProgress = useMemo(() => {
    if (budgetLimit <= 0) return 0;
    return Math.min(100, Math.round((totalExpense / budgetLimit) * 100));
  }, [totalExpense, budgetLimit]);

  // Log Transaction to Database
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a description');
      return;
    }
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    const newTx: Transaction = {
      id: Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      amount: parsedAmount,
      type,
      category,
      date: new Date().toISOString().split('T')[0]
    };

    const updated = [newTx, ...transactions];
    updateProfile({
      settings: {
        ...userSettings,
        financeTransactions: JSON.stringify(updated)
      }
    });

    setTitle('');
    setAmount('');
    setShowAddForm(false);
    play('success');
    toast.success(type === 'income' ? 'Income Logged! 💰' : 'Expense Logged! 💸');
  };

  // Delete Transaction from Database
  const handleDeleteTransaction = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = transactions.filter(t => t.id !== id);
    updateProfile({
      settings: {
        ...userSettings,
        financeTransactions: JSON.stringify(updated)
      }
    });
    play('click');
    toast.success('Transaction removed');
  };

  return (
    <div className="glass-card p-6 relative overflow-hidden group h-full flex flex-col justify-between">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-600/[0.03] via-transparent to-cyan-600/[0.02] pointer-events-none" />
      
      {/* Widget Header */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
              <Wallet size={20} />
            </div>
            <div>
              <h3 className="font-bold text-white text-base uppercase tracking-wider">Finance Console</h3>
              <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest mt-0.5">Asset flow &amp; budgets</p>
            </div>
          </div>
          <button 
            onClick={() => { play('click'); setShowAddForm(prev => !prev); }}
            className="btn-glow px-3 py-1.5 flex items-center gap-1 text-[10px] font-black uppercase tracking-wider"
          >
            <Plus size={12} /> Log Cash
          </button>
        </div>

        {/* Balance Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5 relative overflow-hidden">
            <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Net Cash</div>
            <div className={`text-lg font-black tracking-tight mt-1 truncate ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${netBalance.toLocaleString()}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5">
            <div className="text-[9px] font-bold text-emerald-400/40 uppercase tracking-widest flex items-center gap-1">
              <ArrowUpRight size={10} /> Inflow
            </div>
            <div className="text-lg font-black text-emerald-400 tracking-tight mt-1 truncate">
              ${totalIncome.toLocaleString()}
            </div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white/[0.01] border border-white/5">
            <div className="text-[9px] font-bold text-rose-400/40 uppercase tracking-widest flex items-center gap-1">
              <ArrowDownRight size={10} /> Outflow
            </div>
            <div className="text-lg font-black text-rose-400 tracking-tight mt-1 truncate">
              ${totalExpense.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Budget Limit Tracker */}
        <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 mb-5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Active Spend Budget</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white">${totalExpense}</span>
              <span className="text-[10px] text-white/20">/</span>
              <input 
                type="number"
                value={budgetLimit}
                onChange={e => {
                  const val = Math.max(0, Number(e.target.value));
                  updateProfile({
                    settings: {
                      ...userSettings,
                      financeBudgetLimit: val
                    }
                  });
                }}
                className="w-16 bg-transparent text-xs font-bold text-white/40 hover:text-white/80 focus:text-white focus:outline-none text-right border-b border-transparent focus:border-white/20 pb-0.5"
                title="Click to adjust limit"
              />
            </div>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${budgetProgress}%` }}
              className={`h-full rounded-full ${budgetProgress > 90 ? 'bg-gradient-to-r from-rose-500 to-red-600' : 'bg-gradient-to-r from-violet-500 to-cyan-500'}`}
              transition={{ duration: 0.6 }}
            />
          </div>
          <div className="flex justify-between text-[8px] font-black uppercase text-white/20">
            <span>{budgetProgress}% Spent</span>
            <span>${Math.max(0, budgetLimit - totalExpense)} Available</span>
          </div>
        </div>
      </div>

      {/* Transaction & Log Forms (Persistent Scrolling) */}
      <div className="relative flex-1 min-h-[160px] overflow-hidden flex flex-col justify-end">
        <AnimatePresence mode="wait">
          {showAddForm ? (
            <motion.form 
              key="add-form"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              onSubmit={handleAddTransaction}
              className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3 relative z-10"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">New Cash Record</span>
                <button type="button" onClick={() => setShowAddForm(false)} className="text-[9px] font-black uppercase text-white/30 hover:text-white">Cancel</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input 
                  type="text" 
                  placeholder="Record title..." 
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  className="input-glass px-2.5 py-1.5 text-xs col-span-2 font-medium"
                  required
                />
                <input 
                  type="number" 
                  placeholder="Amount..." 
                  value={amount} 
                  onChange={e => setAmount(e.target.value)}
                  className="input-glass px-2.5 py-1.5 text-xs font-semibold"
                  required
                />
                <select 
                  value={type} 
                  onChange={e => setType(e.target.value as any)}
                  className="input-glass px-2 py-1.5 text-xs font-semibold"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  className="input-glass px-2 py-1.5 text-xs font-semibold col-span-2"
                >
                  <option value="General">General</option>
                  <option value="Salary">Salary</option>
                  <option value="Investment">Investment</option>
                  <option value="Groceries">Groceries</option>
                  <option value="Work">Work Place</option>
                  <option value="Software">Software</option>
                </select>
              </div>
              <button 
                type="submit" 
                className="w-full btn-glow py-2 text-xs font-black uppercase tracking-wider"
              >
                Log Operational Cash
              </button>
            </motion.form>
          ) : (
            <motion.div 
              key="transactions-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar flex-1"
            >
              <div className="text-[10px] font-bold text-white/20 uppercase tracking-widest px-1 mb-2 flex items-center gap-1.5">
                <Activity size={10} /> Ledger Operations (Synced)
              </div>
              {transactions.length === 0 ? (
                <div className="text-center py-8 opacity-20 border border-dashed border-white/5 rounded-xl">
                  <span className="text-[10px] font-bold italic">Ledger is empty. Log assets!</span>
                </div>
              ) : (
                transactions.slice(0, 4).map(tx => (
                  <div key={tx.id} className="p-3 rounded-xl bg-white/[0.01] hover:bg-white/[0.03] border border-white/5 flex items-center justify-between group/item transition-all">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{tx.title}</div>
                      <div className="text-[8px] font-black text-white/20 uppercase tracking-tighter mt-0.5">{tx.category} • {tx.date}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black italic ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.type === 'income' ? '+' : '-'}${tx.amount}
                      </span>
                      <button 
                        onClick={(e) => handleDeleteTransaction(tx.id, e)}
                        className="opacity-0 group-hover/item:opacity-100 p-1 rounded hover:bg-red-500/10 text-white/20 hover:text-red-400 transition-all"
                        title="Delete record"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
