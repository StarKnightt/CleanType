use crate::entry::FontStyle;
use egui::{FontDefinitions, FontFamily, FontId, TextStyle};

pub fn setup_fonts(ctx: &egui::Context) {
    let mut fonts = FontDefinitions::default();

    // We'll use the built-in fonts and create different "styles" through font families
    // In a production app, you'd embed actual font files here
    
    // For now, we'll use proportional for most fonts and monospace for mono
    // The actual visual difference will be simulated through styling
    
    // Create custom font families for our styles
    fonts.families.insert(
        FontFamily::Name("Sans".into()),
        vec!["Ubuntu-Light".to_owned(), "Hack".to_owned()],
    );
    
    fonts.families.insert(
        FontFamily::Name("Mono".into()),
        vec!["Hack".to_owned()],
    );
    
    fonts.families.insert(
        FontFamily::Name("Serif".into()),
        vec!["Ubuntu-Light".to_owned()],
    );

    // Set default text styles with larger sizes for the editor
    let mut style = (*ctx.style()).clone();
    
    style.text_styles = [
        (TextStyle::Small, FontId::new(13.0, FontFamily::Proportional)),
        (TextStyle::Body, FontId::new(16.0, FontFamily::Proportional)),
        (TextStyle::Button, FontId::new(14.0, FontFamily::Proportional)),
        (TextStyle::Heading, FontId::new(24.0, FontFamily::Proportional)),
        (TextStyle::Monospace, FontId::new(14.0, FontFamily::Monospace)),
    ]
    .into();

    ctx.set_fonts(fonts);
    ctx.set_style(style);
}

pub fn get_font_family(font_style: &FontStyle) -> FontFamily {
    match font_style {
        FontStyle::Mono => FontFamily::Monospace,
        FontStyle::System | FontStyle::Sans | FontStyle::Serif => FontFamily::Proportional,
        FontStyle::Script | FontStyle::Elegant | FontStyle::Classic | FontStyle::Playpen => {
            FontFamily::Proportional
        }
    }
}

pub fn get_font_id(font_style: &FontStyle, size: f32) -> FontId {
    FontId::new(size, get_font_family(font_style))
}

