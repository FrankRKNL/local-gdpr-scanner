//! Email parsing and handling

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Email {
    pub id: String,
    pub from: String,
    pub from_name: Option<String>,
    pub to: String,
    pub subject: String,
    pub date: String,
    pub body: String,
    pub has_attachments: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchEmailsResult {
    pub emails: Vec<Email>,
    pub total: u32,
}

/// Parse raw email data into structured Email
#[tauri::command]
pub fn parse_emails(raw_emails: Vec<String>) -> FetchEmailsResult {
    let emails: Vec<Email> = raw_emails
        .into_iter()
        .enumerate()
        .map(|(i, raw)| {
            // Simple parsing - in production would use a proper email parsing library
            let lines: Vec<&str> = raw.lines().collect();
            let mut email = Email {
                id: format!("email-{}", i),
                from: String::new(),
                from_name: None,
                to: String::new(),
                subject: String::new(),
                date: String::new(),
                body: String::new(),
                has_attachments: false,
            };

            for line in &lines {
                if line.starts_with("From: ") {
                    email.from = line.trim_start_matches("From: ").to_string();
                } else if line.starts_with("Subject: ") {
                    email.subject = line.trim_start_matches("Subject: ").to_string();
                } else if line.starts_with("Date: ") {
                    email.date = line.trim_start_matches("Date: ").to_string();
                }
            }

            // Body is everything after the headers (empty line)
            if let Some(pos) = lines.iter().position(|l| l.is_empty()) {
                email.body = lines[pos+1..].join("\n");
            }

            email
        })
        .collect();

    let total = emails.len() as u32;
    FetchEmailsResult { emails, total }
}
