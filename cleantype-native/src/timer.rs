use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
pub struct Timer {
    pub duration: Duration,
    pub remaining: Duration,
    pub is_running: bool,
    pub started_at: Option<Instant>,
    pub paused_remaining: Option<Duration>,
}

impl Timer {
    pub fn new() -> Self {
        Self {
            duration: Duration::ZERO,
            remaining: Duration::ZERO,
            is_running: false,
            started_at: None,
            paused_remaining: None,
        }
    }

    pub fn start(&mut self, minutes: u64) {
        self.duration = Duration::from_secs(minutes * 60);
        self.remaining = self.duration;
        self.is_running = true;
        self.started_at = Some(Instant::now());
        self.paused_remaining = None;
    }

    pub fn pause(&mut self) {
        if self.is_running {
            self.paused_remaining = Some(self.remaining);
            self.is_running = false;
            self.started_at = None;
        }
    }

    pub fn resume(&mut self) {
        if !self.is_running && self.paused_remaining.is_some() {
            self.remaining = self.paused_remaining.take().unwrap();
            self.is_running = true;
            self.started_at = Some(Instant::now());
        }
    }

    pub fn reset(&mut self) {
        self.is_running = false;
        self.remaining = Duration::ZERO;
        self.duration = Duration::ZERO;
        self.started_at = None;
        self.paused_remaining = None;
    }

    pub fn update(&mut self) -> bool {
        if self.is_running {
            if let Some(started_at) = self.started_at {
                let elapsed = started_at.elapsed();
                let base = self.paused_remaining.unwrap_or(self.duration);
                
                if elapsed >= base {
                    self.remaining = Duration::ZERO;
                    self.is_running = false;
                    self.started_at = None;
                    return true; // Timer completed
                } else {
                    self.remaining = base - elapsed;
                }
            }
        }
        false
    }

    pub fn format_time(&self) -> String {
        let total_secs = self.remaining.as_secs();
        let minutes = total_secs / 60;
        let seconds = total_secs % 60;
        format!("{:02}:{:02}", minutes, seconds)
    }

    pub fn has_time(&self) -> bool {
        self.remaining > Duration::ZERO || self.is_running
    }
}

impl Default for Timer {
    fn default() -> Self {
        Self::new()
    }
}

pub const TIMER_PRESETS: &[u64] = &[5, 10, 15, 20, 25, 30, 45, 60];

