# Notify - Smart Task Management Application

A modern, AI-enhanced task management application that helps you organize your daily activities with intelligent reminders and natural language processing.

## 🌟 Features

- **Smart Task Creation**: Add tasks using natural language input
- **AI Enhancement**: Intelligent task analysis and suggestion system
- **Real-time Updates**: Instant task list updates using WebSocket technology
- **Custom Categories**: Organize tasks by type (Work, Personal, Shopping, Health, etc.)
- **Smart Reminders**: Customizable notification system
- **Cross-platform**: Built with React Native for both iOS and Android support
- **Modern UI**: Clean and intuitive user interface

## 🚀 Technology Stack

### Frontend
- React Native (Expo)
- Socket.io Client
- @react-native-community/datetimepicker
- expo-notifications

### Backend
- Flask (Python)
- Flask-SocketIO
- SQLite3
- AI Enhancement capabilities

## 📋 Prerequisites

- Node.js
- Python 3.x
- Expo CLI
- pip (Python package manager)

## 🛠️ Installation

1. **Clone the repository**
```bash
git clone [your-repository-url]
cd notify
```

2. **Install Frontend Dependencies**
```bash
npm install
```

3. **Install Backend Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

4. **Set up the Database**
The application will automatically set up the SQLite database on first run.

## 🚀 Running the Application

1. **Start the Backend Server**
```bash
cd backend
python app.py
```

2. **Start the Frontend Application**
```bash
expo start
```

## 📱 Usage

1. Launch the application on your device or emulator
2. Add tasks using the input field with natural language processing
3. Set reminders and categories for your tasks
4. Receive smart notifications for your upcoming tasks
5. Manage and organize your tasks with an intuitive interface

## 🔒 Security

- Secure API key management
- Protected backend endpoints
- Safe data storage practices

## 📄 License

Copyright (c) 2025 Fares Kareem Fouly

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 👨‍💻 Author

**Fares Kareem Fouly**

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
