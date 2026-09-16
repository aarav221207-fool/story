import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Player, World, Character, ActionHistory } from './types';
import { Loader2, Send, MapPin, Clock, Heart, Zap, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function App() {
  const [world, setWorld] = useState<World | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [actionInput, setActionInput] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  
  const [npcs, setNpcs] = useState<Character[]>([]);
  const [history, setHistory] = useState<ActionHistory[]>([]);

  useEffect(() => {
    checkExistingState();
  }, []);

  const checkExistingState = async () => {
    // Basic local storage persistence for player ID to reload session
    const savedPlayerId = localStorage.getItem('worldbound_player_id');
    if (savedPlayerId) {
      await loadGameState(savedPlayerId);
    } else {
      setLoading(false);
    }
  };

  const loadGameState = async (playerId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/state/${playerId}`);
      if (res.ok) {
        const data = await res.json();
        setPlayer(data.player);
        setWorld(data.world);
        setNpcs(data.npcs);
        setHistory(data.recent_history);
      } else {
        localStorage.removeItem('worldbound_player_id');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!playerNameInput.trim()) return;
    setLoading(true);
    try {
      // 1. Seed World (or get existing default world)
      const worldRes = await fetch('/api/seed-world', { method: 'POST' });
      const worldData = await worldRes.json();
      
      if (worldData.world) {
        // 2. Create player
        const playerRes = await fetch('/api/create-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ world_id: worldData.world.id, name: playerNameInput })
        });
        const playerData = await playerRes.json();
        
        if (playerData.id) {
          localStorage.setItem('worldbound_player_id', playerData.id);
          await loadGameState(playerData.id);
        }
      }
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionInput.trim() || !player || processingAction) return;
    
    const text = actionInput.trim();
    setActionInput('');
    setProcessingAction(true);
    
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: player.id, action_text: text })
      });
      
      const result = await res.json();
      if (result.success || result.success === false) {
         // Reload state to get updated narration and status
         await loadGameState(player.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!player || !world) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 text-stone-200">
        <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-xl p-8 shadow-2xl">
          <h1 className="text-3xl font-serif font-bold text-center text-amber-500 mb-2">Worldbound</h1>
          <p className="text-stone-400 text-center mb-8">An immersive anime RPG simulation.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-400 mb-1">Your Name</label>
              <input 
                type="text" 
                value={playerNameInput}
                onChange={(e) => setPlayerNameInput(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-500"
                placeholder="Enter character name..."
              />
            </div>
            <button 
              onClick={handleStartGame}
              disabled={!playerNameInput.trim()}
              className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              Enter the World
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col md:flex-row">
      {/* Sidebar / Status Panel */}
      <div className="w-full md:w-80 bg-stone-900 border-r border-stone-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-stone-800">
          <h2 className="text-xl font-bold font-serif text-amber-500 mb-1">{player.name}</h2>
          <div className="flex items-center text-sm text-stone-400">
            <span className="bg-stone-800 px-2 py-0.5 rounded text-xs mr-2">Level {player.level}</span>
          </div>
        </div>
        
        <div className="p-6 space-y-4 border-b border-stone-800">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center text-red-400"><Heart className="w-4 h-4 mr-1"/> Health</span>
              <span>{player.health}/{player.max_health}</span>
            </div>
            <div className="w-full bg-stone-950 rounded-full h-1.5">
              <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${(player.health / player.max_health) * 100}%` }}></div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="flex items-center text-emerald-400"><Zap className="w-4 h-4 mr-1"/> Stamina</span>
              <span>{player.stamina}/{player.max_stamina}</span>
            </div>
            <div className="w-full bg-stone-950 rounded-full h-1.5">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${(player.stamina / player.max_stamina) * 100}%` }}></div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm">
            <div className="flex items-center text-stone-400 mb-1">
              <MapPin className="w-4 h-4 mr-2"/>
              <span className="font-medium text-stone-200">{player.locations?.name || 'Unknown'}</span>
            </div>
            <div className="flex items-center text-stone-400">
              <Clock className="w-4 h-4 mr-2"/>
              <span>Day {world.day}, {world.time_of_day}</span>
            </div>
          </div>
          
          {npcs.length > 0 && (
            <div className="pt-4 border-t border-stone-800">
              <h3 className="text-xs font-semibold uppercase text-stone-500 tracking-wider mb-3">Nearby Characters</h3>
              <div className="space-y-3">
                {npcs.map(npc => (
                  <div key={npc.id} className="flex items-start">
                    <User className="w-4 h-4 mr-2 mt-0.5 text-stone-400 shrink-0"/>
                    <div>
                      <p className="text-sm font-medium">{npc.name}</p>
                      <p className="text-xs text-stone-500">{npc.current_activity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Story Area */}
      <div className="flex-1 flex flex-col max-h-screen">
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
          {history.length === 0 ? (
            <div className="text-center text-stone-500 mt-20 italic">
              You arrive at {player.locations?.name}. What do you want to do?
            </div>
          ) : (
            <AnimatePresence>
              {history.map((item, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={item.id} 
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2 opacity-60">
                    <span className="text-xs font-medium text-amber-500 uppercase tracking-widest">{">"} {item.action_text}</span>
                  </div>
                  <p className="text-lg leading-relaxed text-stone-300 font-serif">
                    {item.narration}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          {processingAction && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center text-stone-500 italic space-x-2">
               <Loader2 className="w-4 h-4 animate-spin"/>
               <span>The world reacts...</span>
             </motion.div>
          )}
        </div>
        
        {/* Input Area */}
        <div className="p-4 bg-stone-900 border-t border-stone-800 shrink-0">
          <form onSubmit={handleActionSubmit} className="max-w-4xl mx-auto relative">
            <input
              type="text"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              disabled={processingAction}
              placeholder="What do you want to do?"
              className="w-full bg-stone-950 border border-stone-700 rounded-xl pl-4 pr-12 py-4 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-50 text-lg shadow-inner"
            />
            <button 
              type="submit"
              disabled={!actionInput.trim() || processingAction}
              className="absolute right-3 top-3 p-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white disabled:opacity-50 transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default App;

