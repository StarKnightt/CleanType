use std::fs;
use tauri::Manager;
use window_shadows::set_shadow;

#[tauri::command]
fn greet(name: String) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn read_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(path)
        .map_err(|e| e.to_string())
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
            
            let handle = app.handle();
            
            // Handle file opening
            app.listen_global("tauri://file-drop", move |event| {
                if let Some(payload) = event.payload() {
                    if let Some(window) = handle.get_window("main") {
                        let _ = window.emit("file-open", payload);
                    }
                }
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet, read_file_content])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}