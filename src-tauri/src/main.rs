// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())

        .setup(|app| {
            tracing::info!("Local GDPR Scanner starting...");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            local_gdpr_scanner_lib::imap::connect,
            local_gdpr_scanner_lib::imap::disconnect,
            local_gdpr_scanner_lib::imap::is_connected,
            local_gdpr_scanner_lib::imap::fetch_emails,
            local_gdpr_scanner_lib::email::parse_emails,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
