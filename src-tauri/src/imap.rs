//! IMAP module for email connectivity
//! Uses async-imap for IMAP handling in Tauri v2

use async_imap::types::{Flag, Flags, Mailbox, Message};
use async_imap::{Client, Session, Noop, Stream};
use native_tls::TlsConnector;
use serde::{Deserialize, Serialize};
use std::net::TcpStream;
use std::sync::Mutex;
use thiserror::Error;
use tokio::net::TcpStream as TokioTcpStream;
use tokio::task;
use tracing::{info, warn, error};

/// IMAP connection state stored in app
pub struct ImapState {
    session: Mutex<Option<Session<Stream<TokioTcpStream>>>>,
}

impl Default for ImapState {
    fn default() -> Self {
        Self {
            session: Mutex::new(None),
        }
    }
}

#[derive(Error, Debug)]
pub enum ImapError {
    #[error("Not connected to IMAP server")]
    NotConnected,
    #[error("Connection failed: {0}")]
    ConnectionFailed(String),
    #[error("Authentication failed: {0}")]
    AuthFailed(String),
    #[error("IMAP error: {0}")]
    ImapError(String),
    #[error("Timeout: {0}")]
    Timeout(String),
}

impl Serialize for ImapError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ImapConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub use_tls: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EmailMessage {
    pub id: String,
    pub uid: u32,
    pub from: String,
    pub from_name: Option<String>,
    pub to: String,
    pub subject: String,
    pub date: String,
    pub body: String,
    pub body_html: Option<String>,
    pub has_attachments: bool,
    pub flags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FetchResult {
    pub emails: Vec<EmailMessage>,
    pub total: u32,
}

/// Connect to an IMAP server
#[tauri::command]
pub async fn connect(
    host: String,
    port: u16,
    username: String,
    password: String,
    use_tls: bool,
    state: tauri::State<'_, ImapState>,
) -> Result<bool, ImapError> {
    info!("Connecting to IMAP: {}:{} (TLS: {})", host, port, use_tls);

    let imap_result = task::spawn_blocking(move || {
        // Create TCP connection
        let tcp = match std::net::TcpStream::connect(format!("{}:{}", host, port)) {
            Ok(t) => t,
            Err(e) => return Err(ImapError::ConnectionFailed(e.to_string())),
        };

        let stream: Stream<async_imap::TcpStream>;

        if use_tls {
            // TLS connection on port 993
            let tls = match TlsConnector::builder()
                .danger_accept_invalid_certs(true)
                .build()
            {
                Ok(t) => t,
                Err(e) => return Err(ImapError::ConnectionFailed(e.to_string())),
            };

            let tls_stream = match tls.connect(&host, tcp) {
                Ok(s) => s,
                Err(e) => return Err(ImapError::ConnectionFailed(e.to_string())),
            };

            stream = Stream::new(tls_stream);
        } else {
            // Plain connection (port 143 with STARTTLS)
            let plain_stream = async_imap::PlainTcpStream::new(tcp);
            stream = Stream::new(plain_stream);
        }

        // Create IMAP client
        let client = match Client::new(stream) {
            Ok(c) => c,
            Err(e) => return Err(ImapError::ConnectionFailed(e.to_string())),
        };

        // Authenticate
        let session = match client.login(&username, &password) {
            Ok(s) => s,
            Err((e, _)) => return Err(ImapError::AuthFailed(e.to_string())),
        };

        info!("IMAP connected successfully as {}", username);
        Ok::<Session<Stream<TokioTcpStream>>, ImapError>(session)
    }).await;

    match imap_result {
        Ok(Ok(session)) => {
            let mut s = state.session.lock().unwrap();
            *s = Some(session);
            Ok(true)
        }
        Ok(Err(e)) => Err(e),
        Err(e) => Err(ImapError::ConnectionFailed(e.to_string())),
    }
}

/// Disconnect from IMAP server
#[tauri::command]
pub async fn disconnect(state: tauri::State<'_, ImapState>) -> Result<bool, ImapError> {
    info!("Disconnecting from IMAP");
    let mut s = state.session.lock().unwrap();
    if let Some(session) = s.take() {
        match session.logout() {
            Ok(_) => info!("IMAP logged out"),
            Err(e) => warn!("IMAP logout error: {}", e),
        }
    }
    Ok(true)
}

/// Check connection status
#[tauri::command]
pub async fn is_connected(state: tauri::State<'_, ImapState>) -> Result<bool, ImapError> {
    let s = state.session.lock().unwrap();
    Ok(s.is_some())
}

/// List mailboxes
#[tauri::command]
pub async fn list_mailboxes(
    state: tauri::State<'_, ImapState>,
) -> Result<Vec<String>, ImapError> {
    let session = state.session.lock().unwrap();
    let session = session.as_ref().ok_or(ImapError::NotConnected)?;

    let mailboxes: Vec<String> = task::spawn_blocking({
        let session = session.clone();
        move || {
            let list = session.list("", "*");
            match list {
                Ok(mailboxes) => {
                    mailboxes
                        .iter()
                        .map(|m| m.name().to_string())
                        .filter(|n| !n.is_empty())
                        .collect()
                }
                Err(e) => {
                    warn!("List mailboxes error: {}", e);
                    vec!["INBOX".to_string()] // fallback
                }
            }
        }
    }).await.unwrap_or_default();

    Ok(mailboxes)
}

/// Fetch emails from a mailbox
#[tauri::command]
pub async fn fetch_emails(
    mailbox: String,
    limit: Option<u32>,
    state: tauri::State<'_, ImapState>,
) -> Result<FetchResult, ImapError> {
    let session = state.session.lock().unwrap();
    let session = session.as_ref().ok_or(ImapError::NotConnected)?;

    let limit = limit.unwrap_or(50).min(500) as usize;

    let emails = task::spawn_blocking({
        let session = session.clone();
        let mailbox = mailbox.clone();
        move || {
            // Select mailbox
            let select = session.select(&mailbox);
            if select.is_err() {
                // Try INBOX if mailbox not found
                let _ = session.select("INBOX");
            }

            // Search for all emails
            let search = session.search("ALL");
            if search.is_err() {
                return vec![];
            }

            let uids: Vec<u32> = search.unwrap().into();

            if uids.is_empty() {
                return vec![];
            }

            // Take last N emails (most recent)
            let uids: Vec<u32> = uids.into_iter().rev().take(limit).collect();

            // Fetch email data
            let fetch_result = session.fetch(
                uids.iter().map(|&u| u).collect::<Vec<u32>>(),
                "ENVELOPE INTERNALDATE RFC822",
            );

            if fetch_result.is_err() {
                return vec![];
            }

            let messages: Vec<Message> = fetch_result.unwrap();
            let mut emails = vec![];

            for msg in messages {
                let uid = msg.uid().unwrap_or(0);
                let envelope = msg.envelope();
                let date = msg.internal_date().map(|d| d.to_string()).unwrap_or_default();

                // Parse envelope for from/subject
                let (from, from_name) = if let Some(env) = envelope {
                    let from = env.from().and_then(|f| f.first()).map(|f| {
                        f.to_string()
                    }).unwrap_or_default();
                    let from_name = env.from().and_then(|f| f.first()).and_then(|f| {
                        f.to_string()
                    });
                    (from, from_name)
                } else {
                    (String::new(), None)
                };

                let subject = envelope
                    .and_then(|e| e.subject())
                    .map(|s| String::from_utf8_lossy(s).to_string())
                    .unwrap_or_default();

                let flags: Vec<String> = msg.flags()
                    .iter()
                    .map(|f| match f {
                        Flag::Seen => "seen",
                        Flag::Answered => "answered",
                        Flag::Flagged => "flagged",
                        Flag::Deleted => "deleted",
                        Flag::Draft => "draft",
                        Flag::Recent => "recent",
                        _ => "other",
                    })
                    .map(|s| s.to_string())
                    .collect();

                let rfc822 = msg.body().map(|b| String::from_utf8_lossy(b).to_string()).unwrap_or_default();

                // Parse RFC822 for email content
                let (body, body_html) = parse_email_body(&rfc822);

                emails.push(EmailMessage {
                    id: uid.to_string(),
                    uid,
                    from,
                    from_name,
                    to: String::new(),
                    subject,
                    date,
                    body,
                    body_html,
                    has_attachments: msg.flags().contains(&Flag::Attachment),
                    flags,
                });
            }

            emails
        }
    }).await.unwrap_or_default();

    let total = emails.len() as u32;
    info!("Fetched {} emails from {}", emails.len(), mailbox);

    Ok(FetchResult { emails, total })
}

/// Parse email body from RFC822 format
fn parse_email_body(rfc822: &str) -> (String, Option<String>) {
    use mail_parser::MessageParser;

    match MessageParser::default().parse(rfc822.as_bytes()) {
        Ok(msg) => {
            let body_text = msg
                .text_body()
                .map(|t| t.to_string())
                .or_else(|| msg.html_body().map(|t| t.to_string()))
                .unwrap_or_default();

            let body_html = msg.html_body().map(|t| t.to_string());

            (body_text, body_html)
        }
        Err(_) => {
            // Fallback: just return raw RFC822
            (rfc822.to_string(), None)
        }
    }
}

/// Search emails
#[tauri::command]
pub async fn search_emails(
    query: String,
    mailbox: String,
    limit: Option<u32>,
    state: tauri::State<'_, ImapState>,
) -> Result<FetchResult, ImapError> {
    let session = state.session.lock().unwrap();
    let session = session.as_ref().ok_or(ImapError::NotConnected)?;

    let limit = limit.unwrap_or(50).min(500) as usize;

    let emails = task::spawn_blocking({
        let session = session.clone();
        let mailbox = mailbox.clone();
        move || {
            // Select mailbox
            let _ = session.select(&mailbox);

            // Search
            let search = session.search(&query);
            if search.is_err() {
                return vec![];
            }

            let uids: Vec<u32> = search.unwrap().into();
            if uids.is_empty() {
                return vec![];
            }

            let uids: Vec<u32> = uids.into_iter().rev().take(limit).collect();

            let fetch_result = session.fetch(
                uids.iter().map(|&u| u).collect::<Vec<u32>>(),
                "ENVELOPE INTERNALDATE RFC822",
            );

            if fetch_result.is_err() {
                return vec![];
            }

            let messages: Vec<Message> = fetch_result.unwrap();
            let mut emails = vec![];

            for msg in messages {
                let uid = msg.uid().unwrap_or(0);
                let envelope = msg.envelope();
                let date = msg.internal_date().map(|d| d.to_string()).unwrap_or_default();

                let from = envelope
                    .and_then(|e| e.from())
                    .and_then(|f| f.first())
                    .map(|f| f.to_string())
                    .unwrap_or_default();

                let subject = envelope
                    .and_then(|e| e.subject())
                    .map(|s| String::from_utf8_lossy(s).to_string())
                    .unwrap_or_default();

                let rfc822 = msg.body().map(|b| String::from_utf8_lossy(b).to_string()).unwrap_or_default();
                let (body, body_html) = parse_email_body(&rfc822);

                emails.push(EmailMessage {
                    id: uid.to_string(),
                    uid,
                    from,
                    from_name: None,
                    to: String::new(),
                    subject,
                    date,
                    body,
                    body_html,
                    has_attachments: false,
                    flags: vec![],
                });
            }

            emails
        }
    }).await.unwrap_or_default();

    Ok(FetchResult { emails, total: emails.len() as u32 })
}
