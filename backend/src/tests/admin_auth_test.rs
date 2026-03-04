/// Unit tests for admin authentication logic.
///
/// These tests cover pure-logic functions that don't require a live database
/// or network connection, keeping the suite fast and hermetic.
///
/// Run with:
///   cargo test admin_auth
#[cfg(test)]
mod tests {
    use std::sync::Arc;

    use crate::{
        config::Config,
        models::admin::AdminUser,
        services::admin_auth_service,
    };

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    /// Build a minimal in-memory Config for tests.
    fn test_config() -> Arc<Config> {
        Arc::new(Config {
            server_port:           3000,
            database_url:          "postgres://localhost/test".into(),
            jwt_secret:            "super_secret_test_key_32_chars!!".into(),
            jwt_expiration_hours:  24,
            google_client_id:      "test_client_id".into(),
            google_client_secret:  "test_client_secret".into(),
            google_redirect_uri:   "http://localhost:3000/auth/callback".into(),
            frontend_url:          "http://localhost:5173".into(),
            smtp_host:             "localhost".into(),
            smtp_port:             1025,
            smtp_username:         "test@example.com".into(),
            smtp_password:         "testpassword".into(),
            contact_from_name:     "Test Shop".into(),
            contact_from_email:    "noreply@example.com".into(),
            contact_admin_email:   "admin@example.com".into(),
            reply_logo_url:        "".into(),
            cloudflare_secret_key: "0x0000000000000000000000000000000000000000".into(),
            admin_username:        "hothienty".into(),
            admin_password:        "tohkaty01".into(),
        })
    }

    /// Build a fake AdminUser for JWT-generation tests.
    fn fake_admin() -> AdminUser {
        AdminUser {
            id:            uuid::Uuid::new_v4(),
            username:      "hothienty".into(),
            password_hash: "$argon2id$fake".into(),
            created_at:    chrono::Utc::now(),
        }
    }

    // -----------------------------------------------------------------------
    // hash_password / verify_password
    // -----------------------------------------------------------------------

    #[test]
    fn hash_roundtrip_correct_password() {
        let password = "tohkaty01";
        let hash = admin_auth_service::hash_password(password)
            .expect("hashing should succeed");

        // Hash is a non-empty PHC string
        assert!(!hash.is_empty(), "hash must not be empty");
        assert!(hash.starts_with("$argon2id$"), "expected Argon2id PHC format");

        // Verification with the correct password must return true
        let ok = admin_auth_service::verify_password(password, &hash)
            .expect("verify should not error on valid hash");
        assert!(ok, "correct password should verify");
    }

    #[test]
    fn hash_roundtrip_wrong_password() {
        let password = "tohkaty01";
        let hash = admin_auth_service::hash_password(password)
            .expect("hashing should succeed");

        let ok = admin_auth_service::verify_password("wrongpassword", &hash)
            .expect("verify should not error");
        assert!(!ok, "wrong password must not verify");
    }

    #[test]
    fn two_hashes_of_same_password_are_different() {
        // Argon2id uses a random salt — hashes must differ
        let h1 = admin_auth_service::hash_password("tohkaty01").unwrap();
        let h2 = admin_auth_service::hash_password("tohkaty01").unwrap();
        assert_ne!(h1, h2, "salted hashes must differ");
    }

    #[test]
    fn verify_returns_error_on_invalid_hash_format() {
        let result = admin_auth_service::verify_password("anypassword", "not_a_valid_hash");
        assert!(result.is_err(), "invalid hash format should return Err");
    }

    // -----------------------------------------------------------------------
    // generate_admin_jwt
    // -----------------------------------------------------------------------

    #[test]
    fn generate_admin_jwt_produces_non_empty_token() {
        let config = test_config();
        let admin  = fake_admin();
        let token  = admin_auth_service::generate_admin_jwt(&config, &admin)
            .expect("JWT generation should succeed");

        assert!(!token.is_empty(), "token must not be empty");
        // A standard JWT has three base64url segments separated by dots
        assert_eq!(token.split('.').count(), 3, "JWT must have exactly 3 segments");
    }

    #[test]
    fn generated_admin_jwt_is_verifiable() {
        use crate::services::auth_service;

        let config = test_config();
        let admin  = fake_admin();
        let token  = admin_auth_service::generate_admin_jwt(&config, &admin).unwrap();

        let claims = auth_service::verify_jwt(&config, &token)
            .expect("token generated with the same config must be verifiable");

        assert_eq!(claims.role, "admin",     "role claim must be 'admin'");
        assert_eq!(claims.sub,  admin.id.to_string(), "sub must match admin id");
        assert_eq!(claims.name, admin.username,       "name must match username");
    }

    #[test]
    fn generated_jwt_role_is_admin_not_user() {
        use crate::services::auth_service;

        let config = test_config();
        let admin  = fake_admin();
        let token  = admin_auth_service::generate_admin_jwt(&config, &admin).unwrap();
        let claims = auth_service::verify_jwt(&config, &token).unwrap();

        // Explicitly assert not "user" — guards depend on this distinction
        assert_ne!(claims.role, "user", "admin token must not carry 'user' role");
    }

    #[test]
    fn jwt_with_wrong_secret_fails_verification() {
        use crate::services::auth_service;

        let config = test_config();
        let admin  = fake_admin();
        let token  = admin_auth_service::generate_admin_jwt(&config, &admin).unwrap();

        // Build a second config with a different secret
        let mut wrong_config = (*config).clone();
        wrong_config.jwt_secret = "completely_different_secret_!!!".into();
        let wrong_config = Arc::new(wrong_config);

        let result = auth_service::verify_jwt(&wrong_config, &token);
        assert!(result.is_err(), "token signed with a different secret must not verify");
    }
}
