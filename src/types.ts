export interface World {
  id: string;
  name: string;
  description: string;
  genre: string;
  setting: string;
  day: number;
  time_of_day: string;
  weather: string;
}

export interface Player {
  id: string;
  world_id: string;
  name: string;
  health: number;
  max_health: number;
  stamina: number;
  max_stamina: number;
  cursed_energy: number;
  max_cursed_energy: number;
  
  strength: number;
  speed: number;
  endurance: number;
  reflexes: number;
  cursed_energy_control: number;
  technique_mastery: number;
  combat_experience: number;
  weapon_proficiency: number;
  
  age: number;
  gender: string;
  appearance: string;
  background: string;
  affiliation: string;
  cursed_technique: string;
  personal_goal: string;
  
  money: number;
  level: number;
  xp: number;
  location_id: string;
  locations?: Location;
}

export interface Location {
  id: string;
  name: string;
  description: string;
  region: string;
}

export interface Character {
  id: string;
  name: string;
  age: number;
  appearance: string;
  background: string;
  personality: string;
  occupation: string;
  affiliation: string;
  current_location_id: string;
  current_activity: string;
  current_mood: string;
}

export interface Relationship {
  id: string;
  character_id: string;
  target_id: string;
  friendship: number;
  trust: number;
  respect: number;
  status: string;
  characters?: { name: string }; // joined data
}

export interface ActionHistory {
  id: string;
  action_text: string;
  narration: string;
  day: number;
  time_of_day: string;
  created_at: string;
}

