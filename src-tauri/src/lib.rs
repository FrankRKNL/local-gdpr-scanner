// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod imap;
mod email;

pub use imap::*;
pub use email::*;
