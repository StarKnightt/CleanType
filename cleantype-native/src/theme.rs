use crate::entry::Theme;
use egui::{Color32, Rounding, Stroke, Visuals};

pub struct ThemeColors {
    pub bg_primary: Color32,
    pub color_primary: Color32,
    pub color_secondary: Color32,
    pub color_muted: Color32,
    pub color_accent: Color32,
    pub bg_secondary: Color32,
    pub bg_hover: Color32,
    pub bg_active: Color32,
    pub border_color: Color32,
    pub border_hover: Color32,
}

impl ThemeColors {
    pub fn dark() -> Self {
        Self {
            bg_primary: Color32::from_rgb(26, 26, 26),
            color_primary: Color32::from_rgba_unmultiplied(255, 255, 255, 230),
            color_secondary: Color32::from_rgba_unmultiplied(255, 255, 255, 178),
            color_muted: Color32::from_rgba_unmultiplied(255, 255, 255, 102),
            color_accent: Color32::from_rgb(255, 59, 48),
            bg_secondary: Color32::from_rgba_unmultiplied(255, 255, 255, 13),
            bg_hover: Color32::from_rgba_unmultiplied(255, 255, 255, 20),
            bg_active: Color32::from_rgba_unmultiplied(255, 255, 255, 31),
            border_color: Color32::from_rgba_unmultiplied(255, 255, 255, 26),
            border_hover: Color32::from_rgba_unmultiplied(255, 255, 255, 51),
        }
    }

    pub fn light() -> Self {
        Self {
            bg_primary: Color32::from_rgb(255, 252, 242),
            color_primary: Color32::from_rgba_unmultiplied(0, 0, 0, 230),
            color_secondary: Color32::from_rgba_unmultiplied(0, 0, 0, 178),
            color_muted: Color32::from_rgba_unmultiplied(0, 0, 0, 102),
            color_accent: Color32::from_rgb(255, 59, 48),
            bg_secondary: Color32::from_rgba_unmultiplied(0, 0, 0, 8),
            bg_hover: Color32::from_rgba_unmultiplied(0, 0, 0, 13),
            bg_active: Color32::from_rgba_unmultiplied(0, 0, 0, 26),
            border_color: Color32::from_rgba_unmultiplied(0, 0, 0, 26),
            border_hover: Color32::from_rgba_unmultiplied(0, 0, 0, 51),
        }
    }

    pub fn from_theme(theme: &Theme) -> Self {
        match theme {
            Theme::Dark => Self::dark(),
            Theme::Light => Self::light(),
        }
    }
}

pub fn apply_theme(ctx: &egui::Context, theme: &Theme) {
    let colors = ThemeColors::from_theme(theme);
    
    let mut visuals = match theme {
        Theme::Dark => Visuals::dark(),
        Theme::Light => Visuals::light(),
    };

    // Customize the visuals
    visuals.panel_fill = colors.bg_primary;
    visuals.window_fill = colors.bg_primary;
    visuals.extreme_bg_color = colors.bg_secondary;
    
    visuals.widgets.noninteractive.bg_fill = colors.bg_secondary;
    visuals.widgets.noninteractive.fg_stroke = Stroke::new(1.0, colors.color_primary);
    visuals.widgets.noninteractive.bg_stroke = Stroke::new(1.0, colors.border_color);
    visuals.widgets.noninteractive.rounding = Rounding::same(8.0);

    visuals.widgets.inactive.bg_fill = colors.bg_secondary;
    visuals.widgets.inactive.fg_stroke = Stroke::new(1.0, colors.color_secondary);
    visuals.widgets.inactive.bg_stroke = Stroke::new(1.0, colors.border_color);
    visuals.widgets.inactive.rounding = Rounding::same(8.0);

    visuals.widgets.hovered.bg_fill = colors.bg_hover;
    visuals.widgets.hovered.fg_stroke = Stroke::new(1.0, colors.color_primary);
    visuals.widgets.hovered.bg_stroke = Stroke::new(1.0, colors.border_hover);
    visuals.widgets.hovered.rounding = Rounding::same(8.0);

    visuals.widgets.active.bg_fill = colors.bg_active;
    visuals.widgets.active.fg_stroke = Stroke::new(1.0, colors.color_primary);
    visuals.widgets.active.bg_stroke = Stroke::new(1.0, colors.color_accent);
    visuals.widgets.active.rounding = Rounding::same(8.0);

    visuals.selection.bg_fill = colors.color_accent.linear_multiply(0.3);
    visuals.selection.stroke = Stroke::new(1.0, colors.color_accent);

    visuals.window_rounding = Rounding::same(12.0);
    visuals.window_stroke = Stroke::new(1.0, colors.border_color);

    ctx.set_visuals(visuals);
}

