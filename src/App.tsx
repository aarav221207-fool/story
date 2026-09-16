import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import type { Player, World, Character, ActionHistory, Relationship } from './types';
import { Loader2, Send, MapPin, Clock, Heart, Zap, User, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function App() {
  const [world, setWorld] = useState<World | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Character Creation State
  const [playerNameInput, setPlayerNameInput] = useState('');
  const [playerAgeInput, setPlayerAgeInput] = useState('16');
  const [playerTechniqueInput, setPlayerTechniqueInput] = useState('None');
  
  const [actionInput, setActionInput] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [actionError, setActionError] = useState('');
  
  const [npcs, setNpcs] = useState<Character[]>([]);
  const [history, setHistory] = useState<ActionHistory[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);

  useEffect(() => {
    checkExistingState();
  }, []);

  const checkExistingState = async () => {
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
        setRelationships(data.relationships || []);
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
      const worldRes = await fetch('/api/seed-world', { method: 'POST' });
      const worldData = await worldRes.json();
      
      if (worldData.world) {
        const playerRes = await fetch('/api/create-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
             world_id: worldData.world.id, 
             name: playerNameInput,
             age: parseInt(playerAgeInput) || 16,
             cursed_technique: playerTechniqueInput
          })
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
    setActionError('');
    
    try {
      const res = await fetch('/api/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: player.id, action_text: text })
      });
      
      const result = await res.json();
      
      if (result.success === false) {
         setActionError(result.message);
      }
      
      await loadGameState(player.id);
      
    } catch (e: any) {
      console.error(e);
      setActionError("A mysterious error prevented your action.");
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!player || !world) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-4 text-stone-200">
        <div className="max-w-md w-full bg-stone-900 border border-stone-800 rounded-xl p-8 shadow-2xl">
          <h1 className="text-3xl font-serif font-bold text-center text-indigo-500 mb-2">Jujutsu Kaisen RPG</h1>
          <p className="text-stone-400 text-center mb-8">Enter the hidden world of curses.</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-400 mb-1">Your Name</label>
              <input 
                type="text" 
                value={playerNameInput}
                onChange={(e) => setPlayerNameInput(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                placeholder="Yuji Itadori..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-400 mb-1">Age</label>
              <input 
                type="number" 
                value={playerAgeInput}
                onChange={(e) => setPlayerAgeInput(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                placeholder="16"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-400 mb-1">Cursed Technique</label>
              <input 
                type="text" 
                value={playerTechniqueInput}
                onChange={(e) => setPlayerTechniqueInput(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                placeholder="None, Ten Shadows, Limitless..."
              />
            </div>
            <button 
              onClick={handleStartGame}
              disabled={!playerNameInput.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 mt-4"
            >
              Enter Tokyo Jujutsu High
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200 flex flex-col md:flex-row font-sans">
      {/* Sidebar / Status Panel */}
      <div className="w-full md:w-80 bg-stone-900 border-r border-stone-800 flex flex-col shrink-0 overflow-y-auto">
        <div className="p-6 border-b border-stone-800">
          <h2 className="text-xl font-bold text-indigo-400 mb-1">{player.name}</h2>
          <div className="flex flex-wrap items-center text-sm text-stone-400 gap-2">
            <span className="bg-stone-800 px-2 py-0.5 rounded text-xs text-stone-300">Lvl {player.level}</span>
            <span className="bg-stone-800 px-2 py-0.5 rounded text-xs text-stone-300">{player.affiliation}</span>
          </div>
        </div>
        
        <div className="p-6 space-y-5 border-b border-stone-800">
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm font-medium">
              <span className="flex items-center text-red-400"><Heart className="w-4 h-4 mr-1.5"/> Health</span>
              <span>{player.health}/{player.max_health}</span>
            </div>
            <div className="w-full bg-stone-950 rounded-full h-2">
              <div className="bg-red-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(player.health / player.max_health) * 100}%` }}></div>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm font-medium">
              <span className="flex items-center text-emerald-400"><Zap className="w-4 h-4 mr-1.5"/> Stamina</span>
              <span>{player.stamina}/{player.max_stamina}</span>
            </div>
            <div className="w-full bg-stone-950 rounded-full h-2">
              <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(player.stamina / player.max_stamina) * 100}%` }}></div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-sm font-medium">
              <span className="flex items-center text-indigo-400"><Flame className="w-4 h-4 mr-1.5"/> Cursed Energy</span>
              <span>{player.cursed_energy}/{player.max_cursed_energy}</span>
            </div>
            <div className="w-full bg-stone-950 rounded-full h-2">
              <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${(player.cursed_energy / player.max_cursed_energy) * 100}%` }}></div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4 border-b border-stone-800">
          <div className="text-sm space-y-2">
            <div className="flex items-center text-stone-400">
              <MapPin className="w-4 h-4 mr-2 text-stone-500"/>
              <span className="font-medium text-stone-200">{player.locations?.name || 'Unknown'}</span>
            </div>
            <div className="flex items-center text-stone-400">
              <Clock className="w-4 h-4 mr-2 text-stone-500"/>
              <span>Day {world.day}, {world.time_of_day}</span>
            </div>
          </div>
        </div>

        {npcs.length > 0 && (
          <div className="p-6 border-b border-stone-800">
            <h3 className="text-xs font-bold uppercase text-stone-500 tracking-wider mb-4">Nearby Characters</h3>
            <div className="space-y-4">
              {npcs.map(npc => (
                <div key={npc.id} className="flex items-start">
                  <User className="w-4 h-4 mr-2.5 mt-0.5 text-stone-500 shrink-0"/>
                  <div>
                    <p className="text-sm font-semibold text-stone-200">{npc.name}</p>
                    <p className="text-xs text-stone-400">{npc.current_activity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {relationships.length > 0 && (
          <div className="p-6">
            <h3 className="text-xs font-bold uppercase text-stone-500 tracking-wider mb-4">Relationships</h3>
            <div className="space-y-3">
              {relationships.map(rel => (
                <div key={rel.id} className="flex justify-between items-center bg-stone-950 p-2 rounded-lg border border-stone-800">
                  <span className="text-sm font-medium">{rel.characters?.name}</span>
                  <span className="text-xs px-2 py-1 rounded-md bg-stone-800 text-indigo-300">{rel.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Main Story Area */}
      <div className="flex-1 flex flex-col max-h-screen relative">
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8 scroll-smooth pb-32">
          {history.length === 0 ? (
            <div className="text-center text-stone-500 mt-20 italic">
              You arrive at {player.locations?.name}. What do you want to do?
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {history.map((item) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={item.id} 
                  className="space-y-3 max-w-3xl mx-auto"
                >
                  <div className="flex items-center space-x-2 opacity-50">
                    <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">{">"} {item.action_text}</span>
                  </div>
                  <p className="text-lg leading-relaxed text-stone-300">
                    {item.narration}
                  </p>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
          
          {actionError && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl mx-auto p-4 rounded-lg bg-red-950/30 border border-red-900/50 text-red-400 text-sm">
                {actionError}
             </motion.div>
          )}
          
          {processingAction && (
             <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center text-stone-500 italic space-x-2 max-w-3xl mx-auto">
               <Loader2 className="w-4 h-4 animate-spin text-indigo-500"/>
               <span>Processing action...</span>
             </motion.div>
          )}
        </div>
        
        {/* Input Area */}
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-gradient-to-t from-stone-950 via-stone-950 to-transparent">
          <form onSubmit={handleActionSubmit} className="max-w-3xl mx-auto relative group">
            <input
              type="text"
              value={actionInput}
              onChange={(e) => setActionInput(e.target.value)}
              disabled={processingAction}
              placeholder="What do you want to do?"
              className="w-full bg-stone-900/90 backdrop-blur border border-stone-700/50 rounded-2xl pl-6 pr-14 py-4 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 text-lg shadow-2xl transition-all"
            />
            <button 
              type="submit"
              disabled={!actionInput.trim() || processingAction}
              className="absolute right-2 top-2 p-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white disabled:opacity-50 transition-colors shadow-lg"
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

