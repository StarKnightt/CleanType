use std::time::{Duration, Instant};

#[derive(Debug, Clone)]
pub enum ToastType {
    Success,
    Error,
    Info,
}

#[derive(Debug, Clone)]
pub struct Toast {
    pub message: String,
    pub toast_type: ToastType,
    pub created_at: Instant,
    pub duration: Duration,
}

impl Toast {
    pub fn success(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            toast_type: ToastType::Success,
            created_at: Instant::now(),
            duration: Duration::from_secs(2),
        }
    }

    pub fn error(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            toast_type: ToastType::Error,
            created_at: Instant::now(),
            duration: Duration::from_secs(3),
        }
    }

    pub fn info(message: impl Into<String>) -> Self {
        Self {
            message: message.into(),
            toast_type: ToastType::Info,
            created_at: Instant::now(),
            duration: Duration::from_secs(2),
        }
    }

    pub fn is_expired(&self) -> bool {
        self.created_at.elapsed() >= self.duration
    }

    pub fn opacity(&self) -> f32 {
        let elapsed = self.created_at.elapsed().as_secs_f32();
        let total = self.duration.as_secs_f32();
        
        // Fade in for first 0.2s, fade out for last 0.3s
        if elapsed < 0.2 {
            elapsed / 0.2
        } else if elapsed > total - 0.3 {
            (total - elapsed) / 0.3
        } else {
            1.0
        }
    }
}

#[derive(Debug, Default)]
pub struct ToastManager {
    pub toasts: Vec<Toast>,
}

impl ToastManager {
    pub fn new() -> Self {
        Self { toasts: Vec::new() }
    }

    pub fn show(&mut self, toast: Toast) {
        self.toasts.push(toast);
    }

    pub fn success(&mut self, message: impl Into<String>) {
        self.show(Toast::success(message));
    }

    pub fn error(&mut self, message: impl Into<String>) {
        self.show(Toast::error(message));
    }

    pub fn info(&mut self, message: impl Into<String>) {
        self.show(Toast::info(message));
    }

    pub fn update(&mut self) {
        self.toasts.retain(|t| !t.is_expired());
    }
}

