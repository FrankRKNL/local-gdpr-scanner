//! IMAP module for email connectivity
//! Uses async-imap with tokio runtime for Tauri v2

use async_imap::types::Flag;
use async_imap::{Client, Session, Stream};
use async_native_tls::TlsConnector;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use thiserror::Error;
use tokio::net::TcpStream as TokioTcpStream;
use tokio::io::BufStream;
use tokio::sync::Mutex;
use tracing::{info, warn};

/// IMAP connection state stored in app
pub struct ImapState {
    session: Arc<Mutex<Option<Session<Stream<TokioTcpStream>>>>>,
}

impl Default for ImapState {
    fn default() -> Self {
        Self {
            session: Arc::new(Mutex::new(None)),
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

/// Connect to an IMAP server with TLS
#[tauri::command]
pub async fn connect(
    host: String,
    port: u16,
    username: String,
    password: String,
    use_tls: bool,
    state: tauri::State<'_, ImapState>,
) -> Result<bool, ImapError> {
    info!("IMAP connecting: {}:{} (TLS: {})", host, port, use_tls);

    // Use tokio runtime for async operations
    let session = tokio::task::spawn_blocking({
        let host = host.clone();
        let username = username.clone();
        let password = password.clone();
        move || {
            // Create blocking TCP stream
            let tcp = std::net::TcpStream::connect(format!("{}:{}", host, port))
                .map_err(|e| ImapError::ConnectionFailed(e.to_string()))?;
            
            tcp.set_read_timeout(Some(std::time::Duration::from_secs(30)))
                .ok();
            tcp.set_write_timeout(Some(std::time::Duration::from_secs(30)))
                .ok();

            let stream: Stream<std::net::TcpStream>;

            if use_tls {
                // TLS connection on port 993
                let tls = async_native_tls::TlsConnector::new();
                let tls_stream = tls.connect(&host, tcp)
                    .map_err(|e| ImapError::ConnectionFailed(e.to_string()))?;
                stream = Stream::new(tls_stream);
            } else {
                // Plain connection with STARTTLS on port 143
                let plain_stream = async_imap::PlainTcpStream::new(tcp);
                stream = Stream::new(plain_stream);
            }

            // Create IMAP client
            let mut client = Client::new(stream);

            // Read greeting
            let _greeting = client.read_response()
                .map_err(|e| ImapError::ConnectionFailed(e.to_string()))?;

            // Login
            let session = client.login(&username, &password)
                .map_err(|(e, _)| ImapError::AuthFailed(e.to_string()))?;

            info!("IMAP connected successfully");
            Ok(session)
        }
    }).await
    .map_err(|e| ImapError::ConnectionFailed(e.to_string()))??;

    let mut s = state.session.lock().await;
    *s = Some(session);
    Ok(true)
}

/// Disconnect from IMAP server
#[tauri::command]
pub async fn disconnect(state: tauri::State<'_, ImapState>) -> Result<bool, ImapError> {
    info!("IMAP disconnecting");
    let mut s = state.session.lock().await;
    if let Some(session) = s.take() {
        match session.clone().logout().await {
            Ok(_) => info!("IMAP logged out"),
            Err(e) => warn!("IMAP logout error: {}", e),
        }
    }
    Ok(true)
}

/// Check connection status
#[tauri::command]
pub async fn is_connected(state: tauri::State<'_, ImapState>) -> Result<bool, ImapError> {
    let s = state.session.lock().await;
    Ok(s.is_some())
}

/// List mailboxes
#[tauri::command]
pub async fn list_mailboxes(
    state: tauri::State<'_, ImapState>,
) -> Result<Vec<String>, ImapError> {
    let session = {
        let s = state.session.lock().await;
        s.as_ref().ok_or(ImapError::NotConnected)?.clone()
    };

    let mailboxes = session.list("", "*")
        .map_err(|e| ImapError::ImapError(e.to_string()))?
        .iter()
        .filter_map(|m| {
            let name = m.name().to_string();
            if name.is_empty() { None } else { Some(name) }
        })
        .collect();

    Ok(mailboxes)
}

/// Fetch emails from a mailbox
#[tauri::command]
pub async fn fetch_emails(
    mailbox: String,
    limit: Option<u32>,
    state: tauri::State<'_, ImapState>,
) -> Result<FetchResult, ImapError> {
    let session = {
        let s = state.session.lock().await;
        s.as_ref().ok_or(ImapError::NotConnected)?.clone()
    };

    let limit = limit.unwrap_or(50).min(500) as usize;

    let emails = fetch_emails_impl(session, mailbox, limit).await?;

    info!("Fetched {} emails", emails.len());
    Ok(FetchResult { emails, total: emails.len() as u32 })
}

async fn fetch_emails_impl(
    mut session: Session<Stream<TokioTcpStream>>,
    mailbox: String,
    limit: usize,
) -> Result<Vec<EmailMessage>, ImapError> {
    // Select mailbox
    let _ = session.select(&mailbox).or_else(|_| session.select("INBOX"));

    // Search for all emails
    let search = session.search("ALL")
        .await
        .map_err(|e| ImapError::ImapError(e.to_string()))?;

    let uids: Vec<u32> = search.into();
    if uids.is_empty() {
        return Ok(vec![]);
    }

    // Take most recent emails
    let uids: Vec<u32> = uids.into_iter().rev().take(limit).collect();
    if uids.is_empty() {
        return Ok(vec![]);
    }

    // Build sequence string like "1,2,3"
    let sequence = uids.iter().map(|u| u.to_string()).collect::<Vec<_>>().join(",");

    // Fetch email data
    let messages = session.fetch(&sequence, "ENVELOPE INTERNALDATE RFC822")
        .await
        .map_err(|e| ImapError::ImapError(e.to_string()))?;

    let mut emails = vec![];

    for msg in messages {
        let uid = msg.uid().unwrap_or(0);
        let envelope = msg.envelope();
        let date = msg.internal_date().map(|d| d.to_string()).unwrap_or_default();

        let from = envelope
            .and_then(|e| e.from())
            .and_then(|f| f.first())
            .map(|f| {
                let addr = f.address()?;
                String::from_utf8_lossy(addr.as_str().unwrap_or(&[])).to_string()
            })
            .unwrap_or_default();

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
            .map(String::from)
            .collect();

        let rfc822 = msg.body()
            .map(|b| String::from_utf8_lossy(b).to_string())
            .unwrap_or_default();
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
            has_attachments: msg.flags().contains(&Flag::Attachment),
            flags,
        });
    }

    Ok(emails)
}

/// Search emails
#[tauri::command]
pub async fn search_emails(
    query: String,
    mailbox: String,
    limit: Option<u32>,
    state: tauri::State<'_, ImapState>,
) -> Result<FetchResult, ImapError> {
    let session = {
        let s = state.session.lock().await;
        s.as_ref().ok_or(ImapError::NotConnected)?.clone()
    };

    let limit = limit.unwrap_or(50).min(500) as usize;

    // Select mailbox
    let _ = session.select(&mailbox).or_else(|_| session.select("INBOX"));

    // Search
    let search = session.search(&query)
        .await
        .map_err(|e| ImapError::ImapError(e.to_string()))?;

    let uids: Vec<u32> = search.into();
    if uids.is_empty() {
        return Ok(FetchResult { emails: vec![], total: 0 });
    }

    let uids: Vec<u32> = uids.into_iter().rev().take(limit).collect();
    if uids.is_empty() {
        return Ok(FetchResult { emails: vec![], total: 0 });
    }

    let sequence = uids.iter().map(|u| u.to_string()).collect::<Vec<_>>().join(",");

    let messages = session.fetch(&sequence, "ENVELOPE INTERNALDATE RFC822")
        .await
        .map_err(|e| ImapError::ImapError(e.to_string()))?;

    let mut emails = vec![];

    for msg in messages {
        let uid = msg.uid().unwrap_or(0);
        let envelope = msg.envelope();

        let from = envelope
            .and_then(|e| e.from())
            .and_then(|f| f.first())
            .map(|f| {
                let addr = f.address()?;
                String::from_utf8_lossy(addr.as_str().unwrap_or(&[])).to_string()
            })
            .unwrap_or_default();

        let subject = envelope
            .and_then(|e| e.subject())
            .map(|s| String::from_utf8_lossy(s).to_string())
            .unwrap_or_default();

        let rfc822 = msg.body()
            .map(|b| String::from_utf8_lossy(b).to_string())
            .unwrap_or_default();
        let (body, body_html) = parse_email_body(&rfc822);

        emails.push(EmailMessage {
            id: uid.to_string(),
            uid,
            from,
            from_name: None,
            to: String::new(),
            subject,
            date: String::new(),
            body,
            body_html,
            has_attachments: false,
            flags: vec![],
        });
    }

    Ok(FetchResult { emails, total: emails.len() as u32 })
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
            (rfc822.to_string(), None)
        }
    }
}
