// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod imap;
mod email;

use imap::ImapState;

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
        .manage(ImapState::default())
        .setup(|app| {
            tracing::info!("App setup complete");
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // IMAP commands
            imap::connect,
            imap::disconnect,
            imap::is_connected,
            imap::list_mailboxes,
            imap::fetch_emails,
            imap::search_emails,
            // Email parsing
            email::parse_emails,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
