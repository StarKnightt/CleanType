use crate::entry::{Entry, FontStyle, Theme};
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppState {
    pub entries: Vec<Entry>,
    pub current_content: String,
    pub current_font: FontStyle,
    pub current_font_size: u32,
    pub theme: Theme,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            entries: Vec::new(),
            current_content: String::new(),
            current_font: FontStyle::default(),
            current_font_size: 28,
            theme: Theme::Dark,
        }
    }
}

pub struct Storage {
    data_dir: PathBuf,
}

impl Storage {
    pub fn new() -> Self {
        let data_dir = if let Some(proj_dirs) = ProjectDirs::from("com", "starknightt", "cleantype")
        {
            proj_dirs.data_dir().to_path_buf()
        } else {
            // Fallback to current directory
            PathBuf::from(".")
        };

        // Create directory if it doesn't exist
        if !data_dir.exists() {
            let _ = fs::create_dir_all(&data_dir);
        }

        Self { data_dir }
    }

    fn state_path(&self) -> PathBuf {
        self.data_dir.join("state.json")
    }

    fn entries_path(&self) -> PathBuf {
        self.data_dir.join("entries.json")
    }

    pub fn load_state(&self) -> AppState {
        // Try to load state
        if let Ok(content) = fs::read_to_string(self.state_path()) {
            if let Ok(state) = serde_json::from_str::<AppState>(&content) {
                return state;
            }
        }

        // Try to load entries separately (backward compatibility)
        let mut state = AppState::default();
        if let Ok(content) = fs::read_to_string(self.entries_path()) {
            if let Ok(entries) = serde_json::from_str::<Vec<Entry>>(&content) {
                state.entries = entries;
            }
        }

        state
    }

    pub fn save_state(&self, state: &AppState) -> Result<(), std::io::Error> {
        let json = serde_json::to_string_pretty(state)?;
        fs::write(self.state_path(), json)?;
        Ok(())
    }

    pub fn save_entries(&self, entries: &[Entry]) -> Result<(), std::io::Error> {
        let json = serde_json::to_string_pretty(entries)?;
        fs::write(self.entries_path(), json)?;
        Ok(())
    }
}

impl Default for Storage {
    fn default() -> Self {
        Self::new()
    }
}

