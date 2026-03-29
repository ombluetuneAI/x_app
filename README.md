# X Browser GUI

A PyQt5-based GUI application for browsing X (Twitter) users and their content.

## Features

- User search and profile display
- Tweet browsing with text content
- Media content display (images and videos)
- Following user navigation
- Back navigation between users
- Media links that open in browser

## Requirements

- Python 3.7+
- PyQt5
- requests

## Installation

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create `config.json` with your X API credentials:
```json
{
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  "cookies": {
    "auth_token": "your_auth_token",
    "ct0": "your_csrf_token"
  },
  "proxies": {
    "http": "http://127.0.0.1:7890",
    "https": "http://127.0.0.1:7890"
  }
}
```

## Usage

1. Run the GUI:
```bash
python gui.py
```

2. Search for users (default starts with elonmusk)
3. Click on following users to navigate
4. Use back button to return to previous users
5. Click media links to open in browser

## UI Components

- **Profile Panel**: Shows user info and stats
- **Following List**: Shows users this account follows
- **All Tweets**: Displays all tweets with content and media links
- **Media Posts**: Shows tweets that contain media
- **Navigation**: Search box and back button

## API Integration

The GUI uses the unified X API client to fetch:
- User profiles
- Tweets and media
- Following relationships

Note: Some features may be limited due to X API restrictions.
