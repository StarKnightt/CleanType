use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum FontStyle {
    #[serde(rename = "system")]
    System,
    #[serde(rename = "lato")]
    Sans,
    #[serde(rename = "arial")]
    Mono,
    #[serde(rename = "serif")]
    Serif,
    #[serde(rename = "script")]
    Script,
    #[serde(rename = "elegant")]
    Elegant,
    #[serde(rename = "classic")]
    Classic,
    #[serde(rename = "playpen")]
    Playpen,
}

impl FontStyle {
    pub fn label(&self) -> &'static str {
        match self {
            FontStyle::System => "Inter",
            FontStyle::Sans => "Sans",
            FontStyle::Mono => "Mono",
            FontStyle::Serif => "Serif",
            FontStyle::Script => "Script",
            FontStyle::Elegant => "Elegant",
            FontStyle::Classic => "Classic",
            FontStyle::Playpen => "Playpen",
        }
    }

    pub fn all() -> Vec<FontStyle> {
        vec![
            FontStyle::System,
            FontStyle::Sans,
            FontStyle::Mono,
            FontStyle::Serif,
            FontStyle::Script,
            FontStyle::Elegant,
            FontStyle::Classic,
            FontStyle::Playpen,
        ]
    }

    pub fn basic() -> Vec<FontStyle> {
        vec![
            FontStyle::System,
            FontStyle::Sans,
            FontStyle::Mono,
            FontStyle::Serif,
        ]
    }

    pub fn calligraphy() -> Vec<FontStyle> {
        vec![
            FontStyle::Playpen,
            FontStyle::Script,
            FontStyle::Elegant,
            FontStyle::Classic,
        ]
    }

    pub fn random() -> FontStyle {
        use rand::Rng;
        let all = Self::all();
        let idx = rand::thread_rng().gen_range(0..all.len());
        all[idx].clone()
    }
}

impl Default for FontStyle {
    fn default() -> Self {
        FontStyle::System
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum Theme {
    #[serde(rename = "dark")]
    Dark,
    #[serde(rename = "light")]
    Light,
}

impl Default for Theme {
    fn default() -> Self {
        Theme::Dark
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Entry {
    pub id: String,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub title: String,
    pub font: FontStyle,
    pub font_size: u32,
    pub theme: Theme,
}

impl Entry {
    pub fn new() -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            content: String::new(),
            created_at: now,
            updated_at: now,
            title: "Untitled".to_string(),
            font: FontStyle::default(),
            font_size: 28,
            theme: Theme::default(),
        }
    }

    pub fn word_count(&self) -> usize {
        self.content
            .split_whitespace()
            .filter(|s| !s.is_empty())
            .count()
    }

    pub fn preview(&self, max_len: usize) -> String {
        if self.content.len() <= max_len {
            self.content.clone()
        } else {
            format!("{}...", &self.content[..max_len])
        }
    }
}

impl Default for Entry {
    fn default() -> Self {
        Self::new()
    }
}

