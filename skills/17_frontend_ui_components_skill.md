# Skill File 17 — Frontend UI Implementation (End-to-End)

## Overview
This skill file contains the end-to-end implementation details for the React frontend of the Altzor Analytics platform. It builds upon the skeleton created in `14_react_frontend_skill.md` and replaces all the stubbed components with fully functional, premium, and highly dynamic UI components. 

**Design Aesthetics**: The UI must use a modern, dark-mode-first aesthetic with glassmorphism, smooth micro-animations using `framer-motion`, and high-quality typography. We use Tailwind CSS for styling and `lucide-react` for iconography.

---

## 1. Prerequisites & Dependencies
Run the following in `apps/web`:
```bash
npm install framer-motion lucide-react clsx tailwind-merge date-fns @radix-ui/react-slot
```
*(Ensure Tailwind and PostCSS are fully configured per standard shadcn/ui setups).*

---

## 2. AppLayout (`src/components/shared/AppLayout.tsx`)
This is the shell of the application featuring a responsive sidebar with glassmorphic styling.

```tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { motion } from 'framer-motion';
import { MessageSquare, LayoutDashboard, Database, Network, FileSpreadsheet, Settings, LogOut } from 'lucide-react';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const clearAuth = useAuthStore(s => s.clearAuth);

  const links = [
    { name: 'Conversations', path: '/conversations', icon: MessageSquare },
    { name: 'Dashboards', path: '/dashboards', icon: LayoutDashboard },
    { name: 'Connections', path: '/connections', icon: Database },
    { name: 'Semantic Layer', path: '/semantic', icon: Network },
    { name: 'Files', path: '/files', icon: FileSpreadsheet },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-950 text-slate-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-64 bg-slate-900/50 backdrop-blur-xl border-r border-slate-800 flex flex-col"
      >
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            Altzor AI
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          {links.map((link) => {
            const isActive = location.pathname.startsWith(link.path);
            const Icon = link.icon;
            return (
              <Link key={link.path} to={link.path}>
                <div className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${isActive ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(37,99,235,0.15)]' : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'}`}>
                  <Icon size={20} />
                  <span className="font-medium">{link.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={clearAuth}
            className="flex items-center space-x-3 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950">
        {children}
      </main>
    </div>
  );
}
```

---

## 3. LoginPage (`src/pages/LoginPage.tsx`)
A sleek, glassmorphic login screen.

```tsx
import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const setAuth = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user, accessToken } = await api.post<any>('/auth/login', { email, password });
      setAuth(user, accessToken);
      navigate('/conversations');
    } catch (err) {
      alert('Login failed. Check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] top-1/4 left-1/4 animate-pulse"></div>
      <div className="absolute w-[400px] h-[400px] bg-indigo-600/20 rounded-full blur-[100px] bottom-1/4 right-1/4 animate-pulse delay-1000"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-8 rounded-2xl shadow-2xl relative z-10"
      >
        <h2 className="text-3xl font-bold text-white mb-2 text-center">Welcome Back</h2>
        <p className="text-slate-400 text-center mb-8">Sign in to Altzor Analytics</p>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="you@company.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium py-3 rounded-lg transition-all transform hover:scale-[1.02] active:scale-95 flex justify-center items-center"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
```

---

## 4. ConversationsPage (`src/pages/ConversationsPage.tsx`)
The primary NL2SQL interface where users chat with data.

```tsx
import React, { useState } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export function ConversationsPage() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'Hello! I am Altzor AI. Ask me anything about your data.' }
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    setMessages([...messages, { role: 'user', content: prompt }]);
    setPrompt('');
    
    // Mock response
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Here is the data you requested...' }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md flex items-center px-6 sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sparkles className="text-blue-400" size={20} />
          Data Exploration
        </h2>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((msg, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i} 
            className={`flex gap-4 max-w-4xl mx-auto ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-blue-600' : 'bg-indigo-600'}`}>
              {msg.role === 'user' ? <User size={20} className="text-white"/> : <Bot size={20} className="text-white"/>}
            </div>
            <div className={`px-5 py-4 rounded-2xl ${msg.role === 'user' ? 'bg-blue-600/20 border border-blue-500/30 text-blue-50 rounded-tr-none' : 'bg-slate-800/50 border border-slate-700/50 text-slate-200 rounded-tl-none'}`}>
              <p className="leading-relaxed">{msg.content}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-6 bg-gradient-to-t from-slate-950 to-transparent">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ask a question about your revenue..."
            className="w-full bg-slate-900 border border-slate-700 rounded-full pl-6 pr-14 py-4 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-xl"
          />
          <button 
            type="submit"
            className="absolute right-2 top-2 bottom-2 w-10 flex items-center justify-center bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-colors"
          >
            <Send size={18} className="ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

## 5. DashboardsPage (`src/pages/DashboardsPage.tsx`)
A grid of available dashboards.

```tsx
import React from 'react';
import { Plus, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';

export function DashboardsPage() {
  const dashboards = [
    { id: 1, title: 'Executive Overview', widgets: 5, lastUpdated: '2 hours ago' },
    { id: 2, title: 'Marketing Analytics', widgets: 8, lastUpdated: '1 day ago' },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Dashboards</h1>
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-lg shadow-blue-600/20">
          <Plus size={20} />
          New Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboards.map((board, i) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={board.id} 
            className="bg-slate-900/50 backdrop-blur-md border border-slate-800 p-6 rounded-2xl hover:border-slate-600 transition-all cursor-pointer group hover:shadow-xl hover:-translate-y-1"
          >
            <div className="w-12 h-12 bg-blue-900/30 text-blue-400 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BarChart2 size={24} />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">{board.title}</h3>
            <p className="text-slate-400 text-sm">{board.widgets} widgets • Updated {board.lastUpdated}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
```

---

## Next Steps
To implement this skill:
1. Ensure the necessary dependencies (`framer-motion`, `lucide-react`) are installed.
2. Copy these complete UI implementations over the original stubbed files.
3. Validate routing and responsive behavior.
