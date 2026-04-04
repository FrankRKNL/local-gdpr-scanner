// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // Initialize logging
    tracing_subscriber::fmt()
        .with_env_filter("info")
        .init();

    tracing::info!("Local GDPR Scanner starting...");

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(local_gdpr_scanner_lib::ImapState::default())
        .setup(|_app| {
            tracing::info!("App setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // IMAP commands
            local_gdpr_scanner_lib::imap::connect,
            local_gdpr_scanner_lib::imap::disconnect,
            local_gdpr_scanner_lib::imap::is_connected,
            local_gdpr_scanner_lib::imap::list_mailboxes,
            local_gdpr_scanner_lib::imap::fetch_emails,
            local_gdpr_scanner_lib::imap::search_emails,
            // Email parsing
            local_gdpr_scanner_lib::email::parse_emails,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
