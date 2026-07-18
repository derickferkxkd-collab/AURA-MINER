export interface DatabaseState {
  users: User[];
  investments: any[];
  movements: any[];
  miningRigs: any[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  status?: string;
}

const STORAGE_KEY = "aura_miner_db";

export function loadDatabase(): DatabaseState {
  const data = localStorage.getItem(STORAGE_KEY);

  if (data) {
    return JSON.parse(data);
  }

  return {
    users: [],
    investments: [],
    movements: [],
    miningRigs: []
  };
}

export function saveDatabase(state: DatabaseState) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );
}

export function resetDatabaseToDefault(): DatabaseState {
  const defaultData: DatabaseState = {
    users: [],
    investments: [],
    movements: [],
    miningRigs: []
  };

  saveDatabase(defaultData);

  return defaultData;
}