//! Fast Data Detection Module
//! Uses regex for quick identification of personal data types
//! This is Tier 1 of our Two-Tier Analysis system

use regex::Regex;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataDetection {
    pub has_personal_data: bool,
    pub data_types: Vec<String>,
    pub confidence: f32,
    pub summary: String,
}

impl Default for DataDetection {
    fn default() -> Self {
        Self {
            has_personal_data: false,
            data_types: Vec::new(),
            confidence: 0.0,
            summary: String::new(),
        }
    }
}

/// Dutch and European specific patterns
pub struct FastScanner {
    // Dutch specific
    bsn_regex: Regex,
    iban_regex: Regex,
    phone_nl_regex: Regex,
    postcode_regex: Regex,
    
    // General patterns
    email_regex: Regex,
    ipv4_regex: Regex,
    ipv6_regex: Regex,
    credit_card_regex: Regex,
    ssn_us_regex: Regex,
    
    // Context keywords
    medical_keywords: Vec<String>,
    financial_keywords: Vec<String>,
    address_keywords: Vec<String>,
}

impl FastScanner {
    pub fn new() -> Self {
        Self {
            bsn_regex: Regex::new(r"\b\d{8,9}\b").unwrap(),
            iban_regex: Regex::new(r"\bNL\d{2}[A-Z]{4}\d{10}\b").unwrap(),
            phone_nl_regex: Regex::new(r"\b(?:\+31|0)[6][1-9]\d{7,8}\b").unwrap(),
            postcode_regex: Regex::new(r"\b\d{4}\s?[A-Z]{2}\b").unwrap(),
            
            email_regex: Regex::new(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b").unwrap(),
            ipv4_regex: Regex::new(r"\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b").unwrap(),
            ipv6_regex: Regex::new(r"\b([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b").unwrap(),
            credit_card_regex: Regex::new(r"\b(?:\d{4}[- ]?){3}\d{4}\b").unwrap(),
            ssn_us_regex: Regex::new(r"\b\d{3}-\d{2}-\d{4}\b").unwrap(),
            
            medical_keywords: vec![
                "medisch", "gezondheid", "arts", "ziekenhuis", "patient", 
                "diagnose", "recept", "medicatie", "behandeling", "klacht",
                "medicine", "health", "doctor", "hospital", "diagnosis"
            ],
            financial_keywords: vec![
                "bankrekening", "salaris", "betalen", "factuur", "bedrag",
                "krediet", "lening", "hypotheek", "verzekering", "premie",
                "bankaccount", "payment", "invoice", "salary", "credit"
            ],
            address_keywords: vec![
                "adres", "straat", "weg", "laan", "plein", "huisnummer",
                "postcode", "woonplaats", "provincie", "address", "street"
            ],
        }
    }

    /// Tauri command for fast data detection
#[tauri::command]
pub fn fast_detect(texts: Vec<String>) -> DataDetection {
    let scanner = FastScanner::new();
    scanner.scan_batch(&texts)
}

/// Scan text for personal data patterns
    /// Returns detection result with high confidence for matches found via regex
    pub fn scan(&self, text: &str) -> DataDetection {
        let mut data_types = Vec::new();
        let mut confidence = 0.0;
        
        let text_lower = text.to_lowercase();
        
        // Check each pattern
        if self.bsn_regex.is_match(text) {
            data_types.push("BSN".to_string());
            confidence += 0.95;
        }
        
        if self.iban_regex.is_match(text) {
            data_types.push("IBAN".to_string());
            confidence += 0.95;
        }
        
        if self.phone_nl_regex.is_match(text) {
            data_types.push("Telefoonnummer".to_string());
            confidence += 0.85;
        }
        
        if self.postcode_regex.is_match(text) {
            data_types.push("Postcode".to_string());
            confidence += 0.7;
        }
        
        if self.email_regex.is_match(text) {
            if !data_types.contains(&"Email".to_string()) {
                data_types.push("Email".to_string());
                confidence += 0.6;
            }
        }
        
        if self.ipv4_regex.is_match(text) || self.ipv6_regex.is_match(text) {
            data_types.push("IP-adres".to_string());
            confidence += 0.7;
        }
        
        if self.credit_card_regex.is_match(text) {
            data_types.push("Kredietkaart".to_string());
            confidence += 0.9;
        }
        
        // Check keyword categories
        for keyword in &self.medical_keywords {
            if text_lower.contains(keyword) {
                if !data_types.contains(&"Medisch".to_string()) {
                    data_types.push("Medisch".to_string());
                    confidence += 0.65;
                    break;
                }
            }
        }
        
        for keyword in &self.financial_keywords {
            if text_lower.contains(keyword) {
                if !data_types.contains(&"Financieel".to_string()) {
                    data_types.push("Financieel".to_string());
                    confidence += 0.6;
                    break;
                }
            }
        }
        
        for keyword in &self.address_keywords {
            if text_lower.contains(keyword) {
                if !data_types.contains(&"Adres".to_string()) {
                    data_types.push("Adres".to_string());
                    confidence += 0.5;
                    break;
                }
            }
        }
        
        let has_personal_data = !data_types.is_empty();
        let summary = if has_personal_data {
            format!("Snel scan: {} gevonden ({:.0}% zeker)", 
                data_types.len(), confidence * 100.0)
        } else {
            "Snel scan: geen persoonsgegevens gevonden".to_string()
        };
        
        DataDetection {
            has_personal_data,
            data_types,
            confidence: confidence.min(1.0),
            summary,
        }
    }
    
    /// Scan multiple texts and aggregate results
    pub fn scan_batch(&self, texts: &[String]) -> DataDetection {
        let mut all_types = Vec::new();
        let mut max_confidence = 0.0f32;
        
        for text in texts {
            let result = self.scan(text);
            if result.has_personal_data {
                for dt in result.data_types {
                    if !all_types.contains(&dt) {
                        all_types.push(dt);
                    }
                }
                max_confidence = max_confidence.max(result.confidence);
            }
        }
        
        DataDetection {
            has_personal_data: !all_types.is_empty(),
            data_types: all_types,
            confidence: max_confidence,
            summary: if !all_types.is_empty() {
                format!("Batch scan: {} types gevonden", all_types.len())
            } else {
                "Geen persoonsgegevens in batch".to_string()
            },
        }
    }
}

impl Default for FastScanner {
    fn default() -> Self {
        Self::new()
    }
}
