use std::fs;
use tauri::Manager;
use window_shadows::set_shadow;

/// Write text to a path the user picked via the native "save" dialog.
/// Doing file IO here keeps arbitrary-path writes out of the webview FS scope.
#[tauri::command]
fn export_data(path: String, contents: String) -> Result<(), String> {
    fs::write(path, contents).map_err(|e| e.to_string())
}

/// Read text from a path the user picked via the native "open" dialog.
#[tauri::command]
fn import_data(path: String) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let main_window = app.get_window("main").expect("main window not found");

            // Apply shadow only on Windows and macOS
            #[cfg(any(windows, target_os = "macos"))]
            {
                set_shadow(&main_window, true).expect("Failed to set window shadow");
            }

            main_window.show().expect("failed to show window");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![export_data, import_data])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
