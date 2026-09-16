import express from "express";
import path from "path";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// --- Initialize Supabase ---
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
let supabase: ReturnType<typeof createClient> | null = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey);
}

// --- Initialize Gemini AI ---
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- API Routes ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", supabase_configured: !!supabase });
});

// Seed a new world
app.post("/api/seed-world", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { data: world, error: worldError } = await supabase
      .from('worlds')
      .insert([{
        name: "Ethereal Domain",
        description: "A demon-hunting anime-inspired world.",
        genre: "Dark Fantasy / Anime Action",
        setting: "A historical land plagued by supernatural entities.",
        day: 1,
        time_of_day: "Morning"
      }])
      .select()
      .single();
    
    if (worldError) throw worldError;

    // Create locations
    const locations = [
      { world_id: world.id, name: "Starting Village", region: "South" },
      { world_id: world.id, name: "Training Grounds", region: "South" },
      { world_id: world.id, name: "Dark Forest", region: "West" },
      { world_id: world.id, name: "Mountain Peak", region: "North" },
      { world_id: world.id, name: "Central Town", region: "Center" }
    ];
    
    const { data: insertedLocs, error: locError } = await supabase
      .from('locations')
      .insert(locations)
      .select();

    if (locError) throw locError;

    const startVillageId = insertedLocs.find(l => l.name === "Starting Village")?.id;
    const trainingGroundsId = insertedLocs.find(l => l.name === "Training Grounds")?.id;

    // Create characters
    const characters = [
      {
        world_id: world.id,
        name: "Master Kael",
        age: 55,
        appearance: "An older man with graying hair and scars.",
        background: "A retired demon hunter who now trains the next generation.",
        personality: "Strict, disciplined, but deeply caring.",
        occupation: "Mentor",
        current_location_id: trainingGroundsId,
        current_activity: "Meditating"
      },
      {
        world_id: world.id,
        name: "Lyra",
        age: 19,
        appearance: "Energetic with bright red hair and agile movements.",
        background: "A fellow trainee eager to prove herself.",
        personality: "Competitive, loyal, brash.",
        occupation: "Trainee",
        current_location_id: startVillageId,
        current_activity: "Practicing swings"
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
    const { world_id, name } = req.body;
    
    // get starting village
    const { data: locs } = await supabase.from('locations').select('id').eq('world_id', world_id).eq('name', 'Starting Village').single();
    
    const { data: player, error } = await supabase
      .from('players')
      .insert([{
        world_id,
        name,
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

// Action Director
app.post("/api/action", async (req, res) => {
  if (!supabase) return res.status(500).json({ error: "Supabase not configured" });
  try {
    const { player_id, action_text } = req.body;

    // 1. Fetch player & world state
    const { data: player } = await supabase.from('players').select('*, locations(name)').eq('id', player_id).single();
    if (!player) return res.status(404).json({ error: "Player not found" });

    const { data: world } = await supabase.from('worlds').select('*').eq('id', player.world_id).single();
    
    // Fetch NPCs in same location
    const { data: npcs } = await supabase.from('characters').select('id, name, current_activity, personality').eq('current_location_id', player.location_id);
    
    // Fetch available locations for travel
    const { data: allLocations } = await supabase.from('locations').select('id, name').eq('world_id', world.id);

    // 2. AI Interpretation (The Director)
    const directorSchema = {
      type: Type.OBJECT,
      properties: {
        action_type: { type: Type.STRING, description: "One of: TRAVEL, TRAIN, TALK, EXPLORE, REST, COMBAT, INVALID" },
        target_location_id: { type: Type.STRING, nullable: true },
        target_character_id: { type: Type.STRING, nullable: true },
        duration_hours: { type: Type.INTEGER, description: "Hours this action takes" },
        stamina_cost: { type: Type.INTEGER, description: "Stamina consumed by this action" },
        narration: { type: Type.STRING, description: "A highly descriptive, atmospheric narration of what happens and the outcome. Min 2 sentences." },
        is_impossible: { type: Type.BOOLEAN, description: "True if the action makes no physical/logical sense in the current context." },
        impossible_reason: { type: Type.STRING, nullable: true, description: "Why it's impossible, if applicable." },
        npc_relationship_changes: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              character_id: { type: Type.STRING },
              friendship_change: { type: Type.INTEGER }
            }
          }
        },
        memory_to_create: {
          type: Type.OBJECT,
          nullable: true,
          properties: {
            character_id: { type: Type.STRING },
            content: { type: Type.STRING, description: "Important fact to remember." },
            importance: { type: Type.INTEGER }
          }
        }
      },
      required: ["action_type", "duration_hours", "stamina_cost", "narration", "is_impossible"]
    };

    const prompt = `
      You are the AI Director for an anime RPG simulation.
      Interpret the player's action and output structured results.
      
      WORLD: ${world.name} (Day ${world.day}, ${world.time_of_day})
      PLAYER: ${player.name} (Health: ${player.health}, Stamina: ${player.stamina})
      CURRENT LOCATION: ${player.locations?.name}
      NEARBY NPCS: ${JSON.stringify(npcs)}
      AVAILABLE LOCATIONS: ${JSON.stringify(allLocations)}
      
      PLAYER INTENT: "${action_text}"
      
      Determine what type of action this is. If it involves a known NPC, link their ID. If travel to a known location, link ID.
      Narrate the outcome beautifully.
    `;

    const response = await ai.models.generateContent({
      model: process.env.AI_MODEL || "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: directorSchema as Schema,
        temperature: 0.7
      }
    });

    const result = JSON.parse(response.text || '{}');

    if (result.is_impossible) {
      return res.json({ 
        success: false, 
        message: result.impossible_reason || "You cannot do that.",
        narration: result.narration
      });
    }

    // 3. Apply state changes (Authoritative Engine)
    
    // Update player stamina
    let newStamina = Math.max(0, player.stamina - (result.stamina_cost || 0));
    let updatePayload: any = { stamina: newStamina };

    if (result.action_type === 'REST') {
       updatePayload.stamina = player.max_stamina;
       updatePayload.health = player.max_health;
    }

    if (result.action_type === 'TRAVEL' && result.target_location_id) {
       updatePayload.location_id = result.target_location_id;
    }

    await supabase.from('players').update(updatePayload).eq('id', player.id);

    // Update time
    // simplified: just advance time of day arbitrarily for now based on duration
    let newTime = world.time_of_day;
    if (result.duration_hours > 0) {
       const times = ["Morning", "Afternoon", "Evening", "Night"];
       let currentIndex = times.indexOf(world.time_of_day);
       let nextIndex = (currentIndex + 1) % times.length;
       newTime = times[nextIndex];
       
       let newDay = world.day;
       if (nextIndex < currentIndex) {
         newDay += 1; // rolled over to next day
       }
       await supabase.from('worlds').update({ time_of_day: newTime, day: newDay }).eq('id', world.id);
    }

    // Memory
    if (result.memory_to_create && result.memory_to_create.character_id) {
       await supabase.from('memories').insert({
         world_id: world.id,
         character_id: result.memory_to_create.character_id,
         type: 'episodic',
         importance: result.memory_to_create.importance || 1,
         content: result.memory_to_create.content
       });
    }

    // Record Action
    await supabase.from('actions_history').insert({
      world_id: world.id,
      player_id: player.id,
      action_text,
      narration: result.narration,
      day: world.day,
      time_of_day: world.time_of_day
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
    const { data: npcs } = await supabase.from('characters').select('*').eq('current_location_id', player.location_id);
    const { data: history } = await supabase.from('actions_history').select('*').eq('player_id', player.id).order('created_at', { ascending: false }).limit(5);

    res.json({ player, world, npcs, recent_history: history.reverse() });
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
