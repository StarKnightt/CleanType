use crate::entry::{Entry, FontStyle, Theme};
use crate::fonts::get_font_id;
use crate::storage::{AppState, Storage};
use crate::theme::ThemeColors;
use crate::timer::{Timer, TIMER_PRESETS};
use crate::toast::ToastManager;
use chrono::Utc;
use eframe::egui::{self, Color32, Key, RichText, Rounding, Sense, Stroke, Vec2};
use std::time::{Duration, Instant};

const SIZE_PRESETS: &[u32] = &[16, 18, 20, 24, 28, 32, 36, 42, 48];

const PLACEHOLDERS: &[&str] = &[
    "Start writing your story...",
    "What's on your mind today?",
    "Share your thoughts and dreams...",
    "Write about your favorite memory...",
    "What are your goals for today?",
    "Describe a place you'd love to visit...",
    "Write a letter to your future self...",
];

pub struct CleanTypeApp {
    // Core state
    content: String,
    current_entry: Option<Entry>,
    entries: Vec<Entry>,
    has_unsaved_changes: bool,

    // Editor settings
    current_font: FontStyle,
    font_size: u32,
    theme: Theme,

    // UI state
    show_history: bool,
    show_font_menu: bool,
    show_size_menu: bool,
    show_timer_menu: bool,
    show_shortcuts: bool,
    search_query: String,
    editing_title_id: Option<String>,
    edited_title: String,

    // Entry deletion
    entry_to_delete: Option<String>,
    show_clear_all_confirm: bool,

    // Undo/Redo
    undo_stack: Vec<String>,
    redo_stack: Vec<String>,
    last_undo_content: String,

    // Timer
    timer: Timer,

    // Toast notifications
    toasts: ToastManager,

    // Placeholder rotation
    current_placeholder: usize,
    last_placeholder_change: Instant,

    // Storage
    storage: Storage,

    // Auto-save
    last_save: Instant,
    auto_save_interval: Duration,

    // Animation state
    history_anim: f32,
    button_hovers: std::collections::HashMap<String, f32>,
}

impl CleanTypeApp {
    pub fn new(_cc: &eframe::CreationContext<'_>) -> Self {
        let storage = Storage::new();
        let state = storage.load_state();

        let current_entry = if !state.entries.is_empty() {
            Some(state.entries[0].clone())
        } else {
            let new_entry = Entry::new();
            Some(new_entry)
        };

        let content = current_entry
            .as_ref()
            .map(|e| e.content.clone())
            .unwrap_or_default();

        Self {
            content: content.clone(),
            current_entry,
            entries: state.entries,
            has_unsaved_changes: false,

            current_font: state.current_font,
            font_size: state.current_font_size,
            theme: state.theme,

            show_history: false,
            show_font_menu: false,
            show_size_menu: false,
            show_timer_menu: false,
            show_shortcuts: false,
            search_query: String::new(),
            editing_title_id: None,
            edited_title: String::new(),

            entry_to_delete: None,
            show_clear_all_confirm: false,

            undo_stack: vec![content.clone()],
            redo_stack: Vec::new(),
            last_undo_content: content,

            timer: Timer::new(),
            toasts: ToastManager::new(),

            current_placeholder: 0,
            last_placeholder_change: Instant::now(),

            storage,
            last_save: Instant::now(),
            auto_save_interval: Duration::from_millis(300),

            history_anim: 0.0,
            button_hovers: std::collections::HashMap::new(),
        }
    }

    fn save_state(&self) {
        let state = AppState {
            entries: self.entries.clone(),
            current_content: self.content.clone(),
            current_font: self.current_font.clone(),
            current_font_size: self.font_size,
            theme: self.theme.clone(),
        };
        let _ = self.storage.save_state(&state);
    }

    fn handle_save(&mut self) {
        if let Some(ref mut entry) = self.current_entry {
            entry.content = self.content.clone();
            entry.updated_at = Utc::now();
            entry.font = self.current_font.clone();
            entry.font_size = self.font_size;
            entry.theme = self.theme.clone();

            if let Some(idx) = self.entries.iter().position(|e| e.id == entry.id) {
                self.entries[idx] = entry.clone();
            } else {
                self.entries.insert(0, entry.clone());
            }

            if let Some(idx) = self.entries.iter().position(|e| e.id == entry.id) {
                let entry = self.entries.remove(idx);
                self.entries.insert(0, entry);
            }

            self.save_state();
            self.has_unsaved_changes = false;
            self.toasts.success("Saved to history");
        }
    }

    fn create_new_entry(&mut self) {
        let new_entry = Entry {
            font: self.current_font.clone(),
            font_size: self.font_size,
            theme: self.theme.clone(),
            ..Entry::new()
        };

        self.entries.insert(0, new_entry.clone());
        self.current_entry = Some(new_entry);
        self.content = String::new();
        self.has_unsaved_changes = false;
        self.undo_stack = vec![String::new()];
        self.redo_stack.clear();
        self.last_undo_content = String::new();

        self.save_state();
        self.toasts.success("New entry created");
    }

    fn select_entry(&mut self, entry: Entry) {
        self.current_entry = Some(entry.clone());
        self.content = entry.content.clone();
        self.current_font = entry.font.clone();
        self.font_size = entry.font_size;
        self.has_unsaved_changes = false;
        self.undo_stack = vec![entry.content.clone()];
        self.redo_stack.clear();
        self.last_undo_content = entry.content;
    }

    fn delete_entry(&mut self, id: &str) {
        self.entries.retain(|e| e.id != id);
        if self.current_entry.as_ref().map(|e| e.id.as_str()) == Some(id) {
            self.current_entry = self.entries.first().cloned();
            self.content = self
                .current_entry
                .as_ref()
                .map(|e| e.content.clone())
                .unwrap_or_default();
        }
        self.save_state();
        self.toasts.success("Entry deleted");
    }

    fn clear_all_entries(&mut self) {
        self.entries.clear();
        self.current_entry = None;
        self.content = String::new();
        self.save_state();
        self.toasts.success("All entries cleared");
    }

    fn handle_undo(&mut self) {
        if self.undo_stack.len() > 1 {
            if let Some(current) = self.undo_stack.pop() {
                self.redo_stack.push(current);
                if let Some(previous) = self.undo_stack.last() {
                    self.content = previous.clone();
                    self.last_undo_content = previous.clone();
                }
            }
        }
    }

    fn handle_redo(&mut self) {
        if let Some(next) = self.redo_stack.pop() {
            self.undo_stack.push(next.clone());
            self.content = next.clone();
            self.last_undo_content = next;
        }
    }

    fn push_undo(&mut self) {
        if self.content != self.last_undo_content {
            self.undo_stack.push(self.content.clone());
            self.redo_stack.clear();
            self.last_undo_content = self.content.clone();
        }
    }

    fn toggle_theme(&mut self) {
        self.theme = match self.theme {
            Theme::Dark => Theme::Light,
            Theme::Light => Theme::Dark,
        };
        self.save_state();
    }

    fn randomize_font(&mut self) {
        let all_fonts = FontStyle::all();
        let current_idx = all_fonts.iter().position(|f| *f == self.current_font);
        
        loop {
            let new_idx = rand::random::<usize>() % all_fonts.len();
            if Some(new_idx) != current_idx {
                self.current_font = all_fonts[new_idx].clone();
                break;
            }
            if all_fonts.len() <= 1 {
                break;
            }
        }
    }

    fn word_count(&self) -> usize {
        self.content
            .split_whitespace()
            .filter(|s| !s.is_empty())
            .count()
    }

    fn filtered_entries(&self) -> Vec<Entry> {
        if self.search_query.is_empty() {
            self.entries.clone()
        } else {
            let query = self.search_query.to_lowercase();
            self.entries
                .iter()
                .filter(|e| {
                    e.content.to_lowercase().contains(&query)
                        || e.title.to_lowercase().contains(&query)
                })
                .cloned()
                .collect()
        }
    }

    // Custom styled button
    fn pill_button(&mut self, ui: &mut egui::Ui, id: &str, text: &str, colors: &ThemeColors, accent: bool) -> bool {
        let hover = self.button_hovers.get(id).copied().unwrap_or(0.0);
        
        let bg = if accent {
            Color32::from_rgba_unmultiplied(
                colors.color_accent.r(),
                colors.color_accent.g(),
                colors.color_accent.b(),
                ((0.1 + hover * 0.15) * 255.0) as u8,
            )
        } else {
            Color32::from_rgba_unmultiplied(
                colors.color_primary.r(),
                colors.color_primary.g(),
                colors.color_primary.b(),
                ((0.0 + hover * 0.08) * 255.0) as u8,
            )
        };

        let text_color = if accent {
            colors.color_accent
        } else {
            Color32::from_rgba_unmultiplied(
                colors.color_primary.r(),
                colors.color_primary.g(),
                colors.color_primary.b(),
                ((0.6 + hover * 0.4) * 255.0) as u8,
            )
        };

        let response = ui.add(
            egui::Button::new(RichText::new(text).size(13.0).color(text_color))
                .fill(bg)
                .stroke(Stroke::NONE)
                .rounding(Rounding::same(16.0))
                .min_size(Vec2::new(0.0, 32.0)),
        );

        // Animate hover
        let target = if response.hovered() { 1.0 } else { 0.0 };
        let current = self.button_hovers.entry(id.to_string()).or_insert(0.0);
        *current += (target - *current) * 0.2;

        response.clicked()
    }

    // Floating action button
    fn fab_button(&mut self, ui: &mut egui::Ui, colors: &ThemeColors) -> bool {
        let hover = self.button_hovers.get("fab").copied().unwrap_or(0.0);
        
        let size = 48.0 + hover * 4.0;
        let bg = Color32::from_rgba_unmultiplied(
            colors.color_accent.r(),
            colors.color_accent.g(),
            colors.color_accent.b(),
            ((0.9 + hover * 0.1) * 255.0) as u8,
        );

        let response = ui.add(
            egui::Button::new(RichText::new("+").size(24.0 + hover * 2.0).color(Color32::WHITE).strong())
                .fill(bg)
                .stroke(Stroke::NONE)
                .rounding(Rounding::same(size / 2.0))
                .min_size(Vec2::splat(size)),
        );

        let target = if response.hovered() { 1.0 } else { 0.0 };
        let current = self.button_hovers.entry("fab".to_string()).or_insert(0.0);
        *current += (target - *current) * 0.15;

        response.clicked()
    }
}

impl eframe::App for CleanTypeApp {
    fn update(&mut self, ctx: &egui::Context, _frame: &mut eframe::Frame) {
        // Get colors for current theme
        let colors = ThemeColors::from_theme(&self.theme);

        // Set custom visuals
        let mut visuals = match self.theme {
            Theme::Dark => egui::Visuals::dark(),
            Theme::Light => egui::Visuals::light(),
        };
        visuals.panel_fill = colors.bg_primary;
        visuals.window_fill = colors.bg_primary;
        visuals.window_rounding = Rounding::same(16.0);
        visuals.window_shadow = egui::epaint::Shadow {
            offset: Vec2::new(0.0, 8.0),
            blur: 24.0,
            spread: 0.0,
            color: Color32::from_black_alpha(60),
        };
        visuals.widgets.noninteractive.rounding = Rounding::same(8.0);
        visuals.widgets.inactive.rounding = Rounding::same(8.0);
        visuals.widgets.hovered.rounding = Rounding::same(8.0);
        visuals.widgets.active.rounding = Rounding::same(8.0);
        ctx.set_visuals(visuals);

        // Update timer
        if self.timer.update() {
            self.toasts.success("Timer completed!");
        }

        // Update toasts
        self.toasts.update();

        // Update placeholder
        if self.last_placeholder_change.elapsed() > Duration::from_secs(3) {
            self.current_placeholder = (self.current_placeholder + 1) % PLACEHOLDERS.len();
            self.last_placeholder_change = Instant::now();
        }

        // Animate history panel
        let target_anim = if self.show_history { 1.0 } else { 0.0 };
        self.history_anim += (target_anim - self.history_anim) * 0.15;

        // Auto-save
        if self.has_unsaved_changes && self.last_save.elapsed() > self.auto_save_interval {
            if let Some(ref mut entry) = self.current_entry {
                entry.content = self.content.clone();
                entry.updated_at = Utc::now();
                if let Some(idx) = self.entries.iter().position(|e| e.id == entry.id) {
                    self.entries[idx] = entry.clone();
                }
            }
            self.save_state();
            self.last_save = Instant::now();
        }

        // Handle keyboard shortcuts
        ctx.input(|i| {
            if i.modifiers.ctrl && i.key_pressed(Key::S) {
                self.handle_save();
            }
            if i.modifiers.ctrl && i.key_pressed(Key::N) {
                self.create_new_entry();
            }
            if i.modifiers.ctrl && !i.modifiers.shift && i.key_pressed(Key::Z) {
                self.handle_undo();
            }
            if i.modifiers.ctrl && (i.key_pressed(Key::Y) || (i.modifiers.shift && i.key_pressed(Key::Z))) {
                self.handle_redo();
            }
            if i.modifiers.ctrl && i.key_pressed(Key::Slash) {
                self.show_shortcuts = !self.show_shortcuts;
            }
            if i.key_pressed(Key::F11) {
                ctx.send_viewport_cmd(egui::ViewportCommand::Fullscreen(
                    !ctx.input(|i| i.viewport().fullscreen.unwrap_or(false)),
                ));
            }
            if i.key_pressed(Key::Escape) {
                self.show_history = false;
                self.show_shortcuts = false;
                self.show_font_menu = false;
                self.show_size_menu = false;
                self.show_timer_menu = false;
            }
            if i.modifiers.ctrl {
                let scroll = i.raw_scroll_delta.y;
                if scroll != 0.0 {
                    let delta = if scroll > 0.0 { 2i32 } else { -2i32 };
                    self.font_size = (self.font_size as i32 + delta).clamp(12, 72) as u32;
                    self.toasts.info(format!("Font size: {}px", self.font_size));
                }
            }
        });

        // Main panel with gradient-like background
        egui::CentralPanel::default()
            .frame(egui::Frame::none().fill(colors.bg_primary))
            .show(ctx, |ui| {
                let screen = ui.max_rect();
                let history_width = 340.0 * self.history_anim;
                let main_width = screen.width() - history_width;

                // Main editor area
                let main_rect = egui::Rect::from_min_size(
                    screen.min,
                    Vec2::new(main_width, screen.height()),
                );

                ui.allocate_new_ui(egui::UiBuilder::new().max_rect(main_rect), |ui| {
                    // Top bar
                    ui.add_space(24.0);
                    ui.horizontal(|ui| {
                        ui.add_space(32.0);
                        
                        // Word count with subtle styling
                        let count = self.word_count();
                        let word_text = format!("{} {}", count, if count == 1 { "word" } else { "words" });
                        
                        egui::Frame::none()
                            .fill(colors.bg_secondary)
                            .rounding(Rounding::same(12.0))
                            .inner_margin(egui::Margin::symmetric(12.0, 6.0))
                            .show(ui, |ui| {
                                ui.label(RichText::new(word_text).size(13.0).color(colors.color_muted));
                            });

                        ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                            ui.add_space(32.0);
                            
                            // New entry FAB
                            if self.fab_button(ui, &colors) {
                                self.create_new_entry();
                            }
                        });
                    });

                    // Editor area
                    let editor_margin = 48.0;
                    let available = ui.available_rect_before_wrap();
                    let editor_rect = egui::Rect::from_min_max(
                        egui::pos2(available.min.x + editor_margin, available.min.y + 20.0),
                        egui::pos2(available.max.x - editor_margin, available.max.y - 80.0),
                    );

                    ui.allocate_new_ui(egui::UiBuilder::new().max_rect(editor_rect), |ui| {
                        egui::ScrollArea::vertical()
                            .auto_shrink([false, false])
                            .show(ui, |ui| {
                                let font_id = get_font_id(&self.current_font, self.font_size as f32);
                                
                                // Styled text editor
                                let response = ui.add_sized(
                                    Vec2::new(ui.available_width(), ui.available_height().max(400.0)),
                                    egui::TextEdit::multiline(&mut self.content)
                                        .font(font_id)
                                        .text_color(colors.color_primary)
                                        .frame(false)
                                        .desired_width(f32::INFINITY)
                                        .margin(egui::Margin::same(0.0))
                                        .hint_text(
                                            RichText::new(PLACEHOLDERS[self.current_placeholder])
                                                .size(self.font_size as f32)
                                                .color(colors.color_muted.linear_multiply(0.5)),
                                        ),
                                );

                                if response.changed() {
                                    self.has_unsaved_changes = true;
                                    self.push_undo();
                                }
                            });
                    });

                    // Bottom navigation - floating pill style
                    let nav_width = 700.0_f32.min(main_width - 64.0);
                    let nav_x = (main_width - nav_width) / 2.0;
                    let nav_rect = egui::Rect::from_min_size(
                        egui::pos2(nav_x, screen.height() - 70.0),
                        Vec2::new(nav_width, 50.0),
                    );

                    ui.allocate_new_ui(egui::UiBuilder::new().max_rect(nav_rect), |ui| {
                        egui::Frame::none()
                            .fill(colors.bg_secondary)
                            .rounding(Rounding::same(25.0))
                            .stroke(Stroke::new(1.0, colors.border_color))
                            .inner_margin(egui::Margin::symmetric(16.0, 8.0))
                            .show(ui, |ui| {
                                ui.horizontal_centered(|ui| {
                                    ui.spacing_mut().item_spacing.x = 4.0;

                                    // Font size
                                    if self.pill_button(ui, "size", &format!("{}px", self.font_size), &colors, false) {
                                        self.show_size_menu = !self.show_size_menu;
                                        self.show_font_menu = false;
                                        self.show_timer_menu = false;
                                    }

                                    ui.label(RichText::new("·").size(16.0).color(colors.color_muted));

                                    // Fonts
                                    if self.pill_button(ui, "fonts", "Fonts", &colors, false) {
                                        self.show_font_menu = !self.show_font_menu;
                                        self.show_size_menu = false;
                                        self.show_timer_menu = false;
                                    }

                                    ui.label(RichText::new("·").size(16.0).color(colors.color_muted));

                                    // Random
                                    if self.pill_button(ui, "random", "Random", &colors, false) {
                                        self.randomize_font();
                                    }

                                    // Spacer
                                    ui.add_space(ui.available_width() - 280.0);

                                    // Timer
                                    let timer_text = if self.timer.has_time() {
                                        self.timer.format_time()
                                    } else {
                                        "Timer".to_string()
                                    };
                                    if self.pill_button(ui, "timer", &timer_text, &colors, self.timer.is_running) {
                                        self.show_timer_menu = !self.show_timer_menu;
                                        self.show_font_menu = false;
                                        self.show_size_menu = false;
                                    }

                                    ui.label(RichText::new("·").size(16.0).color(colors.color_muted));

                                    // History
                                    if self.pill_button(ui, "history", "History", &colors, self.show_history) {
                                        self.show_history = !self.show_history;
                                    }

                                    ui.label(RichText::new("·").size(16.0).color(colors.color_muted));

                                    // Theme
                                    let theme_icon = match self.theme {
                                        Theme::Dark => "◐",
                                        Theme::Light => "◑",
                                    };
                                    if self.pill_button(ui, "theme", theme_icon, &colors, false) {
                                        self.toggle_theme();
                                    }

                                    ui.label(RichText::new("·").size(16.0).color(colors.color_muted));

                                    // Save
                                    if self.pill_button(ui, "save", "Save", &colors, self.has_unsaved_changes) {
                                        self.handle_save();
                                    }
                                });
                            });
                    });
                });

                // History panel (animated slide-in)
                if self.history_anim > 0.01 {
                    let history_rect = egui::Rect::from_min_size(
                        egui::pos2(main_width, screen.min.y),
                        Vec2::new(history_width, screen.height()),
                    );

                    ui.allocate_new_ui(egui::UiBuilder::new().max_rect(history_rect), |ui| {
                        egui::Frame::none()
                            .fill(colors.bg_secondary)
                            .stroke(Stroke::new(1.0, colors.border_color))
                            .show(ui, |ui| {
                                ui.set_clip_rect(history_rect);
                                
                                ui.add_space(20.0);
                                ui.horizontal(|ui| {
                                    ui.add_space(20.0);
                                    ui.heading(RichText::new("History").size(20.0).color(colors.color_primary).strong());
                                    
                                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                        ui.add_space(20.0);
                                        if ui.add(
                                            egui::Button::new(RichText::new("✕").size(16.0).color(colors.color_muted))
                                                .fill(Color32::TRANSPARENT)
                                                .stroke(Stroke::NONE)
                                        ).clicked() {
                                            self.show_history = false;
                                        }
                                        
                                        if ui.add(
                                            egui::Button::new(RichText::new("+ New").size(13.0).color(colors.color_accent))
                                                .fill(colors.color_accent.linear_multiply(0.1))
                                                .stroke(Stroke::NONE)
                                                .rounding(Rounding::same(12.0))
                                        ).clicked() {
                                            self.create_new_entry();
                                        }
                                    });
                                });

                                ui.add_space(12.0);
                                
                                // Search
                                ui.horizontal(|ui| {
                                    ui.add_space(20.0);
                                    egui::Frame::none()
                                        .fill(colors.bg_primary)
                                        .rounding(Rounding::same(12.0))
                                        .inner_margin(egui::Margin::symmetric(12.0, 8.0))
                                        .show(ui, |ui| {
                                            ui.add(
                                                egui::TextEdit::singleline(&mut self.search_query)
                                                    .hint_text(RichText::new("🔍 Search...").color(colors.color_muted))
                                                    .frame(false)
                                                    .desired_width(history_width - 64.0),
                                            );
                                        });
                                    ui.add_space(20.0);
                                });

                                ui.add_space(16.0);

                                // Entries
                                egui::ScrollArea::vertical()
                                    .auto_shrink([false, false])
                                    .show(ui, |ui| {
                                        let entries = self.filtered_entries();

                                        if entries.is_empty() {
                                            ui.vertical_centered(|ui| {
                                                ui.add_space(40.0);
                                                ui.label(
                                                    RichText::new(if self.search_query.is_empty() {
                                                        "No entries yet\nClick + to create one"
                                                    } else {
                                                        "No matching entries"
                                                    })
                                                    .size(14.0)
                                                    .color(colors.color_muted),
                                                );
                                            });
                                        } else {
                                            for entry in entries {
                                                let is_current = self.current_entry.as_ref().map(|e| e.id == entry.id).unwrap_or(false);
                                                let entry_id = entry.id.clone();
                                                let entry_clone = entry.clone();

                                                ui.horizontal(|ui| {
                                                    ui.add_space(16.0);
                                                    
                                                    let card_bg = if is_current {
                                                        colors.color_accent.linear_multiply(0.1)
                                                    } else {
                                                        colors.bg_primary
                                                    };

                                                    egui::Frame::none()
                                                        .fill(card_bg)
                                                        .rounding(Rounding::same(12.0))
                                                        .stroke(if is_current {
                                                            Stroke::new(1.0, colors.color_accent.linear_multiply(0.3))
                                                        } else {
                                                            Stroke::NONE
                                                        })
                                                        .inner_margin(egui::Margin::same(14.0))
                                                        .show(ui, |ui| {
                                                            ui.set_width(history_width - 48.0);
                                                            
                                                            let response = ui.interact(
                                                                ui.max_rect(),
                                                                egui::Id::new(&entry.id),
                                                                Sense::click(),
                                                            );

                                                            ui.vertical(|ui| {
                                                                // Title row
                                                                ui.horizontal(|ui| {
                                                                    if self.editing_title_id.as_ref() == Some(&entry.id) {
                                                                        let resp = ui.add(
                                                                            egui::TextEdit::singleline(&mut self.edited_title)
                                                                                .desired_width(150.0),
                                                                        );
                                                                        if resp.lost_focus() {
                                                                            if let Some(idx) = self.entries.iter().position(|e| e.id == entry.id) {
                                                                                self.entries[idx].title = self.edited_title.clone();
                                                                                self.save_state();
                                                                            }
                                                                            self.editing_title_id = None;
                                                                        }
                                                                    } else {
                                                                        let title_resp = ui.add(
                                                                            egui::Label::new(
                                                                                RichText::new(&entry.title)
                                                                                    .size(14.0)
                                                                                    .color(colors.color_primary)
                                                                                    .strong(),
                                                                            ).sense(Sense::click()),
                                                                        );
                                                                        if title_resp.double_clicked() {
                                                                            self.editing_title_id = Some(entry.id.clone());
                                                                            self.edited_title = entry.title.clone();
                                                                        }
                                                                    }

                                                                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                                                        ui.label(
                                                                            RichText::new(entry.created_at.format("%b %d").to_string())
                                                                                .size(11.0)
                                                                                .color(colors.color_muted),
                                                                        );
                                                                    });
                                                                });

                                                                // Preview
                                                                ui.add_space(4.0);
                                                                ui.label(
                                                                    RichText::new(entry.preview(80))
                                                                        .size(12.0)
                                                                        .color(colors.color_secondary),
                                                                );

                                                                // Footer
                                                                ui.add_space(8.0);
                                                                ui.horizontal(|ui| {
                                                                    ui.label(
                                                                        RichText::new(format!("{} words", entry.word_count()))
                                                                            .size(11.0)
                                                                            .color(colors.color_muted),
                                                                    );

                                                                    ui.with_layout(egui::Layout::right_to_left(egui::Align::Center), |ui| {
                                                                        if ui.add(
                                                                            egui::Button::new(
                                                                                RichText::new("🗑").size(11.0).color(colors.color_muted),
                                                                            )
                                                                            .fill(Color32::TRANSPARENT)
                                                                            .stroke(Stroke::NONE),
                                                                        ).clicked() {
                                                                            self.entry_to_delete = Some(entry_id.clone());
                                                                        }
                                                                    });
                                                                });
                                                            });

                                                            if response.clicked() && self.editing_title_id.is_none() {
                                                                self.select_entry(entry_clone);
                                                            }
                                                        });
                                                    
                                                    ui.add_space(16.0);
                                                });
                                                ui.add_space(8.0);
                                            }
                                        }

                                        // Clear all button at bottom
                                        ui.add_space(20.0);
                                        ui.vertical_centered(|ui| {
                                            if ui.add(
                                                egui::Button::new(
                                                    RichText::new("Clear All").size(12.0).color(colors.color_muted),
                                                )
                                                .fill(Color32::TRANSPARENT)
                                                .stroke(Stroke::new(1.0, colors.border_color))
                                                .rounding(Rounding::same(8.0)),
                                            ).clicked() {
                                                self.show_clear_all_confirm = true;
                                            }
                                        });
                                        ui.add_space(20.0);
                                    });
                            });
                    });
                }
            });

        // Popup menus
        if self.show_size_menu {
            egui::Window::new("size_picker")
                .title_bar(false)
                .resizable(false)
                .collapsible(false)
                .fixed_pos(egui::pos2(
                    (ctx.screen_rect().width() - 340.0 * self.history_anim) / 2.0 - 280.0,
                    ctx.screen_rect().height() - 180.0,
                ))
                .frame(egui::Frame::popup(&ctx.style())
                    .fill(colors.bg_primary)
                    .rounding(Rounding::same(16.0))
                    .stroke(Stroke::new(1.0, colors.border_color))
                    .shadow(egui::epaint::Shadow {
                        offset: Vec2::new(0.0, 4.0),
                        blur: 16.0,
                        spread: 0.0,
                        color: Color32::from_black_alpha(40),
                    }))
                .show(ctx, |ui| {
                    ui.set_min_width(100.0);
                    for size in SIZE_PRESETS {
                        let is_selected = self.font_size == *size;
                        if ui.add(
                            egui::Button::new(
                                RichText::new(format!("{}px", size))
                                    .size(14.0)
                                    .color(if is_selected { colors.color_accent } else { colors.color_primary }),
                            )
                            .fill(if is_selected { colors.color_accent.linear_multiply(0.1) } else { Color32::TRANSPARENT })
                            .stroke(Stroke::NONE)
                            .rounding(Rounding::same(8.0))
                            .min_size(Vec2::new(80.0, 32.0)),
                        ).clicked() {
                            self.font_size = *size;
                            self.show_size_menu = false;
                        }
                    }
                });
        }

        if self.show_font_menu {
            egui::Window::new("font_picker")
                .title_bar(false)
                .resizable(false)
                .collapsible(false)
                .fixed_pos(egui::pos2(
                    (ctx.screen_rect().width() - 340.0 * self.history_anim) / 2.0 - 200.0,
                    ctx.screen_rect().height() - 280.0,
                ))
                .frame(egui::Frame::popup(&ctx.style())
                    .fill(colors.bg_primary)
                    .rounding(Rounding::same(16.0))
                    .stroke(Stroke::new(1.0, colors.border_color))
                    .shadow(egui::epaint::Shadow {
                        offset: Vec2::new(0.0, 4.0),
                        blur: 16.0,
                        spread: 0.0,
                        color: Color32::from_black_alpha(40),
                    }))
                .show(ctx, |ui| {
                    ui.set_min_width(140.0);
                    
                    ui.label(RichText::new("Basic").size(11.0).color(colors.color_muted));
                    ui.add_space(4.0);
                    for font in FontStyle::basic() {
                        let is_selected = self.current_font == font;
                        if ui.add(
                            egui::Button::new(
                                RichText::new(font.label())
                                    .size(14.0)
                                    .color(if is_selected { colors.color_accent } else { colors.color_primary }),
                            )
                            .fill(if is_selected { colors.color_accent.linear_multiply(0.1) } else { Color32::TRANSPARENT })
                            .stroke(Stroke::NONE)
                            .rounding(Rounding::same(8.0))
                            .min_size(Vec2::new(120.0, 32.0)),
                        ).clicked() {
                            self.current_font = font;
                            self.show_font_menu = false;
                        }
                    }
                    
                    ui.add_space(8.0);
                    ui.separator();
                    ui.add_space(8.0);
                    
                    ui.label(RichText::new("Decorative").size(11.0).color(colors.color_muted));
                    ui.add_space(4.0);
                    for font in FontStyle::calligraphy() {
                        let is_selected = self.current_font == font;
                        if ui.add(
                            egui::Button::new(
                                RichText::new(font.label())
                                    .size(14.0)
                                    .color(if is_selected { colors.color_accent } else { colors.color_primary }),
                            )
                            .fill(if is_selected { colors.color_accent.linear_multiply(0.1) } else { Color32::TRANSPARENT })
                            .stroke(Stroke::NONE)
                            .rounding(Rounding::same(8.0))
                            .min_size(Vec2::new(120.0, 32.0)),
                        ).clicked() {
                            self.current_font = font;
                            self.show_font_menu = false;
                        }
                    }
                });
        }

        if self.show_timer_menu {
            egui::Window::new("timer_picker")
                .title_bar(false)
                .resizable(false)
                .collapsible(false)
                .fixed_pos(egui::pos2(
                    (ctx.screen_rect().width() - 340.0 * self.history_anim) / 2.0 + 60.0,
                    ctx.screen_rect().height() - 220.0,
                ))
                .frame(egui::Frame::popup(&ctx.style())
                    .fill(colors.bg_primary)
                    .rounding(Rounding::same(16.0))
                    .stroke(Stroke::new(1.0, colors.border_color))
                    .shadow(egui::epaint::Shadow {
                        offset: Vec2::new(0.0, 4.0),
                        blur: 16.0,
                        spread: 0.0,
                        color: Color32::from_black_alpha(40),
                    }))
                .show(ctx, |ui| {
                    ui.set_min_width(180.0);

                    if self.timer.has_time() {
                        ui.vertical_centered(|ui| {
                            ui.label(
                                RichText::new(self.timer.format_time())
                                    .size(32.0)
                                    .color(colors.color_accent)
                                    .strong(),
                            );
                        });
                        ui.add_space(12.0);
                        ui.horizontal(|ui| {
                            if self.timer.is_running {
                                if ui.add(
                                    egui::Button::new(RichText::new("⏸ Pause").size(13.0))
                                        .rounding(Rounding::same(8.0))
                                        .min_size(Vec2::new(75.0, 32.0)),
                                ).clicked() {
                                    self.timer.pause();
                                    self.toasts.info("Timer paused");
                                }
                            } else {
                                if ui.add(
                                    egui::Button::new(RichText::new("▶ Resume").size(13.0))
                                        .rounding(Rounding::same(8.0))
                                        .min_size(Vec2::new(75.0, 32.0)),
                                ).clicked() {
                                    self.timer.resume();
                                    self.toasts.info("Timer resumed");
                                }
                            }
                            if ui.add(
                                egui::Button::new(RichText::new("Reset").size(13.0).color(colors.color_muted))
                                    .fill(Color32::TRANSPARENT)
                                    .stroke(Stroke::new(1.0, colors.border_color))
                                    .rounding(Rounding::same(8.0))
                                    .min_size(Vec2::new(60.0, 32.0)),
                            ).clicked() {
                                self.timer.reset();
                                self.toasts.info("Timer reset");
                            }
                        });
                        ui.add_space(8.0);
                        ui.separator();
                        ui.add_space(8.0);
                    }

                    ui.label(RichText::new("Quick start").size(11.0).color(colors.color_muted));
                    ui.add_space(4.0);
                    
                    ui.horizontal_wrapped(|ui| {
                        ui.spacing_mut().item_spacing = Vec2::new(6.0, 6.0);
                        for &mins in TIMER_PRESETS {
                            if ui.add(
                                egui::Button::new(RichText::new(format!("{}m", mins)).size(13.0))
                                    .fill(colors.bg_secondary)
                                    .stroke(Stroke::NONE)
                                    .rounding(Rounding::same(8.0))
                                    .min_size(Vec2::new(42.0, 32.0)),
                            ).clicked() {
                                self.timer.start(mins);
                                self.show_timer_menu = false;
                                self.toasts.success(format!("Timer: {} min", mins));
                            }
                        }
                    });
                });
        }

        // Modal dialogs
        if let Some(ref id) = self.entry_to_delete.clone() {
            egui::Window::new("Delete Entry?")
                .collapsible(false)
                .resizable(false)
                .anchor(egui::Align2::CENTER_CENTER, [0.0, 0.0])
                .frame(egui::Frame::popup(&ctx.style())
                    .fill(colors.bg_primary)
                    .rounding(Rounding::same(16.0))
                    .stroke(Stroke::new(1.0, colors.border_color)))
                .show(ctx, |ui| {
                    ui.set_min_width(280.0);
                    ui.add_space(8.0);
                    ui.label(RichText::new("This action cannot be undone.").color(colors.color_secondary));
                    ui.add_space(16.0);
                    ui.horizontal(|ui| {
                        if ui.add(
                            egui::Button::new("Cancel")
                                .fill(Color32::TRANSPARENT)
                                .stroke(Stroke::new(1.0, colors.border_color))
                                .rounding(Rounding::same(8.0))
                                .min_size(Vec2::new(100.0, 36.0)),
                        ).clicked() {
                            self.entry_to_delete = None;
                        }
                        ui.add_space(8.0);
                        if ui.add(
                            egui::Button::new(RichText::new("Delete").color(Color32::WHITE))
                                .fill(colors.color_accent)
                                .stroke(Stroke::NONE)
                                .rounding(Rounding::same(8.0))
                                .min_size(Vec2::new(100.0, 36.0)),
                        ).clicked() {
                            self.delete_entry(id);
                            self.entry_to_delete = None;
                        }
                    });
                });
        }

        if self.show_clear_all_confirm {
            egui::Window::new("Clear All Entries?")
                .collapsible(false)
                .resizable(false)
                .anchor(egui::Align2::CENTER_CENTER, [0.0, 0.0])
                .frame(egui::Frame::popup(&ctx.style())
                    .fill(colors.bg_primary)
                    .rounding(Rounding::same(16.0))
                    .stroke(Stroke::new(1.0, colors.border_color)))
                .show(ctx, |ui| {
                    ui.set_min_width(280.0);
                    ui.add_space(8.0);
                    ui.label(RichText::new("All your entries will be permanently deleted.").color(colors.color_secondary));
                    ui.add_space(16.0);
                    ui.horizontal(|ui| {
                        if ui.add(
                            egui::Button::new("Cancel")
                                .fill(Color32::TRANSPARENT)
                                .stroke(Stroke::new(1.0, colors.border_color))
                                .rounding(Rounding::same(8.0))
                                .min_size(Vec2::new(100.0, 36.0)),
                        ).clicked() {
                            self.show_clear_all_confirm = false;
                        }
                        ui.add_space(8.0);
                        if ui.add(
                            egui::Button::new(RichText::new("Clear All").color(Color32::WHITE))
                                .fill(colors.color_accent)
                                .stroke(Stroke::NONE)
                                .rounding(Rounding::same(8.0))
                                .min_size(Vec2::new(100.0, 36.0)),
                        ).clicked() {
                            self.clear_all_entries();
                            self.show_clear_all_confirm = false;
                        }
                    });
                });
        }

        if self.show_shortcuts {
            egui::Window::new("⌨️ Keyboard Shortcuts")
                .collapsible(false)
                .resizable(false)
                .anchor(egui::Align2::CENTER_CENTER, [0.0, 0.0])
                .frame(egui::Frame::popup(&ctx.style())
                    .fill(colors.bg_primary)
                    .rounding(Rounding::same(16.0))
                    .stroke(Stroke::new(1.0, colors.border_color)))
                .show(ctx, |ui| {
                    ui.set_min_width(320.0);
                    ui.add_space(8.0);
                    
                    egui::Grid::new("shortcuts")
                        .num_columns(2)
                        .spacing([24.0, 12.0])
                        .show(ui, |ui| {
                            let shortcuts = [
                                ("Ctrl + S", "Save to history"),
                                ("Ctrl + N", "New entry"),
                                ("Ctrl + Z", "Undo"),
                                ("Ctrl + Y", "Redo"),
                                ("Ctrl + /", "Toggle shortcuts"),
                                ("Ctrl + Scroll", "Adjust font size"),
                                ("F11", "Fullscreen"),
                                ("Esc", "Close panels"),
                            ];

                            for (key, desc) in shortcuts {
                                egui::Frame::none()
                                    .fill(colors.bg_secondary)
                                    .rounding(Rounding::same(6.0))
                                    .inner_margin(egui::Margin::symmetric(8.0, 4.0))
                                    .show(ui, |ui| {
                                        ui.label(RichText::new(key).size(12.0).color(colors.color_accent).strong());
                                    });
                                ui.label(RichText::new(desc).size(13.0).color(colors.color_secondary));
                                ui.end_row();
                            }
                        });

                    ui.add_space(16.0);
                    ui.vertical_centered(|ui| {
                        if ui.add(
                            egui::Button::new("Got it")
                                .fill(colors.color_accent)
                                .stroke(Stroke::NONE)
                                .rounding(Rounding::same(8.0))
                                .min_size(Vec2::new(100.0, 36.0)),
                        ).clicked() {
                            self.show_shortcuts = false;
                        }
                    });
                });
        }

        // Toast notifications (bottom center, stacked)
        let toasts: Vec<_> = self.toasts.toasts.iter().cloned().collect();
        for (i, toast) in toasts.iter().enumerate() {
            let y_offset = 100.0 + (i as f32 * 56.0);
            let opacity = toast.opacity();
            
            egui::Area::new(egui::Id::new(format!("toast_{}", i)))
                .fixed_pos(egui::pos2(
                    (ctx.screen_rect().width() - 340.0 * self.history_anim) / 2.0 - 80.0,
                    ctx.screen_rect().height() - y_offset,
                ))
                .order(egui::Order::Foreground)
                .show(ctx, |ui| {
                    egui::Frame::none()
                        .fill(Color32::from_rgba_unmultiplied(
                            colors.bg_secondary.r(),
                            colors.bg_secondary.g(),
                            colors.bg_secondary.b(),
                            (opacity * 240.0) as u8,
                        ))
                        .rounding(Rounding::same(12.0))
                        .stroke(Stroke::new(1.0, colors.border_color.linear_multiply(opacity)))
                        .shadow(egui::epaint::Shadow {
                            offset: Vec2::new(0.0, 4.0),
                            blur: 12.0,
                            spread: 0.0,
                            color: Color32::from_black_alpha((30.0 * opacity) as u8),
                        })
                        .inner_margin(egui::Margin::symmetric(20.0, 12.0))
                        .show(ui, |ui| {
                            ui.label(
                                RichText::new(&toast.message)
                                    .size(13.0)
                                    .color(Color32::from_rgba_unmultiplied(
                                        colors.color_primary.r(),
                                        colors.color_primary.g(),
                                        colors.color_primary.b(),
                                        (opacity * 255.0) as u8,
                                    )),
                            );
                        });
                });
        }

        // Request repaint for animations
        if self.timer.is_running 
            || !self.toasts.toasts.is_empty() 
            || (self.history_anim - target_anim).abs() > 0.01
            || self.button_hovers.values().any(|&v| v > 0.01 && v < 0.99)
        {
            ctx.request_repaint();
        }
    }
}
