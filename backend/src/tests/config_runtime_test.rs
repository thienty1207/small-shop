use crate::config::{
    parse_app_env, resolve_auto_run_migrations, resolve_media_backend, AppEnv, MediaBackend,
};

#[test]
fn development_defaults_to_local_media_and_auto_migrations() {
    let env = parse_app_env(None).expect("default env should be development");
    let backend = resolve_media_backend(env, None, false).expect("dev should allow local media");

    assert_eq!(env, AppEnv::Development);
    assert_eq!(backend, MediaBackend::Local);
    assert!(resolve_auto_run_migrations(env, None).expect("dev should auto run migrations"));
}

#[test]
fn production_rejects_local_media_backend() {
    let error = resolve_media_backend(AppEnv::Production, Some("local"), false)
        .expect_err("production must reject local media");

    assert!(error.contains("UPLOAD_BACKEND"));
}

#[test]
fn production_defaults_to_remote_media_and_disables_auto_migrations() {
    let backend = resolve_media_backend(AppEnv::Production, None, true)
        .expect("production should accept cloudinary when configured");

    assert_eq!(backend, MediaBackend::Cloudinary);
    assert!(!resolve_auto_run_migrations(AppEnv::Production, None)
        .expect("production should not auto run migrations"));
}
