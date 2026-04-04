/// Unit tests for OAuth CSRF helpers.
#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use crate::{config::Config, services::auth_service};

    fn test_config() -> Arc<Config> {
        Arc::new(Config {
            server_port: 3000,
            database_url: "postgres://localhost/test".into(),
            google_client_id: "test_client_id".into(),
            google_client_secret: "test_client_secret".into(),
            google_redirect_uri: "http://localhost:3000/auth/callback".into(),
            jwt_secret: "super_secret_test_key_32_chars!!".into(),
            jwt_expiration_hours: 24,
            csrf_cookie_key: "csrf_secret_test_key_32_chars!!".into(),
            frontend_url: "http://localhost:5173".into(),
            smtp_host: "localhost".into(),
            smtp_port: 1025,
            smtp_username: "test@example.com".into(),
            smtp_password: "testpassword".into(),
            contact_from_name: "Test Shop".into(),
            contact_from_email: "noreply@example.com".into(),
            contact_admin_email: "admin@example.com".into(),
            reply_logo_url: "".into(),
            cloudflare_secret_key: "0x0000000000000000000000000000000000000000".into(),
            admin_username: "hothienty".into(),
            admin_password: "tohkaty01".into(),
        })
    }

    #[test]
    fn csrf_state_is_random_hex() {
        let first = auth_service::generate_csrf_state();
        let second = auth_service::generate_csrf_state();

        assert_eq!(first.len(), 64);
        assert_eq!(second.len(), 64);
        assert_ne!(first, second);
        assert!(first.chars().all(|c| c.is_ascii_hexdigit()));
        assert!(second.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn csrf_cookie_can_be_signed_and_verified() {
        let config = test_config();
        let state = auth_service::generate_csrf_state();

        let cookie = auth_service::build_csrf_cookie(&config, &state)
            .expect("cookie should be built");
        let token = cookie
            .split(';')
            .find_map(|part| part.trim().strip_prefix("oauth_state="))
            .expect("token should be embedded in cookie");

        auth_service::verify_csrf_state(&config, Some(token), Some(&state))
            .expect("matching state should verify");
    }

    #[test]
    fn csrf_cookie_rejects_mismatched_state() {
        let config = test_config();
        let state = auth_service::generate_csrf_state();

        let cookie = auth_service::build_csrf_cookie(&config, &state)
            .expect("cookie should be built");
        let token = cookie
            .split(';')
            .find_map(|part| part.trim().strip_prefix("oauth_state="))
            .expect("token should be embedded in cookie");

        let result = auth_service::verify_csrf_state(&config, Some(token), Some("wrong-state"));
        assert!(result.is_err());
    }

    #[test]
    fn cookie_header_extraction_finds_expected_cookie() {
        let header = Some("foo=bar; oauth_state=abc123; theme=dark");
        let found = auth_service::extract_cookie_value(header, "oauth_state");

        assert_eq!(found.as_deref(), Some("abc123"));
    }
}