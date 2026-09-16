import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { createClient } from '@supabase/supabase-js';
import { getAIClient, getAIModel } from "./ai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Initialize Supabase ---
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// --- API Routes ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", supabase_configured: !!supabase });
});

// Seed a new world (JJK Edition)
app.post("/api/seed-world", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { data: world, error: worldError } = await supabase
      .from('worlds')
      .insert([{
        name: "Jujutsu Kaisen RPG",
        description: "A persistent open-world Jujutsu Kaisen roleplaying simulator.",
        genre: "Anime RPG",
        setting: "Modern Japan with hidden Jujutsu Society",
        day: 1,
        time_of_day: "Morning"
      }])
      .select()
      .single();
    
    if (worldError) throw worldError;

    // Create locations
    const locations = [
      { world_id: world.id, name: "Tokyo Jujutsu High", region: "Tokyo" },
      { world_id: world.id, name: "Kyoto Jujutsu High", region: "Kyoto" },
      { world_id: world.id, name: "Training Grounds", region: "Tokyo" },
      { world_id: world.id, name: "Shibuya", region: "Tokyo" },
      { world_id: world.id, name: "Shinjuku", region: "Tokyo" },
      { world_id: world.id, name: "Dormitories", region: "Tokyo" },
      { world_id: world.id, name: "Abandoned Hospital", region: "Saitama" },
    ];
    
    const { data: insertedLocs, error: locError } = await supabase
      .from('locations')
      .insert(locations)
      .select();

    if (locError) throw locError;

    const tokyoHighId = insertedLocs.find((l: any) => l.name === "Tokyo Jujutsu High")?.id;
    const trainingGroundsId = insertedLocs.find((l: any) => l.name === "Training Grounds")?.id;
    const dormsId = insertedLocs.find((l: any) => l.name === "Dormitories")?.id;

    // Create characters
    const characters = [
      {
        world_id: world.id,
        name: "Satoru Gojo",
        age: 28,
        appearance: "Tall, white hair, blindfold.",
        background: "The strongest jujutsu sorcerer.",
        personality: "Playful, arrogant, deeply caring about his students.",
        occupation: "Teacher",
        affiliation: "Tokyo Jujutsu High",
        current_location_id: tokyoHighId,
        current_activity: "Buying sweets",
        schedule: { "Morning": tokyoHighId, "Afternoon": trainingGroundsId, "Evening": tokyoHighId, "Night": dormsId },
        strength: 99, speed: 99, cursed_energy: 99, technique_mastery: 99
      },
      {
        world_id: world.id,
        name: "Maki Zenin",
        age: 16,
        appearance: "Green hair in a ponytail, glasses.",
        background: "Rejected by the Zenin clan due to lack of cursed energy, but has heavenly restriction.",
        personality: "Stubborn, hardworking, blunt, secretly supportive.",
        occupation: "Student",
        affiliation: "Tokyo Jujutsu High",
        current_location_id: trainingGroundsId,
        current_activity: "Practicing with a polearm",
        schedule: { "Morning": trainingGroundsId, "Afternoon": tokyoHighId, "Evening": trainingGroundsId, "Night": dormsId },
        strength: 50, speed: 45, cursed_energy: 0, weapon_proficiency: 80
      },
      {
        world_id: world.id,
        name: "Megumi Fushiguro",
        age: 15,
        appearance: "Spiky dark hair.",
        background: "Descendant of the Zenin clan, possesses Ten Shadows Technique.",
        personality: "Stoic, calculating, protective of good people.",
        occupation: "Student",
        affiliation: "Tokyo Jujutsu High",
        current_location_id: tokyoHighId,
        current_activity: "Reading",
        schedule: { "Morning": tokyoHighId, "Afternoon": trainingGroundsId, "Evening": tokyoHighId, "Night": dormsId },
        strength: 30, speed: 35, cursed_energy: 40, technique_mastery: 40
      }
    ];

    await supabase.from('characters').insert(characters);

    res.json({ success: true, world });
  } catch (error: any) {
    console.error("Seed error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Create Player
app.post("/api/create-player", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { world_id, name, age, appearance, background, affiliation, cursed_technique, personal_goal } = req.body;
    
    // get starting location
    const { data: locs } = await supabase.from('locations').select('id').eq('world_id', world_id).eq('name', 'Tokyo Jujutsu High').single();
    
    const { data: player, error } = await supabase
      .from('players')
      .insert([{
        world_id,
        name,
        age: age || 16,
        appearance: appearance || "Standard uniform",
        background: background || "Unknown",
        affiliation: affiliation || "Tokyo Jujutsu High",
        cursed_technique: cursed_technique || "None",
        personal_goal: personal_goal || "Become a strong sorcerer",
        location_id: locs?.id
      }])
      .select()
      .single();
      
    if (error) throw error;
    res.json(player);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Calculate Time Advancement
function advanceTime(currentDay: number, currentTime: string, durationMinutes: number) {
  const times = ["Morning", "Afternoon", "Evening", "Night"];
  let currentIndex = times.indexOf(currentTime);
  
  // Very simple approximation: 4 phases a day, say ~6 hours each.
  let phasesToAdvance = Math.floor(durationMinutes / (6 * 60));
  if (durationMinutes > 0 && phasesToAdvance === 0) phasesToAdvance = 1; // at least 1 phase for short actions that take 'some' time

  let newIndex = (currentIndex + phasesToAdvance) % times.length;
  let daysPassed = Math.floor((currentIndex + phasesToAdvance) / times.length);
  
  return {
    newDay: currentDay + daysPassed,
    newTime: times[newIndex]
  };
}

// Action Director
app.post("/api/action", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { player_id, action_text } = req.body;
    const ai = getAIClient();
    const model = getAIModel();

    // 1. Fetch player & world state
    const { data: player } = await supabase.from('players').select('*, locations(*)').eq('id', player_id).single();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const { data: world } = await supabase.from('worlds').select('*').eq('id', player.world_id).single();
    
    const { data: npcs } = await supabase.from('characters').select('id, name, current_location_id, current_activity, personality, affiliation').eq('world_id', world.id);
    const { data: relationships } = await supabase.from('relationships').select('*').eq('target_id', player.id);
    const { data: allLocations } = await supabase.from('locations').select('id, name, region').eq('world_id', world.id);
    const { data: recentMemories } = await supabase.from('memories').select('content, type').eq('player_id', player.id).order('created_at', { ascending: false }).limit(5);

    // 2. AI Interpretation (The Director)
    const prompt = `
You are the AI Director for a Jujutsu Kaisen RPG simulation.
Your job is to interpret the player's free-text action and output a structured JSON response.

WORLD STATE:
Day: ${world.day}, Time: ${world.time_of_day}, Weather: ${world.weather}

PLAYER STATE:
Name: ${player.name}
Location: ${player.locations?.name} (${player.locations?.region})
Stats: Health ${player.health}/${player.max_health}, Stamina ${player.stamina}/${player.max_stamina}, Cursed Energy ${player.cursed_energy}/${player.max_cursed_energy}
Technique: ${player.cursed_technique}

ALL LOCATIONS: ${JSON.stringify(allLocations.map((l:any) => ({id: l.id, name: l.name})))}

ALL NPCS: ${JSON.stringify(npcs.map((n:any) => ({id: n.id, name: n.name, location: allLocations.find((l:any)=>l.id === n.current_location_id)?.name, activity: n.current_activity})))}

PLAYER'S RELATIONSHIPS: ${JSON.stringify(relationships)}

RECENT MEMORIES: ${JSON.stringify(recentMemories)}

PLAYER INTENT: "${action_text}"

Based on the intent, determine what happens.
- If the player tries to do something impossible (e.g. travel to a place that doesn't exist, attack someone not there), set is_impossible: true.
- If they want to travel, set target_location_id.
- If they interact with an NPC, specify target_character_id and how the relationship changes.
- Determine duration_minutes (e.g., traveling might take 60-120 mins, training 180 mins, talking 15 mins).
- Calculate stamina/health/energy costs. Training uses stamina/energy. Resting restores them.
- Provide a rich narrative of the outcome in the 'narration' field.
- If important, create a memory.

Respond ONLY with valid JSON using the following schema (no markdown blocks):
{
  "action_type": "string (e.g. TRAVEL, TRAIN, TALK, EXPLORE, REST, COMBAT, OTHER)",
  "target_location_id": "uuid or null",
  "target_character_id": "uuid or null",
  "duration_minutes": 0,
  "stamina_cost": 0,
  "health_cost": 0,
  "cursed_energy_cost": 0,
  "stat_changes": { "strength": 0, "speed": 0, "technique_mastery": 0, "cursed_energy_control": 0 },
  "npc_relationship_changes": [ { "character_id": "uuid", "friendship_change": 0, "respect_change": 0, "trust_change": 0 } ],
  "memory_to_create": { "character_id": "uuid", "content": "summary of event", "type": "episodic", "importance": 5 },
  "narration": "detailed narrative string",
  "is_impossible": false,
  "impossible_reason": ""
}
`;

    const chatCompletion = await ai.chat.completions.create({
      model: model,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.7,
    });

    const resultString = chatCompletion.choices[0]?.message?.content || '{}';
    const result = JSON.parse(resultString);

    if (result.is_impossible) {
      return res.json({ 
        success: false, 
        message: result.impossible_reason || "You cannot do that.",
        narration: result.narration
      });
    }

    // 3. Apply state changes (Authoritative Engine)
    
    // Calculate new stats
    let newStamina = Math.max(0, Math.min(player.max_stamina, player.stamina - (result.stamina_cost || 0)));
    let newHealth = Math.max(0, Math.min(player.max_health, player.health - (result.health_cost || 0)));
    let newCE = Math.max(0, Math.min(player.max_cursed_energy, player.cursed_energy - (result.cursed_energy_cost || 0)));
    
    let updatePayload: any = { 
      stamina: newStamina,
      health: newHealth,
      cursed_energy: newCE
    };

    if (result.action_type === 'REST') {
       updatePayload.stamina = player.max_stamina;
       updatePayload.health = player.max_health;
       updatePayload.cursed_energy = player.max_cursed_energy;
    }

    if (result.action_type === 'TRAVEL' && result.target_location_id) {
       updatePayload.location_id = result.target_location_id;
    }
    
    // Apply stat growths if any
    if (result.stat_changes) {
      for (const key of Object.keys(result.stat_changes)) {
         if (player[key] !== undefined && typeof result.stat_changes[key] === 'number') {
            updatePayload[key] = player[key] + result.stat_changes[key];
         }
      }
    }

    await supabase.from('players').update(updatePayload).eq('id', player.id);

    // Update time
    const { newDay, newTime } = advanceTime(world.day, world.time_of_day, result.duration_minutes || 15);
    await supabase.from('worlds').update({ time_of_day: newTime, day: newDay }).eq('id', world.id);

    // Process Relationship Changes
    if (result.npc_relationship_changes && result.npc_relationship_changes.length > 0) {
      for (const change of result.npc_relationship_changes) {
         if (!change.character_id) continue;
         
         const { data: existingRel } = await supabase.from('relationships')
           .select('*')
           .eq('character_id', change.character_id)
           .eq('target_id', player.id)
           .single();
           
         if (existingRel) {
            let newFriendship = existingRel.friendship + (change.friendship_change || 0);
            let newRespect = existingRel.respect + (change.respect_change || 0);
            let newTrust = existingRel.trust + (change.trust_change || 0);
            
            let newStatus = existingRel.status;
            if (newFriendship > 60) newStatus = "Close Friend";
            else if (newFriendship > 30) newStatus = "Friendly";
            else if (newFriendship > 15) newStatus = "Acquaintance";
            
            await supabase.from('relationships').update({
              friendship: newFriendship,
              respect: newRespect,
              trust: newTrust,
              status: newStatus
            }).eq('id', existingRel.id);
         } else {
            let newStatus = "Acquaintance";
            let f = change.friendship_change || 0;
            if (f > 30) newStatus = "Friendly";
            
            await supabase.from('relationships').insert({
              world_id: world.id,
              character_id: change.character_id,
              target_id: player.id,
              target_type: 'player',
              friendship: f,
              respect: change.respect_change || 0,
              trust: change.trust_change || 0,
              status: newStatus
            });
         }
      }
    }

    // Memory
    if (result.memory_to_create && result.memory_to_create.content && result.memory_to_create.character_id) {
       await supabase.from('memories').insert({
         world_id: world.id,
         player_id: player.id,
         character_id: result.memory_to_create.character_id,
         type: result.memory_to_create.type || 'episodic',
         importance: result.memory_to_create.importance || 5,
         content: result.memory_to_create.content
       });
    }

    // Record Action History
    await supabase.from('actions_history').insert({
      world_id: world.id,
      player_id: player.id,
      action_text,
      narration: result.narration,
      day: newDay,
      time_of_day: newTime
    });

    res.json({
      success: true,
      narration: result.narration,
      action_type: result.action_type,
      state_changes: updatePayload
    });

  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});


// State retrieval
app.get("/api/state/:playerId", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { data: player } = await supabase.from('players').select('*, locations(*)').eq('id', req.params.playerId).single();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const { data: world } = await supabase.from('worlds').select('*').eq('id', player.world_id).single();
    
    // We fetch NPCs at the same location to display
    const { data: npcs } = await supabase.from('characters').select('*').eq('current_location_id', player.location_id);
    
    const { data: history } = await supabase.from('actions_history').select('*').eq('player_id', player.id).order('created_at', { ascending: false }).limit(20);

    const { data: relationships } = await supabase.from('relationships').select('*, characters(name)').eq('target_id', player.id);

    res.json({ player, world, npcs, recent_history: history.reverse(), relationships });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
