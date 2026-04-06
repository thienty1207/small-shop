#[cfg(test)]
mod tests {
    use crate::startup::format_bind_error;

    #[test]
    fn bind_error_message_mentions_port_conflict() {
        let message = format_bind_error(
            "0.0.0.0:3000",
            &std::io::Error::new(
                std::io::ErrorKind::AddrInUse,
                "Only one usage of each socket address is normally permitted.",
            ),
        );

        assert!(message.contains("0.0.0.0:3000"));
        assert!(message.contains("already using this port"));
        assert!(message.contains("stop the old backend process"));
    }
}
