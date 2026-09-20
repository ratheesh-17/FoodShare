# Food Redistribution Platform

A full-stack platform for reducing food waste and connecting surplus food donors with nearby NGOs, volunteers, and community beneficiaries in Nagercoil and the Kanyakumari district.

This project combines a React frontend, FastAPI backend, MySQL database, and ML-powered donation matching to streamline food recovery, pickup coordination, and delivery tracking.

## Overview

The application supports four main roles:

- Donors: post surplus food listings
- NGOs: discover nearby donations and claim them
- Volunteers: accept and complete pickup/delivery tasks
- Admin: monitor system activity, users, and donation flow

The platform includes:

- JWT-based authentication and role-based access
- Donation posting with upload support
- Geographic map-based donation discovery
- Smart matching for NGOs using distance, demand, and rating signals
- Volunteer assignment and delivery tracking
- Expiry risk scoring and urgency notifications
- Telegram alerts for urgent food expiring soon
- Dashboard analytics and leaderboard features

## Tech Stack

### Frontend
- React 19
- React Router
- Leaflet + React Leaflet for mapping
- Tailwind CSS
- Axios for API calls

### Backend
- Python 3
- FastAPI
- SQLAlchemy
- MySQL
- JWT auth via python-jose and passlib
- Static file upload support

### ML / Intelligence
- scikit-learn
- pandas
- numpy
- joblib

## Core Features

### Donor Flow
- Create food donation listings
- Attach photos to donations
- Set pickup details and expiry time
- View donation history and impact statistics
- Rate completed volunteers

### NGO Flow
- View nearby active donations by geography
- Claim donations and manage assigned tasks
- Review smart recommendations from the AI engine
- Track pickups and delivery status

### Volunteer Flow
- View assigned deliveries
- Use route and map views for pickup coordination
- Mark donation tasks as completed

### Admin Flow
- Access platform overview dashboard
- Monitor users and donation records
- Review system activity and demand trends
- Manage operational visibility across the platform

### Smart Engine
- Calculates spoilage/expiry risk for posted food
- Recommends NGOs based on demand and proximity
- Sends urgent alerts before food expires
- Supports data-driven redistribution decisions

## Architecture

```text
Frontend (React)
    |
    v
FastAPI Backend
    |
    +--> MySQL Database
    |
    +--> ML matching and risk scoring
    |
    +--> Telegram / notification services
    |
    +--> Static uploads directory
```

## Project Structure

```text
Food_Redistribution/
├── API_DOCUMENTATION.md
├── PAGES_DOCUMENTATION.md
├── README.md
├── backend/
│   ├── .env
│   ├── auth.py
│   ├── database.py
│   ├── main.py
│   ├── ml.py
│   ├── models.py
│   ├── requirements.txt
│   ├── schemas.py
│   ├── seed_demo.py
│   ├── telegram_bot.py
│   ├── train_spoilage_model.py
│   ├── utils.py
│   ├── uploads/
│   └── routes/
│       ├── admin.py
│       ├── ai.py
│       ├── donations.py
│       ├── ml.py
│       ├── telegram.py
│       ├── upload.py
│       ├── users.py
│       ├── volunteers.py
│       └── __init__.py
├── frontend/
│   ├── .env
│   ├── package.json
│   ├── public/
│   ├── src/
│   └── README.md
└── .git/
```

## Prerequisites

Before running the project, make sure you have:

- Python 3.10+
- Node.js 18+
- npm
- MySQL running locally

## Backend Setup

1. Open a terminal in the backend folder.
2. Create and activate a virtual environment:

```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Configure environment variables in `backend/.env`:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=food_redistribution
SECRET_KEY=your_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_HOURS=168
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin_password
GEMINI_API_KEY=your_key
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_ADMIN_CHAT_ID=your_chat_id
```

5. Start the backend:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at:

- API: http://localhost:8000
- Swagger docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health

## Frontend Setup

1. Open a terminal in the frontend folder.
2. Install dependencies:

```bash
cd frontend
npm install
```

3. Ensure `frontend/.env` is configured:

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_ORS_KEY=your_openrouteservice_key
```

4. Start the app:

```bash
npm start
```

The React app will run at:

- Frontend: http://localhost:3000

## Default Access Flow

- Donor, NGO, and Volunteer users authenticate via the main login page.
- Admin users use the dedicated admin login flow with OTP verification.
- Role-based route protection redirects unauthorized users back to the login page.

## Demo / Seed Data

The project includes data seeding utilities and demo workflows. You may use:

```bash
cd backend
python seed_demo.py
```

This can help load sample users, donations, and notification data for local testing.

## Documentation

This repository includes dedicated documentation for both the API and the user-facing pages:

- [API_DOCUMENTATION.md](API_DOCUMENTATION.md)
- [PAGES_DOCUMENTATION.md](PAGES_DOCUMENTATION.md)

## Useful Notes

- Uploaded food images are served from the backend `uploads` directory.
- The app automatically expires overdue donations and raises urgent alerts for near-expiry food.
- The system is designed for local deployment and demo use, with a geo-aware donation workflow for a community food redistribution use case.

## License

This project is for educational and local deployment use. Add your preferred license if you plan to distribute it publicly.

## Future Enhancements

Potential improvements include:

- More advanced ML models for donation forecasting
- Better route optimization for volunteers
- Automated push notifications to mobile users
- Production-grade deployment setup with Docker and CI/CD
- Expanded analytics and reporting for NGOs and admins
