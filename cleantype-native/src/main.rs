#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod app;
mod entry;
mod storage;
mod theme;
mod fonts;
mod timer;
mod toast;

use app::CleanTypeApp;
use eframe::egui;

fn main() -> eframe::Result<()> {
    let options = eframe::NativeOptions {
        viewport: egui::ViewportBuilder::default()
            .with_inner_size([1200.0, 800.0])
            .with_min_inner_size([800.0, 600.0])
            .with_title("CleanType")
            .with_icon(load_icon()),
        ..Default::default()
    };

    eframe::run_native(
        "CleanType",
        options,
        Box::new(|cc| {
            // Setup custom fonts
            fonts::setup_fonts(&cc.egui_ctx);
            
            // Set initial visuals
            cc.egui_ctx.set_visuals(egui::Visuals::dark());
            
            Ok(Box::new(CleanTypeApp::new(cc)))
        }),
    )
}

fn load_icon() -> egui::IconData {
    // Default icon if loading fails
    let (icon_rgba, icon_width, icon_height) = {
        // Create a simple colored square as fallback icon
        let size = 64u32;
        let mut rgba = Vec::with_capacity((size * size * 4) as usize);
        for y in 0..size {
            for x in 0..size {
                // Create a gradient icon
                let r = ((x as f32 / size as f32) * 100.0 + 100.0) as u8;
                let g = ((y as f32 / size as f32) * 80.0 + 80.0) as u8;
                let b = 180u8;
                let a = 255u8;
                rgba.extend_from_slice(&[r, g, b, a]);
            }
        }
        (rgba, size, size)
    };

    egui::IconData {
        rgba: icon_rgba,
        width: icon_width,
        height: icon_height,
    }
}
