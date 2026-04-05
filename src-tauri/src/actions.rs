//! AI Agent Module - Smart Actions Engine
//! Takes actions on emails: delete, anonymize, forward, auto-reply
//! Based on scan results

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Available actions the agent can take
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ActionType {
    /// Delete email permanently
    Delete,
    /// Anonymize personal data in email
    Anonymize,
    /// Move to folder
    MoveTo { folder: String },
    /// Mark as read
    MarkRead,
    /// Add label/tag
    AddLabel { label: String },
    /// Auto-reply with template
    AutoReply { template: String },
}

/// A single action to be taken on an email
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentAction {
    pub email_id: String,
    pub action: ActionType,
    pub reason: String,
}

/// Anonymizer for personal data
pub struct Anonymizer {
    replacements: HashMap<String, String>,
}

impl Anonymizer {
    pub fn new() -> Self {
        Self {
            replacements: HashMap::new(),
        }
    }

    /// Anonymize common personal data patterns
    pub fn anonymize_text(&mut self, text: &str) -> String {
        let mut result = text.to_string();

        // Dutch phone numbers
        let phone_regex = regex::Regex::new(r"\b(?:\+31|0)[6][1-9]\d{7,8}\b").unwrap();
        for cap in phone_regex.find_iter(text) {
            let placeholder = "[TELEFOON]";
            result = result.replace(cap.as_str(), placeholder);
        }

        // Dutch BSN
        let bsn_regex = regex::Regex::new(r"\b\d{8,9}\b").unwrap();
        for cap in bsn_regex.find_iter(text) {
            result = result.replace(cap.as_str(), "[BSN]");
        }

        // IBAN
        let iban_regex = regex::Regex::new(r"\bNL\d{2}[A-Z]{4}\d{10}\b").unwrap();
        for cap in iban_regex.find_iter(text) {
            result = result.replace(cap.as_str(), "[IBAN]");
        }

        // Email addresses
        let email_regex = regex::Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b").unwrap();
        for cap in email_regex.find_iter(text) {
            result = result.replace(cap.as_str(), "[EMAIL]");
        }

        // Postcodes
        let postcode_regex = regex::Regex::new(r"\b\d{4}\s?[A-Z]{2}\b").unwrap();
        for cap in postcode_regex.find_iter(text) {
            result = result.replace(cap.as_str(), "[POSTCODE]");
        }

        result
    }
}

impl Default for Anonymizer {
    fn default() -> Self {
        Self::new()
    }
}

/// Execute an action on an email
#[tauri::command]
pub fn execute_action(
    email_id: String,
    action_type: String,
    params: HashMap<String, String>,
) -> Result<bool, String> {
    match action_type.as_str() {
        "delete" => {
            tracing::info!("[Agent] Delete email: {}", email_id);
            Ok(true)
        }
        "anonymize" => {
            tracing::info!("[Agent] Anonymize email: {}", email_id);
            Ok(true)
        }
        "move_to" => {
            let folder = params.get("folder").cloned().unwrap_or_default();
            tracing::info!("[Agent] Move email {} to folder: {}", email_id, folder);
            Ok(true)
        }
        "mark_read" => {
            tracing::info!("[Agent] Mark email as read: {}", email_id);
            Ok(true)
        }
        "add_label" => {
            let label = params.get("label").cloned().unwrap_or_default();
            tracing::info!("[Agent] Add label '{}' to email: {}", label, email_id);
            Ok(true)
        }
        "auto_reply" => {
            tracing::info!("[Agent] Auto-reply to email: {}", email_id);
            Ok(true)
        }
        _ => Err(format!("Unknown action type: {}", action_type)),
    }
}

/// Batch execute multiple actions
#[tauri::command]
pub fn execute_batch(actions: Vec<AgentAction>) -> Result<usize, String> {
    let count = actions.len();
    for action in &actions {
        let action_type = match &action.action {
            ActionType::Delete => "delete".to_string(),
            ActionType::Anonymize => "anonymize".to_string(),
            ActionType::MoveTo { folder } => format!("move_to:{}", folder),
            ActionType::MarkRead => "mark_read".to_string(),
            ActionType::AddLabel { label } => format!("add_label:{}", label),
            ActionType::AutoReply { template } => format!("auto_reply:{}", template),
        };
        
        let mut params = HashMap::new();
        if let ActionType::MoveTo { folder } = &action.action {
            params.insert("folder".to_string(), folder.clone());
        }
        if let ActionType::AddLabel { label } = &action.action {
            params.insert("label".to_string(), label.clone());
        }
        if let ActionType::AutoReply { template } = &action.action {
            params.insert("template".to_string(), template.clone());
        }
        
        execute_action(action.email_id.clone(), action_type, params)
            .map_err(|e| format!("Action failed: {}", e))?;
    }
    Ok(count)
}
