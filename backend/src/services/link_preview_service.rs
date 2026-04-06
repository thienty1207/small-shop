use std::{
    collections::{HashMap, HashSet},
    net::{IpAddr, Ipv4Addr, Ipv6Addr},
    time::Duration,
};

use futures::stream::{self, StreamExt};
use reqwest::{
    header::{HeaderMap, HeaderValue, ACCEPT, ACCEPT_LANGUAGE, CONTENT_TYPE, REFERER, USER_AGENT},
    Client, Url,
};
use scraper::{node::Node, ElementRef, Html, Selector};
use serde::Deserialize;

use crate::{error::AppError, models::blog::ExternalLinkPreview};

const MAX_EXTERNAL_PREVIEWS_PER_POST: usize = 6;
const EXTERNAL_PREVIEW_FETCH_CONCURRENCY: usize = 3;
const EXTERNAL_PREVIEW_TIMEOUT: Duration = Duration::from_secs(8);
const PREVIEW_USER_AGENT: &str =
    "Mozilla/5.0 (compatible; RustyPerfumeBot/1.0; +https://rustyperfume.local)";
const PREVIEW_ACCEPT: &str =
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8";
const PREVIEW_ACCEPT_LANGUAGE: &str = "en-US,en;q=0.9,vi;q=0.8";
const PREVIEW_REFERER: &str = "https://www.google.com/";
const MICROLINK_API_BASE: &str = "https://api.microlink.io/?url=";

#[derive(Debug, Deserialize)]
struct MicrolinkResponse {
    data: Option<MicrolinkData>,
}

#[derive(Debug, Deserialize)]
struct MicrolinkData {
    title: Option<String>,
    description: Option<String>,
    url: Option<String>,
    publisher: Option<String>,
    image: Option<MicrolinkImage>,
}

#[derive(Debug, Deserialize)]
struct MicrolinkImage {
    url: Option<String>,
}

fn normalize_url(raw_url: &str) -> Option<String> {
    let trimmed = raw_url.trim();
    if trimmed.is_empty() {
        return None;
    }

    let mut url = Url::parse(trimmed).ok()?;
    if !matches!(url.scheme(), "http" | "https") {
        return None;
    }

    let host = url.host_str()?.trim().to_lowercase();
    if host.is_empty() || host == "localhost" || host.ends_with(".local") {
        return None;
    }

    if let Ok(ip) = host.parse::<IpAddr>() {
        let is_private = match ip {
            IpAddr::V4(ipv4) => {
                ipv4.is_private()
                    || ipv4.is_loopback()
                    || ipv4.is_link_local()
                    || ipv4 == Ipv4Addr::UNSPECIFIED
            }
            IpAddr::V6(ipv6) => {
                ipv6.is_loopback()
                    || ipv6.is_unspecified()
                    || ipv6.is_unique_local()
                    || ipv6.is_unicast_link_local()
                    || ipv6 == Ipv6Addr::LOCALHOST
            }
        };

        if is_private {
            return None;
        }
    }

    let host = url.host_str()?.to_lowercase();
    if host == "youtu.be" || host.ends_with("youtube.com") {
        return None;
    }

    url.set_fragment(None);
    Some(url.to_string())
}

fn element_text(element: &ElementRef<'_>) -> String {
    element
        .text()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .collect::<Vec<_>>()
        .join(" ")
}

fn extract_anchor_only_url(element: &ElementRef<'_>) -> Option<String> {
    let mut direct_anchor_href = None;
    let mut direct_element_count = 0;

    for child in element.children() {
        match child.value() {
            Node::Element(node) => {
                direct_element_count += 1;
                if direct_element_count > 1 || node.name() != "a" {
                    return None;
                }

                let anchor = ElementRef::wrap(child)?;
                direct_anchor_href = anchor.value().attr("href").map(ToOwned::to_owned);
            }
            Node::Text(text) => {
                if !text.text.trim().is_empty() {
                    return None;
                }
            }
            _ => {}
        }
    }

    normalize_url(direct_anchor_href.as_deref()?)
}

fn extract_plain_text_url(element: &ElementRef<'_>) -> Option<String> {
    if element.children().any(|child| matches!(child.value(), Node::Element(_))) {
        return None;
    }

    normalize_url(&element_text(element))
}

pub fn extract_previewable_external_urls(html: &str) -> Vec<String> {
    let document = Html::parse_fragment(html);
    let selector = Selector::parse("p, li").expect("valid selector");
    let mut seen = HashSet::new();
    let mut urls = Vec::new();

    for element in document.select(&selector) {
        let candidate = extract_anchor_only_url(&element).or_else(|| extract_plain_text_url(&element));
        let Some(url) = candidate else {
            continue;
        };

        if seen.insert(url.clone()) {
            urls.push(url);
        }

        if urls.len() >= MAX_EXTERNAL_PREVIEWS_PER_POST {
            break;
        }
    }

    urls
}

fn read_meta_content(document: &Html, keys: &[&str]) -> Option<String> {
    let selector = Selector::parse("meta").expect("valid selector");

    for element in document.select(&selector) {
        let meta_key = element
            .value()
            .attr("property")
            .or_else(|| element.value().attr("name"));

        if let Some(meta_key) = meta_key {
            if keys.iter().any(|key| meta_key.eq_ignore_ascii_case(key)) {
                if let Some(content) = element
                    .value()
                    .attr("content")
                    .map(str::trim)
                    .filter(|value| !value.is_empty())
                {
                    return Some(content.to_string());
                }
            }
        }
    }

    None
}

fn read_title(document: &Html) -> Option<String> {
    let selector = Selector::parse("title").expect("valid selector");
    document
        .select(&selector)
        .next()
        .map(|element| element_text(&element))
        .filter(|value| !value.is_empty())
}

fn resolve_base_url(url: &Url, document: &Html) -> Url {
    let selector = Selector::parse("base[href]").expect("valid selector");
    document
        .select(&selector)
        .next()
        .and_then(|element| element.value().attr("href"))
        .and_then(|href| url.join(href).ok())
        .unwrap_or_else(|| url.clone())
}

fn resolve_asset_url(base_url: &Url, raw_url: Option<String>) -> Option<String> {
    let raw_url = raw_url?.trim().to_string();
    if raw_url.is_empty() {
        return None;
    }

    base_url.join(&raw_url).ok().map(|url| url.to_string())
}

pub fn parse_external_link_preview(url: &Url, html: &str) -> Option<ExternalLinkPreview> {
    let normalized_url = normalize_url(url.as_str())?;
    let document = Html::parse_document(html);
    let base_url = resolve_base_url(url, &document);
    let domain = url
        .domain()
        .or_else(|| url.host_str())
        .map(|value| value.trim_start_matches("www.").to_string())?;

    let title = read_meta_content(&document, &["og:title", "twitter:title"])
        .or_else(|| read_title(&document))
        .unwrap_or_else(|| domain.clone());
    let description = read_meta_content(
        &document,
        &["og:description", "twitter:description", "description"],
    );
    let image_url = resolve_asset_url(
        &base_url,
        read_meta_content(&document, &["og:image", "twitter:image", "twitter:image:src"]),
    );
    let site_name = read_meta_content(&document, &["og:site_name", "application-name"]);

    Some(ExternalLinkPreview {
        url: normalized_url,
        title,
        description,
        image_url,
        site_name,
        domain,
    })
}

fn parse_microlink_preview(source_url: &str, payload: &str) -> Option<ExternalLinkPreview> {
    let response = serde_json::from_str::<MicrolinkResponse>(payload).ok()?;
    let data = response.data?;
    let normalized_source_url = normalize_url(source_url)?;
    let resolved_url = data
        .url
        .as_deref()
        .and_then(normalize_url)
        .unwrap_or_else(|| normalized_source_url.clone());
    let url = Url::parse(&resolved_url).ok()?;
    let domain = url
        .domain()
        .or_else(|| url.host_str())
        .map(|value| value.trim_start_matches("www.").to_string())?;
    let title = data.title.unwrap_or_else(|| domain.clone());

    Some(ExternalLinkPreview {
        url: normalized_source_url,
        title,
        description: data.description,
        image_url: data.image.and_then(|image| image.url),
        site_name: data.publisher,
        domain,
    })
}

async fn fetch_external_link_preview(
    client: &Client,
    url: &str,
) -> Result<Option<ExternalLinkPreview>, AppError> {
    let Some(normalized_url) = normalize_url(url) else {
        return Ok(None);
    };

    let response = client
        .get(&normalized_url)
        .headers(preview_request_headers())
        .timeout(EXTERNAL_PREVIEW_TIMEOUT)
        .send()
        .await?;

    if response.status().is_success() {
        let final_url = response.url().clone();
        let content_type = response
            .headers()
            .get(CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .unwrap_or("");

        if content_type.is_empty()
            || content_type.contains("text/html")
            || content_type.contains("application/xhtml+xml")
        {
            let html = response.text().await?;
            if let Some(preview) = parse_external_link_preview(&final_url, &html) {
                return Ok(Some(preview));
            }
        }
    }

    fetch_microlink_preview(client, &normalized_url).await
}

fn preview_map(previews: &[ExternalLinkPreview]) -> HashMap<String, ExternalLinkPreview> {
    previews
        .iter()
        .filter_map(|preview| normalize_url(&preview.url).map(|key| (key, preview.clone())))
        .collect()
}

fn preview_request_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(ACCEPT, HeaderValue::from_static(PREVIEW_ACCEPT));
    headers.insert(ACCEPT_LANGUAGE, HeaderValue::from_static(PREVIEW_ACCEPT_LANGUAGE));
    headers.insert(REFERER, HeaderValue::from_static(PREVIEW_REFERER));
    headers.insert(USER_AGENT, HeaderValue::from_static(PREVIEW_USER_AGENT));
    headers
}

async fn fetch_microlink_preview(
    client: &Client,
    url: &str,
) -> Result<Option<ExternalLinkPreview>, AppError> {
    let api_url = format!("{MICROLINK_API_BASE}{}", urlencoding::encode(url));
    let response = client
        .get(api_url)
        .header(USER_AGENT, PREVIEW_USER_AGENT)
        .timeout(EXTERNAL_PREVIEW_TIMEOUT)
        .send()
        .await?;

    if !response.status().is_success() {
        return Ok(None);
    }

    let payload = response.text().await?;
    Ok(parse_microlink_preview(url, &payload))
}

pub async fn enrich_external_link_previews(
    client: &Client,
    html: &str,
    existing: &[ExternalLinkPreview],
) -> Result<Vec<ExternalLinkPreview>, AppError> {
    let urls = extract_previewable_external_urls(html);
    if urls.is_empty() {
        return Ok(Vec::new());
    }

    let mut previews_by_url = preview_map(existing);
    let missing_urls = urls
        .iter()
        .filter(|url| !previews_by_url.contains_key(*url))
        .cloned()
        .collect::<Vec<_>>();

    let fetched = stream::iter(missing_urls.into_iter().map(|url| {
        let client = client.clone();
        async move {
            match fetch_external_link_preview(&client, &url).await {
                Ok(Some(preview)) => Some((url, preview)),
                Ok(None) => None,
                Err(error) => {
                    tracing::warn!("Failed to fetch external link preview for {url}: {error}");
                    None
                }
            }
        }
    }))
    .buffer_unordered(EXTERNAL_PREVIEW_FETCH_CONCURRENCY)
    .collect::<Vec<_>>()
    .await;

    for (requested_url, preview) in fetched.into_iter().flatten() {
        previews_by_url.insert(requested_url.clone(), preview.clone());
        if let Some(key) = normalize_url(&preview.url) {
            previews_by_url.insert(key, preview);
        }
    }

    Ok(urls
        .into_iter()
        .filter_map(|url| previews_by_url.get(&url).cloned())
        .collect())
}

#[cfg(test)]
mod tests {
    use reqwest::{
        header::{ACCEPT, ACCEPT_LANGUAGE, REFERER, USER_AGENT},
        Url,
    };

    use super::{
        extract_previewable_external_urls, parse_external_link_preview, parse_microlink_preview,
        preview_request_headers,
    };

    #[test]
    fn extract_previewable_external_urls_only_keeps_standalone_non_youtube_links() {
        let html = r#"
            <p>Đây là link inline <a href="https://www.fragrantica.com/news">Fragrantica</a> trong đoạn văn.</p>
            <p>https://www.fragrantica.com/awards2025/category/Best-Mens-Fragrance-2025</p>
            <p><a href="https://www.fragrantica.com/perfume/rusty-story">Rusty Story</a></p>
            <p>https://www.youtube.com/watch?v=xSK5NoUMUcQ</p>
        "#;

        let urls = extract_previewable_external_urls(html);

        assert_eq!(
            urls,
            vec![
                "https://www.fragrantica.com/awards2025/category/Best-Mens-Fragrance-2025".to_string(),
                "https://www.fragrantica.com/perfume/rusty-story".to_string(),
            ]
        );
    }

    #[test]
    fn parse_external_link_preview_reads_open_graph_metadata() {
        let html = r#"
            <html>
                <head>
                    <title>Ignored title</title>
                    <meta property="og:title" content="Best Men's Fragrance 2025" />
                    <meta property="og:description" content="Top fragrances selected by the community." />
                    <meta property="og:image" content="/images/award-cover.jpg" />
                    <meta property="og:site_name" content="Fragrantica" />
                </head>
            </html>
        "#;

        let preview = parse_external_link_preview(
            &Url::parse("https://www.fragrantica.com/awards2025/category/Best-Mens-Fragrance-2025")
                .expect("valid url"),
            html,
        )
        .expect("preview should be parsed");

        assert_eq!(preview.title, "Best Men's Fragrance 2025");
        assert_eq!(
            preview.description.as_deref(),
            Some("Top fragrances selected by the community.")
        );
        assert_eq!(
            preview.image_url.as_deref(),
            Some("https://www.fragrantica.com/images/award-cover.jpg")
        );
        assert_eq!(preview.site_name.as_deref(), Some("Fragrantica"));
        assert_eq!(preview.domain, "fragrantica.com");
    }

    #[test]
    fn preview_request_headers_look_like_a_browser_request() {
        let headers = preview_request_headers();

        assert_eq!(
            headers.get(ACCEPT).and_then(|value| value.to_str().ok()),
            Some(
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8"
            )
        );
        assert_eq!(
            headers
                .get(ACCEPT_LANGUAGE)
                .and_then(|value| value.to_str().ok()),
            Some("en-US,en;q=0.9,vi;q=0.8")
        );
        assert_eq!(
            headers.get(REFERER).and_then(|value| value.to_str().ok()),
            Some("https://www.google.com/")
        );
        assert!(headers.get(USER_AGENT).is_some());
    }

    #[test]
    fn parse_microlink_preview_maps_payload_to_preview_card() {
        let payload = r#"
            {
              "status":"success",
              "data":{
                "title":"Best Men's Fragrance 2025",
                "description":"Top fragrances selected by the community.",
                "url":"https://www.fragrantica.com/awards2025/",
                "publisher":"www.fragrantica.com",
                "image":{"url":"https://fimgs.net/himg/o.f5AyP5M4iiT.jpg"}
              }
            }
        "#;

        let preview = parse_microlink_preview(
            "https://www.fragrantica.com/awards2025/category/Best-Mens-Fragrance-2025",
            payload,
        )
        .expect("preview should be parsed");

        assert_eq!(
            preview.url,
            "https://www.fragrantica.com/awards2025/category/Best-Mens-Fragrance-2025"
        );
        assert_eq!(preview.title, "Best Men's Fragrance 2025");
        assert_eq!(
            preview.image_url.as_deref(),
            Some("https://fimgs.net/himg/o.f5AyP5M4iiT.jpg")
        );
        assert_eq!(preview.site_name.as_deref(), Some("www.fragrantica.com"));
        assert_eq!(preview.domain, "fragrantica.com");
    }
}
