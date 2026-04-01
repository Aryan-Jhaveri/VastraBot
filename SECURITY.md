# Security Policy

## Supported Versions

Only the latest version of VastraBot is supported for security updates.

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability within this project, please do not open a public issue. Instead, please report it via the following method:

1.  **Email:** Send an email to [aryan.jhaveri@outlook.com](mailto:aryan.jhaveri@outlook.com).
2.  **Details:** Include as much information as possible, including steps to reproduce the issue.
3.  **Response:** You will receive an acknowledgment within 48 hours.

## Security Overview

VastraBot is designed to be self-hosted and prioritizes user privacy.

### Authentication & Authorization

- **Telegram Bot:** Access is strictly limited to the user ID specified in `TELEGRAM_ALLOWED_USER_ID`. All other users are blocked.
- **Web Dashboard:** Protected by a password (`WEB_AUTH_PASSWORD`). Sessions are maintained via a `closet-auth` cookie or Bearer token.
- **Timing Attacks:** Comparison of authentication tokens uses `timingSafeEqual` to prevent timing-based side-channel attacks.

### Data Privacy

- **Local Storage:** All wardrobe data, settings, and images are stored locally in a SQLite database and the filesystem (specified by `CLOSET_DATA_DIR`).
- **AI Processing:** Image data and text queries are sent to Google's Gemini API for processing. Users should review [Google's Generative AI Privacy Notice](https://generativelanguage.googleapis.com/privacy).
- **No Third-Party Tracking:** This application does not include any third-party analytics or tracking scripts.

### Best Practices for Deployment

- **Environment Variables:** Never commit your `.env` file. A `.env.example` is provided as a template.
- **HTTPS:** Always run the web dashboard over HTTPS. If using a tunnel (like Cloudflare or ngrok), ensure you use the provided HTTPS URL.
- **Updates:** Keep your Node.js environment and dependencies updated to the latest stable versions.
